# Post de lancement (brouillon) — chiffres issus de l'export du 16/08/2026

## Chiffre inédit

**614 certifications RNCP actives arrivent à échéance entre aujourd'hui et le 22 octobre 2026** — la date à laquelle
les offres sans blocs de compétences renseignés deviennent invisibles sur Mon Compte Formation.
D'ici le 31/12/2026 : **1 076 fiches actives expirent** (791 RNCP + 285 RS), dont 353 de niveau 7 et 216 de niveau 6.
Et **244 fiches RNCP actives n'ont aucun bloc de compétences** publié.

(Requêtes SQL reproductibles sur `rncp.sqlite` : voir `docs/LAUNCH-POST.md` dans le repo.)

## LinkedIn (FR)

Vous êtes organisme de formation, OPCO, RH ? Vous avez déjà cherché « le RNCP 35419 est-il encore actif ? »
ou « mon SIRET est-il habilité pour former ET évaluer ? » dans un XML de 570 Mo…

J'ai publié **mcp-rncp** : un serveur MCP open source qui met le RNCP et le RS de France compétences directement dans
Claude, ChatGPT ou Cursor.

Un chiffre pour commencer : **614 certifications RNCP actives expirent avant le 22 octobre 2026**, échéance à
laquelle les offres sans blocs de compétences renseignés dans EDOF disparaissent de Mon Compte Formation.

Ce que ça fait, en langage naturel :
- « Le RNCP 37674 est-il actif, jusqu'à quand, remplacé par quoi ? »
- « Le SIRET 8805… est-il habilité sur cette fiche, pour former ou évaluer ? »
- « Liste-moi les blocs à cocher dans EDOF. »
- « Certifications actives niveau 6 en cybersécurité, compare les deux premières. »

Zéro clé API, zéro LLM côté serveur, réponses sourcées et datées (données ouvertes France compétences, Licence
Ouverte 2.0, rafraîchies chaque semaine).

- Local : `npx -y mcp-rncp`
- Hébergé : https://mcp-rncp.com/mcp
- Code (MIT) : https://github.com/ALDEBERTArnaud/mcp-rncp

Retours bienvenus, surtout des OF/CFA qui préparent l'échéance EDOF. Une v2 « Pro » (vérification de catalogue en
masse, alertes d'expiration et de retrait d'habilitation, export EDOF) est en réflexion : dites-moi ce qui vous
ferait gagner du temps.

#RNCP #FranceCompetences #EDOF #CPF #Qualiopi #MCP #IA #Formation

## 10 messages ciblés (canevas)

Groupes LinkedIn/Facebook Qualiopi & EDOF, réseaux OF/CFA, OPCO, éditeurs SIRH/edtech :

« Bonjour, je viens de publier un outil gratuit qui vérifie en une question la validité d'une fiche RNCP, l'habilitation
d'un SIRET et les blocs à renseigner dans EDOF (échéance 22/10). Ça s'utilise dans Claude/ChatGPT/Cursor. Si vous
préparez vos offres pour l'échéance, je serais preneur de vos retours : [lien]. »

## Requêtes SQL des chiffres

```sql
-- RNCP actives expirant avant l'échéance EDOF
SELECT count(*) FROM certifications WHERE actif=1 AND repertoire='RNCP'
  AND date_fin_enregistrement BETWEEN '2026-08-17' AND '2026-10-22';           -- 614
-- Actives expirant d'ici fin 2026, par répertoire et par niveau
SELECT repertoire, niveau, count(*) FROM certifications WHERE actif=1
  AND date_fin_enregistrement BETWEEN '2026-08-17' AND '2026-12-31' GROUP BY 1,2;
-- RNCP actives sans bloc
SELECT count(*) FROM certifications c WHERE actif=1 AND repertoire='RNCP'
  AND NOT EXISTS (SELECT 1 FROM blocs b WHERE b.numero=c.numero);              -- 244
-- SIRET distincts habilités sur des fiches actives
SELECT count(DISTINCT siret) FROM partenaires p JOIN certifications c ON c.numero=p.numero
  WHERE c.actif=1 AND p.etat='Actif';                                          -- 20 257
```
