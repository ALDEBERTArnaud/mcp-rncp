import type { McpServer } from "@modelcontextprotocol/server";
import type { Db } from "./db.ts";
import { DATASET_URL } from "./format.ts";
import { getMeta } from "./queries.ts";

export const GLOSSAIRE = `# Glossaire RNCP / RS

- **RNCP** — Répertoire national des certifications professionnelles : diplômes, titres à finalité professionnelle et CQP reconnus par l'État, classés par niveau (3 à 8) et domaine (NSF). Géré par France compétences.
- **RS** — Répertoire spécifique : certifications et habilitations correspondant à des compétences complémentaires (langues, bureautique, sécurité, habilitations réglementaires). Pas de niveau de qualification.
- **Fiche active / inactive** — Active tant que l'enregistrement est en cours ; passe inactive le lendemain de la date d'échéance d'enregistrement. Une fiche inactive n'accepte plus de nouveaux candidats (parcours en cours autorisés jusqu'à la date limite de délivrance).
- **Enregistrement de droit** — diplômes délivrés au nom de l'État (Éducation nationale, Enseignement supérieur, etc.). **Enregistrement sur demande** — titres et CQP examinés par France compétences, durée 1 à 5 ans.
- **Niveau** — 3 : CAP/BEP · 4 : Bac · 5 : Bac+2 (BTS/DUT) · 6 : Bac+3/4 (licence, BUT) · 7 : Bac+5 (master, ingénieur) · 8 : doctorat.
- **Bloc de compétences** — ensemble homogène de compétences évaluable et validable séparément (code \`RNCPxxxxxBCyy\`). Obligatoire pour toute fiche RNCP enregistrée depuis 2019 ; les fiches RS n'en ont pas. Depuis le 11/06/2026 les organismes doivent déclarer dans EDOF les blocs visés par chaque offre RNCP ; à partir du 22/10/2026 les offres non renseignées deviennent invisibles sur Mon Compte Formation.
- **Certificateur** — organisme (ou ministère) propriétaire de la certification, qui délivre le parchemin.
- **Partenaire habilité** — organisme autorisé par le certificateur à **former** (HABILITATION_FORMER), à **organiser l'évaluation** (HABILITATION_ORGANISER) ou les deux (HABILITATION_ORGA_FORM). État Actif / Inactif (fiche inactive) / Supprimé (habilitation retirée).
- **SIRET** — identifiant d'établissement à 14 chiffres (SIREN à 9 chiffres + NIC). Les habilitations sont attachées au SIRET.
- **NSF** — Nomenclature des spécialités de formation (ex. 326 informatique, 310 gestion, 331 santé). **ROME** — code métier France Travail (ex. M1805 études et développement informatique). **Formacode** — thésaurus Centre Inffo.
- **CPF** — Compte personnel de formation. Une certification RNCP/RS active est éligible au CPF en principe ; l'organisme doit être habilité (ou certificateur) et référencé sur EDOF.
- **EDOF** — Espace des organismes de formation, back-office de Mon Compte Formation.
- **NPEC** — Niveau de prise en charge des contrats d'apprentissage (par certification et branche IDCC). Non inclus dans cette version.
- **VAE** — Validation des acquis de l'expérience, l'une des voies d'accès (FI formation initiale, CA apprentissage, FC formation continue, CQ contrat de professionnalisation, CL candidature libre, VAE).
`;

export function registerResources(server: McpServer, deps: { db: Db; version: string }): void {
  server.registerResource(
    "glossaire",
    "rncp://glossaire",
    {
      title: "Glossaire RNCP / RS (FR)",
      description:
        "Definitions of RNCP/RS concepts: registers, levels, blocs, habilitations, CPF, EDOF, NSF/ROME.",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: GLOSSAIRE }] }),
  );

  server.registerResource(
    "about",
    "rncp://about",
    {
      title: "About this server: source, licence, freshness, limits",
      description:
        "Data provenance (France compétences via data.gouv.fr), licence, last update, coverage and known limits.",
      mimeType: "text/markdown",
    },
    async (uri) => {
      const meta = await getMeta(deps.db);
      const text = `# mcp-rncp ${deps.version}

Serveur MCP en lecture seule sur le RNCP et le RS (certifications professionnelles françaises).

- **Source** : ${meta.source ?? "France compétences (data.gouv.fr)"} — ${DATASET_URL}
- **Licence des données** : ${meta.licence ?? "Licence Ouverte / Open Licence 2.0"} — mention obligatoire « Source : France compétences (data.gouv.fr), export du ${meta.source_date} ».
- **Fraîcheur** : export du ${meta.source_date} (flux XML V${meta.flux_version}), ingéré le ${meta.ingested_at} (run ${meta.run_id}).
- **Couverture** : ${meta.count_total} fiches (${meta.count_actives} actives) — RNCP ${meta.count_rncp}, RS ${meta.count_rs} ; ${meta.count_blocs} blocs ; ${meta.count_partenaires} lignes partenaires.
- **Fiches officielles** : https://www.francecompetences.fr/recherche/rncp/{numéro}/ — toujours citée dans \`url_fiche\`.

## Limites
- Données rejouées de l'export public : pas de temps réel, pas d'accès aux référentiels PDF ni aux décisions individuelles.
- \`eligible_cpf_estime\` est une estimation (fiche active) : l'éligibilité effective dépend aussi de l'habilitation et du référencement EDOF de l'organisme.
- Le texte de composition des jurys et le NPEC ne sont pas inclus en v1.
- Recherche plein texte (FTS5 + synonymes), pas de recherche sémantique.
- Aucune donnée personnelle : SIRET et raisons sociales publiques uniquement.

Code : https://github.com/ALDEBERTArnaud/mcp-rncp (MIT).
`;
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text }] };
    },
  );
}
