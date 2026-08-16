import type { Db, SqlParam } from "@mcp-rncp/core";

// Cloudflare D1 adapter. One D1Database binding → one Db.
export function d1Db(d1: D1Database): Db {
  return {
    async all<T>(sql: string, params: SqlParam[] = []) {
      const r = await d1
        .prepare(sql)
        .bind(...params)
        .all<T & Record<string, unknown>>();
      return r.results as T[];
    },
    async get<T>(sql: string, params: SqlParam[] = []) {
      const r = await d1
        .prepare(sql)
        .bind(...params)
        .first<T & Record<string, unknown>>();
      return (r ?? undefined) as T | undefined;
    },
  };
}

export type Slot = { name: string; db: Db; sourceDate: string };

// Blue/green: two databases; ingestion reloads the older one and marks meta.status='ready' last.
// The Worker serves the newest ready slot, so a half-loaded database is never read.
export async function pickReadySlot(slots: Array<{ name: string; d1: D1Database }>): Promise<Slot> {
  const ready: Slot[] = [];
  for (const s of slots) {
    try {
      const rows = await s.d1
        .prepare("SELECT key, value FROM meta WHERE key IN ('status','source_date')")
        .all<{ key: string; value: string }>();
      const m = Object.fromEntries(rows.results.map((r) => [r.key, r.value]));
      if (m.status === "ready" && m.source_date)
        ready.push({ name: s.name, db: d1Db(s.d1), sourceDate: m.source_date });
    } catch {
      // table missing while loading: slot not ready
    }
  }
  if (!ready.length) throw new Error("no ready database slot");
  ready.sort((a, b) => (a.sourceDate < b.sourceDate ? 1 : -1));
  return ready[0]!;
}
