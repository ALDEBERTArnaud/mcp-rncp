import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { describe, expect, it } from "vitest";

const BUNDLE = resolve(import.meta.dirname, "../dist/mcp-rncp.mjs");
const FIXTURE = resolve(import.meta.dirname, "../../../fixtures/rncp.fixture.sqlite");

// Exercises the built npm bundle over real stdio with the same Node that runs the tests.
describe.skipIf(!existsSync(BUNDLE))("CLI bundle (stdio)", () => {
  it("serves tools from a pinned local database, no network", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [BUNDLE, "--db", FIXTURE, "--no-update"],
      stderr: "pipe",
    });
    const client = new Client({ name: "cli-test", version: "0" });
    await client.connect(transport);
    const tools = await client.listTools();
    expect(tools.tools.length).toBe(9);
    const r = await client.callTool({ name: "get_data_status", arguments: {} });
    const data = r.structuredContent as { source_date: string };
    expect(data.source_date).toBe("2026-08-16");
    const v = await client.callTool({ name: "check_validity", arguments: { numero: "35419" } });
    expect((v.structuredContent as { actif: boolean }).actif).toBe(false);
    await client.close();
  });
});
