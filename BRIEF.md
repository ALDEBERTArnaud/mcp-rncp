# BRIEF — `mcp-rncp` : serveur MCP du Répertoire national des certifications professionnelles

> Document de passation pour l'agent qui va créer le repo. Autonome : tout le contexte est ici.
> Version 2 — 14 août 2026. Auteur du projet : Arnaud Aldebert (dev fullstack, Nîmes,
> `arnaudtishu@gmail.com`, GitHub `ALDEBERTArnaud`).

---

## 0. TL;DR

Serveur **MCP** (Model Context Protocol) exposant le **RNCP + RS** (certifications professionnelles
françaises, données ouvertes de France compétences) sous forme d'outils métier pour Claude / ChatGPT /
Cursor / tout client MCP.

- Deux modes, **un seul code d'outils** : `npx mcp-rncp` (stdio, local, SQLite embarqué) et hébergé
  Streamable HTTP sur **Cloudflare Workers + D1**.
- Aucun appel LLM côté serveur, aucune clé API à fournir, coût d'exploitation ≈ 0.
- V1 = gratuit, lecture seule, publié partout. V2 = plan Pro (fonctions métier) derrière auth.
- Concurrence vérifiée le 14/08/2026 : **aucun serveur MCP RNCP** sur registre officiel, Smithery, Glama,
  mcp.so, PulseMCP, GitHub. Refaire une vérif manuelle de 10 min avant de coder.

Décisions arrêtées avec Arnaud (ne pas rediscuter) :
- **Cloudflare** (compte existant) : Workers + D1 + KV + Rate Limiting. Pas d'autre hébergeur.
- **Bun** pour le dev, les workspaces, les tests, l'ingestion. **Node ≥ 20** comme cible du CLI publié
  sur npm (les utilisateurs ont Node, pas Bun). Aucune API Bun-only dans le code publié.
- Hébergé **gratuit en lecture** dès la v1. Le payant = fonctions métier v2, jamais l'accès aux données.
- SQLite/FTS5 partout. Pas de Postgres, pas d'embeddings en v1.

---

## 1. Contexte et objectifs

### Pourquoi ce projet
- Arnaud passe freelance « dev fullstack IA » (RAG, workflows LLM, MCP, LLMOps). Ce repo est une
  **vitrine de crédibilité** d'abord, un produit monétisable ensuite. Priorité : exécution propre.
- Il a un produit en prod, KeepForLater (`C:\Git\keepforlater`) : Hono, `@hono/mcp`, Workers, Zod, Bun.
  Réutiliser les **patterns** (descriptions d'outils, source dans chaque réponse, évals CI), pas l'infra
  lourde (Postgres/pgvector inutiles ici).

### Objectifs
1. Week-end 1 : ingestion + D1 + 8 outils + CLI stdio + hébergé sur un sous-domaine.
2. Week-end 2 : évals CI, README FR/EN + GIF, publication npm + 5 index, post de lancement.
3. Semaines 3-6 : selon retours, v2 Pro (auth, alertes, batch, export EDOF).

### Accroche temporelle (argument n° 1)
- Depuis le **11 juin 2026**, les organismes de formation (OF) doivent renseigner dans EDOF (Mon Compte
  Formation) les **blocs de compétences** visés par chaque offre RNCP.
- Au **22 octobre 2026**, les offres non renseignées deviennent **invisibles** sur Mon Compte Formation.
- Source : of.moncompteformation.gouv.fr — « Formations certifiantes RNCP : renseignez les blocs ».

---

## 2. Les données (vérifié)

- Jeu data.gouv : **« Répertoire national des certifications professionnelles et répertoire spécifique
  RNCP et RS »**, producteur France compétences.
  https://www.data.gouv.fr/datasets/repertoire-national-des-certifications-professionnelles-et-repertoire-specifique
- Licence : **Licence Ouverte / Open Licence 2.0** — réutilisation libre, **mention obligatoire**
  « Source : France compétences (data.gouv.fr) » + date de mise à jour.
- Format : **XML flux V4-1**, zip, mise à jour **hebdomadaire**. XSD + dictionnaire de données PDF dans le
  jeu. Plusieurs centaines de Mo → **parser en streaming (SAX)**.
- Volume : ~20 000 fiches, ~7 500 actives (≈ 2 900 diplômes d'État, 2 200 titres/CQP, 2 400 RS).
- Champs attendus par fiche (**à confirmer sur le XSD, ne pas deviner**) : numéro (`RNCPxxxxx`/`RSxxxx`),
  intitulé, abrégé, niveau (3→8), statut actif/inactif, date d'échéance d'enregistrement, certificateur(s),
  **partenaires habilités (SIRET + rôle former/évaluer)**, blocs de compétences (code `RNCPxxxxxBCyy`,
  intitulé, compétences, modalités d'évaluation), voies d'accès, codes NSF, codes ROME, textes
  réglementaires, activités visées, compétences attestées, secteurs, prérequis.
- Parseur de référence (mapping V4-1, SAX) : https://github.com/data-fair/processing-rncp-rs
- Bonus v1.1 : **NPEC** (niveaux de prise en charge apprentissage), zip sur francecompetences.fr →
  « Référentiels et bases de données ».
- Fiches officielles pour `source_url` : `https://www.francecompetences.fr/recherche/rncp/{num}/` — vérifier.

---

## 3. Personas et questions

| Persona | Question type | Outil |
|---|---|---|
| Organisme de formation (~100 k, Qualiopi/CPF) | « RNCP 35419 active ? Mon SIRET habilité ? Blocs à cocher dans EDOF ? » | `check_validity`, `check_habilitation`, `list_blocs` |
| OF, rédaction d'offre | « Rédige les objectifs pédagogiques depuis les compétences attestées » | `get_certification` + prompt |
| RH / L&D | « Certifs niveau 6 cybersécurité ? Prise en charge ? » | `search_certifications`, `get_npec` |
| OPCO, CFA, financeurs | « Complète ou partielle ? Coût pris en charge ? » | `list_blocs`, `get_npec` |
| Écoles / certificateurs | « Compare ma fiche au concurrent » | `compare_certifications` |
| Candidats / CEP | « Reconnu par l'État ? Expire quand ? » | `get_certification`, `check_validity` |
| Éditeurs edtech / SIRH | Intégration | hébergé + (v2) clés API |

---

## 4. Périmètre V1 (gratuit) vs V2 (Pro payant)

### V1 — gratuit, lecture seule, sans compte
- Tous les outils de lecture (§7) : recherche, fiche, blocs, validité, habilitation unitaire,
  partenaires, comparaison, changements récents, statut des données.
- Resources (glossaire, about) et prompts (rédiger offre EDOF, vérifier une certif).
- Local `npx` **et** hébergé, mêmes outils, mêmes données.
- Rate limit par IP sur l'hébergé (protège la facture ; les données restent publiques).
- Pas d'auth, pas de compte, pas de billing, pas de télémétrie nominative.

### V2 — Pro (auth + paiement), fonctions métier
- **Vérification de catalogue en masse** : N numéros × 1 SIRET → validité + habilitation + blocs, en un appel.
- **Alertes** (email hebdo ou webhook) : fiche qui expire à 90/30 j, habilitation retirée, blocs
  modifiés, nouvelle fiche dans un domaine NSF/ROME suivi.
- **Export EDOF** : blocs formatés pour l'import XML / le formulaire EDOF d'une offre.
- **Veille par domaine** : `changes_since` filtré + digest.
- Quotas plus hauts, clés API multi-utilisateurs, `/health` avec SLA, support email.
- Tarifs cibles : Pro OF/CFA 19-39 €/mois ; Entreprise/éditeur 99-299 €/mois. Stripe (déjà maîtrisé
  sur KFL). Auth : clés API stockées en KV (simple) ou Better Auth si comptes nécessaires.
- Hors périmètre définitif : scraping de sites, génération LLM côté serveur, écriture dans les
  référentiels.

---

## 5. Architecture

```
mcp-rncp/                              (Bun workspaces)
├── packages/
│   ├── core/          # outils MCP + schémas Zod + interface Db + requêtes SQL (agnostique runtime)
│   ├── db-sqlite/     # impl Db sur better-sqlite3 (CLI local)
│   ├── db-d1/         # impl Db sur binding D1 (Worker)
│   └── ingest/        # download zip → parse SAX → build rncp.sqlite + rncp.sql (script Bun)
├── apps/
│   ├── worker/        # Cloudflare Worker : Hono + @hono/mcp, /mcp, /health, rate limit, cache
│   └── cli/           # package npm `mcp-rncp` (Node ≥ 20) : stdio, télécharge rncp.sqlite (Release)
├── eval/              # cases.json + runner (recall@5, exactitude)
├── fixtures/          # extrait XML 20 fiches + rncp.fixture.sqlite pour les tests
├── docs/              # README.fr.md, README.en.md, LICENCE-DONNEES.md, CHANGELOG.md
└── .github/workflows/ # ci.yml, ingest.yml (hebdo), release-cli.yml, deploy-worker.yml
```

### Flux de données
1. **GitHub Actions `ingest.yml`** (cron lundi 05:00 UTC + manuel) : télécharge le dernier export V4-1
   via l'API data.gouv, parse SAX, écrit `rncp.sqlite` (FTS5 inclus) et `rncp.sql` (dump).
2. Publie `rncp.sqlite` (+ `manifest.json` : date source, checksums, compteurs) en **GitHub Release**
   taguée `data-YYYY-MM-DD` → consommée par le CLI.
3. Charge D1 : `wrangler d1 execute rncp --remote --file=rncp.sql` par lots (ou import D1 par l'API si
   le dump dépasse les limites de taille — tester au démarrage). Stratégie **table de staging + swap**
   (`rncp_next` → `rncp`) pour ne jamais servir une base à moitié chargée.
4. Le Worker lit D1, met en cache les réponses chaudes (Cache API, 1 h), sert `/mcp`.
5. Le CLI télécharge `rncp.sqlite` au premier lancement dans `~/.cache/mcp-rncp/`, vérifie le checksum,
   se met à jour si une Release plus récente existe (check quotidien, silencieux).

### Pourquoi ces choix
- **D1** = SQLite managé avec FTS5, 10 Go, 5 M lectures/jour gratuites, même compte que KFL.
- **Ingestion hors du Worker** : pas de limite CPU, gratuit, versionné, rejouable.
- **Une interface `Db`, deux implémentations** : le module d'outils ne connaît pas le runtime.
- **Pas d'embeddings** : FTS5 + BM25 + synonymes suffit pour un référentiel d'intitulés ; réévalué
  par les évals. Si < 0,8 recall@5 → v1.1 : `sqlite-vec` + modèle local à l'ingestion (toujours 0 clé).

---

## 6. Schéma SQLite / D1 (à ajuster sur le XSD)

```
certifications(numero PK, repertoire, intitule, abrege, niveau, statut, date_fin_enregistrement,
  date_publication, date_effet, type_certification, activites_visees, competences_attestees,
  secteurs, prerequis, voies_acces_json, codes_nsf_json, codes_rome_json, textes_json, url_fiche,
  source_updated_at, content_hash)
certificateurs(id PK, numero FK, nom, siret, role)
partenaires(id PK, numero FK, nom, siret, habilitation, date_actif, date_last_commit)
blocs(code PK, numero FK, ordre, intitule, competences, modalites_evaluation)
npec(numero, idcc, montant, date_debut, date_fin)                       -- v1.1
changes(id PK, run_date, numero, change_type, diff_json)
meta(key PK, value)                                                    -- source_date, run_id, counts
certifications_fts (FTS5, tokenize='unicode61 remove_diacritics 2', content=certifications)
  colonnes : numero, intitule, abrege, competences_attestees, activites_visees
```
Index : `partenaires(siret)`, `certifications(statut, niveau)`, `certifications(date_fin_enregistrement)`,
`blocs(numero)`. Table `synonymes(terme, expansion)` pour sigles courants (RH→ressources humaines, dev→
développeur…), appliquée à la requête FTS.

---

## 7. Outils MCP — spécification (V1)

Règles : snake_case ; descriptions en anglais + 1 exemple de prompt FR ; entrées Zod strictes ; sortie
JSON structurée + `summary` court ; **toujours** `source`, `source_url`, `data_updated_at` ;
`readOnlyHint: true` ; troncature explicite (`truncated: true`).

| Outil | Entrées | Sortie |
|---|---|---|
| `search_certifications` | `query`, `repertoire?`, `niveau?` (3-8), `nsf?`, `rome?`, `actives_only`=true, `limit`≤20 | liste {numero, intitule, niveau, statut, date_fin, certificateur, score} — FTS5 bm25 + synonymes |
| `get_certification` | `numero` (accepte `35419`, `RNCP35419`, `rncp 35419`) | fiche complète structurée |
| `list_blocs` | `numero` | blocs {code, ordre, intitule, competences, modalites_evaluation}, format prêt EDOF |
| `check_validity` | `numero` | {statut, date_fin, jours_restants, eligible_cpf_estime, avertissement} |
| `check_habilitation` | `numero`, `siret` | {habilite, roles[], partenaire, date_actif} |
| `list_partenaires` | `numero`, `limit`, `siret_prefix?` | partenaires habilités |
| `compare_certifications` | `numero_a`, `numero_b` | niveaux, certificateurs, recouvrement des blocs (Jaccard sur termes) |
| `changes_since` | `since`, `type?`, `nsf?` | changements récents |
| `get_data_status` | — | date source, run, compteurs, âge des données |
| `get_npec` (v1.1) | `numero`, `idcc?` | montants NPEC |

Resources : `rncp://glossaire`, `rncp://about` (source, licence, fraîcheur, limites).
Prompts : `rediger_offre_edof(numero, public, duree)`, `verifier_certification(numero, siret?)`.

V2 (Pro, mêmes conventions) : `check_catalogue(items[{numero,siret}])`, `create_alert`, `list_alerts`,
`export_edof_blocs(numero, format)`, `watch_domain(nsf|rome)`.

---

## 8. Sécurité, qualité, observabilité

- Lecture seule ; aucune donnée personnelle (SIRET publics) ; entrées validées Zod ; tailles bornées.
- Hébergé : **Rate Limiting binding** Cloudflare (60 req/min/IP), Cache API sur GET/POST idempotents,
  en-têtes sécurité de base, DNS rebinding protection en local (`@hono/mcp` / SDK).
- Secrets : aucun en v1 côté Worker (D1 = binding). Actions : `CLOUDFLARE_API_TOKEN` (scope D1 + Workers),
  `NPM_TOKEN`.
- Télémétrie minimale : log JSON par appel (outil, latence, ok, taille sortie, IP hashée) via
  Workers Logs ; `/health` (date source, âge, compteurs). Pas de PostHog/Sentry en v1.
- Tests Vitest sur `fixtures/rncp.fixture.sqlite` (aucun réseau) : parseur SAX, normalisation numéro,
  FTS+synonymes, jours restants, habilitation, troncature.
- **Évals CI** `eval/cases.json` (~30 questions réelles) → recall@5 ≥ 0,8, exactitude validité/habilitation
  = 100 % sur cas connus. `bun run eval` exit 1 si régression.
- CI : Biome, typecheck, tests, éval sur fixture ; deploy Worker sur `main` ; publish npm sur tag.

---

## 9. Infra, DNS, comptes — checklist

Cloudflare (compte existant d'Arnaud) :
- [ ] `wrangler d1 create rncp` (+ `rncp-staging`), binding `DB` dans `wrangler.jsonc`.
- [ ] Rate Limiting binding `RL`, Cache API (rien à créer), KV `META` optionnel (v2 : clés API).
- [ ] Sous-domaine : `mcp-rncp.arnaud-aldebert.dev` (zone déjà chez Cloudflare) via Custom Domain du
  Worker — ou domaine dédié `mcp-rncp.fr` si Arnaud le souhaite (à acheter, ~7 €/an, chez Cloudflare
  Registrar pour rester au même endroit). **Décision : sous-domaine en v1**, domaine dédié si traction.
- [ ] Environnements : `production` + `staging` (D1 séparées, route `staging-mcp-rncp.…`).
- [ ] Token API pour Actions (D1 edit + Workers deploy), stocké en secret GitHub.
- [ ] Alerte de dépense Cloudflare à 1 €/mois (dashboard → Billing → notifications).

GitHub :
- [ ] Repo public `ALDEBERTArnaud/mcp-rncp`, MIT, topics `mcp`, `mcp-server`, `rncp`, `france-competences`.
- [ ] Secrets : `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `NPM_TOKEN`.
- [ ] Workflows : `ci.yml`, `ingest.yml` (cron + dispatch), `deploy-worker.yml`, `release-cli.yml`.
- [ ] Releases `data-YYYY-MM-DD` (asset `rncp.sqlite` + `manifest.json`), Releases `cli-vX.Y.Z`.

npm :
- [ ] Nom `mcp-rncp` (vérifier dispo), `bin: mcp-rncp`, `engines.node >=20`, publish provenance.

Registres MCP :
- [ ] `server.json` (registre officiel, namespace `io.github.aldebertarnaud/mcp-rncp`), Smithery, Glama,
  mcp.so, PulseMCP — même description, même icône.

---

## 10. Plan de développement

### Jour 0 — vérifications (2 h)
1. Vérif manuelle « RNCP » sur les 5 index MCP.
2. Télécharger le zip, lire **XSD + dictionnaire** → figer le mapping (noms de balises exacts).
3. Mesurer taille XML, temps de parse local, taille du `.sqlite` et du dump → confirmer stratégie D1
   (execute par lots vs import API).
4. Confirmer format URL des fiches officielles, ID du dataset data.gouv, dispo du nom npm.

### Week-end 1 — cœur
5. Scaffold workspaces (Bun), Biome, tsconfig, Vitest.
6. `packages/ingest` : SAX → SQLite (schéma §6, FTS5, synonymes, meta). Fixture 20 fiches.
7. `packages/core` : interface `Db`, requêtes, 8 outils Zod, resources, prompts.
8. `packages/db-sqlite` + `apps/cli` : stdio, téléchargement Release + cache + checksum. Test dans
   Claude Desktop.
9. `packages/db-d1` + `apps/worker` : Hono + `@hono/mcp`, `/mcp`, `/health`, rate limit, cache. Deploy
   staging, puis prod sur le sous-domaine. Test dans Claude.ai connecteurs et Cursor.
10. `ingest.yml` : Release + chargement D1 staging→prod (staging + swap).

### Week-end 2 — qualité et lancement
11. `eval/cases.json` 30 cas + runner ; ajuster synonymes jusqu'à ≥ 0,8.
12. README FR/EN (problème → 3 prompts → install 3 clients → outils → source/licence → limites →
    roadmap), 2-3 GIF, `LICENCE-DONNEES.md`.
13. Publier npm, `server.json` registre officiel, Smithery, Glama, mcp.so, PulseMCP.
14. Requête SQL « chiffre inédit » (ex. fiches actives expirant avant fin 2026, par niveau) → post
    LinkedIn de lancement + 10 messages ciblés (groupes Qualiopi/EDOF, OF, OPCO).

### Semaines 3-6 — v1.1 puis v2 selon retours
15. v1.1 : NPEC, embeddings locaux si évals insuffisantes, `changes_since` enrichi.
16. v2 : clés API (KV) → Stripe Checkout → outils Pro (§4), alertes par Cron Worker + email
    (Cloudflare Email Service ou Resend), page pricing sur le README/site.

---

## 11. Définition de « terminé » (V1)
- [ ] `bun run ingest` reconstruit `rncp.sqlite` en < 15 min, idempotent, journalisé, publié en Release.
- [ ] D1 prod chargée par Actions, sans interruption de service (staging + swap).
- [ ] 8 outils + 2 resources + 2 prompts, sources dans chaque réponse, tests verts.
- [ ] Évals CI ≥ 0,8 recall@5 ; validité/habilitation exactes sur les cas connus.
- [ ] `npx -y mcp-rncp` OK dans Claude Desktop (Node 20/22, macOS/Windows/Linux).
- [ ] `https://mcp-rncp.arnaud-aldebert.dev/mcp` OK dans Claude.ai (connecteur) et Cursor.
- [ ] Rate limit actif, `/health` OK, alerte de dépense configurée.
- [ ] npm + registre officiel + Smithery + Glama publiés ; README FR/EN avec GIF.
- [ ] Post de lancement rédigé avec un chiffre issu des données.

---

## 12. Références
- Données : https://www.data.gouv.fr/datasets/repertoire-national-des-certifications-professionnelles-et-repertoire-specifique
- Référentiels/NPEC : https://www.francecompetences.fr/referentiels-et-bases-de-donnees/
- EDOF blocs (échéance 22/10/2026) : https://of.moncompteformation.gouv.fr/espace-public/formations-certifiantes-rncp-renseignez-les-blocs-de-competences
- Parseur de référence : https://github.com/data-fair/processing-rncp-rs
- Hono MCP : https://www.npmjs.com/package/@hono/mcp — SDK Hono officiel : https://ts.sdk.modelcontextprotocol.io/v2/serving/hono.html
- Cloudflare D1 (FTS5, import, limites) : https://developers.cloudflare.com/d1/ — Rate Limiting :
  https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Registre officiel MCP : https://registry.modelcontextprotocol.io
- Patterns à copier dans KeepForLater (`C:\Git\keepforlater`) : `apps/api/src/routes/mcp.ts` (serveur MCP
  Hono, descriptions d'outils), `apps/api/tests/ai/prompt-registry.test.ts` (style de tests), README et
  `docs/LLMOPS.md` (ton et rigueur).
