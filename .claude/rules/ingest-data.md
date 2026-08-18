---
paths:
  - "packages/ingest/**"
  - "docs/DATA-MAPPING.md"
  - "fixtures/**"
---
# Ingestion et données (packages/ingest)

- Le mapping balise XML → colonne est figé dans `docs/DATA-MAPPING.md` : toute nouvelle colonne y est documentée d'abord.
- Ne jamais deviner un nom de balise : vérifier dans `fixtures/export_fiches_*_fixture.xml` ou le XSD v4.1.
- Schéma unique dans `schema.ts` (SQLite local et D1). `dump.ts` doit rester ≤ 100 Ko par statement (limite D1)
  et se terminer par `meta.status = 'ready'` (le Worker ne sert que les slots prêts).
- Dates ISO `AAAA-MM-JJ`, `Oui/Non` → 1/0, `NIVx` → entier ; jamais de texte jury `COMPOSITION` (poids).
- Après modification du schéma ou des synonymes : `bun run fixture` (avec les XML complets) puis `bun run test` et
  `bun run eval` ; le seuil recall@5 ≥ 0,8 est bloquant en CI.
- Bun-only autorisé ici (bun:sqlite, Bun.spawn) ; jamais dans `apps/cli`.
