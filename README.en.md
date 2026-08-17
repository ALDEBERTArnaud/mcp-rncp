# mcp-rncp

**The French RNCP / RS registers of professional certifications, inside Claude, ChatGPT or Cursor: search, sheets,
blocs de compétences, validity, SIRET habilitations.**

Read-only [MCP](https://modelcontextprotocol.io) server over France compétences open data. No API key, no server-side
LLM, every answer carries its source and data date.

🇫🇷 [README en français](README.md) · 📦 [`npx -y mcp-rncp`](https://www.npmjs.com/package/mcp-rncp) ·
🌐 `https://mcp-rncp.com/mcp` · 📄 [Data licence](docs/LICENCE-DONNEES.md)

## Why

- Training organisms in France must check that an RNCP certification is **still registered**, that their **SIRET is
  habilitated** to train and/or assess, and must declare the **blocs de compétences** of every offer in EDOF (mandatory
  since 2026-06-11; unlisted offers disappear from Mon Compte Formation on 2026-10-22).
- HR teams, funders and candidates want to know which level-6 cybersecurity certifications exist, when they expire,
  which one replaces which.
- The answers live in a 570 MB XML refreshed nightly. This server makes it queryable in natural language.

## Try these prompts

> "Is RNCP 35419 still active? If not, which sheet replaces it?"

> "Is SIRET 88055223700047 habilitated on RNCP 37674, and for which role? List the blocs to declare in EDOF."

> "Find active level-6 cybersecurity certifications and compare the top two."

## Install

**Claude Desktop (local, stdio)** — Node ≥ 22.16 (`node:sqlite` with FTS5):

```json
{ "mcpServers": { "rncp": { "command": "npx", "args": ["-y", "mcp-rncp"] } } }
```

First run downloads the database (~90 MB brotli) to `~/.cache/mcp-rncp` (Windows: `%LOCALAPPDATA%\mcp-rncp`),
verifies SHA-256, then refreshes weekly in the background.

**Claude.ai / Claude Code / Cursor (hosted, Streamable HTTP)** — `https://mcp-rncp.com/mcp`,
no auth, 60 requests/min per IP.

```bash
claude mcp add --transport http rncp https://mcp-rncp.com/mcp
```

## Tools

| Tool | Returns |
|---|---|
| `search_certifications` | BM25 full-text search with French synonyms; filters: register, level 3-8, NSF, ROME; active only by default |
| `get_certification` | full sheet: certifiers, activities, attested skills, codes, access routes, legal texts, replacements, statistics |
| `list_blocs` | blocs `RNCPxxxxxBCyy` in order with skills and assessment methods — EDOF-ready |
| `check_validity` | status, expiry, days left, delivery deadline, replacement, estimated CPF eligibility, warning |
| `check_habilitation` | SIRET/SIREN habilitated or not, roles `former` / `evaluer`, certifier match, state and dates |
| `list_partenaires` | paginated habilitated partners, SIRET prefix filter |
| `compare_certifications` | levels, certifiers, shared NSF/ROME, bloc overlap, closest bloc pairs |
| `changes_since` | created / updated / deactivated / reactivated / removed sheets since a date |
| `get_data_status` | export date, age, counts |

Numbers are accepted as `RNCP35419`, `35419`, `rncp 35419`, `RS5000` or a francecompetences.fr URL. Every response
includes `summary`, `source`, `data_updated_at`, `url_fiche` and an explicit `truncated` flag.
Resources: `rncp://glossaire`, `rncp://about`. Prompts: `rediger_offre_edof`, `verifier_certification` (French).

## Data

France compétences, data.gouv.fr dataset "RNCP et RS", XML feed V4.1, **Licence Ouverte 2.0** (attribution required —
included in every answer). ~30,500 sheets (~7,000 active), ~56,000 blocs, ~400,000 habilitation rows. Weekly ingestion
published as GitHub Releases `data-YYYY-MM-DD` and loaded into Cloudflare D1 with zero downtime (blue/green databases).
Field mapping: [docs/DATA-MAPPING.md](docs/DATA-MAPPING.md) (French).

## Limits

Not real time (age reported by `get_data_status`); `eligible_cpf_estime` is an estimate; full-text (not semantic)
search; no NPEC, jury composition or PDF referentials in v1; hosted endpoint is rate limited — use `npx mcp-rncp`
locally for heavy use.

## Development

Bun workspaces: `packages/core` (tools + SQL, runtime-agnostic), `packages/ingest`, `packages/db-sqlite`,
`packages/db-d1`, `apps/cli`, `apps/worker`, `eval/` (46 real cases, recall@5 measured at 96% on the full dataset).
`bun install && bun run test && bun run eval`.

MIT — Arnaud Aldebert.
