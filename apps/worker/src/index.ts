// Cloudflare Worker: Streamable HTTP MCP endpoint over D1 (blue/green slots), rate limit, cache, /health.
import { createServer, type Db, SERVER_VERSION } from "@mcp-rncp/core";
import { pickReadySlot, type Slot } from "@mcp-rncp/db-d1";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { type Context, Hono } from "hono";
import {
  docsHtml,
  FAVICON_SVG,
  LOGO_SVG,
  landingHtml,
  llmsTxt,
  ROBOTS,
  type Stats,
  sitemapXml,
} from "./pages.ts";

type Env = {
  DB_A: D1Database;
  DB_B: D1Database;
  RL: RateLimit;
  ENVIRONMENT: string;
  PUBLIC_URL: string;
};

const SLOT_TTL_MS = 60_000;
const CACHE_TTL_S = 3600;
const CACHEABLE = new Set([
  "tools/call",
  "tools/list",
  "resources/read",
  "resources/list",
  "prompts/list",
  "prompts/get",
]);

let slotCache: { slot: Slot; at: number } | null = null;
async function currentSlot(env: Env): Promise<Slot> {
  if (slotCache && Date.now() - slotCache.at < SLOT_TTL_MS) return slotCache.slot;
  const slot = await pickReadySlot([
    { name: "A", d1: env.DB_A },
    { name: "B", d1: env.DB_B },
  ]);
  slotCache = { slot, at: Date.now() };
  return slot;
}

// The MCP handler is built once; the Db it closes over resolves the live slot per query.
let envRef: Env | null = null;
const liveDb: Db = {
  all: async (sql, params) => (await currentSlot(envRef!)).db.all(sql, params),
  get: async (sql, params) => (await currentSlot(envRef!)).db.get(sql, params),
};
const mcp = createMcpHandler(() => createServer({ db: liveDb }), {
  onerror: (e) => console.log(JSON.stringify({ level: "error", msg: "mcp", error: String(e) })),
});

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  envRef = c.env;
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Cache-Control", c.res.headers.get("Cache-Control") ?? "no-store");
});

async function stats(env: Env): Promise<Stats> {
  try {
    const slot = await currentSlot(env);
    const rows = await slot.db.all<{ key: string; value: string }>("SELECT key, value FROM meta");
    return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Stats;
  } catch {
    return {};
  }
}

const page = (c: Context<{ Bindings: Env }>, body: string, type: string) => {
  c.header("Content-Type", type);
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(body);
};

app.get("/", async (c) => page(c, landingHtml(await stats(c.env)), "text/html; charset=utf-8"));
app.get("/docs", async (c) => page(c, docsHtml(await stats(c.env)), "text/html; charset=utf-8"));
app.get("/llms.txt", async (c) =>
  page(c, llmsTxt(await stats(c.env)), "text/plain; charset=utf-8"),
);
app.get("/sitemap.xml", async (c) => page(c, sitemapXml(await stats(c.env)), "application/xml"));
app.get("/robots.txt", (c) => page(c, ROBOTS, "text/plain; charset=utf-8"));
app.get("/logo.svg", (c) => page(c, LOGO_SVG, "image/svg+xml"));
app.get("/favicon.svg", (c) => page(c, FAVICON_SVG, "image/svg+xml"));

app.get("/health", async (c) => {
  try {
    const slot = await currentSlot(c.env);
    const rows = await slot.db.all<{ key: string; value: string }>("SELECT key, value FROM meta");
    const meta = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const age = Math.round((Date.now() - Date.parse(`${meta.source_date}T00:00:00Z`)) / 86_400_000);
    c.header("Cache-Control", "public, max-age=60");
    return c.json({
      ok: true,
      version: SERVER_VERSION,
      environment: c.env.ENVIRONMENT,
      db_slot: slot.name,
      source_date: meta.source_date,
      age_days: age,
      run_id: meta.run_id,
      counts: Object.fromEntries(
        Object.entries(meta)
          .filter(([k]) => k.startsWith("count_"))
          .map(([k, v]) => [k.slice(6), Number(v)]),
      ),
    });
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 503);
  }
});

app.all("/mcp", async (c) => {
  const started = Date.now();
  const ip = c.req.header("cf-connecting-ip") ?? "0.0.0.0";
  const { success } = await c.env.RL.limit({ key: ip });
  if (!success) {
    c.header("Retry-After", "60");
    return c.json(
      {
        jsonrpc: "2.0",
        error: { code: -32000, message: "Rate limit exceeded (60 requests/min per IP)" },
        id: null,
      },
      429,
    );
  }

  let method = c.req.method;
  let tool: string | null = null;
  let cacheKey: Request | null = null;
  const bodyText = c.req.method === "POST" ? await c.req.text() : "";
  if (bodyText) {
    try {
      const j = JSON.parse(bodyText) as {
        method?: string;
        params?: { name?: string; uri?: string };
      };
      method = j.method ?? method;
      tool = j.params?.name ?? j.params?.uri ?? null;
      if (j.method && CACHEABLE.has(j.method)) {
        const slot = await currentSlot(c.env);
        const h = await sha256(
          [
            slot.sourceDate,
            c.req.header("accept") ?? "",
            c.req.header("mcp-protocol-version") ?? "",
            bodyText,
          ].join("\n"),
        );
        cacheKey = new Request(`${c.env.PUBLIC_URL}/__cache/${h}`, { method: "GET" });
      }
    } catch {
      // not JSON: let the handler answer
    }
  }

  const cache = caches.default;
  if (cacheKey) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      log({
        method,
        tool,
        ms: Date.now() - started,
        status: hit.status,
        cache: "hit",
        ip: await sha256(ip),
      });
      return new Response(hit.body, hit);
    }
  }

  const req = bodyText
    ? new Request(c.req.raw.url, { method: "POST", headers: c.req.raw.headers, body: bodyText })
    : c.req.raw;
  let res = await mcp.fetch(req);
  // Tool results are single-shot (JSON body, or one SSE event for 2025-era clients): buffer and cache.
  const cacheable = cacheKey && res.ok;
  if (cacheable) {
    const text = await res.text();
    const headers = new Headers(res.headers);
    headers.set("Cache-Control", `public, max-age=${CACHE_TTL_S}`);
    res = new Response(text, { status: res.status, headers });
    c.executionCtx.waitUntil(cache.put(cacheKey as Request, res.clone()));
  }
  log({
    method,
    tool,
    ms: Date.now() - started,
    status: res.status,
    cache: cacheable ? "miss" : "bypass",
    ip: await sha256(ip),
  });
  return res;
});

app.notFound((c) =>
  c.json(
    {
      error: "not found",
      docs: `${c.env.PUBLIC_URL}/docs`,
      mcp_endpoint: `${c.env.PUBLIC_URL}/mcp`,
    },
    404,
  ),
);

function log(fields: Record<string, unknown>) {
  console.log(JSON.stringify({ level: "info", ...fields, ip: String(fields.ip).slice(0, 16) }));
}

export default app;
