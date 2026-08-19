// Static site: landing (/) and documentation (/docs). Server-rendered HTML, no JS, SEO/GEO structured data.
// Written in the first person (Arnaud Aldebert). All dates/counts come from the live database (meta table).
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
  },
  repo: "https://github.com/ALDEBERTArnaud/mcp-rncp",
  npm: "https://www.npmjs.com/package/mcp-rncp",
  dataset:
    "https://www.data.gouv.fr/datasets/repertoire-national-des-certifications-professionnelles-et-repertoire-specifique",
};

export type Stats = {
  source_date?: string;
  ingested_at?: string;
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
    ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

// Logo: register lines + R monogram + validation check. Used inline, as favicon and at /logo.svg.
export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="mcp-rncp">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f46e5"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs>
<rect width="64" height="64" rx="14" fill="url(#g)"/>
<rect x="13" y="17" width="9" height="3.2" rx="1.6" fill="#fff" opacity=".85"/>
<rect x="13" y="25" width="9" height="3.2" rx="1.6" fill="#fff" opacity=".65"/>
<rect x="13" y="33" width="9" height="3.2" rx="1.6" fill="#fff" opacity=".45"/>
<text x="27" y="44" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Inter,Roboto,sans-serif" font-size="32" font-weight="800" fill="#fff">R</text>
<circle cx="47" cy="47" r="10" fill="#0b1220"/>
<circle cx="47" cy="47" r="8.5" fill="#22c55e"/>
<path d="M42.5 47.2l3 3 6-6.4" fill="none" stroke="#0b1220" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f46e5"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs>
<rect width="64" height="64" rx="16" fill="url(#g)"/>
<text x="31" y="47" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Inter,Roboto,Arial,sans-serif" font-size="42" font-weight="800" fill="#fff">R</text>
<circle cx="50" cy="50" r="11" fill="#0b1220"/><circle cx="50" cy="50" r="9" fill="#22c55e"/>
<path d="M45 50.3l3.4 3.4 6.6-7" fill="none" stroke="#0b1220" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const CSS = `
:root{--bg:#0a0f1c;--bg2:#0e1526;--fg:#e6eaf2;--muted:#98a2b8;--card:#111a2e;--line:#1f2a44;--acc:#8b93ff;--acc-strong:#6366f1;--cyan:#22d3ee;--green:#22c55e;--code:#0b1220;--shadow:0 10px 30px rgba(0,0,0,.35)}
@media(prefers-color-scheme:light){:root{--bg:#ffffff;--bg2:#f6f8fc;--fg:#0f172a;--muted:#5b6478;--card:#ffffff;--line:#e5e9f2;--acc:#4f46e5;--acc-strong:#4338ca;--cyan:#0891b2;--green:#16a34a;--code:#0f172a;--shadow:0 10px 30px rgba(15,23,42,.08)}}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Inter,Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--acc);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1040px;margin:0 auto;padding:0 22px}
header.top{position:sticky;top:0;z-index:10;backdrop-filter:saturate(1.4) blur(10px);background:color-mix(in srgb,var(--bg) 78%,transparent);border-bottom:1px solid var(--line)}
header.top .wrap{display:flex;justify-content:space-between;align-items:center;height:62px}
.brand{display:flex;align-items:center;gap:10px;color:var(--fg);font-weight:800;letter-spacing:-.01em;font-size:1.05rem}
.brand svg{width:30px;height:30px}
nav a{margin-left:22px;color:var(--fg);font-weight:500;font-size:.95rem;opacity:.9}
nav a.pill{background:var(--acc-strong);color:#fff;padding:7px 12px;border-radius:999px;opacity:1}
.hero{position:relative;padding:72px 0 36px}
body{background-image:radial-gradient(circle at 1px 1px,color-mix(in srgb,var(--fg) 7%,transparent) 1px,transparent 0);background-size:26px 26px}
.hero-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:36px;align-items:center}
@media(max-width:860px){.hero-grid{grid-template-columns:1fr}}
.preview{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:var(--shadow);position:relative}
.preview:before{content:"";position:absolute;inset:-1px;border-radius:18px;padding:1px;background:linear-gradient(135deg,rgba(99,102,241,.6),rgba(34,211,238,.35));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
.preview .bar{display:flex;gap:6px;margin-bottom:12px}.preview .bar i{width:10px;height:10px;border-radius:50%;background:var(--line);display:block}
.preview .bubble{box-shadow:none;font-size:.9rem}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;counter-reset:s}
.step{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 18px 18px 56px;position:relative;box-shadow:var(--shadow)}
.step:before{counter-increment:s;content:counter(s);position:absolute;left:16px;top:16px;width:28px;height:28px;border-radius:9px;display:grid;place-items:center;font-weight:800;color:#fff;background:linear-gradient(135deg,var(--acc-strong),var(--cyan))}
.stat{position:relative;overflow:hidden}.stat:before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,var(--acc-strong),var(--cyan))}
.kicker{font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--cyan);margin:0 0 6px}
tr:nth-child(even) td{background:color-mix(in srgb,var(--fg) 2.5%,transparent)}
.btn:hover{border-color:var(--acc)}.btn.primary:hover{filter:brightness(1.08)}
.hero:before{content:"";position:absolute;inset:-120px -10% auto -10%;height:560px;background:radial-gradient(560px 280px at 18% 30%,rgba(99,102,241,.32),transparent 62%),radial-gradient(480px 240px at 82% 12%,rgba(34,211,238,.24),transparent 62%);filter:blur(14px);pointer-events:none;z-index:-1}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:.8rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--cyan);margin-bottom:14px}
.eyebrow:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 4px rgba(34,197,94,.18)}
h1{font-size:clamp(2rem,4.6vw,3.2rem);line-height:1.08;letter-spacing:-.02em;margin:0 0 16px;max-width:820px}
h1 em{font-style:normal;background:linear-gradient(90deg,var(--acc),var(--cyan));-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{font-size:1.15rem;color:var(--muted);max-width:720px;margin:0}
.cta{display:flex;gap:12px;flex-wrap:wrap;margin:26px 0 8px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:10px;font-weight:600;border:1px solid var(--line);color:var(--fg);background:var(--card);box-shadow:var(--shadow)}
.btn:hover{text-decoration:none;transform:translateY(-1px)}
.btn.primary{background:linear-gradient(135deg,var(--acc-strong),#0ea5e9);color:#fff;border-color:transparent}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:34px 0 10px}
.stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;box-shadow:var(--shadow)}
.stat b{display:block;font-size:1.7rem;letter-spacing:-.02em}
.stat span{color:var(--muted);font-size:.88rem}
.fresh{color:var(--muted);font-size:.9rem;margin:6px 0 0}
.fresh b{color:var(--fg)}
section{padding:46px 0 6px}
h2{font-size:1.65rem;letter-spacing:-.015em;margin:0 0 14px}
h3{font-size:1.05rem;margin:0 0 8px}
.sub{color:var(--muted);max-width:760px;margin:0 0 20px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;box-shadow:var(--shadow)}
.card p{margin:8px 0 0;color:var(--muted);font-size:.95rem}
.chat{display:grid;gap:12px;max-width:820px}
.bubble{padding:14px 16px;border-radius:14px;border:1px solid var(--line);background:var(--card);box-shadow:var(--shadow)}
.bubble.q{border-bottom-right-radius:4px;justify-self:end;background:linear-gradient(135deg,rgba(99,102,241,.16),rgba(34,211,238,.12))}
.bubble.a{border-bottom-left-radius:4px;justify-self:start;font-size:.95rem}
.bubble .who{display:block;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
pre{background:var(--code);color:#e6eaf2;border:1px solid var(--line);border-radius:10px;padding:12px 14px;overflow-x:auto;font-size:.88rem;line-height:1.5;margin:10px 0 0}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:.92em}
p code,li code,td code{background:color-mix(in srgb,var(--fg) 8%,transparent);padding:1px 6px;border-radius:5px}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:.95rem;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-weight:600;font-size:.85rem;text-transform:uppercase;letter-spacing:.04em;background:var(--bg2)}
tr:last-child td{border-bottom:0}
.callout{margin:18px 0;padding:14px 18px;border-left:3px solid var(--cyan);background:var(--card);border-radius:0 12px 12px 0}
details{margin:8px 0;padding:10px 16px;background:var(--card);border:1px solid var(--line);border-radius:12px}
summary{cursor:pointer;font-weight:600}
details p{color:var(--muted);margin:8px 0 2px}
.toc{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:.92rem;margin:0 0 10px}
.author{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:start;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;box-shadow:var(--shadow)}
.avatar{width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,var(--acc-strong),var(--cyan));display:grid;place-items:center;color:#fff;font-weight:800;font-size:1.3rem}
footer{border-top:1px solid var(--line);margin-top:60px;padding:28px 0 40px;color:var(--muted);font-size:.9rem;background:var(--bg2)}
footer .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px}
footer h4{margin:0 0 8px;color:var(--fg);font-size:.9rem}
footer a{color:var(--muted)}footer a:hover{color:var(--fg)}
.small{font-size:.85rem}
@media(max-width:640px){nav a{margin-left:14px}nav a.hide{display:none}.hero{padding-top:44px}}
`;

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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
<meta name="theme-color" content="#4f46e5">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:site_name" content="mcp-rncp">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE.url}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="mcp-rncp — le RNCP et le RS dans Claude, ChatGPT et Cursor">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.title)}">
<meta name="twitter:description" content="${esc(o.description)}">
<meta name="twitter:image" content="${SITE.url}/og.png">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="shortcut icon" href="/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="alternate" type="text/plain" href="${SITE.url}/llms.txt" title="llms.txt">
<style>${CSS}</style>
${o.jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="/">${LOGO_SVG} mcp-rncp</a>
  <nav><a href="/docs">Documentation</a><a class="hide" href="${SITE.repo}" rel="noopener">GitHub</a><a class="hide" href="${SITE.author.url}" rel="author noopener">Qui suis-je</a><a class="pill" href="/docs#installation">Installer</a></nav>
</div></header>
<main class="wrap">
${o.body}
</main>
<footer><div class="wrap">
  <div class="cols">
    <div><h4>mcp-rncp ${SERVER_VERSION}</h4><p class="small">Serveur MCP open source (MIT) que je conçois et maintiens : le RNCP et le RS de France compétences dans vos assistants IA.</p></div>
    <div><h4>Navigation</h4><p class="small"><a href="/docs">Documentation</a> · <a href="/health">Statut des données</a> · <a href="/llms.txt">llms.txt</a> · <a href="/sitemap.xml">Plan du site</a> · <a href="${SITE.repo}" rel="noopener">GitHub</a> · <a href="${SITE.npm}" rel="noopener">npm</a></p></div>
    <div><h4>Auteur</h4><p class="small"><a href="${SITE.author.url}" rel="author">Arnaud Aldebert</a> — développeur fullstack &amp; systèmes IA, Nîmes · <a href="${SITE.author.linkedin}" rel="noopener">LinkedIn</a> · <a href="${SITE.author.github}" rel="noopener">GitHub</a></p></div>
  </div>
  <p class="small" style="margin-top:18px">Données : France compétences via <a href="${SITE.dataset}" rel="noopener">data.gouv.fr</a>, Licence Ouverte 2.0 — export du ${frDate(o.stats.source_date)}.
  Ce site n'est pas affilié à France compétences ni à l'État ; seules les fiches publiées sur francecompetences.fr font foi.</p>
</div></footer>
</body>
</html>`;
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
    image: `${SITE.url}/logo.png`,
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
    "Un serveur MCP (Model Context Protocol) open source que j'ai créé pour exposer le Répertoire national des certifications professionnelles (RNCP) et le Répertoire spécifique (RS) de France compétences sous forme d'outils utilisables par Claude, ChatGPT, Cursor ou tout client MCP. Il répond à des questions comme « le RNCP 35419 est-il actif ? » ou « mon SIRET est-il habilité ? » directement dans la conversation.",
  ],
  [
    "Est-ce gratuit ?",
    "Oui. La version hébergée (https://mcp-rncp.com/mcp) est gratuite, sans compte ni clé API, limitée à 60 requêtes par minute et par adresse IP. La version locale s'installe avec « npx -y mcp-rncp » et fonctionne hors ligne après le premier téléchargement des données. Le code est sous licence MIT.",
  ],
  [
    "D'où viennent les données et sont-elles à jour ?",
    "Du jeu de données ouvert « RNCP et RS » publié par France compétences sur data.gouv.fr (Licence Ouverte 2.0). Je réimporte l'export chaque semaine automatiquement ; la date de l'export en service est affichée sur ce site et renvoyée dans chaque réponse avec l'URL de la fiche officielle sur francecompetences.fr.",
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
    "Moi, Arnaud Aldebert, développeur fullstack et systèmes IA (RAG, agents, MCP) basé à Nîmes. Le projet illustre mon travail sur les intégrations MCP en production ; mon portfolio : https://arnaud-aldebert.dev.",
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

const TOOLS: Array<[string, string]> = [
  [
    "search_certifications",
    "Recherche plein texte (BM25 + synonymes français) avec filtres répertoire, niveau 3-8, code NSF, code ROME.",
  ],
  [
    "get_certification",
    "Fiche complète : certificateurs, activités visées, compétences attestées, codes, voies d'accès, textes, remplacements, statistiques.",
  ],
  [
    "list_blocs",
    "Blocs de compétences dans l'ordre officiel avec codes <code>RNCPxxxxxBCyy</code>, prêts pour EDOF.",
  ],
  [
    "check_validity",
    "Statut actif/inactif, échéance, jours restants, date limite de délivrance, fiche remplaçante, éligibilité CPF estimée.",
  ],
  [
    "check_habilitation",
    "Un SIRET ou SIREN est-il habilité, pour former et/ou évaluer, avec état et dates.",
  ],
  ["list_partenaires", "Organismes habilités sur une certification, paginés."],
  [
    "compare_certifications",
    "Niveaux, certificateurs, codes communs, recouvrement des blocs entre deux fiches.",
  ],
  [
    "changes_since",
    "Fiches créées, modifiées, désactivées, réactivées ou retirées depuis une date.",
  ],
  ["get_data_status", "Date de l'export, âge des données, compteurs."],
];
const toolsTable = `<table><tr><th>Outil</th><th>Ce qu'il fait</th></tr>${TOOLS.map(([n, d]) => `<tr><td><code>${n}</code></td><td>${d}</td></tr>`).join("")}</table>`;

const authorBlock = `<div class="author">
  <div class="avatar">AA</div>
  <div>
    <h3 style="margin-bottom:4px">Je suis Arnaud Aldebert</h3>
    <p style="margin:0;color:var(--muted)">Développeur fullstack &amp; systèmes IA à Nîmes. Je construis des applications web robustes et des
    systèmes GenAI en production : RAG, workflows LLM, agents, serveurs MCP. mcp-rncp est un projet open source que je conçois et
    maintiens seul, de l'ingestion des données à l'hébergement. Je suis disponible pour des missions freelance autour de l'IA
    générative et des intégrations MCP.</p>
    <p style="margin:10px 0 0"><a class="btn" href="${SITE.author.url}" rel="author">Mon portfolio →</a> <a class="btn" href="${SITE.author.linkedin}" rel="noopener">LinkedIn</a> <a class="btn" href="${SITE.author.github}" rel="noopener">GitHub</a></p>
  </div>
</div>`;

export function landingHtml(stats: Stats): string {
  const body = `
<div class="hero">
  <div class="hero-grid">
    <div>
      <div class="eyebrow">Serveur MCP gratuit · données France compétences du ${frDate(stats.source_date)}</div>
      <h1>Le RNCP et le RS, <em>directement dans Claude, ChatGPT et Cursor</em></h1>
      <p class="lead">J'ai construit <strong>mcp-rncp</strong> pour ne plus jamais fouiller un XML de 570 Mo : posez la question à votre
      assistant IA — validité d'une fiche, blocs de compétences EDOF, habilitation d'un SIRET, recherche par niveau ou domaine —
      et obtenez une réponse sourcée et datée. Sans clé API, sans compte, open source.</p>
      <div class="cta">
        <a class="btn primary" href="/docs#installation">Installer en 1 minute</a>
        <a class="btn" href="/docs">Lire la documentation</a>
        <a class="btn" href="${SITE.repo}" rel="noopener">Code source (MIT)</a>
      </div>
    </div>
    <div class="preview" aria-label="Aperçu d'une conversation">
      <div class="bar"><i></i><i></i><i></i></div>
      <div class="chat">
        <div class="bubble q"><span class="who">Vous</span>Le RNCP 35419 est-il encore actif ? Le SIRET 88055223700047 est-il habilité sur le RNCP 37674 ?</div>
        <div class="bubble a"><span class="who">Claude · check_validity, check_habilitation</span><strong>RNCP 35419 : non, plus actif</strong> depuis le 17 mars 2026 — remplacé par le RNCP 42147.<br>
        <strong>SIRET 88055223700047 sur RNCP 37674 : habilité</strong>, former <em>et</em> évaluer, fiche active jusqu'au 1ᵉʳ septembre 2028.<br>
        <span class="small" style="color:var(--muted)">Source : France compétences (data.gouv.fr), export du ${frDate(stats.source_date)}.</span></div>
      </div>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><b>${fmt(stats.count_total)}</b><span>fiches RNCP + RS indexées</span></div>
    <div class="stat"><b>${fmt(stats.count_actives)}</b><span>certifications actives</span></div>
    <div class="stat"><b>${fmt(stats.count_blocs)}</b><span>blocs de compétences</span></div>
    <div class="stat"><b>${fmt(stats.count_partenaires)}</b><span>lignes d'habilitation (SIRET)</span></div>
  </div>
  <p class="fresh">Export France compétences en service : <b>${frDate(stats.source_date)}</b> — je réimporte les données
  automatiquement chaque semaine ; la date affichée ici et dans chaque réponse est celle de la base réellement servie.</p>
</div>

<section id="comment">
  <p class="kicker">Comment ça marche</p>
  <h2>Trois étapes, zéro configuration</h2>
  <div class="steps">
    <div class="step"><h3>Connectez</h3><p style="margin:0;color:var(--muted)">Ajoutez <code>https://mcp-rncp.com/mcp</code> comme connecteur dans Claude, Cursor ou ChatGPT — ou lancez <code>npx -y mcp-rncp</code> en local.</p></div>
    <div class="step"><h3>Demandez</h3><p style="margin:0;color:var(--muted)">En français, comme à un collègue : « le 37674 est-il actif ? », « qui est habilité ? », « quels blocs pour EDOF ? ».</p></div>
    <div class="step"><h3>Vérifiez</h3><p style="margin:0;color:var(--muted)">Chaque réponse cite France compétences, la date de l'export et l'URL de la fiche officielle. Rien d'inventé.</p></div>
  </div>
</section>

<section id="pourquoi">
  <p class="kicker">Le problème</p>
  <h2>Pourquoi je l'ai construit</h2>
  <p class="sub">Organismes de formation, OPCO, services RH, candidats : tout le monde se pose les mêmes questions.
  La fiche est-elle <strong>encore active</strong> ? jusqu'à quand ? qui est <strong>habilité</strong> à former ou à évaluer ?
  quels <strong>blocs de compétences</strong> déclarer dans EDOF ? quelle fiche remplace l'ancienne ? Les réponses existent,
  publiées chaque nuit sur data.gouv.fr — mais dans un XML de 570 Mo. Je l'ai rendu interrogeable en français, en langage
  naturel, depuis l'outil que vous utilisez déjà.</p>
  <div class="callout">Depuis le 11 juin 2026, les blocs de compétences visés par chaque offre RNCP doivent être renseignés dans EDOF.
  Au 22 octobre 2026, les offres non renseignées deviennent invisibles sur Mon Compte Formation.</div>
</section>

<section id="exemples">
  <p class="kicker">Exemple</p>
  <h2>À quoi ça ressemble</h2>
  <p class="sub">Une conversation réelle dans Claude, connecteur mcp-rncp activé.</p>
  <div class="chat">
    <div class="bubble q"><span class="who">Vous</span>Liste-moi les blocs à déclarer dans EDOF pour le 37674.</div>
    <div class="bubble a"><span class="who">Claude · list_blocs</span><strong>Deux blocs :</strong> RNCP37674BC01 — Développer la partie front-end d'une application web ou web mobile sécurisée ·
    RNCP37674BC02 — Développer la partie back-end d'une application web ou web mobile sécurisée.<br>
    <span class="small" style="color:var(--muted)">Fiche : francecompetences.fr/recherche/rncp/37674/</span></div>
    <div class="bubble q"><span class="who">Vous</span>Trouve les certifications actives de niveau 6 en cybersécurité et compare les deux premières.</div>
    <div class="bubble a"><span class="who">Claude · search_certifications, compare_certifications</span>10 résultats, dont RNCP37300 « Responsable en cybersécurité » et RNCP37473 « Sciences et ingénierie – Cybersécurité » : même niveau, un code NSF commun, recouvrement des blocs 12 %…</div>
  </div>
</section>

<section id="connexion">
  <p class="kicker">Installation</p>
  <h2>Se connecter</h2>
  <p class="sub">Une URL, aucun compte. La version locale tourne sur votre machine si vous préférez.</p>
  <div class="grid">
    <div class="card"><h3>Claude.ai &amp; Claude mobile</h3><p>Paramètres → Connecteurs → Ajouter un connecteur personnalisé →
    URL <code>https://mcp-rncp.com/mcp</code>, sans authentification.</p></div>
    <div class="card"><h3>Claude Code</h3><pre><code>claude mcp add --transport http rncp https://mcp-rncp.com/mcp</code></pre></div>
    <div class="card"><h3>Cursor, ChatGPT, VS Code, autres clients MCP</h3>${CONNECT}</div>
    <div class="card"><h3>En local (Claude Desktop, hors ligne)</h3><pre><code>npx -y mcp-rncp</code></pre><p>Node.js ≥ 22.16, base téléchargée au premier lancement (~90 Mo), mise à jour hebdomadaire.</p></div>
  </div>
</section>

<section id="outils">
  <p class="kicker">Outils</p>
  <h2>Neuf outils, tous en lecture seule</h2>
  ${toolsTable}
  <p><a href="/docs#outils">Détail des paramètres et des réponses →</a></p>
</section>

<section id="fiabilite">
  <p class="kicker">Fiabilité</p>
  <h2>Ce que je garantis</h2>
  <div class="grid">
    <div class="card"><h3>Sourcé</h3><p>Chaque réponse cite France compétences, la licence, la date de l'export et l'URL de la fiche officielle.</p></div>
    <div class="card"><h3>À jour automatiquement</h3><p>Import hebdomadaire de l'export data.gouv.fr, bascule sans interruption, date visible ici et via <code>get_data_status</code>.</p></div>
    <div class="card"><h3>Sans donnée personnelle</h3><p>Lecture seule, SIRET et raisons sociales publiques uniquement, aucun compte, aucune télémétrie nominative.</p></div>
    <div class="card"><h3>Ouvert</h3><p>Code MIT sur GitHub, données sous Licence Ouverte 2.0, évaluations de qualité publiques (recall@5 = 96 % sur 46 questions réelles).</p></div>
  </div>
</section>

<section id="faq">
  <p class="kicker">FAQ</p>
  <h2>Questions fréquentes</h2>
  ${faqHtml}
</section>

<section id="auteur">
  <p class="kicker">Auteur</p>
  <h2>Qui suis-je</h2>
  ${authorBlock}
</section>
`;
  return layout({
    title: "mcp-rncp — RNCP et RS dans Claude, ChatGPT, Cursor (serveur MCP gratuit)",
    description:
      "Serveur MCP gratuit et open source pour interroger le RNCP et le RS de France compétences depuis Claude, ChatGPT ou Cursor : validité d'une certification, blocs de compétences EDOF, habilitation d'un SIRET, recherche. Un projet que je développe et maintiens — Arnaud Aldebert, développeur IA à Nîmes.",
    path: "/",
    body,
    jsonld: [websiteLd, softwareLd(stats), faqLd],
    stats,
  });
}

export function docsHtml(stats: Stats): string {
  const body = `
<div class="hero" style="padding-bottom:10px">
  <div class="eyebrow">Documentation · version ${SERVER_VERSION}</div>
  <h1>Installer et utiliser <em>mcp-rncp</em></h1>
  <p class="lead">Tout ce qu'il faut pour connecter le RNCP et le RS à un assistant IA via le Model Context Protocol :
  installation, outils, exemples de prompts, format des réponses, données, limites.</p>
</div>
<p class="toc"><a href="#installation">Installation</a><a href="#outils">Outils</a><a href="#prompts">Prompts &amp; resources</a><a href="#numeros">Numéros acceptés</a><a href="#reponses">Format des réponses</a><a href="#donnees">Données</a><a href="#limites">Limites</a><a href="#faq">FAQ</a><a href="#auteur">Auteur</a></p>

<section id="installation">
  <h2>Installation</h2>
  <h3>Version hébergée (recommandée) — <code>https://mcp-rncp.com/mcp</code></h3>
  <p class="sub">Transport Streamable HTTP, sans authentification, 60 requêtes/minute par IP, réponses mises en cache 1 h.
  Je l'héberge sur Cloudflare Workers + D1.</p>
  <div class="grid">
    <div class="card"><h3>Claude.ai (web et mobile)</h3><p>Paramètres → Connecteurs → « Ajouter un connecteur personnalisé » →
    nom <code>RNCP</code>, URL <code>https://mcp-rncp.com/mcp</code>, pas d'authentification. Dans « Outils en lecture seule »,
    choisissez « Autoriser » pour ne plus confirmer chaque appel.</p></div>
    <div class="card"><h3>Claude Code</h3><pre><code>claude mcp add --transport http rncp https://mcp-rncp.com/mcp</code></pre></div>
    <div class="card"><h3>Cursor (<code>.cursor/mcp.json</code>), ChatGPT (mode développeur), Windsurf, VS Code…</h3>${CONNECT}</div>
  </div>
  <h3 style="margin-top:26px">Version locale — <code>npx -y mcp-rncp</code></h3>
  <p class="sub">Serveur stdio pour Claude Desktop et les IDE. Nécessite Node.js ≥ 22.16. Au premier lancement, la base SQLite
  (~90 Mo compressés) est téléchargée depuis mes releases GitHub, vérifiée (SHA-256) puis mise à jour chaque semaine en arrière-plan.</p>
<pre><code>{
  "mcpServers": {
    "rncp": { "command": "npx", "args": ["-y", "mcp-rncp"] }
  }
}</code></pre>
  <p class="small" style="color:var(--muted)">Options : <code>--db &lt;rncp.sqlite&gt;</code> (base locale), <code>--cache-dir</code>, <code>--update</code>, <code>--no-update</code>, <code>--help</code>.</p>
</section>

<section id="outils">
  <h2>Outils</h2>
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
</section>

<section id="prompts">
  <h2>Prompts et resources</h2>
  <ul>
    <li>Prompt <code>rediger_offre_edof</code> (numero, public, durée) : rédige objectifs pédagogiques, programme par bloc et
    liste des blocs à déclarer, uniquement à partir de la fiche.</li>
    <li>Prompt <code>verifier_certification</code> (numero, siret) : verdict de conformité validité + habilitation + blocs.</li>
    <li>Resource <code>rncp://glossaire</code> : RNCP, RS, niveaux, blocs, habilitations, CPF, EDOF, NSF, ROME.</li>
    <li>Resource <code>rncp://about</code> : source, licence, fraîcheur, couverture, limites.</li>
  </ul>
  <h3>Exemples de questions</h3>
  <div class="chat">
    <div class="bubble q">« Quelles certifications actives de niveau 5 en gestion de paie ? »</div>
    <div class="bubble q">« Le RNCP 37674 expire quand ? Combien de jours restants ? »</div>
    <div class="bubble q">« Qui est habilité sur le RS 5719 (SIREN commençant par 8) ? »</div>
    <div class="bubble q">« Compare le RNCP 36490 et le RNCP 37873 : blocs communs ? »</div>
    <div class="bubble q">« Quelles fiches informatique (NSF 326) ont été désactivées depuis le 1er juillet ? »</div>
  </div>
</section>

<section id="numeros">
  <h2>Numéros acceptés</h2>
  <p class="sub"><code>RNCP35419</code>, <code>35419</code>, <code>rncp 35419</code>, <code>RNCP-35419</code>, <code>RS5000</code>, ou l'URL de la fiche
  sur francecompetences.fr. Un nombre seul est cherché d'abord au RNCP puis au RS.</p>
</section>

<section id="reponses">
  <h2>Format des réponses</h2>
  <p class="sub">Chaque outil renvoie du JSON structuré (<code>structuredContent</code>) et un texte identique, avec systématiquement :
  <code>summary</code> (une phrase), <code>source</code> (France compétences, licence, URL du jeu de données, <code>data_updated_at</code>),
  <code>url_fiche</code> vers la fiche officielle et, quand un texte est coupé, <code>truncated: true</code>. Les erreurs sont
  explicites (numéro inconnu avec les variantes essayées, SIRET invalide).</p>
</section>

<section id="donnees">
  <h2>Données, fraîcheur, licence</h2>
  <p class="sub">Source : jeu de données « Répertoire national des certifications professionnelles et répertoire spécifique » de
  France compétences sur <a href="${SITE.dataset}" rel="noopener">data.gouv.fr</a>, flux XML V4.1, réutilisé sous
  Licence Ouverte 2.0 (mention de la source et de la date dans chaque réponse).</p>
  <div class="stats">
    <div class="stat"><b>${frDate(stats.source_date)}</b><span>export en service</span></div>
    <div class="stat"><b>${fmt(stats.count_total)}</b><span>fiches (${fmt(stats.count_rncp)} RNCP, ${fmt(stats.count_rs)} RS)</span></div>
    <div class="stat"><b>${fmt(stats.count_actives)}</b><span>actives</span></div>
    <div class="stat"><b>${fmt(stats.count_partenaires)}</b><span>lignes d'habilitation</span></div>
  </div>
  <p class="sub">Je réimporte l'export automatiquement chaque semaine (et à la demande) : parse du XML, construction d'une base
  SQLite/FTS5, publication en release GitHub pour la version locale, chargement dans Cloudflare D1 sans interruption
  (deux bases blue/green). Statut en direct : <a href="/health">/health</a>.</p>
</section>

<section id="limites">
  <h2>Limites</h2>
  <ul>
    <li>Pas de temps réel : l'âge des données est indiqué par <code>get_data_status</code> (≤ 7 jours en régime normal).</li>
    <li><code>eligible_cpf_estime</code> est une estimation ; l'éligibilité réelle dépend aussi de l'habilitation et du référencement EDOF.</li>
    <li>Recherche plein texte (pas sémantique) : préférez les termes de l'intitulé officiel ; les sigles courants (BTS, TP, RH, dev, MCO…) sont gérés.</li>
    <li>Non inclus en v1 : NPEC (prise en charge apprentissage), composition des jurys, référentiels PDF.</li>
    <li>Service hébergé limité à 60 requêtes/minute par IP ; usage intensif → <code>npx mcp-rncp</code> en local.</li>
  </ul>
</section>

<section id="faq">
  <h2>FAQ</h2>
  ${faqHtml}
</section>

<section id="auteur">
  <h2>Auteur et contact</h2>
  ${authorBlock}
  <p class="small" style="color:var(--muted);margin-top:12px">Bugs et idées : <a href="${SITE.repo}/issues" rel="noopener">issues GitHub</a>. Licence MIT.</p>
</section>
`;
  return layout({
    title: "Documentation mcp-rncp — installer et utiliser le serveur MCP RNCP / RS",
    description:
      "Mon guide complet du serveur MCP RNCP/RS : installation dans Claude, ChatGPT, Cursor ou en local (npx mcp-rncp), description des 9 outils, exemples de prompts, format des réponses, données France compétences, limites.",
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
> Je suis Arnaud Aldebert (https://arnaud-aldebert.dev), développeur fullstack & systèmes IA à Nîmes : je développe et maintiens ce serveur.

Endpoint MCP hébergé (Streamable HTTP, sans auth, 60 req/min/IP) : https://mcp-rncp.com/mcp
Version locale : npx -y mcp-rncp (Node ≥ 22.16)
Code (MIT) : ${SITE.repo}
Données : France compétences via data.gouv.fr, Licence Ouverte 2.0, export du ${stats.source_date ?? "?"} —
${stats.count_total ?? "?"} fiches, ${stats.count_actives ?? "?"} actives, ${stats.count_blocs ?? "?"} blocs, ${stats.count_partenaires ?? "?"} lignes d'habilitation. Réimport automatique hebdomadaire.

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
  const d = (stats.source_date ?? new Date().toISOString()).slice(0, 10);
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
