import { createHash } from "node:crypto";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { brotliCompressSync, constants } from "node:zlib";
import { build } from "./build.ts";
import { downloadTo, findLatestExports, unzipXml } from "./download.ts";
import { dumpForD1 } from "./dump.ts";

const { values: args } = parseArgs({
  options: {
    data: { type: "string", default: ".data" },
    out: { type: "string", default: ".data/out" },
    previous: { type: "string" },
    "skip-dump": { type: "boolean", default: false },
    "rncp-xml": { type: "string" },
    "rs-xml": { type: "string" },
    date: { type: "string" },
  },
});

const t0 = Date.now();
const log = (msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ t: Math.round((Date.now() - t0) / 100) / 10, msg, ...extra }));

const dataDir = resolve(args.data!);
const outDir = resolve(args.out!);
mkdirSync(dataDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

let rncpXml = args["rncp-xml"];
let rsXml = args["rs-xml"];
let sourceDate = args.date;

if (!rncpXml || !rsXml) {
  const latest = await findLatestExports();
  sourceDate ??= latest.date;
  log("latest export", { date: latest.date, rncp: latest.rncp.filesize, rs: latest.rs.filesize });
  const rncpZip = join(dataDir, `rncp-${latest.date}.zip`);
  const rsZip = join(dataDir, `rs-${latest.date}.zip`);
  await Promise.all([downloadTo(latest.rncp.url, rncpZip), downloadTo(latest.rs.url, rsZip)]);
  log("downloaded");
  rncpXml = await unzipXml(rncpZip, join(dataDir, "xml"));
  rsXml = await unzipXml(rsZip, join(dataDir, "xml"));
  log("unzipped", {
    rncpXml,
    rsXml,
    mb: Math.round((statSync(rncpXml).size + statSync(rsXml).size) / 1e6),
  });
}
if (!sourceDate) throw new Error("--date is required when providing XML paths");

const runId = `${sourceDate}-${new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)}`;
const sqlitePath = join(outDir, "rncp.sqlite");
const result = await build({
  rncpXml,
  rsXml,
  out: sqlitePath,
  sourceDate,
  runId,
  previousDb: args.previous ? resolve(args.previous) : undefined,
  onProgress: (n) => n % 5000 === 0 && log("parsed", { fiches: n }),
});
log("sqlite built", {
  bytes: statSync(sqlitePath).size,
  ...result.counts,
  flux: result.fluxVersion,
});

const raw = await Bun.file(sqlitePath).arrayBuffer();
const sqliteSha = createHash("sha256").update(Buffer.from(raw)).digest("hex");
const br = brotliCompressSync(Buffer.from(raw), {
  params: {
    [constants.BROTLI_PARAM_QUALITY]: 6,
    [constants.BROTLI_PARAM_SIZE_HINT]: raw.byteLength,
  },
});
const brPath = join(outDir, "rncp.sqlite.br");
await Bun.write(brPath, br);
log("compressed", { bytes: br.byteLength });

let dump: { statements: number; bytes: number } | null = null;
if (!args["skip-dump"]) {
  dump = await dumpForD1(sqlitePath, join(outDir, "rncp.sql"));
  log("d1 dump", dump);
}

const manifest = {
  schema_version: 1,
  source: "France compétences (data.gouv.fr)",
  licence: "Licence Ouverte / Open Licence 2.0",
  source_date: sourceDate,
  flux_version: result.fluxVersion,
  run_id: runId,
  ingested_at: new Date().toISOString(),
  counts: result.counts,
  sqlite: { bytes: raw.byteLength, sha256: sqliteSha },
  sqlite_br: { bytes: br.byteLength, sha256: createHash("sha256").update(br).digest("hex") },
  sql: dump,
};
await Bun.write(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
log("done", { seconds: Math.round((Date.now() - t0) / 1000) });
if (!existsSync(join(outDir, "manifest.json"))) process.exit(1);
