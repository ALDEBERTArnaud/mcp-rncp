# Licence des données

Les données servies par `mcp-rncp` proviennent du jeu de données **« Répertoire national des certifications
professionnelles et répertoire spécifique (RNCP et RS) »**, produit par **France compétences** et publié sur
data.gouv.fr :

https://www.data.gouv.fr/datasets/repertoire-national-des-certifications-professionnelles-et-repertoire-specifique
(identifiant `5eebbc067a14b6fecc9c9976`, flux XML V4.1, mise à jour quotidienne).

Elles sont réutilisées sous **Licence Ouverte / Open Licence 2.0** (Etalab) :
https://www.etalab.gouv.fr/licence-ouverte-open-licence

## Obligations respectées

- **Mention de la source** : chaque réponse d'outil porte un champ `source` (`France compétences (data.gouv.fr)`),
  la licence, l'URL du jeu de données et la date de l'export (`data_updated_at`). Chaque fiche renvoie
  `url_fiche` vers la fiche officielle sur francecompetences.fr.
- **Date de mise à jour** : `meta.source_date`, exposée par `get_data_status`, `/health` et la resource `rncp://about`.
- **Aucune altération du sens** : les champs sont copiés tels quels (dates converties en ISO, `Oui`/`Non` en 1/0,
  codes de niveau `NIVx` en entiers). Le texte des compositions de jury n'est pas repris en v1.

## Ce que ce projet n'est pas

- Ce n'est pas un service de France compétences ni de l'État. Les seules données faisant foi sont celles publiées
  sur https://www.francecompetences.fr/recherche/.
- Aucune donnée personnelle : les SIRET et raisons sociales des certificateurs et partenaires sont des données
  publiques d'entreprises.

## Le code

Le code de `mcp-rncp` (ce dépôt) est sous licence **MIT** (voir `LICENSE`).
