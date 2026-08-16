// Single source of truth for the SQLite/D1 schema. See docs/DATA-MAPPING.md.
export const SCHEMA_SQL = `
CREATE TABLE certifications (
  id INTEGER PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  id_fiche INTEGER,
  repertoire TEXT NOT NULL,
  intitule TEXT NOT NULL,
  abrege_code TEXT,
  abrege_libelle TEXT,
  etat_fiche TEXT NOT NULL,
  actif INTEGER NOT NULL,
  type_enregistrement TEXT,
  niveau INTEGER,
  niveau_libelle TEXT,
  date_fin_enregistrement TEXT,
  date_publication TEXT,
  date_effet TEXT,
  date_decision TEXT,
  date_dernier_jo TEXT,
  date_limite_delivrance TEXT,
  duree_enregistrement INTEGER,
  activites_visees TEXT,
  competences_attestees TEXT,
  secteurs_activite TEXT,
  type_emploi_accessibles TEXT,
  objectifs_contexte TEXT,
  reglementations_activites TEXT,
  prerequis_entree_formation TEXT,
  prerequis_validation TEXT,
  validation_partielle INTEGER,
  validation_partielle_perimetre TEXT,
  existence_partenaires INTEGER,
  accessible_nc INTEGER,
  accessible_pf INTEGER,
  lien_url_description TEXT,
  voies_acces_json TEXT,
  codes_nsf_json TEXT,
  codes_rome_json TEXT,
  formacodes_json TEXT,
  idcc_json TEXT,
  ccn_json TEXT,
  textes_json TEXT,
  anciennes_json TEXT,
  nouvelles_json TEXT,
  correspondances_json TEXT,
  stats_json TEXT,
  url_fiche TEXT NOT NULL,
  content_hash TEXT NOT NULL
);
CREATE INDEX idx_cert_actif_niveau ON certifications(actif, niveau);
CREATE INDEX idx_cert_date_fin ON certifications(date_fin_enregistrement);
CREATE INDEX idx_cert_repertoire ON certifications(repertoire);

CREATE TABLE certificateurs (
  id INTEGER PRIMARY KEY,
  numero TEXT NOT NULL,
  nom TEXT NOT NULL,
  siret TEXT,
  etat TEXT,
  date_modif_etat TEXT,
  nom_commercial TEXT,
  site_internet TEXT
);
CREATE INDEX idx_certificateurs_numero ON certificateurs(numero);
CREATE INDEX idx_certificateurs_siret ON certificateurs(siret);

CREATE TABLE partenaires (
  id INTEGER PRIMARY KEY,
  numero TEXT NOT NULL,
  nom TEXT NOT NULL,
  siret TEXT,
  habilitation TEXT NOT NULL,
  etat TEXT NOT NULL,
  date_actif TEXT,
  date_modif_etat TEXT
);
CREATE INDEX idx_partenaires_numero ON partenaires(numero);
CREATE INDEX idx_partenaires_siret ON partenaires(siret);

CREATE TABLE blocs (
  numero TEXT NOT NULL,
  code TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  intitule TEXT NOT NULL,
  competences TEXT,
  modalites_evaluation TEXT,
  prerequis_entree TEXT,
  prerequis_validation TEXT,
  PRIMARY KEY (numero, code)
);
CREATE INDEX idx_blocs_code ON blocs(code);

CREATE TABLE changes (
  id INTEGER PRIMARY KEY,
  run_date TEXT NOT NULL,
  numero TEXT NOT NULL,
  change_type TEXT NOT NULL,
  diff_json TEXT
);
CREATE INDEX idx_changes_run_date ON changes(run_date);

CREATE TABLE synonymes (
  terme TEXT PRIMARY KEY,
  expansion TEXT NOT NULL
);

CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE VIRTUAL TABLE certifications_fts USING fts5(
  numero, intitule, abrege_libelle, competences_attestees, activites_visees,
  content='certifications', content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);
`;

// content= FTS tables need triggers only when the base table changes after build; we rebuild once.
export const FTS_REBUILD_SQL = `INSERT INTO certifications_fts(certifications_fts) VALUES('rebuild');`;
