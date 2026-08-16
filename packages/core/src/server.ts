import { McpServer, type ServerOptions } from "@modelcontextprotocol/server";
import type { Db } from "./db.ts";
import { registerPrompts } from "./prompts.ts";
import { registerResources } from "./resources.ts";
import { registerTools } from "./tools.ts";

export const SERVER_NAME = "mcp-rncp";
export const SERVER_VERSION = "0.1.0";

export type CreateServerOptions = {
  db: Db;
  version?: string;
  now?: () => Date;
  serverOptions?: ServerOptions;
};

// One factory for every runtime (stdio CLI, Cloudflare Worker, tests).
export function createServer(opts: CreateServerOptions): McpServer {
  const version = opts.version ?? SERVER_VERSION;
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version,
      title: "RNCP / RS — certifications professionnelles (France compétences)",
      websiteUrl: "https://github.com/ALDEBERTArnaud/mcp-rncp",
    },
    {
      instructions:
        "Read-only access to the French RNCP and RS registers of professional certifications (France compétences open data). Numbers may be given as 'RNCP35419', '35419' or 'RS5000'. Always relay the `source` and `data_updated_at` fields to the user and link `url_fiche`. Use get_data_status when freshness matters, check_validity before recommending a certification, list_blocs for EDOF declarations, check_habilitation for a SIRET.",
      ...opts.serverOptions,
    },
  );
  registerTools(server, { db: opts.db, now: opts.now });
  registerResources(server, { db: opts.db, version });
  registerPrompts(server);
  return server;
}
