import { resolve } from "node:path";
import { openSqlite } from "@mcp-rncp/db-sqlite";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createServer } from "../src/server.ts";

export const FIXTURE = resolve(import.meta.dirname, "../../../fixtures/rncp.fixture.sqlite");
// Frozen clock: RNCP35419 expired on 2026-03-17, RNCP35959 expires 2026-10-15.
export const NOW = () => new Date("2026-08-16T12:00:00Z");

export async function connect() {
  const db = openSqlite(FIXTURE);
  const server = createServer({ db, now: NOW });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(b);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = await client.callTool({ name, arguments: args });
    return { r, data: r.structuredContent as Record<string, unknown> };
  };
  return {
    client,
    call,
    close: async () => {
      await client.close();
      await server.close();
      db.close();
    },
  };
}
