---
paths:
  - "packages/core/**"
---
# Outils MCP (packages/core)

- Un outil = `registerTool` avec `title`, `description` en anglais + « Example (FR): « … » », `annotations: READ_ONLY`.
- Toute réponse passe par `ok()`/`fail()` de `format.ts` et contient `summary`, `source` (via `sourceOf(meta)`),
  `url_fiche` quand une fiche est concernée, `truncated` explicite si un texte est coupé.
- Le SQL vit dans `queries.ts` uniquement, paramétré (`?`), jamais de concaténation de valeurs utilisateur.
- Numéros : toujours via `parseNumero` + `resolveNumero` (formes `RNCP35419`, `35419`, `rncp 35419`, `RS5000`, URL).
- Pas d'accès runtime (fs, fetch, D1) ici : le core ne connaît que l'interface `Db` (`all`, `get`).
- Tout changement d'outil → test dans `tests/tools.test.ts` (fixture, client MCP en mémoire) + cas dans `eval/cases.json`.
