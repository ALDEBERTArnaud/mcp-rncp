#!/usr/bin/env node
// mcp-rncp — stdio MCP server over the RNCP / RS registers. stdout is the protocol channel: log to stderr only.
import { parseArgs } from "node:util";
import { createServer, type Db, SERVER_VERSION } from "@mcp-rncp/core";
import { assertFts5, openSqlite, type SqliteDb } from "@mcp-rncp/db-sqlite";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import {
  cacheDir,
  checkForUpdate,
  cleanup,
  dbFile,
  downloadRelease,
  latestDataRelease,
  localDb,
  localManifest,
  log,
  needsCheck,
} from "./data.ts";

const { values: args } = parseArgs({
  options: {
    db: { type: "string" },
    "cache-dir": { type: "string" },
    update: { type: "boolean", default: false },
    "no-update": { type: "boolean", default: false },
    version: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (args.version) {
  console.log(SERVER_VERSION);
  process.exit(0);
}
if (args.help) {
  console.log(`mcp-rncp ${SERVER_VERSION} — MCP server (stdio) for the French RNCP / RS registers.

Usage: npx -y mcp-rncp [--db <rncp.sqlite>] [--cache-dir <dir>] [--update] [--no-update]

  --db <path>       Use a local rncp.sqlite instead of the downloaded release (env MCP_RNCP_DB)
  --cache-dir <dir> Where data is cached (default: ~/.cache/mcp-rncp or %LOCALAPPDATA%\\mcp-rncp)
  --update          Force a data update check now, then serve
  --no-update       Never check for updates (offline)

Data: France compétences via data.gouv.fr (Licence Ouverte 2.0), published as GitHub Releases.
Requires Node >= 22.16 (node:sqlite with FTS5).`);
  process.exit(0);
}

const [major = 0, minor = 0] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 16)) {
  console.error(
    `mcp-rncp requires Node >= 22.16 (found ${process.version}): node:sqlite with FTS5 is needed.`,
  );
  process.exit(1);
}

const dir = args["cache-dir"] ?? cacheDir();
const pinned = args.db ?? process.env.MCP_RNCP_DB;
let file = pinned ?? (await localDb(dir));

if (!pinned && (!file || args.update)) {
  const release = await latestDataRelease();
  const local = await localManifest(dir);
  if (!file || release.tag.slice(5) > (local?.source_date ?? "")) {
    const m = await downloadRelease(release, dir);
    file = dbFile(dir, m.source_date);
  }
}
if (!pinned) cleanup(dir, file);

// Hot-swappable Db: a background refresh replaces `current` without restarting the server.
let current: SqliteDb = openSqlite(file as string);
await assertFts5(current);
const db: Db = {
  all: (sql, params) => current.all(sql, params),
  get: (sql, params) => current.get(sql, params),
};

const meta = await current.get<{ value: string }>("SELECT value FROM meta WHERE key='source_date'");
log("mcp-rncp ready", { version: SERVER_VERSION, db: file, source_date: meta?.value ?? null });

const handle = serveStdio(() => createServer({ db }));

if (!pinned && !args["no-update"] && needsCheck(dir)) {
  void (async () => {
    const release = await checkForUpdate(dir);
    if (!release) return;
    try {
      const m = await downloadRelease(release, dir);
      const next = openSqlite(dbFile(dir, m.source_date));
      await assertFts5(next);
      const prev = current;
      current = next;
      prev.close();
      log("data refreshed", { tag: release.tag });
    } catch (e) {
      log("background update failed", { reason: String(e) });
    }
  })();
}

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    void handle.close().finally(() => {
      current.close();
      process.exit(0);
    });
  });
}
