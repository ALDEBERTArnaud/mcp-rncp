// Loads rncp.sql into the older blue/green D1 slot of an environment, then verifies the swap.
//   bun run src/load-d1.ts --env production|staging --sql .data/out/rncp.sql --health https://…/health
// Requires wrangler auth (CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID) and runs from apps/worker.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    env: { type: "string", default: "staging" },
    sql: { type: "string", default: "../../.data/out/rncp.sql" },
    health: { type: "string" },
    "expected-date": { type: "string" },
  },
});

const SLOTS: Record<string, string[]> = {
  production: ["rncp-a", "rncp-b"],
  staging: ["rncp-staging-a", "rncp-staging-b"],
};
const slots = SLOTS[args.env!];
const sqlPath = resolve(args.sql!);
if (!slots) throw new Error(`unknown env ${args.env}`);

const log = (msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ msg, ...extra }));

async function wrangler(argv: string[], quiet = false): Promise<string> {
  const p = Bun.spawn(["bunx", "wrangler", ...argv], {
    cwd: fileURLToPath(new URL("../../../apps/worker", import.meta.url)),
    stdout: "pipe",
    stderr: quiet ? "pipe" : "inherit",
    env: { ...process.env, CI: "true" },
  });
  const out = await new Response(p.stdout).text();
  const code = await p.exited;
  if (code !== 0) throw new Error(`wrangler ${argv.slice(0, 3).join(" ")} exited ${code}`);
  return out;
}

async function slotMeta(db: string): Promise<{ status?: string; source_date?: string }> {
  try {
    const out = await wrangler(
      [
        "d1",
        "execute",
        db,
        "--remote",
        "--json",
        "--command",
        "SELECT key, value FROM meta WHERE key IN ('status','source_date')",
      ],
      true,
    );
    const start = out.indexOf("[");
    const json = JSON.parse(out.slice(start)) as Array<{
      results: Array<{ key: string; value: string }>;
    }>;
    return Object.fromEntries((json[0]?.results ?? []).map((r) => [r.key, r.value]));
  } catch {
    return {};
  }
}

const metas = await Promise.all(slots.map(slotMeta));
for (const [i, s] of slots.entries()) log("slot", { db: s, ...metas[i] });
// Target = a slot that is not ready, else the one with the oldest source_date.
let target = slots.findIndex((_, i) => metas[i]!.status !== "ready");
if (target < 0) target = metas[0]!.source_date! <= metas[1]!.source_date! ? 0 : 1;
const db = slots[target]!;
log("loading", { db, sql: sqlPath });
const t0 = Date.now();
await wrangler(["d1", "execute", db, "--remote", "--yes", "--file", sqlPath]);
log("loaded", { db, seconds: Math.round((Date.now() - t0) / 1000) });

const after = await slotMeta(db);
if (after.status !== "ready")
  throw new Error(`slot ${db} not ready after load: ${JSON.stringify(after)}`);
if (args["expected-date"] && after.source_date !== args["expected-date"])
  throw new Error(
    `slot ${db} has source_date ${after.source_date}, expected ${args["expected-date"]}`,
  );
log("slot ready", { db, ...after });

if (args.health) {
  // The Worker re-picks the slot within 60 s.
  for (let i = 0; i < 8; i++) {
    const h = (await (await fetch(args.health, { cache: "no-store" })).json()) as {
      source_date?: string;
    };
    if (h.source_date === after.source_date) {
      log("health confirms swap", h);
      process.exit(0);
    }
    await Bun.sleep(15_000);
  }
  throw new Error("health did not report the new source_date within 2 min");
}
