---
paths:
  - "apps/worker/**"
  - "packages/db-d1/**"
---
# Worker Cloudflare (apps/worker, packages/db-d1)

- Deux bases D1 blue/green (`DB_A`, `DB_B`) : le Worker sert le slot `meta.status='ready'` le plus récent
  (`pickReadySlot`, cache 60 s). Ne jamais lire une base sans ce test.
- `/mcp` : rate limit `RL` (60/min/IP) avant tout, cache 1 h clé = hash(source_date + headers + body) pour
  `tools/call`, `tools/list`, `resources/*`, `prompts/*`. Jamais de cache sur `initialize`.
- Logs JSON une ligne par requête, IP hachée tronquée ; aucun secret côté Worker (D1 = binding).
- Pages HTML dans `pages.ts` : rendu serveur, zéro JS, toutes les dates/compteurs viennent
  de `meta` (jamais en dur), JSON-LD maintenu (SoftwareApplication, FAQPage, Person).
- Vérifier localement avec `bunx wrangler dev --local` (D1 chargée depuis `.data/fixture.sql`) puis déployer
  staging avant prod ; `deploy-worker.yml` fait staging → smoke → prod sur `main`.
- SDK MCP v2 (`@modelcontextprotocol/server`) : ne pas réintroduire v1/@hono/mcp.
