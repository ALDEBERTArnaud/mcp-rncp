// Eval runner: recall@5 on search cases + exactness on validity/habilitation cases.
// Usage: node run.ts [--db path] [--min-recall 0.8]   (default DB: fixtures/rncp.fixture.sqlite)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { createServer } from "@mcp-rncp/core";
import { openSqlite } from "@mcp-rncp/db-sqlite";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";

type SearchCase = { query: string; niveau?: number; repertoire?: "RNCP" | "RS"; expect: string[] };
type ValidityCase = { numero: string; actif: boolean; remplacee_par?: string[] };
type HabCase = { numero: string; siret: string; habilite: boolean; roles?: string[] };
type Cases = { search: SearchCase[]; validity: ValidityCase[]; habilitation: HabCase[] };

const { values: args } = parseArgs({
  options: {
    db: {
      type: "string",
      default: resolve(import.meta.dirname, "../fixtures/rncp.fixture.sqlite"),
    },
    "min-recall": { type: "string", default: "0.8" },
    verbose: { type: "boolean", default: false },
  },
});
const cases = JSON.parse(readFileSync(resolve(import.meta.dirname, "cases.json"), "utf8")) as Cases;
const db = openSqlite(args.db!);
const known = new Set(
  (await db.all<{ numero: string }>("SELECT numero FROM certifications")).map((r) => r.numero),
);
const server = createServer({ db, now: () => new Date("2026-08-16T12:00:00Z") });
const [a, b] = InMemoryTransport.createLinkedPair();
await server.connect(a);
const client = new Client({ name: "eval", version: "0" });
await client.connect(b);
const call = async (name: string, argsIn: Record<string, unknown>) => {
  const r = await client.callTool({ name, arguments: argsIn });
  if (r.isError) throw new Error(`${name}: ${(r.content[0] as { text: string }).text}`);
  return r.structuredContent as Record<string, unknown>;
};

let hits = 0;
let mrr = 0;
let ran = 0;
const misses: string[] = [];
for (const c of cases.search) {
  if (!c.expect.some((n) => known.has(n))) continue;
  ran++;
  const d = await call("search_certifications", {
    query: c.query,
    niveau: c.niveau,
    repertoire: c.repertoire,
    limit: 5,
  });
  const top = (d.results as Array<{ numero: string }>).map((r) => r.numero);
  const rank = top.findIndex((n) => c.expect.includes(n));
  if (rank >= 0) {
    hits++;
    mrr += 1 / (rank + 1);
  } else
    misses.push(
      `"${c.query}"${c.niveau ? ` niv${c.niveau}` : ""} → ${top.join(",") || "∅"} (expected ${c.expect.join("|")})`,
    );
  if (args.verbose) console.log(`${rank >= 0 ? "✓" : "✗"} ${c.query} → ${top.join(", ")}`);
}
const recall = ran ? hits / ran : 0;

let exactFail = 0;
let exactRan = 0;
for (const c of cases.validity) {
  if (!known.has(c.numero.startsWith("R") ? c.numero : `RNCP${c.numero}`)) continue;
  exactRan++;
  const d = await call("check_validity", { numero: c.numero });
  const ok =
    d.actif === c.actif &&
    (!c.remplacee_par || JSON.stringify(d.remplacee_par) === JSON.stringify(c.remplacee_par));
  if (!ok) {
    exactFail++;
    console.log(
      `✗ validity ${c.numero}: got actif=${d.actif} remplacee_par=${JSON.stringify(d.remplacee_par)}`,
    );
  }
}
for (const c of cases.habilitation) {
  if (!known.has(c.numero)) continue;
  exactRan++;
  const d = await call("check_habilitation", { numero: c.numero, siret: c.siret });
  const ok =
    d.habilite === c.habilite && (!c.roles || JSON.stringify(d.roles) === JSON.stringify(c.roles));
  if (!ok) {
    exactFail++;
    console.log(
      `✗ habilitation ${c.numero}/${c.siret}: got habilite=${d.habilite} roles=${JSON.stringify(d.roles)}`,
    );
  }
}

await client.close();
await server.close();
db.close();

console.log(`\nDB: ${args.db} (${known.size} certifications)`);
console.log(
  `Search  recall@5 = ${(recall * 100).toFixed(0)}% (${hits}/${ran}, ${cases.search.length - ran} skipped) · MRR = ${ran ? (mrr / ran).toFixed(2) : "-"}`,
);
for (const m of misses) console.log(`  miss: ${m}`);
console.log(`Exact   validity/habilitation = ${exactRan - exactFail}/${exactRan}`);
const minRecall = Number(args["min-recall"]);
const pass = recall >= minRecall && exactFail === 0 && ran > 0;
console.log(pass ? "PASS" : `FAIL (min recall ${minRecall}, exact failures ${exactFail})`);
process.exit(pass ? 0 : 1);
