# Post de lancement — prêt à publier

Chiffres calculés sur l'export France compétences du 16/08/2026 (requêtes en bas de page ; à rafraîchir le jour J
avec `bun run eval:full` ou les SQL ci-dessous sur `.data/out/rncp.sqlite`).

## LinkedIn (FR) — version finale

J'ai passé les derniers jours à construire un truc dont j'avais besoin depuis longtemps.

Si vous êtes organisme de formation, OPCO, RH ou CFA, vous vous êtes déjà posé ces questions :
« Le RNCP 35419 est-il encore actif ? », « Mon SIRET est-il habilité pour former ET évaluer ? »,
« Quels blocs de compétences dois-je cocher dans EDOF ? »

Les réponses sont publiques… dans un XML de 570 Mo mis à jour chaque nuit sur data.gouv.fr.

J'ai donc créé **mcp-rncp** : un serveur MCP open source qui met le RNCP et le RS de France compétences directement
dans Claude, ChatGPT ou Cursor. Vous posez la question en français, vous obtenez une réponse sourcée et datée.

Un chiffre pour situer l'enjeu : **614 certifications RNCP actives arrivent à échéance avant le 22 octobre 2026**,
date à laquelle les offres sans blocs de compétences renseignés dans EDOF deviennent invisibles sur Mon Compte
Formation. Et 244 fiches RNCP actives n'ont aucun bloc publié.

Ce que ça fait :
• Vérifier la validité et l'échéance d'une fiche, et trouver la fiche remplaçante
• Vérifier si un SIRET est habilité, pour former ou évaluer
• Lister les blocs de compétences prêts pour EDOF
• Rechercher par niveau, domaine NSF, code ROME ; comparer deux certifications ; suivre les changements

Gratuit, sans clé API, sans compte, zéro LLM côté serveur, données ouvertes (Licence Ouverte 2.0) rafraîchies
chaque semaine. Code MIT.

→ Hébergé : https://mcp-rncp.com (URL connecteur : https://mcp-rncp.com/mcp)
→ Local : npx -y mcp-rncp
→ Code : https://github.com/ALDEBERTArnaud/mcp-rncp

Côté technique, pour les curieux : Cloudflare Workers + D1 (blue/green), SQLite FTS5 + synonymes, SDK MCP v2,
ingestion hebdo par GitHub Actions, évals de recherche à 96 % de recall@5 sur des questions réelles.

Je prépare une version Pro (vérification de catalogue en masse, alertes d'expiration et de retrait
d'habilitation, rapport de conformité EDOF/Qualiopi). Si ça vous parle, dites-le moi en commentaire ou en MP :
je construis avec les premiers intéressés.

#RNCP #FranceCompetences #EDOF #CPF #Qualiopi #FormationProfessionnelle #MCP #IA #OpenData #Claude

## Message court (groupes, MP) — 10 envois ciblés

Bonjour, je viens de mettre en ligne un outil gratuit qui répond en une question dans Claude/ChatGPT :
« cette fiche RNCP est-elle active ? », « mon SIRET est-il habilité ? », « quels blocs déclarer dans EDOF ? ».
614 fiches actives expirent avant l'échéance EDOF du 22/10. Si vous préparez vos offres, je serais preneur de vos
retours : https://mcp-rncp.com — Arnaud

Cibles : groupes LinkedIn/Facebook Qualiopi & EDOF, réseaux OF/CFA (FFP, Les Acteurs de la Compétence,
Synofdes), OPCO (Akto, Atlas, Opco EP), éditeurs SIRH/LMS/edtech, communautés MCP/Claude FR.

## Requêtes SQL des chiffres

```sql
SELECT count(*) FROM certifications WHERE actif=1 AND repertoire='RNCP'
  AND date_fin_enregistrement BETWEEN date('now') AND '2026-10-22';                 -- 614 (au 16/08)
SELECT repertoire, count(*) FROM certifications WHERE actif=1
  AND date_fin_enregistrement BETWEEN date('now') AND '2026-12-31' GROUP BY 1;     -- 791 RNCP + 285 RS
SELECT count(*) FROM certifications c WHERE actif=1 AND repertoire='RNCP'
  AND NOT EXISTS (SELECT 1 FROM blocs b WHERE b.numero=c.numero);                  -- 244
SELECT count(DISTINCT siret) FROM partenaires p JOIN certifications c ON c.numero=p.numero
  WHERE c.actif=1 AND p.etat='Actif';                                              -- 20 257
```
