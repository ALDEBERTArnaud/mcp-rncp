import { DatabaseSync, type StatementSync } from "node:sqlite";
import type { Db, SqlParam } from "@mcp-rncp/core";

export type SqliteDb = Db & { close(): void };

// Read-only adapter on node:sqlite (Node >= 22.16 ships SQLite with FTS5; no native module to install).
export function openSqlite(path: string): SqliteDb {
  const db = new DatabaseSync(path, { readOnly: true });
  const cache = new Map<string, StatementSync>();
  const stmt = (sql: string) => {
    let s = cache.get(sql);
    if (!s) {
      s = db.prepare(sql);
      cache.set(sql, s);
    }
    return s;
  };
  return {
    async all<T>(sql: string, params: SqlParam[] = []) {
      return stmt(sql).all(...params) as T[];
    },
    async get<T>(sql: string, params: SqlParam[] = []) {
      return stmt(sql).get(...params) as T | undefined;
    },
    close: () => db.close(),
  };
}

export function assertFts5(db: SqliteDb): Promise<void> {
  return db.get("SELECT 1 FROM certifications_fts WHERE certifications_fts MATCH 'x' LIMIT 0").then(
    () => undefined,
    (e: unknown) => {
      throw new Error(
        `SQLite FTS5 unavailable in this Node.js (${process.version}). Node >= 22.16 or >= 24 is required. (${String(e)})`,
      );
    },
  );
}
