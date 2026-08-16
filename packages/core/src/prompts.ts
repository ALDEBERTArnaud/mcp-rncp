import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "rediger_offre_edof",
    {
      title: "Rédiger une offre EDOF (FR)",
      description:
        "Drafts the pedagogical objectives, programme outline and blocs section of an EDOF / Mon Compte Formation offer from an RNCP sheet. Args: numero, public (target audience), duree (hours).",
      argsSchema: z.object({
        numero: z.string().describe("RNCP number, e.g. RNCP37674"),
        public: z
          .string()
          .optional()
          .describe("Target audience, e.g. 'demandeurs d'emploi en reconversion'"),
        duree: z.string().optional().describe("Training duration, e.g. '400 heures'"),
      }),
    },
    ({ numero, public: pub, duree }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Tu es un ingénieur pédagogique. Objectif : rédiger le contenu d'une offre de formation pour EDOF (Mon Compte Formation) préparant à la certification ${numero}.

Étapes :
1. Appelle \`check_validity\` sur ${numero}. Si la fiche est inactive ou expire dans moins de 90 jours, préviens-moi avant de continuer et propose la fiche remplaçante s'il y en a une.
2. Appelle \`get_certification\` (full=true) puis \`list_blocs\`.
3. Rédige, en français, sans inventer de contenu absent de la fiche :
   - **Objectifs pédagogiques** : reformule les compétences attestées en objectifs observables (verbes d'action), regroupés par bloc.
   - **Programme** : un module par bloc de compétences, avec le code RNCPxxxxxBCyy exact, l'intitulé officiel et 3-6 contenus issus de la liste des compétences.
   - **Modalités d'évaluation** : reprends les modalités d'évaluation de chaque bloc.
   - **Blocs à déclarer dans EDOF** : liste finale des codes de blocs visés (obligatoire depuis le 11/06/2026, offres invisibles à partir du 22/10/2026 sinon).
   - **Prérequis** et **débouchés** (types d'emplois accessibles, codes ROME).
${pub ? `Public visé : ${pub}.` : ""}${duree ? ` Durée prévue : ${duree}.` : ""}
4. Termine par un rappel : « Source : France compétences (data.gouv.fr), export du <date> » avec la date renvoyée par l'outil, et l'URL de la fiche officielle.`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "verifier_certification",
    {
      title: "Vérifier une certification (FR)",
      description:
        "Compliance check before selling or funding a training: validity, expiry, replacement, blocs, and (optionally) whether a SIRET is habilitated. Args: numero, siret (optional).",
      argsSchema: z.object({
        numero: z.string().describe("RNCP or RS number"),
        siret: z.string().optional().describe("SIRET of the training organism to check"),
      }),
    },
    ({ numero, siret }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Vérifie la certification ${numero} comme le ferait un référent Qualiopi / financeur.

1. \`check_validity\` : statut, date d'échéance, jours restants, fiche remplaçante.
${siret ? `2. \`check_habilitation\` avec le SIRET ${siret} : habilité ou non, pour former et/ou évaluer, ou certificateur.` : "2. `list_partenaires` (limit 10) pour donner un aperçu des organismes habilités."}
3. \`list_blocs\` : nombre de blocs et codes.
4. Rends un verdict clair en français : ✅ / ⚠️ / ❌ avec les motifs, les dates exactes, et ce qu'il faut faire (renouvellement, fiche remplaçante, demande d'habilitation).
5. Cite la source et la date des données (champ \`source\` des réponses) et l'URL de la fiche officielle.`,
          },
        },
      ],
    }),
  );
}
