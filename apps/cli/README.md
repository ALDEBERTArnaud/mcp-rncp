# mcp-rncp

MCP server (stdio) for the French **RNCP / RS** registers of professional certifications — France compétences open
data, no API key. Search, full sheets, blocs de compétences (EDOF), validity/expiry, SIRET habilitations, comparisons,
recent changes.

```json
{ "mcpServers": { "rncp": { "command": "npx", "args": ["-y", "mcp-rncp"] } } }
```

Requires **Node ≥ 22.16** (`node:sqlite` with FTS5). First run downloads the data (~90 MB) into
`~/.cache/mcp-rncp` (Windows: `%LOCALAPPDATA%\mcp-rncp`), verifies its SHA-256 and refreshes weekly.

Options: `--db <rncp.sqlite>` (or `MCP_RNCP_DB`) to pin a local database, `--cache-dir <dir>`, `--update`,
`--no-update`, `--help`.

Hosted alternative (Streamable HTTP, no install): `https://mcp-rncp.com/mcp`.

Data: France compétences via data.gouv.fr, Licence Ouverte 2.0 — every answer cites the source and export date.
Docs, tools and licence: https://github.com/ALDEBERTArnaud/mcp-rncp
