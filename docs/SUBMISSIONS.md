# Soumissions aux annuaires MCP — textes prêts à coller

Statut au 18/08/2026 :
- ✅ **Registre officiel MCP** : `io.github.ALDEBERTArnaud/mcp-rncp` — publié automatiquement par `release-cli.yml`
  à chaque tag `cli-v*` (auth GitHub OIDC). Vérif : https://registry.modelcontextprotocol.io/v0.1/servers?search=mcp-rncp
- ✅ **npm** : https://www.npmjs.com/package/mcp-rncp
- ⏳ Les 4 annuaires ci-dessous exigent une connexion avec ton compte GitHub → 2 min chacun, textes ci-dessous.

## Textes communs

**Nom** : mcp-rncp

**Tagline (≤ 100 car.)** : French RNCP/RS certification registers: search, sheets, blocs, validity, SIRET habilitation.

**Description courte (FR)** : Serveur MCP gratuit et open source pour interroger le RNCP et le RS de France
compétences depuis Claude, ChatGPT ou Cursor : recherche de certifications, fiche complète, blocs de compétences EDOF,
validité et échéance, habilitation d'un SIRET. Sans clé API, réponses sourcées et datées.

**Description (EN)** : Free, open-source MCP server over France compétences open data (RNCP and RS registers of
French professional certifications). 9 read-only tools: full-text search with French synonyms, full certification
sheet, blocs de compétences (EDOF codes), validity/expiry check, SIRET habilitation check, partner listing,
comparison, recent changes, data status. No API key, every answer cites its source and data date. Hosted Streamable
HTTP endpoint or local `npx -y mcp-rncp`.

**Catégories / tags** : education, government, open-data, france, certification, training, hr, search
Tags : `mcp` `rncp` `rs` `france-competences` `certification` `formation` `cpf` `edof` `qualiopi` `open-data`

**Liens**
- Site : https://mcp-rncp.com — Docs : https://mcp-rncp.com/docs
- Repo : https://github.com/ALDEBERTArnaud/mcp-rncp (MIT)
- npm : https://www.npmjs.com/package/mcp-rncp
- Endpoint hébergé (Streamable HTTP, sans auth) : https://mcp-rncp.com/mcp
- Logo : https://mcp-rncp.com/logo.svg
- Auteur : Arnaud Aldebert — https://arnaud-aldebert.dev

**Config locale (stdio)** :
```json
{ "mcpServers": { "rncp": { "command": "npx", "args": ["-y", "mcp-rncp"] } } }
```
**Config hébergée** :
```json
{ "mcpServers": { "rncp": { "url": "https://mcp-rncp.com/mcp" } } }
```

## 1. Smithery — https://smithery.ai/new
- Se connecter avec GitHub → « Add server » → repo `ALDEBERTArnaud/mcp-rncp`.
- Type : **Remote (HTTP)** → URL `https://mcp-rncp.com/mcp`, no auth. Ajouter aussi le paquet npm `mcp-rncp` si proposé.
- Coller tagline + description EN + tags.

## 2. Glama — https://glama.ai/mcp/servers
- « Add server » (login GitHub) → URL du repo. Le fichier `glama.json` à la racine te déclare mainteneur.
- Une fois indexé : « Claim » sur la page du serveur pour éditer description/tags.

## 3. mcp.so — https://mcp.so/submit
- Formulaire : nom, URL GitHub, description EN, catégorie « Data & Search » ou « Government/Open data », tags.
- Server config : coller la config locale ci-dessus.

## 4. PulseMCP — https://www.pulsemcp.com/submit
- Soumissions rouvertes mi-août 2026 (bannière). Formulaire : nom, GitHub, site, description EN, catégorie.

## 5. Bonus (5 min chacun, gratuits, bons backlinks)
- Awesome MCP Servers (PR) : https://github.com/punkpeye/awesome-mcp-servers — section « Search & Data Extraction »
  ou « Government/Legal » : `- [ALDEBERTArnaud/mcp-rncp](https://github.com/ALDEBERTArnaud/mcp-rncp) 📇 ☁️ 🏠 🇫🇷 - French RNCP/RS registers of professional certifications: search, sheets, blocs, validity, SIRET habilitation.`
- Cursor directory : https://cursor.directory/mcp (soumission GitHub).
- data.gouv.fr → page du jeu de données RNCP/RS → « Réutilisations » → ajouter mcp-rncp (URL du site, description FR).
  Backlink institutionnel + visibilité auprès des réutilisateurs open data.
