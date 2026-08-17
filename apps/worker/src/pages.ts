// Static site: landing (/) and documentation (/docs). Server-rendered HTML, no JS, SEO/GEO structured data.
import { SERVER_VERSION } from "@mcp-rncp/core";

export const SITE = {
  url: "https://mcp-rncp.com",
  name: "mcp-rncp",
  author: {
    name: "Arnaud Aldebert",
    url: "https://arnaud-aldebert.dev",
    github: "https://github.com/ALDEBERTArnaud",
    linkedin: "https://www.linkedin.com/in/arnaud-aldebert",
    jobTitle: "Développeur fullstack & systèmes IA (RAG, agents, MCP)",
    location: "Nîmes, France",
  },
  repo: "https://github.com/ALDEBERTArnaud/mcp-rncp",
  npm: "https://www.npmjs.com/package/mcp-rncp",
  dataset:
    "https://www.data.gouv.fr/datasets/repertoire-national-des-certifications-professionnelles-et-repertoire-specifique",
};

export type Stats = {
  source_date?: string;
  count_total?: string;
  count_actives?: string;
  count_rncp?: string;
  count_rs?: string;
  count_blocs?: string;
  count_partenaires?: string;
};

const fmt = (n?: string) => (n ? Number(n).toLocaleString("fr-FR") : "—");
const frDate = (iso?: string) =>
  iso
    ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

const CSS = `
:root{--bg:#0b0d10;--fg:#e8eaed;--muted:#9aa3ad;--card:#14181d;--line:#232a32;--acc:#7cc4ff;--acc2:#a3e635;--code:#0f1318}
@media(prefers-color-scheme:light){:root{--bg:#fff;--fg:#14181d;--muted:#5b6672;--card:#f5f7f9;--line:#e3e8ee;--acc:#0b63c9;--acc2:#3f7f00;--code:#f0f3f6}}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
a{color:var(--acc)}a:hover{text-decoration:underline}
header,main,footer{max-width:960px;margin:0 auto;padding:0 20px}
header{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid var(--line)}
header nav a{margin-left:18px;color:var(--fg);text-decoration:none;font-weight:500}
.brand{font-weight:700;text-decoration:none;color:var(--fg)}
h1{font-size:2.1rem;line-height:1.2;margin:40px 0 12px}h2{font-size:1.45rem;margin:44px 0 12px;padding-top:8px}
h3{font-size:1.1rem;margin:24px 0 8px}
.lead{font-size:1.15rem;color:var(--muted);max-width:760px}
.cta{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0}
.btn{display:inline-block;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;border:1px solid var(--line)}
.btn.primary{background:var(--acc);color:#fff;border-color:var(--acc)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:22px 0}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px}
.stat b{display:block;font-size:1.6rem}
.stat span{color:var(--muted);font-size:.9rem}
pre{background:var(--code);border:1px solid var(--line);border-radius:8px;padding:12px 14px;overflow-x:auto;font-size:.9rem}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.92em}
p code,li code,td code{background:var(--code);padding:1px 5px;border-radius:4px}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:.95rem}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-weight:600}
blockquote{margin:10px 0;padding:10px 14px;border-left:3px solid var(--acc2);background:var(--card);border-radius:0 8px 8px 0}
.muted{color:var(--muted)}
footer{border-top:1px solid var(--line);margin-top:56px;padding:24px 20px;color:var(--muted);font-size:.9rem}
details{margin:8px 0;padding:8px 12px;background:var(--card);border:1px solid var(--line);border-radius:8px}
summary{cursor:pointer;font-weight:600}
.toc a{margin-right:14px}
`;

function layout(o: {
  title: string;
  description: string;
  path: string;
  body: string;
  jsonld: unknown[];
  stats: Stats;
}): string {
  const url = `${SITE.url}${o.path}`;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${url}">
<meta name="author" content="${SITE.author.name}">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:site_name" content="mcp-rncp">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(o.title)}">
<meta name="twitter:description" content="${esc(o.description)}">
<link rel="alternate" type="text/plain" href="${SITE.url}/llms.txt" title="llms.txt">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0b63c9"/><text x="32" y="43" font-size="30" font-family="system-ui" font-weight="700" fill="#fff" text-anchor="middle">R</text></svg>')}">
<style>${CSS}</style>
${o.jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
</head>
<body>
<header>
  <a class="brand" href="/">mcp-rncp</a>
  <nav><a href="/docs">Documentation</a><a href="${SITE.repo}" rel="noopener">GitHub</a><a href="${SITE.author.url}" rel="author noopener">Arnaud Aldebert</a></nav>
</header>
<main>
${o.body}
</main>
<footer>
  <p><strong>mcp-rncp</strong> ${SERVER_VERSION} — serveur MCP open source (MIT) créé et maintenu par
  <a href="${SITE.author.url}" rel="author">Arnaud Aldebert</a>, développeur fullstack &amp; systèmes IA à Nîmes ·
  <a href="${SITE.author.github}" rel="noopener">GitHub</a> · <a href="${SITE.author.linkedin}" rel="noopener">LinkedIn</a>.</p>
  <p>Données : France compétences via <a href="${SITE.dataset}" rel="noopener">data.gouv.fr</a>, Licence Ouverte 2.0,
  export du ${frDate(o.stats.source_date)}. Ce site n'est pas affilié à France compétences ni à l'État ; seules les fiches
  publiées sur francecompetences.fr font foi.</p>
  <p><a href="/docs">Documentation</a> · <a href="/health">Statut</a> · <a href="/llms.txt">llms.txt</a> · <a href="/sitemap.xml">Plan du site</a></p>
</footer>
</body>
</html>`;
}

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const personLd = {
  "@type": "Person",
  "@id": `${SITE.author.url}/#person`,
  name: SITE.author.name,
  url: SITE.author.url,
  jobTitle: SITE.author.jobTitle,
  address: { "@type": "PostalAddress", addressLocality: "Nîmes", addressCountry: "FR" },
  sameAs: [SITE.author.github, SITE.author.linkedin],
};

function softwareLd(stats: Stats) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE.url}/#software`,
    name: "mcp-rncp",
    alternateName: "Serveur MCP RNCP / RS",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Model Context Protocol server",
    operatingSystem: "Any (hosted) · Node.js ≥ 22.16 (local)",
    softwareVersion: SERVER_VERSION,
    url: SITE.url,
    downloadUrl: SITE.npm,
    installUrl: SITE.npm,
    codeRepository: SITE.repo,
    license: "https://opensource.org/licenses/MIT",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    description:
      "Serveur MCP (Model Context Protocol) qui donne accès au RNCP et au RS de France compétences depuis Claude, ChatGPT ou Cursor : recherche de certifications, fiches, blocs de compétences, validité, habilitations SIRET.",
    featureList: [
      "Recherche plein texte des certifications RNCP et RS",
      "Fiche complète d'une certification",
      "Blocs de compétences (codes EDOF)",
      "Vérification de validité et d'échéance",
      "Vérification d'habilitation d'un SIRET",
      "Comparaison de certifications",
      "Changements récents",
    ],
    author: personLd,
    creator: personLd,
    dateModified: stats.source_date,
    inLanguage: "fr",
  };
}

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE.url}/#website`,
  url: SITE.url,
  name: "mcp-rncp — le RNCP et le RS dans vos assistants IA",
  inLanguage: "fr",
  publisher: personLd,
};

const FAQ: Array<[string, string]> = [
  [
    "Qu'est-ce que mcp-rncp ?",
    "Un serveur MCP (Model Context Protocol) open source qui expose le Répertoire national des certifications professionnelles (RNCP) et le Répertoire spécifique (RS) de France compétences sous forme d'outils utilisables par Claude, ChatGPT, Cursor ou tout client MCP. Il répond à des questions comme « le RNCP 35419 est-il actif ? » ou « mon SIRET est-il habilité ? » directement dans la conversation.",
  ],
  [
    "Est-ce gratuit ?",
    "Oui. La version hébergée (https://mcp-rncp.com/mcp) est gratuite, sans compte ni clé API, limitée à 60 requêtes par minute et par adresse IP. La version locale s'installe avec « npx -y mcp-rncp » et fonctionne hors ligne après le premier téléchargement des données. Le code est sous licence MIT.",
  ],
  [
    "D'où viennent les données et sont-elles à jour ?",
    "Du jeu de données ouvert « RNCP et RS » publié par France compétences sur data.gouv.fr (Licence Ouverte 2.0). Les données sont réimportées chaque semaine ; chaque réponse indique la date de l'export utilisé et l'URL de la fiche officielle sur francecompetences.fr.",
  ],
  [
    "Comment vérifier qu'un organisme est habilité sur une certification ?",
    "Demandez par exemple « Le SIRET 88055223700047 est-il habilité sur le RNCP 37674 ? ». L'outil check_habilitation renvoie si l'organisme est habilité, pour quel rôle (former, organiser l'évaluation ou les deux), l'état de l'habilitation et ses dates, et signale si le SIRET est le certificateur lui-même.",
  ],
  [
    "Comment obtenir les blocs de compétences à déclarer dans EDOF ?",
    "Demandez « Liste les blocs de compétences du RNCP 37674 ». L'outil list_blocs renvoie les codes RNCPxxxxxBCyy dans l'ordre officiel, l'intitulé, les compétences et les modalités d'évaluation de chaque bloc. Depuis le 11 juin 2026 les organismes doivent renseigner ces blocs dans EDOF ; à partir du 22 octobre 2026 les offres non renseignées deviennent invisibles sur Mon Compte Formation.",
  ],
  [
    "Une certification active est-elle éligible au CPF ?",
    "En principe oui : une certification enregistrée et active au RNCP ou au RS est éligible au CPF. L'outil check_validity renvoie une éligibilité estimée ; l'éligibilité effective dépend aussi de l'habilitation et du référencement EDOF de l'organisme de formation.",
  ],
  [
    "Qui a créé mcp-rncp ?",
    "Arnaud Aldebert, développeur fullstack et systèmes IA (RAG, agents, MCP) basé à Nîmes. Le projet est une vitrine de son travail sur les intégrations MCP en production ; portfolio : https://arnaud-aldebert.dev.",
  ],
];

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(([q, a]) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

const faqHtml = FAQ.map(
  ([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`,
).join("\n");

const CONNECT = `<pre><code>{ "mcpServers": { "rncp": { "url": "https://mcp-rncp.com/mcp" } } }</code></pre>`;

export function landingHtml(stats: Stats): string {
  const body = `
<h1>Le RNCP et le RS dans Claude, ChatGPT et Cursor</h1>
<p class="lead"><strong>mcp-rncp</strong> est un serveur MCP gratuit et open source qui met les certifications
professionnelles de France compétences (RNCP, RS) à portée de votre assistant IA : recherche, fiche complète, blocs de
compétences EDOF, validité et échéance, habilitation d'un SIRET. Sans clé API, réponses sourcées et datées.</p>
<div class="cta">
  <a class="btn primary" href="/docs#installation">Installer en 1 minute</a>
  <a class="btn" href="/docs">Documentation</a>
  <a class="btn" href="${SITE.repo}" rel="noopener">Code source (MIT)</a>
</div>
<div class="grid">
  <div class="card stat"><b>${fmt(stats.count_total)}</b><span>fiches RNCP + RS indexées</span></div>
  <div class="card stat"><b>${fmt(stats.count_actives)}</b><span>certifications actives</span></div>
  <div class="card stat"><b>${fmt(stats.count_blocs)}</b><span>blocs de compétences</span></div>
  <div class="card stat"><b>${fmt(stats.count_partenaires)}</b><span>lignes d'habilitation (SIRET)</span></div>
</div>
<p class="muted">Données France compétences (data.gouv.fr), export du ${frDate(stats.source_date)}, mises à jour chaque semaine.</p>

<h2 id="pourquoi">Pourquoi</h2>
<p>Un organisme de formation, un OPCO, un service RH ou un candidat se pose toujours les mêmes questions :
la fiche est-elle <strong>encore active</strong> ? jusqu'à quand ? qui est <strong>habilité</strong> à former ou à évaluer ?
quels <strong>blocs de compétences</strong> déclarer dans EDOF ? quelle fiche remplace l'ancienne ?
Les réponses sont dans un XML de 570 Mo publié chaque nuit sur data.gouv.fr. mcp-rncp le rend interrogeable en français,
en langage naturel, depuis l'outil que vous utilisez déjà.</p>
<blockquote>Depuis le 11 juin 2026, les blocs de compétences visés par chaque offre RNCP doivent être renseignés dans EDOF.
Au 22 octobre 2026, les offres non renseignées deviennent invisibles sur Mon Compte Formation.</blockquote>

<h2 id="exemples">Trois questions pour essayer</h2>
<blockquote>« Le RNCP 35419 est-il encore actif ? Sinon, quelle fiche le remplace ? »</blockquote>
<blockquote>« Le SIRET 88055223700047 est-il habilité sur le RNCP 37674, et pour quel rôle ? Liste-moi les blocs à déclarer dans EDOF. »</blockquote>
<blockquote>« Trouve les certifications actives de niveau 6 en cybersécurité et compare les deux premières. »</blockquote>

<h2 id="connexion">Se connecter</h2>
<div class="grid">
  <div class="card"><h3>Claude.ai / Claude mobile</h3><p>Paramètres → Connecteurs → Ajouter un connecteur personnalisé →
  URL <code>https://mcp-rncp.com/mcp</code>, sans authentification.</p></div>
  <div class="card"><h3>Claude Code</h3><pre><code>claude mcp add --transport http rncp https://mcp-rncp.com/mcp</code></pre></div>
  <div class="card"><h3>Cursor, ChatGPT, autres clients MCP</h3>${CONNECT}</div>
  <div class="card"><h3>En local (Claude Desktop, hors ligne)</h3><pre><code>npx -y mcp-rncp</code></pre><p class="muted">Node.js ≥ 22.16, base téléchargée au premier lancement (~90 Mo).</p></div>
</div>

<h2 id="outils">Neuf outils</h2>
<table>
<tr><th>Outil</th><th>Ce qu'il fait</th></tr>
<tr><td><code>search_certifications</code></td><td>Recherche plein texte (BM25 + synonymes français) avec filtres répertoire, niveau 3-8, code NSF, code ROME.</td></tr>
<tr><td><code>get_certification</code></td><td>Fiche complète : certificateurs, activités visées, compétences attestées, codes, voies d'accès, textes, remplacements, statistiques.</td></tr>
<tr><td><code>list_blocs</code></td><td>Blocs de compétences dans l'ordre officiel avec codes <code>RNCPxxxxxBCyy</code>, prêts pour EDOF.</td></tr>
<tr><td><code>check_validity</code></td><td>Statut actif/inactif, échéance, jours restants, date limite de délivrance, fiche remplaçante, éligibilité CPF estimée.</td></tr>
<tr><td><code>check_habilitation</code></td><td>Un SIRET ou SIREN est-il habilité, pour former et/ou évaluer, avec état et dates.</td></tr>
<tr><td><code>list_partenaires</code></td><td>Organismes habilités sur une certification, paginés.</td></tr>
<tr><td><code>compare_certifications</code></td><td>Niveaux, certificateurs, codes communs, recouvrement des blocs entre deux fiches.</td></tr>
<tr><td><code>changes_since</code></td><td>Fiches créées, modifiées, désactivées, réactivées ou retirées depuis une date.</td></tr>
<tr><td><code>get_data_status</code></td><td>Date de l'export, âge des données, compteurs.</td></tr>
</table>
<p><a href="/docs#outils">Détail des paramètres et des réponses →</a></p>

<h2 id="faq">Questions fréquentes</h2>
${faqHtml}

<h2 id="auteur">À propos de l'auteur</h2>
<p><a href="${SITE.author.url}" rel="author"><strong>Arnaud Aldebert</strong></a> est développeur fullstack &amp; systèmes IA à Nîmes :
applications web robustes et systèmes GenAI en production (RAG, workflows LLM, agents, MCP). mcp-rncp est un projet
open source qu'il conçoit et maintient ; il est disponible pour des missions freelance autour de l'IA générative et des
intégrations MCP. <a href="${SITE.author.url}">Portfolio</a> · <a href="${SITE.author.linkedin}" rel="noopener">LinkedIn</a> · <a href="${SITE.author.github}" rel="noopener">GitHub</a>.</p>
`;
  return layout({
    title: "mcp-rncp — RNCP et RS dans Claude, ChatGPT, Cursor (serveur MCP gratuit)",
    description:
      "Serveur MCP gratuit et open source pour interroger le RNCP et le RS de France compétences depuis Claude, ChatGPT ou Cursor : validité d'une certification, blocs de compétences EDOF, habilitation d'un SIRET, recherche. Par Arnaud Aldebert.",
    path: "/",
    body,
    jsonld: [websiteLd, softwareLd(stats), faqLd],
    stats,
  });
}

export function docsHtml(stats: Stats): string {
  const body = `
<h1>Documentation mcp-rncp</h1>
<p class="lead">Tout ce qu'il faut pour connecter le RNCP et le RS à un assistant IA via le Model Context Protocol :
installation, outils, exemples de prompts, données, limites.</p>
<p class="toc"><a href="#installation">Installation</a><a href="#outils">Outils</a><a href="#prompts">Prompts &amp; resources</a><a href="#numeros">Numéros acceptés</a><a href="#reponses">Format des réponses</a><a href="#donnees">Données</a><a href="#limites">Limites</a><a href="#faq">FAQ</a></p>

<h2 id="installation">Installation</h2>
<h3>Version hébergée (recommandée) — <code>https://mcp-rncp.com/mcp</code></h3>
<p>Transport Streamable HTTP, sans authentification, 60 requêtes/minute par IP, réponses mises en cache 1 h.</p>
<ul>
  <li><strong>Claude.ai (web et mobile)</strong> : Paramètres → Connecteurs → « Ajouter un connecteur personnalisé » →
  nom <code>RNCP</code>, URL <code>https://mcp-rncp.com/mcp</code>, pas d'authentification. Dans « Outils en lecture
  seule », choisissez « Autoriser » pour ne plus confirmer chaque appel.</li>
  <li><strong>Claude Code</strong> : <code>claude mcp add --transport http rncp https://mcp-rncp.com/mcp</code></li>
  <li><strong>Cursor</strong> (<code>.cursor/mcp.json</code>), <strong>ChatGPT</strong> (mode développeur → connecteurs MCP),
  <strong>Windsurf</strong>, <strong>VS Code</strong> et tout client MCP :${CONNECT}</li>
</ul>
<h3>Version locale — <code>npx -y mcp-rncp</code></h3>
<p>Serveur stdio pour Claude Desktop et les IDE. Nécessite Node.js ≥ 22.16. Au premier lancement, la base SQLite (~90 Mo
compressés) est téléchargée depuis les releases GitHub, vérifiée (SHA-256) puis mise à jour chaque semaine en arrière-plan.</p>
<pre><code>{
  "mcpServers": {
    "rncp": { "command": "npx", "args": ["-y", "mcp-rncp"] }
  }
}</code></pre>
<p>Options : <code>--db &lt;rncp.sqlite&gt;</code> (base locale), <code>--cache-dir</code>, <code>--update</code>, <code>--no-update</code>, <code>--help</code>.</p>

<h2 id="outils">Outils</h2>
<table>
<tr><th>Outil</th><th>Paramètres</th><th>Réponse</th></tr>
<tr><td><code>search_certifications</code></td><td><code>query</code> (texte FR), <code>repertoire</code> RNCP|RS, <code>niveau</code> 3-8, <code>nsf</code>, <code>rome</code>, <code>actives_only</code> (défaut true), <code>limit</code> ≤ 20</td><td>Liste classée : numéro, intitulé, niveau, statut, échéance, score. Un numéro saisi en requête renvoie la fiche exacte.</td></tr>
<tr><td><code>get_certification</code></td><td><code>numero</code>, <code>full</code> (textes complets)</td><td>Fiche structurée : certificateurs, activités visées, compétences attestées, secteurs, emplois, prérequis, voies d'accès, NSF/ROME/Formacode, textes JO, remplace / remplacée par, correspondances de blocs, statistiques de promotions, URL officielle.</td></tr>
<tr><td><code>list_blocs</code></td><td><code>numero</code></td><td>Blocs ordonnés : code, intitulé, compétences, modalités d'évaluation, prérequis ; liste <code>edof_codes</code>.</td></tr>
<tr><td><code>check_validity</code></td><td><code>numero</code></td><td><code>actif</code>, <code>date_fin_enregistrement</code>, <code>jours_restants</code>, <code>date_limite_delivrance</code>, <code>remplacee_par</code>, <code>eligible_cpf_estime</code>, <code>avertissement</code>.</td></tr>
<tr><td><code>check_habilitation</code></td><td><code>numero</code>, <code>siret</code> (14 chiffres) ou SIREN (9)</td><td><code>habilite</code>, <code>roles</code> (former, evaluer), <code>est_certificateur</code>, partenaires trouvés avec état et dates.</td></tr>
<tr><td><code>list_partenaires</code></td><td><code>numero</code>, <code>siret_prefix</code>, <code>actifs_only</code>, <code>limit</code> ≤ 100, <code>offset</code></td><td>Partenaires paginés avec rôles, totaux, indicateur <code>truncated</code>.</td></tr>
<tr><td><code>compare_certifications</code></td><td><code>numero_a</code>, <code>numero_b</code></td><td>Niveaux, statuts, certificateurs, NSF/ROME communs, recouvrement lexical des blocs (Jaccard), bloc le plus proche pour chaque bloc.</td></tr>
<tr><td><code>changes_since</code></td><td><code>since</code> (AAAA-MM-JJ), <code>type</code>, <code>repertoire</code>, <code>nsf</code>, <code>limit</code></td><td>Changements créés / modifiés / désactivés / réactivés / retirés entre deux exports.</td></tr>
<tr><td><code>get_data_status</code></td><td>—</td><td>Date de l'export, âge en jours, identifiant du run, compteurs.</td></tr>
</table>

<h2 id="prompts">Prompts et resources</h2>
<ul>
  <li>Prompt <code>rediger_offre_edof</code> (numero, public, durée) : rédige objectifs pédagogiques, programme par bloc et
  liste des blocs à déclarer, uniquement à partir de la fiche.</li>
  <li>Prompt <code>verifier_certification</code> (numero, siret) : verdict de conformité validité + habilitation + blocs.</li>
  <li>Resource <code>rncp://glossaire</code> : RNCP, RS, niveaux, blocs, habilitations, CPF, EDOF, NSF, ROME.</li>
  <li>Resource <code>rncp://about</code> : source, licence, fraîcheur, couverture, limites.</li>
</ul>
<h3>Exemples de questions</h3>
<blockquote>« Quelles certifications actives de niveau 5 en gestion de paie ? »</blockquote>
<blockquote>« Le RNCP 37674 expire quand ? Combien de jours restants ? »</blockquote>
<blockquote>« Qui est habilité sur le RS 5719 dans le Gard (SIREN commençant par 8) ? »</blockquote>
<blockquote>« Compare le RNCP 36490 et le RNCP 37873 : blocs communs ? »</blockquote>
<blockquote>« Quelles fiches informatique (NSF 326) ont été désactivées depuis le 1er juillet ? »</blockquote>

<h2 id="numeros">Numéros acceptés</h2>
<p><code>RNCP35419</code>, <code>35419</code>, <code>rncp 35419</code>, <code>RNCP-35419</code>, <code>RS5000</code>, ou l'URL de la fiche
sur francecompetences.fr. Un nombre seul est cherché d'abord au RNCP puis au RS.</p>

<h2 id="reponses">Format des réponses</h2>
<p>Chaque outil renvoie du JSON structuré (<code>structuredContent</code>) et un texte identique, avec systématiquement :
<code>summary</code> (une phrase), <code>source</code> (France compétences, licence, URL du jeu de données, <code>data_updated_at</code>),
<code>url_fiche</code> vers la fiche officielle et, quand un texte est coupé, <code>truncated: true</code>. Les erreurs sont
explicites (numéro inconnu avec les variantes essayées, SIRET invalide).</p>

<h2 id="donnees">Données, fraîcheur, licence</h2>
<p>Source : jeu de données « Répertoire national des certifications professionnelles et répertoire spécifique » de
France compétences sur <a href="${SITE.dataset}" rel="noopener">data.gouv.fr</a>, flux XML V4.1, réutilisé sous
Licence Ouverte 2.0 (mention de la source et de la date dans chaque réponse). Export en service :
<strong>${frDate(stats.source_date)}</strong> — ${fmt(stats.count_total)} fiches (${fmt(stats.count_rncp)} RNCP, ${fmt(stats.count_rs)} RS),
${fmt(stats.count_actives)} actives, ${fmt(stats.count_blocs)} blocs, ${fmt(stats.count_partenaires)} lignes d'habilitation.
Réimport hebdomadaire, base publiée en release GitHub et chargée dans Cloudflare D1 sans interruption (deux bases blue/green).
Statut en direct : <a href="/health">/health</a>.</p>

<h2 id="limites">Limites</h2>
<ul>
  <li>Pas de temps réel : l'âge des données est indiqué par <code>get_data_status</code> (≤ 7 jours en régime normal).</li>
  <li><code>eligible_cpf_estime</code> est une estimation ; l'éligibilité réelle dépend aussi de l'habilitation et du référencement EDOF.</li>
  <li>Recherche plein texte (pas sémantique) : préférez les termes de l'intitulé officiel ; les sigles courants (BTS, TP, RH, dev, MCO…) sont gérés.</li>
  <li>Non inclus en v1 : NPEC (prise en charge apprentissage), composition des jurys, référentiels PDF.</li>
  <li>Service hébergé limité à 60 requêtes/minute par IP ; usage intensif → <code>npx mcp-rncp</code> en local.</li>
</ul>

<h2 id="faq">FAQ</h2>
${faqHtml}

<h2 id="auteur">Auteur et contact</h2>
<p>Créé et maintenu par <a href="${SITE.author.url}" rel="author"><strong>Arnaud Aldebert</strong></a>, développeur fullstack &amp; systèmes IA
(Nîmes) — <a href="${SITE.author.linkedin}" rel="noopener">LinkedIn</a>, <a href="${SITE.author.github}" rel="noopener">GitHub</a>.
Bugs et idées : <a href="${SITE.repo}/issues" rel="noopener">issues GitHub</a>. Licence MIT.</p>
`;
  return layout({
    title: "Documentation mcp-rncp — installer et utiliser le serveur MCP RNCP / RS",
    description:
      "Guide complet du serveur MCP RNCP/RS : installation dans Claude, ChatGPT, Cursor ou en local (npx mcp-rncp), description des 9 outils, exemples de prompts, format des réponses, données France compétences, limites.",
    path: "/docs",
    body,
    jsonld: [
      websiteLd,
      {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: "Documentation mcp-rncp",
        url: `${SITE.url}/docs`,
        inLanguage: "fr",
        author: personLd,
        about: { "@id": `${SITE.url}/#software` },
        dateModified: stats.source_date,
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: SITE.url },
          { "@type": "ListItem", position: 2, name: "Documentation", item: `${SITE.url}/docs` },
        ],
      },
      faqLd,
    ],
    stats,
  });
}

export function llmsTxt(stats: Stats): string {
  return `# mcp-rncp

> Serveur MCP (Model Context Protocol) gratuit et open source donnant accès au RNCP et au RS de France compétences
> (certifications professionnelles françaises) depuis Claude, ChatGPT, Cursor ou tout client MCP.
> Créé par Arnaud Aldebert (https://arnaud-aldebert.dev), développeur fullstack & systèmes IA, Nîmes.

Endpoint MCP hébergé (Streamable HTTP, sans auth, 60 req/min/IP) : https://mcp-rncp.com/mcp
Version locale : npx -y mcp-rncp (Node ≥ 22.16)
Code (MIT) : ${SITE.repo}
Données : France compétences via data.gouv.fr, Licence Ouverte 2.0, export du ${stats.source_date ?? "?"} —
${stats.count_total ?? "?"} fiches, ${stats.count_actives ?? "?"} actives, ${stats.count_blocs ?? "?"} blocs, ${stats.count_partenaires ?? "?"} lignes d'habilitation.

## Outils
- search_certifications(query, repertoire?, niveau?, nsf?, rome?, actives_only=true, limit≤20)
- get_certification(numero, full?)
- list_blocs(numero) — blocs de compétences, codes EDOF
- check_validity(numero) — actif, échéance, jours restants, remplaçante, éligibilité CPF estimée
- check_habilitation(numero, siret|siren) — habilité, rôles former/evaluer, certificateur
- list_partenaires(numero, siret_prefix?, actifs_only, limit, offset)
- compare_certifications(numero_a, numero_b)
- changes_since(since, type?, repertoire?, nsf?)
- get_data_status()

## Pages
- ${SITE.url}/ : présentation
- ${SITE.url}/docs : documentation complète (installation, outils, prompts, données, limites, FAQ)
- ${SITE.url}/health : statut et fraîcheur des données (JSON)
- ${SITE.repo}/blob/main/README.md : README (FR) ; README.en.md (EN)
`;
}

export function sitemapXml(stats: Stats): string {
  const d = stats.source_date ?? new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE.url}/</loc><lastmod>${d}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>${SITE.url}/docs</loc><lastmod>${d}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
</urlset>
`;
}

export const ROBOTS = `User-agent: *
Allow: /
Disallow: /mcp
Sitemap: ${SITE.url}/sitemap.xml
`;
