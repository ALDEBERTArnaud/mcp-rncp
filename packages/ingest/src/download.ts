import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Unzip, UnzipInflate } from "fflate";

export const DATASET_ID = "5eebbc067a14b6fecc9c9976";
const API = `https://www.data.gouv.fr/api/1/datasets/${DATASET_ID}/`;

type Resource = { title: string; url: string; filesize: number | null; last_modified: string };

export type ExportSet = { date: string; rncp: Resource; rs: Resource };

// Latest matching pair of V4.1 zips (RNCP + RS) published on data.gouv.
export async function findLatestExports(fetchImpl: typeof fetch = fetch): Promise<ExportSet> {
  const res = await fetchImpl(API, { headers: { "user-agent": "mcp-rncp-ingest" } });
  if (!res.ok) throw new Error(`data.gouv API ${res.status}`);
  const json = (await res.json()) as { resources: Resource[] };
  const re = /^export-fiches-(rncp|rs)-v4-1-(\d{4}-\d{2}-\d{2})\.zip$/;
  const byDate = new Map<string, Partial<Record<"rncp" | "rs", Resource>>>();
  for (const r of json.resources) {
    const m = re.exec(r.title);
    if (!m) continue;
    const entry = byDate.get(m[2]!) ?? {};
    entry[m[1] as "rncp" | "rs"] = r;
    byDate.set(m[2]!, entry);
  }
  const dates = [...byDate.keys()].sort().reverse();
  for (const d of dates) {
    const e = byDate.get(d)!;
    if (e.rncp && e.rs) return { date: d, rncp: e.rncp, rs: e.rs };
  }
  throw new Error("No complete V4.1 export pair found on data.gouv");
}

export async function downloadTo(url: string, dest: string): Promise<void> {
  if (existsSync(dest) && statSync(dest).size > 0) return;
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download ${url}: ${res.status}`);
  const tmp = `${dest}.part`;
  await pipeline(
    Readable.fromWeb(res.body as import("node:stream/web").ReadableStream),
    createWriteStream(tmp),
  );
  renameSync(tmp, dest);
}

// Extract the single XML entry of an export zip; returns the extracted path.
export async function unzipXml(zipPath: string, outDir: string): Promise<string> {
  mkdirSync(outDir, { recursive: true });
  const file = Bun.file(zipPath);
  let outPath = "";
  let stream: ReturnType<typeof createWriteStream> | null = null;
  const done = new Promise<void>((resolve, reject) => {
    const unzip = new Unzip((entry) => {
      if (!entry.name.toLowerCase().endsWith(".xml")) return;
      outPath = join(outDir, entry.name.split("/").pop()!);
      stream = createWriteStream(outPath);
      entry.ondata = (err, data, final) => {
        if (err) return reject(err);
        stream!.write(data);
        if (final) stream!.end(() => resolve());
      };
      entry.start();
    });
    unzip.register(UnzipInflate);
    (async () => {
      const reader = file.stream().getReader();
      for (;;) {
        const { done: d, value } = await reader.read();
        if (d) break;
        unzip.push(value, false);
      }
      unzip.push(new Uint8Array(0), true);
    })().catch(reject);
  });
  await done;
  if (!outPath) throw new Error(`no XML entry in ${zipPath}`);
  return outPath;
}
