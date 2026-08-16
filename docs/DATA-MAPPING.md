# Mapping des données — flux XML V4.1 → SQLite/D1

Figé le 16/08/2026 à partir de :

- XSD `rncp-rs-france-competence-v4.1.xsd` (data.gouv, 02/01/2025)
- Dictionnaire de données v3.1 (16/03/2023 — dernier publié, V4.1 n'ajoute pas de balise structurelle)
- Inventaire réel des balises sur l'export du 16/08/2026 (30 475 fiches, 100 % conforme au XSD)

Source des données : jeu data.gouv `5eebbc067a14b6fecc9c9976`, producteur France compétences,
Licence Ouverte 2.0. Deux zips par jour : `export-fiches-rncp-v4-1-AAAA-MM-JJ.zip` et
`export-fiches-rs-v4-1-AAAA-MM-JJ.zip`, chacun contenant un XML `export_fiches_{RNCP|RS}_V4_1_AAAA-MM-JJ.xml`.

## Racine

```
FICHES
  VERSION_FLUX          "4.1"                → meta.flux_version
  FICHE (×N)
```

## Table `certifications` (1 ligne par FICHE)

Dates XML au format `JJ/MM/AAAA` → stockées ISO `AAAA-MM-JJ` (tri et comparaison SQL).
`Oui`/`Non` → `1`/`0`. Textes CDATA : HTML déjà retiré à la source, `<br>` = retour chariot.

| Colonne | Balise XML | Type | Notes |
|---|---|---|---|
| `numero` PK | `NUMERO_FICHE` | TEXT | `RNCP34762`, `RS5000`. Unique dans le flux. |
| `id_fiche` | `ID_FICHE` | INT | id technique |
| `repertoire` | — (fichier source) | TEXT | `RNCP` ou `RS` |
| `intitule` | `INTITULE` | TEXT | ≤ 800 car. |
| `abrege_code` | `ABREGE/CODE` | TEXT | ex. `DipViGrM`, `BTS`, `CQP` — absent sur ~47 % des fiches |
| `abrege_libelle` | `ABREGE/LIBELLE` | TEXT | |
| `etat_fiche` | `ETAT_FICHE` | TEXT | `Publiée` \| `Dépubliée/Archivée` \| `Modifications à valider` \| `Modifications à valider par le ministère` |
| `actif` | `ACTIF` | INT | 1 = enregistrement en cours. Passe à 0 à J+1 de `date_fin_enregistrement`. **C'est le champ « statut »** des outils. |
| `type_enregistrement` | `TYPE_ENREGISTREMENT` | TEXT | `Enregistrement de droit` \| `Enregistrement sur demande` |
| `niveau` | `NOMENCLATURE_EUROPE/NIVEAU` | INT | `NIV3`…`NIV8` → 3…8 ; `AUCUN` ou absent (RS) → NULL |
| `niveau_libelle` | `NOMENCLATURE_EUROPE/LIBELLE` | TEXT | |
| `date_fin_enregistrement` | `DATE_FIN_ENREGISTREMENT` | TEXT | échéance. NULL sur fiches de droit inactives < 2019 |
| `date_publication` | `DATE_DE_PUBLICATION` | TEXT | fiches de droit uniquement |
| `date_effet` | `DATE_EFFET` | TEXT | fiches de droit uniquement |
| `date_decision` | `DATE_DECISION` | TEXT | fiches sur demande |
| `date_dernier_jo` | `DATE_DERNIER_JO` | TEXT | |
| `date_limite_delivrance` | `DATE_LIMITE_DELIVRANCE` | TEXT | |
| `duree_enregistrement` | `DUREE_ENREGISTREMENT` | INT | années |
| `activites_visees` | `ACTIVITES_VISEES` | TEXT | ≤ 32 Ko |
| `competences_attestees` | `CAPACITES_ATTESTEES` | TEXT | ≤ 64 Ko. Nom de colonne aligné sur le vocabulaire public (« compétences attestées ») |
| `secteurs_activite` | `SECTEURS_ACTIVITE` | TEXT | |
| `type_emploi_accessibles` | `TYPE_EMPLOI_ACCESSIBLES` | TEXT | |
| `objectifs_contexte` | `OBJECTIFS_CONTEXTE` | TEXT | requis |
| `reglementations_activites` | `REGLEMENTATIONS_ACTIVITES` | TEXT | |
| `prerequis_entree_formation` | `PREREQUIS_ENTREE_FORMATION` | TEXT | |
| `prerequis_validation` | `PREREQUIS_VALIDATION_CERTIFICATION` | TEXT | |
| `validation_partielle` | `VALIDATION_PARTIELLE` | INT | Oui/Non → 1/0, NULL si absent |
| `validation_partielle_perimetre` | `VALIDATION_PARTIELLE_PERIMETRE` | TEXT | |
| `existence_partenaires` | `EXISTENCE_PARTENAIRES` | INT | |
| `accessible_nc` | `ACCESSIBLE_NOUVELLE_CALEDONIE` | INT | |
| `accessible_pf` | `ACCESSIBLE_POLYNESIE_FRANCAISE` | INT | |
| `lien_url_description` | `LIEN_URL_DESCRIPTION` | TEXT | URL du certificateur |
| `voies_acces_json` | `SI_JURY_FI/CA/FC/CQ/CL/VAE` | TEXT JSON | `{"FI":{"actif":1,"date":"…"},…}`. `COMPOSITION` (texte jury, 34 Mo) **non stocké** en v1 |
| `codes_nsf_json` | `CODES_NSF/NSF{CODE,LIBELLE}` | TEXT JSON | ≤ 3 |
| `codes_rome_json` | `CODES_ROME/ROME{CODE,LIBELLE}` | TEXT JSON | ≤ 5 |
| `formacodes_json` | `FORMACODES/FORMACODE{CODE,LIBELLE}` | TEXT JSON | ≤ 5 |
| `idcc_json` | `CODES_IDCC/IDCC{CODE,LIBELLE}` | TEXT JSON | rare (202 fiches) |
| `ccn_json` | `CCN_1..3{NUMERO,LIBELLE}` | TEXT JSON | |
| `textes_json` | `PUBLICATION_DECRET_GENERAL/CREATION/AUTRE → PUBLICATION_JO{TITRE,DATE_PUBLICATION_JO}` | TEXT JSON | `{"general":[…],"creation":[…],"autre":[…]}` |
| `anciennes_json` | `ANCIENNES_CERTIFICATIONS/ANCIENNE_CERTIFICATION/ID_FICHE_ANCIENNE_CERTIFICATION` | TEXT JSON | numéros remplacés |
| `nouvelles_json` | `NOUVELLES_CERTIFICATIONS/NOUVELLE_CERTIFICATION/ID_FICHE_NOUVELLE_CERTIFICATION` | TEXT JSON | numéros remplaçants |
| `correspondances_json` | `CORRESPONDANCES/CORRESPONDANCE{SOURCE/BLOC_COMPETENCES/CODE[], DESTINATION{NUMERO_FICHE, BLOC_COMPETENCES/CODE[]}}` | TEXT JSON | équivalences de blocs |
| `stats_json` | `STATISTIQUES_PROMOTIONS/STATISTIQUES_PROMOTION{ANNEE,NOMBRE_CERTIFIES,NOMBRE_CERTIFIES_VAE,TAUX_INSERTION_*}` | TEXT JSON | |
| `url_fiche` | dérivé | TEXT | `https://www.francecompetences.fr/recherche/{rncp\|rs}/{n}/` — vérifié 200 le 16/08/2026 |
| `content_hash` | dérivé | TEXT | sha256 du fragment XML `<FICHE>` normalisé — détection de changement |

Non retenus en v1 : `NIVEAU_MAITRISE_COMPETENCES`, `DUREE_VALIDITE`, `MODALITES_RENOUVELLEMENT`,
`ANNEES_PROMOTIONS_NIVEAU`, `SI_JURY_*/COMPOSITION` (faible valeur outil, 34 Mo).

## Table `certificateurs` (N par fiche, `CERTIFICATEURS/CERTIFICATEUR`)

| Colonne | Balise |
|---|---|
| `numero` FK | fiche parente |
| `nom` | `NOM_CERTIFICATEUR` |
| `siret` | `SIRET_CERTIFICATEUR` (14 chiffres, absent sur ~31 %) |
| `etat` | `ETAT_CERTIFICATEUR` `Actif`/`Inactif` |
| `date_modif_etat` | `DATE_DERNIERE_MODIFICATION_ETAT` |
| `nom_commercial` | `NOM_COMMERCIAL` |
| `site_internet` | `SITE_INTERNET` |

## Table `partenaires` (N par fiche, `PARTENAIRES/PARTENAIRE`) — 397 774 lignes

| Colonne | Balise | Valeurs |
|---|---|---|
| `numero` FK | fiche parente | |
| `nom` | `NOM_PARTENAIRE` | |
| `siret` | `SIRET_PARTENAIRE` | 14 chiffres, quasi toujours présent |
| `habilitation` | `HABILITATION_PARTENAIRE` | `HABILITATION_FORMER` (former) \| `HABILITATION_ORGANISER` (organiser l'évaluation) \| `HABILITATION_ORGA_FORM` (les deux) |
| `etat` | `ETAT_HABILITATION` | `Actif` \| `Inactif` (= fiche inactive) \| `Supprimé` (habilitation retirée) |
| `date_actif` | `DATE_ACTIF` | passage à Actif |
| `date_modif_etat` | `DATE_DERNIERE_MODIFICATION_ETAT` | dernier changement d'état |

Index `partenaires(siret)`, `partenaires(numero)`.
`check_habilitation` = `etat='Actif'` **et** fiche `actif=1`. Rôles exposés : `former`, `evaluer`
(ORGANISER), les deux pour ORGA_FORM.

## Table `blocs` (N par fiche, `BLOCS_COMPETENCES/BLOC_COMPETENCES`) — 55 761 lignes

| Colonne | Balise |
|---|---|
| `code` | `CODE` — `RNCPnnnnnBCnn`. PK composite `(numero, code)` : un doublon réel (`01` sur RNCP40505 et RNCP40080) |
| `numero` FK | fiche parente |
| `ordre` | position dans le flux (1..n) |
| `intitule` | `LIBELLE` |
| `competences` | `LISTE_COMPETENCES` |
| `modalites_evaluation` | `MODALITES_EVALUATION` |
| `prerequis_entree` | `PREREQUIS_ENTREE_FORMATION_BLOC` |
| `prerequis_validation` | `PREREQUIS_VALIDATION_BLOC` |

Les fiches RS n'ont pas de blocs (0 attendu). Attention : `CORRESPONDANCE/.../BLOC_COMPETENCES` est
un autre élément (code seul), pas un bloc.

## FTS5

`certifications_fts` = table FTS5 à **contenu externe** (`content='certifications'`), colonnes
`numero`, `intitule`, `abrege_code`, `abrege_libelle`, `competences_attestees`, `activites_visees`,
`tokenize='unicode61 remove_diacritics 2'`. Contenu externe = pas de duplication des ~100 Mo de texte.

## `meta`

`source_date` (date du zip), `flux_version`, `run_id`, `ingested_at`, `count_total`, `count_actives`,
`count_rncp`, `count_rs`, `count_blocs`, `count_partenaires`, `xml_sha256_rncp`, `xml_sha256_rs`.

## Chiffres de référence (export 16/08/2026)

| | total | actives |
|---|---|---|
| RNCP | 25 638 | 5 518 |
| RS | 4 837 | 1 471 |
| **Total** | **30 475** | **6 989** |

Actives par niveau : 3 → 636, 4 → 790, 5 → 683, 6 → 1 349, 7 → 2 059, 8 → 1, sans niveau (RS) → 1 471.
Certificateurs 65 867 · partenaires 397 774 (dont 304 855 `Actif`) · blocs 55 761 · SIRET partenaires distincts 34 036.
