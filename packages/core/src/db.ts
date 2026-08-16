// Runtime-agnostic database access. Implemented by @mcp-rncp/db-sqlite (better-sqlite3)
// and @mcp-rncp/db-d1 (Cloudflare D1). SQL lives in core (queries.ts); adapters only execute it.
export type SqlParam = string | number | null;

export interface Db {
  all<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T[]>;
  get<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T | undefined>;
}
