// Locates, downloads, verifies and refreshes the rncp.sqlite data file.
// Data is published as GitHub Releases tagged `data-YYYY-MM-DD` (rncp.sqlite.br + manifest.json).
// Each version lives in its own file (rncp-YYYY-MM-DD.sqlite) so a running server can hot-swap.
import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createBrotliDecompress } from "node:zlib";

export const REPO = "ALDEBERTArnaud/mcp-rncp";
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases?per_page=20`;
const CHECK_INTERVAL_MS = 24 * 3600 * 1000;

export type Manifest = {
  source_date: string;
  run_id: string;
  counts?: Record<string, number>;
  sqlite: { bytes: number; sha256: string };
  sqlite_br: { bytes: number; sha256: string };
};

export type Release = { tag: string; manifestUrl: string; dbUrl: string; publishedAt: string };

export const log = (msg: string, extra: Record<string, unknown> = {}) =>
  console.error(JSON.stringify({ level: "info", msg, ...extra }));

export function cacheDir(): string {
  if (process.env.MCP_RNCP_CACHE_DIR) return process.env.MCP_RNCP_CACHE_DIR;
  const base =
    process.platform === "win32"
      ? (process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"))
      : (process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"));
  return join(base, "mcp-rncp");
}

export const dbFile = (dir: string, sourceDate: string) => join(dir, `rncp-${sourceDate}.sqlite`);
const manifestPath = (dir: string) => join(dir, "manifest.json");
const lastCheckPath = (dir: string) => join(dir, "last-check");

async function ghFetch(url: string): Promise<Response> {
  const headers: Record<string, string> = {
    "user-agent": "mcp-rncp-cli",
    accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}`);
  return res;
}

export async function latestDataRelease(): Promise<Release> {
  const releases = (await (await ghFetch(RELEASES_API)).json()) as Array<{
    tag_name: string;
    published_at: string;
    draft: boolean;
    assets: Array<{ name: string; browser_download_url: string }>;
  }>;
  const data = releases
    .filter((r) => !r.draft && r.tag_name.startsWith("data-"))
    .sort((a, b) => (a.tag_name < b.tag_name ? 1 : -1));
  for (const r of data) {
    const m = r.assets.find((a) => a.name === "manifest.json");
    const d = r.assets.find((a) => a.name === "rncp.sqlite.br");
    if (m && d)
      return {
        tag: r.tag_name,
        manifestUrl: m.browser_download_url,
        dbUrl: d.browser_download_url,
        publishedAt: r.published_at,
      };
  }
  throw new Error(`No data release found on ${REPO}`);
}

async function sha256File(path: string): Promise<string> {
  const h = createHash("sha256");
  await pipeline(createReadStream(path), async function* (src) {
    for await (const chunk of src) h.update(chunk as Buffer);
  });
  return h.digest("hex");
}

// Downloads rncp.sqlite.br, decompresses to rncp-<date>.sqlite.tmp, verifies sha256, renames, writes manifest.
export async function downloadRelease(release: Release, dir: string): Promise<Manifest> {
  mkdirSync(dir, { recursive: true });
  const manifest = (await (await fetch(release.manifestUrl)).json()) as Manifest;
  log("downloading data", {
    tag: release.tag,
    mb: Math.round(manifest.sqlite_br.bytes / 1e6),
    to: dir,
  });
  const res = await fetch(release.dbUrl);
  if (!res.ok || !res.body) throw new Error(`download failed: ${res.status}`);
  const target = dbFile(dir, manifest.source_date);
  const tmp = `${target}.tmp`;
  await pipeline(
    Readable.fromWeb(res.body as import("node:stream/web").ReadableStream),
    createBrotliDecompress(),
    createWriteStream(tmp),
  );
  const sha = await sha256File(tmp);
  if (sha !== manifest.sqlite.sha256) {
    unlinkSync(tmp);
    throw new Error(`checksum mismatch for ${release.tag}: ${sha}`);
  }
  renameSync(tmp, target);
  await writeFile(manifestPath(dir), JSON.stringify(manifest, null, 2));
  await writeFile(lastCheckPath(dir), String(Date.now()));
  log("data ready", { tag: release.tag, source_date: manifest.source_date });
  return manifest;
}

export async function localManifest(dir: string): Promise<Manifest | null> {
  try {
    return JSON.parse(await readFile(manifestPath(dir), "utf8")) as Manifest;
  } catch {
    return null;
  }
}

// Path of the current local DB if manifest + file are present.
export async function localDb(dir: string): Promise<string | null> {
  const m = await localManifest(dir);
  if (!m) return null;
  const f = dbFile(dir, m.source_date);
  return existsSync(f) && statSync(f).size > 0 ? f : null;
}

// Removes stale rncp-*.sqlite files (previous versions, aborted downloads).
export function cleanup(dir: string, keep: string | null): void {
  try {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (/^rncp-\d{4}-\d{2}-\d{2}\.sqlite(\.tmp)?$/.test(name) && p !== keep) {
        try {
          unlinkSync(p);
        } catch {}
      }
    }
  } catch {}
}

export function needsCheck(dir: string): boolean {
  try {
    return Date.now() - Number(statSync(lastCheckPath(dir)).mtimeMs) > CHECK_INTERVAL_MS;
  } catch {
    return true;
  }
}

// Returns the newer release if any (and stamps the check), else null. Never throws.
export async function checkForUpdate(dir: string): Promise<Release | null> {
  try {
    const [release, local] = await Promise.all([latestDataRelease(), localManifest(dir)]);
    await writeFile(lastCheckPath(dir), String(Date.now()));
    return release.tag.slice(5) > (local?.source_date ?? "") ? release : null;
  } catch (e) {
    log("update check skipped", { reason: String(e) });
    return null;
  }
}
