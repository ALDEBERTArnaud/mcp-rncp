# mcp-rncp

**Le RNCP et le RS dans Claude, ChatGPT, Cursor : recherche, fiches, blocs de compétences, validité, habilitations.**

Serveur [MCP](https://modelcontextprotocol.io) en lecture seule sur les répertoires nationaux des certifications
professionnelles (données ouvertes France compétences). Zéro clé API, zéro appel LLM côté serveur, réponses sourcées
et datées.

🇬🇧 [English README](README.en.md) · 📦 [`npx -y mcp-rncp`](https://www.npmjs.com/package/mcp-rncp) ·
🌐 `https://mcp-rncp.com/mcp` · 📄 [Licence des données](docs/LICENCE-DONNEES.md)

---

## Le problème

- Un organisme de formation vend une formation « certifiante » : la fiche RNCP est-elle **encore active** ?
  Son SIRET est-il **habilité** à former et/ou à évaluer ? Quels **blocs de compétences** cocher dans EDOF ?
  Depuis le 11/06/2026 les blocs doivent être renseignés ; au 22/10/2026 les offres non renseignées disparaissent de
  Mon Compte Formation.
- Un RH, un OPCO, un candidat veut savoir quelles certifications de niveau 6 en cybersécurité existent, laquelle
  expire quand, laquelle remplace laquelle.
- Les réponses sont dans un XML de 570 Mo mis à jour chaque nuit. Ce serveur le rend interrogeable en langage naturel.

## Trois prompts pour commencer

> « Le RNCP 35419 est-il encore actif ? Sinon, quelle fiche le remplace ? »

> « Le SIRET 88055223700047 est-il habilité sur le RNCP 37674, et pour quel rôle ? Liste-moi les blocs à déclarer dans EDOF. »

> « Trouve les certifications actives de niveau 6 en cybersécurité et compare les deux premières. »

## Installation

### Claude Desktop (local, `npx`)

Node ≥ 22.16 requis (`node:sqlite` avec FTS5). Fichier `claude_desktop_config.json` :

```json
{
  "mcpServers": {
    "rncp": { "command": "npx", "args": ["-y", "mcp-rncp"] }
  }
}
```

Premier lancement : téléchargement de la base (~90 Mo) dans `~/.cache/mcp-rncp` (Windows : `%LOCALAPPDATA%\mcp-rncp`),
vérification SHA-256, puis mise à jour hebdomadaire silencieuse.

### Claude.ai / Claude Code / Cursor (hébergé, Streamable HTTP)

URL du connecteur : `https://mcp-rncp.com/mcp` — sans authentification, 60 requêtes/min par IP.

```bash
claude mcp add --transport http rncp https://mcp-rncp.com/mcp
```

Cursor (`.cursor/mcp.json`) :

```json
{ "mcpServers": { "rncp": { "url": "https://mcp-rncp.com/mcp" } } }
```

## Outils

| Outil | Question | Ce qu'il renvoie |
|---|---|---|
| `search_certifications` | « développeur web niveau 5 » | recherche plein texte (BM25 + synonymes FR), filtres répertoire / niveau / NSF / ROME, actives par défaut |
| `get_certification` | « fiche RNCP 37674 » | fiche complète : certificateurs, activités, compétences, codes, voies d'accès, textes, remplacements, statistiques |
| `list_blocs` | « blocs du RNCP 37674 » | blocs `RNCPxxxxxBCyy` dans l'ordre, compétences, modalités d'évaluation — prêt pour EDOF |
| `check_validity` | « le RNCP 35419 est-il actif ? » | statut, échéance, jours restants, date limite de délivrance, remplaçante, éligibilité CPF estimée, avertissement |
| `check_habilitation` | « SIRET 8805… habilité sur 37674 ? » | habilité oui/non, rôles `former` / `evaluer`, certificateur, état et dates de l'habilitation |
| `list_partenaires` | « qui est habilité sur 37674 ? » | partenaires paginés, filtre SIRET/SIREN |
| `compare_certifications` | « compare 36490 et 37873 » | niveaux, certificateurs, NSF/ROME communs, recouvrement lexical des blocs, blocs les plus proches |
| `changes_since` | « quoi de neuf depuis le 1er juillet en NSF 326 ? » | fiches créées / modifiées / désactivées / réactivées / retirées |
| `get_data_status` | « de quand datent les données ? » | date de l'export, âge, compteurs |

Numéros acceptés sous toutes les formes : `RNCP35419`, `35419`, `rncp 35419`, `RS5000`, URL francecompetences.fr.
Chaque réponse contient `summary`, `source`, `data_updated_at`, `url_fiche` et un indicateur `truncated` explicite.

Resources : `rncp://glossaire`, `rncp://about`. Prompts : `rediger_offre_edof`, `verifier_certification`.

## Données, source, licence

- Source : **France compétences**, jeu data.gouv.fr « RNCP et RS », flux XML V4.1, licence **Ouverte 2.0**.
  Mention obligatoire reprise dans chaque réponse : « Source : France compétences (data.gouv.fr), export du AAAA-MM-JJ ».
- Couverture : ~30 500 fiches (dont ~7 000 actives), ~56 000 blocs, ~400 000 lignes d'habilitation. Détail du mapping
  balise → colonne dans [docs/DATA-MAPPING.md](docs/DATA-MAPPING.md).
- Fraîcheur : ingestion hebdomadaire (lundi 05:00 UTC, relançable), publiée en Release GitHub `data-AAAA-MM-JJ`
  et chargée dans Cloudflare D1 sans interruption (deux bases blue/green).

## Limites

- Pas de temps réel : les données ont l'âge indiqué par `get_data_status` (au plus 7 jours en régime normal).
- `eligible_cpf_estime` est une **estimation** (fiche active) ; l'éligibilité réelle dépend aussi de l'habilitation et du
  référencement EDOF de l'organisme.
- Recherche plein texte, pas sémantique : préférez les termes de l'intitulé officiel (les sigles courants sont gérés).
- Non inclus en v1 : NPEC (prise en charge apprentissage), composition des jurys, référentiels PDF.
- Le service hébergé est gratuit et limité à 60 req/min/IP ; pour un usage intensif, utilisez `npx mcp-rncp` en local.

## Architecture

```
packages/core       outils MCP + requêtes SQL (agnostique du runtime)
packages/ingest     data.gouv → SAX → SQLite/FTS5 → rncp.sqlite(.br) + rncp.sql (D1) + manifest.json
packages/db-sqlite  adaptateur node:sqlite (CLI)      packages/db-d1  adaptateur Cloudflare D1 (blue/green)
apps/cli            npm `mcp-rncp` (stdio)            apps/worker     Cloudflare Worker (Hono, /mcp, /health)
eval/               46 cas réels : recall@5 ≥ 0,8 (mesuré : 96 % sur la base complète), validité/habilitation exactes
```

Développement : `bun install`, `bun run test`, `bun run eval`, `bun run ingest` (≈ 1 min), `bun run dev:worker`.

## Roadmap

- v1.1 : NPEC par IDCC, `changes_since` enrichi (diff de blocs), embeddings locaux si les évals le justifient.
- v2 (Pro) : vérification de catalogue en masse (N numéros × 1 SIRET), alertes d'expiration / retrait d'habilitation,
  export EDOF, veille par domaine NSF/ROME, clés API.

Contributions et retours : [issues](https://github.com/ALDEBERTArnaud/mcp-rncp/issues). Code MIT — Arnaud Aldebert.
