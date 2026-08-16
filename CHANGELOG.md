# Changelog

## Unreleased — v0.1.0

- Ingestion data.gouv (flux XML V4.1, RNCP + RS) → SQLite/FTS5, dump D1, manifest, suivi des changements entre exports.
- 9 outils MCP en lecture seule : `search_certifications`, `get_certification`, `list_blocs`, `check_validity`,
  `check_habilitation`, `list_partenaires`, `compare_certifications`, `changes_since`, `get_data_status`.
- Resources `rncp://glossaire`, `rncp://about` ; prompts `rediger_offre_edof`, `verifier_certification`.
- CLI npm `mcp-rncp` (stdio, Node ≥ 22.16, base téléchargée depuis les Releases `data-*`, mise à jour à chaud).
- Worker Cloudflare (Streamable HTTP, D1 blue/green, rate limit 60/min/IP, cache 1 h, `/health`).
- Évals : 46 cas réels, recall@5 = 96 % sur la base complète ; tests Vitest sur fixture de 20 fiches.
