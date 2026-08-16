import type { Db, SqlParam } from "./db.ts";
import { buildMatch, tokenize } from "./fts.ts";

export type CertRow = {
  numero: string;
  repertoire: "RNCP" | "RS";
  intitule: string;
  abrege_code: string | null;
  abrege_libelle: string | null;
  etat_fiche: string;
  actif: number;
  type_enregistrement: string | null;
  niveau: number | null;
  niveau_libelle: string | null;
  date_fin_enregistrement: string | null;
  date_publication: string | null;
  date_effet: string | null;
  date_decision: string | null;
  date_limite_delivrance: string | null;
  duree_enregistrement: number | null;
  activites_visees: string | null;
  competences_attestees: string | null;
  secteurs_activite: string | null;
  type_emploi_accessibles: string | null;
  objectifs_contexte: string | null;
  reglementations_activites: string | null;
  prerequis_entree_formation: string | null;
  prerequis_validation: string | null;
  validation_partielle: number | null;
  validation_partielle_perimetre: string | null;
  lien_url_description: string | null;
  voies_acces_json: string;
  codes_nsf_json: string;
  codes_rome_json: string;
  formacodes_json: string;
  idcc_json: string;
  textes_json: string;
  anciennes_json: string;
  nouvelles_json: string;
  correspondances_json: string;
  stats_json: string;
  url_fiche: string;
};

export type CertificateurRow = {
  nom: string;
  siret: string | null;
  etat: string | null;
  nom_commercial: string | null;
  site_internet: string | null;
};

export type PartenaireRow = {
  nom: string;
  siret: string | null;
  habilitation: string;
  etat: string;
  date_actif: string | null;
  date_modif_etat: string | null;
};

export type BlocRow = {
  code: string;
  ordre: number;
  intitule: string;
  competences: string | null;
  modalites_evaluation: string | null;
  prerequis_entree: string | null;
  prerequis_validation: string | null;
};

export type SearchHit = {
  numero: string;
  intitule: string;
  repertoire: string;
  niveau: number | null;
  actif: number;
  date_fin_enregistrement: string | null;
  abrege_libelle: string | null;
  score: number;
};

export type Meta = Record<string, string>;

const CERT_COLS = `numero, repertoire, intitule, abrege_code, abrege_libelle, etat_fiche, actif, type_enregistrement,
  niveau, niveau_libelle, date_fin_enregistrement, date_publication, date_effet, date_decision, date_limite_delivrance,
  duree_enregistrement, activites_visees, competences_attestees, secteurs_activite, type_emploi_accessibles,
  objectifs_contexte, reglementations_activites, prerequis_entree_formation, prerequis_validation, validation_partielle,
  validation_partielle_perimetre, lien_url_description, voies_acces_json, codes_nsf_json, codes_rome_json, formacodes_json,
  idcc_json, textes_json, anciennes_json, nouvelles_json, correspondances_json, stats_json, url_fiche`;

export async function getMeta(db: Db): Promise<Meta> {
  const rows = await db.all<{ key: string; value: string }>("SELECT key, value FROM meta");
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

let synonymesCache: Map<string, string> | null = null;
export async function getSynonymes(db: Db): Promise<Map<string, string>> {
  if (synonymesCache) return synonymesCache;
  const rows = await db.all<{ terme: string; expansion: string }>(
    "SELECT terme, expansion FROM synonymes",
  );
  synonymesCache = new Map(rows.map((r) => [r.terme, r.expansion]));
  return synonymesCache;
}

export async function getCertification(db: Db, numero: string): Promise<CertRow | undefined> {
  return db.get<CertRow>(`SELECT ${CERT_COLS} FROM certifications WHERE numero = ?`, [numero]);
}

// Resolves the first existing numero among candidates (RNCPn then RSn for bare numbers).
export async function resolveNumero(db: Db, candidates: string[]): Promise<string | undefined> {
  for (const c of candidates) {
    const row = await db.get<{ numero: string }>(
      "SELECT numero FROM certifications WHERE numero = ?",
      [c],
    );
    if (row) return row.numero;
  }
  return undefined;
}

export async function getCertificateurs(db: Db, numero: string): Promise<CertificateurRow[]> {
  return db.all<CertificateurRow>(
    "SELECT nom, siret, etat, nom_commercial, site_internet FROM certificateurs WHERE numero = ? ORDER BY id",
    [numero],
  );
}

export async function getBlocs(db: Db, numero: string): Promise<BlocRow[]> {
  return db.all<BlocRow>(
    "SELECT code, ordre, intitule, competences, modalites_evaluation, prerequis_entree, prerequis_validation FROM blocs WHERE numero = ? ORDER BY ordre",
    [numero],
  );
}

export async function countPartenaires(
  db: Db,
  numero: string,
  actifsOnly: boolean,
): Promise<{ total: number; actifs: number }> {
  const r = await db.get<{ total: number; actifs: number }>(
    "SELECT count(*) total, sum(etat = 'Actif') actifs FROM partenaires WHERE numero = ?",
    [numero],
  );
  return { total: r?.total ?? 0, actifs: actifsOnly ? (r?.actifs ?? 0) : (r?.total ?? 0) };
}

export async function listPartenaires(
  db: Db,
  numero: string,
  opts: { limit: number; offset: number; siretPrefix?: string; actifsOnly: boolean },
): Promise<PartenaireRow[]> {
  const where: string[] = ["numero = ?"];
  const params: SqlParam[] = [numero];
  if (opts.actifsOnly) where.push("etat = 'Actif'");
  if (opts.siretPrefix) {
    where.push("siret LIKE ?");
    params.push(`${opts.siretPrefix}%`);
  }
  params.push(opts.limit, opts.offset);
  return db.all<PartenaireRow>(
    `SELECT nom, siret, habilitation, etat, date_actif, date_modif_etat FROM partenaires WHERE ${where.join(" AND ")} ORDER BY etat = 'Actif' DESC, nom LIMIT ? OFFSET ?`,
    params,
  );
}

export async function findPartenaire(
  db: Db,
  numero: string,
  siret: string | undefined,
  siren: string | undefined,
): Promise<PartenaireRow[]> {
  if (siret)
    return db.all<PartenaireRow>(
      "SELECT nom, siret, habilitation, etat, date_actif, date_modif_etat FROM partenaires WHERE numero = ? AND siret = ? ORDER BY etat = 'Actif' DESC",
      [numero, siret],
    );
  if (siren)
    return db.all<PartenaireRow>(
      "SELECT nom, siret, habilitation, etat, date_actif, date_modif_etat FROM partenaires WHERE numero = ? AND siret LIKE ? ORDER BY etat = 'Actif' DESC",
      [numero, `${siren}%`],
    );
  return [];
}

export type SearchFilters = {
  repertoire?: "RNCP" | "RS";
  niveau?: number;
  nsf?: string;
  rome?: string;
  actives_only: boolean;
  limit: number;
};

export async function searchCertifications(
  db: Db,
  query: string,
  filters: SearchFilters,
): Promise<{ hits: SearchHit[]; match: string | null; mode: "and" | "or" | "filters" }> {
  const tokens = tokenize(query);
  const where: string[] = [];
  const params: SqlParam[] = [];
  if (filters.actives_only) where.push("c.actif = 1");
  if (filters.repertoire) {
    where.push("c.repertoire = ?");
    params.push(filters.repertoire);
  }
  if (filters.niveau !== undefined) {
    where.push("c.niveau = ?");
    params.push(filters.niveau);
  }
  if (filters.nsf) {
    where.push("c.codes_nsf_json LIKE ?");
    params.push(`%"code":"${filters.nsf.replace(/[%_"]/g, "")}%`);
  }
  if (filters.rome) {
    where.push("c.codes_rome_json LIKE ?");
    params.push(`%"code":"${filters.rome.replace(/[%_"]/g, "").toUpperCase()}"%`);
  }
  const whereSql = where.length ? `AND ${where.join(" AND ")}` : "";

  if (!tokens.length) {
    const hits = await db.all<SearchHit>(
      `SELECT c.numero, c.intitule, c.repertoire, c.niveau, c.actif, c.date_fin_enregistrement, c.abrege_libelle, 0 AS score
       FROM certifications c WHERE 1=1 ${whereSql} ORDER BY c.actif DESC, c.date_fin_enregistrement DESC LIMIT ?`,
      [...params, filters.limit],
    );
    return { hits, match: null, mode: "filters" };
  }

  const syn = await getSynonymes(db);
  for (const mode of ["and", "or"] as const) {
    if (mode === "or" && tokens.length < 2) break;
    const match = buildMatch(tokens, syn, mode);
    const hits = await db.all<SearchHit>(
      `SELECT c.numero, c.intitule, c.repertoire, c.niveau, c.actif, c.date_fin_enregistrement, c.abrege_libelle,
              round(-bm25(certifications_fts, 0.0, 10.0, 4.0, 1.0, 1.0), 3) AS score
       FROM certifications_fts f JOIN certifications c ON c.id = f.rowid
       WHERE certifications_fts MATCH ? ${whereSql}
       ORDER BY score DESC, c.actif DESC LIMIT ?`,
      [match, ...params, filters.limit],
    );
    if (hits.length || mode === "or") return { hits, match, mode };
  }
  return { hits: [], match: null, mode: "and" };
}

export type ChangeRow = {
  run_date: string;
  numero: string;
  change_type: string;
  diff_json: string | null;
  intitule: string | null;
  repertoire: string | null;
};

export async function changesSince(
  db: Db,
  since: string,
  opts: { type?: string; nsf?: string; repertoire?: string; limit: number },
): Promise<ChangeRow[]> {
  const where: string[] = ["ch.run_date >= ?"];
  const params: SqlParam[] = [since];
  if (opts.type) {
    where.push("ch.change_type = ?");
    params.push(opts.type);
  }
  if (opts.repertoire) {
    where.push("c.repertoire = ?");
    params.push(opts.repertoire);
  }
  if (opts.nsf) {
    where.push("c.codes_nsf_json LIKE ?");
    params.push(`%"code":"${opts.nsf.replace(/[%_"]/g, "")}%`);
  }
  params.push(opts.limit);
  return db.all<ChangeRow>(
    `SELECT ch.run_date, ch.numero, ch.change_type, ch.diff_json, c.intitule, c.repertoire
     FROM changes ch LEFT JOIN certifications c ON c.numero = ch.numero
     WHERE ${where.join(" AND ")} ORDER BY ch.run_date DESC, ch.id DESC LIMIT ?`,
    params,
  );
}

export async function firstChangeDate(db: Db): Promise<string | null> {
  const r = await db.get<{ d: string | null }>("SELECT min(run_date) d FROM changes");
  return r?.d ?? null;
}
