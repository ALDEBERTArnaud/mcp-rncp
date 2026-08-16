import { Database } from "bun:sqlite";
import { createWriteStream } from "node:fs";
import { SCHEMA_SQL } from "./schema.ts";

const TABLES = [
  "certifications",
  "certificateurs",
  "partenaires",
  "blocs",
  "changes",
  "synonymes",
  "meta",
];
const MAX_STMT = 80_000;

function lit(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  return `'${String(v).replaceAll("'", "''")}'`;
}

// Produces a self-contained SQL file for `wrangler d1 execute --file`.
// Statements stay < 100 KB (D1 limit). Ends by marking meta.status = 'ready'
// so a half-loaded database is never selected by the Worker (see apps/worker).
export async function dumpForD1(
  sqlitePath: string,
  outPath: string,
): Promise<{ statements: number; bytes: number }> {
  const db = new Database(sqlitePath, { readonly: true });
  const out = createWriteStream(outPath, { encoding: "utf8" });
  let statements = 0;
  let bytes = 0;
  const write = (s: string) =>
    new Promise<void>((resolve, reject) => {
      bytes += Buffer.byteLength(s);
      out.write(s, (e) => (e ? reject(e) : resolve()));
    });

  for (const t of [...TABLES, "certifications_fts"]) {
    await write(`DROP TABLE IF EXISTS ${t};\n`);
    statements++;
  }
  // FTS on D1 keeps its own content copy: a content= table cannot be swapped by rename safely.
  const schema = SCHEMA_SQL.replace("content='certifications', content_rowid='id',\n", "");
  for (const stmt of schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    await write(`${stmt};\n`);
    statements++;
  }

  for (const t of TABLES) {
    const cols = (db.query(`PRAGMA table_info(${t})`).all() as Array<{ name: string }>).map(
      (c) => c.name,
    );
    const head = `INSERT INTO ${t} (${cols.join(",")}) VALUES `;
    let buf: string[] = [];
    let size = head.length;
    const flush = async () => {
      if (!buf.length) return;
      await write(`${head}${buf.join(",")};\n`);
      statements++;
      buf = [];
      size = head.length;
    };
    for (const row of db.query(`SELECT ${cols.join(",")} FROM ${t}`).iterate() as Iterable<
      Record<string, unknown>
    >) {
      if (t === "meta" && row.key === "status") continue;
      const tuple = `(${cols.map((c) => lit(row[c])).join(",")})`;
      if (size + tuple.length + 1 > MAX_STMT && buf.length) await flush();
      buf.push(tuple);
      size += tuple.length + 1;
    }
    await flush();
  }

  const fts = db
    .query(
      "SELECT id, numero, intitule, abrege_libelle, competences_attestees, activites_visees FROM certifications ORDER BY id",
    )
    .iterate() as Iterable<Record<string, unknown>>;
  const head =
    "INSERT INTO certifications_fts (rowid, numero, intitule, abrege_libelle, competences_attestees, activites_visees) VALUES ";
  let buf: string[] = [];
  let size = head.length;
  for (const r of fts) {
    const tuple = `(${lit(r.id)},${lit(r.numero)},${lit(r.intitule)},${lit(r.abrege_libelle)},${lit(r.competences_attestees)},${lit(r.activites_visees)})`;
    if (size + tuple.length + 1 > MAX_STMT && buf.length) {
      await write(`${head}${buf.join(",")};\n`);
      statements++;
      buf = [];
      size = head.length;
    }
    buf.push(tuple);
    size += tuple.length + 1;
  }
  if (buf.length) {
    await write(`${head}${buf.join(",")};\n`);
    statements++;
  }
  await write("INSERT INTO meta (key, value) VALUES ('status', 'ready');\n");
  statements++;
  await new Promise<void>((resolve) => out.end(resolve));
  db.close();
  return { statements, bytes };
}
