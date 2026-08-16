import { Database } from "bun:sqlite";
import { existsSync, unlinkSync } from "node:fs";
import { type Fiche, mapFiche } from "./map.ts";
import { iterFiches } from "./parse.ts";
import { FTS_REBUILD_SQL, SCHEMA_SQL } from "./schema.ts";
import { SYNONYMES } from "./synonymes.ts";

export type BuildInput = {
  rncpXml: string;
  rsXml: string;
  out: string;
  sourceDate: string;
  runId: string;
  previousDb?: string;
  onProgress?: (n: number) => void;
};

export type BuildResult = {
  counts: Record<string, number>;
  fluxVersion: string | null;
  changes: number;
};

const CERT_COLS = [
  "numero",
  "id_fiche",
  "repertoire",
  "intitule",
  "abrege_code",
  "abrege_libelle",
  "etat_fiche",
  "actif",
  "type_enregistrement",
  "niveau",
  "niveau_libelle",
  "date_fin_enregistrement",
  "date_publication",
  "date_effet",
  "date_decision",
  "date_dernier_jo",
  "date_limite_delivrance",
  "duree_enregistrement",
  "activites_visees",
  "competences_attestees",
  "secteurs_activite",
  "type_emploi_accessibles",
  "objectifs_contexte",
  "reglementations_activites",
  "prerequis_entree_formation",
  "prerequis_validation",
  "validation_partielle",
  "validation_partielle_perimetre",
  "existence_partenaires",
  "accessible_nc",
  "accessible_pf",
  "lien_url_description",
  "voies_acces_json",
  "codes_nsf_json",
  "codes_rome_json",
  "formacodes_json",
  "idcc_json",
  "ccn_json",
  "textes_json",
  "anciennes_json",
  "nouvelles_json",
  "correspondances_json",
  "stats_json",
  "url_fiche",
  "content_hash",
] as const;

function insertSql(table: string, cols: readonly string[]) {
  return `INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`;
}
function bind(row: Record<string, unknown>, cols: readonly string[]): (string | number | null)[] {
  return cols.map((c) => (row[c] ?? null) as string | number | null);
}

export async function build(input: BuildInput): Promise<BuildResult> {
  for (const f of [input.out, `${input.out}-journal`, `${input.out}-wal`])
    if (existsSync(f)) unlinkSync(f);
  const db = new Database(input.out, { create: true });
  db.exec("PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF; PRAGMA temp_store=MEMORY;");
  db.exec(SCHEMA_SQL);

  const insCert = db.prepare(insertSql("certifications", CERT_COLS));
  const CF = [
    "numero",
    "nom",
    "siret",
    "etat",
    "date_modif_etat",
    "nom_commercial",
    "site_internet",
  ];
  const insCf = db.prepare(insertSql("certificateurs", CF));
  const PA = ["numero", "nom", "siret", "habilitation", "etat", "date_actif", "date_modif_etat"];
  const insPa = db.prepare(insertSql("partenaires", PA));
  const BL = [
    "code",
    "numero",
    "ordre",
    "intitule",
    "competences",
    "modalites_evaluation",
    "prerequis_entree",
    "prerequis_validation",
  ];
  const insBl = db.prepare(insertSql("blocs", BL));

  const insertBatch = db.transaction((fiches: Fiche[]) => {
    for (const f of fiches) {
      insCert.run(...bind(f.cert, CERT_COLS));
      for (const c of f.certificateurs) insCf.run(...bind(c, CF));
      for (const p of f.partenaires) insPa.run(...bind(p, PA));
      for (const b of f.blocs) insBl.run(...bind(b, BL));
    }
  });

  let fluxVersion: string | null = null;
  let n = 0;
  let batch: Fiche[] = [];
  for (const [path, rep] of [
    [input.rncpXml, "RNCP"],
    [input.rsXml, "RS"],
  ] as const) {
    for await (const node of iterFiches(path)) {
      if (node.name === "VERSION_FLUX") {
        fluxVersion = node.text.trim();
        continue;
      }
      batch.push(mapFiche(node, rep));
      if (batch.length >= 500) {
        insertBatch(batch);
        n += batch.length;
        batch = [];
        input.onProgress?.(n);
      }
    }
  }
  if (batch.length) {
    insertBatch(batch);
    n += batch.length;
  }

  db.exec(FTS_REBUILD_SQL);
  const insSyn = db.prepare("INSERT INTO synonymes (terme, expansion) VALUES (?, ?)");
  db.transaction(() => {
    for (const [terme, expansion] of Object.entries(SYNONYMES)) insSyn.run(terme, expansion);
  })();

  const changes =
    input.previousDb && existsSync(input.previousDb)
      ? computeChanges(db, input.previousDb, input.sourceDate)
      : 0;

  const count = (sql: string) => (db.query(sql).get() as { n: number }).n;
  const counts = {
    total: count("SELECT count(*) n FROM certifications"),
    actives: count("SELECT count(*) n FROM certifications WHERE actif=1"),
    rncp: count("SELECT count(*) n FROM certifications WHERE repertoire='RNCP'"),
    rs: count("SELECT count(*) n FROM certifications WHERE repertoire='RS'"),
    blocs: count("SELECT count(*) n FROM blocs"),
    partenaires: count("SELECT count(*) n FROM partenaires"),
    certificateurs: count("SELECT count(*) n FROM certificateurs"),
    changes,
  };
  const insMeta = db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)");
  const meta: Record<string, string> = {
    schema_version: "1",
    source_date: input.sourceDate,
    flux_version: fluxVersion ?? "",
    run_id: input.runId,
    ingested_at: new Date().toISOString(),
    source: "France compétences (data.gouv.fr)",
    licence: "Licence Ouverte / Open Licence 2.0",
    ...Object.fromEntries(Object.entries(counts).map(([k, v]) => [`count_${k}`, String(v)])),
  };
  db.transaction(() => {
    for (const [k, v] of Object.entries(meta)) insMeta.run(k, v);
  })();
  db.exec("VACUUM");
  db.close();
  return { counts, fluxVersion, changes };
}

// Diff against the previous build: created / removed / updated / deactivated / reactivated.
function computeChanges(db: Database, previousDb: string, runDate: string): number {
  db.exec(`ATTACH DATABASE '${previousDb.replaceAll("'", "''")}' AS prev`);
  const hasChanges =
    (
      db.query("SELECT count(*) n FROM prev.sqlite_master WHERE name='changes'").get() as {
        n: number;
      }
    ).n > 0;
  if (hasChanges) {
    db.exec(
      "INSERT INTO changes (run_date, numero, change_type, diff_json) SELECT run_date, numero, change_type, diff_json FROM prev.changes WHERE run_date >= date('now','-400 days')",
    );
  }
  const insert = db.prepare(
    "INSERT INTO changes (run_date, numero, change_type, diff_json) VALUES (?, ?, ?, ?)",
  );
  const rows = db
    .query(
      `SELECT c.numero, c.actif, c.intitule, c.date_fin_enregistrement, c.content_hash, c.etat_fiche,
              p.actif p_actif, p.intitule p_intitule, p.date_fin_enregistrement p_date_fin, p.content_hash p_hash, p.etat_fiche p_etat
       FROM certifications c LEFT JOIN prev.certifications p ON p.numero = c.numero
       WHERE p.numero IS NULL OR p.content_hash <> c.content_hash`,
    )
    .all() as Array<Record<string, string | number | null>>;
  const removed = db
    .query(
      "SELECT p.numero FROM prev.certifications p LEFT JOIN certifications c ON c.numero=p.numero WHERE c.numero IS NULL",
    )
    .all() as Array<{ numero: string }>;
  const blocCount = db.prepare("SELECT count(*) n FROM blocs WHERE numero=?");
  const prevBlocCount = db.prepare("SELECT count(*) n FROM prev.blocs WHERE numero=?");
  const paCount = db.prepare("SELECT count(*) n FROM partenaires WHERE numero=? AND etat='Actif'");
  const prevPaCount = db.prepare(
    "SELECT count(*) n FROM prev.partenaires WHERE numero=? AND etat='Actif'",
  );
  let n = 0;
  db.transaction(() => {
    for (const r of rows) {
      const numero = r.numero as string;
      if (r.p_hash == null) {
        insert.run(
          runDate,
          numero,
          "created",
          JSON.stringify({ intitule: r.intitule, actif: r.actif }),
        );
        n++;
        continue;
      }
      let type = "updated";
      if (r.p_actif === 1 && r.actif === 0) type = "deactivated";
      else if (r.p_actif === 0 && r.actif === 1) type = "reactivated";
      const diff: Record<string, unknown> = {};
      if (r.intitule !== r.p_intitule) diff.intitule = { from: r.p_intitule, to: r.intitule };
      if (r.date_fin_enregistrement !== r.p_date_fin)
        diff.date_fin_enregistrement = { from: r.p_date_fin, to: r.date_fin_enregistrement };
      if (r.etat_fiche !== r.p_etat) diff.etat_fiche = { from: r.p_etat, to: r.etat_fiche };
      const b = (blocCount.get(numero) as { n: number }).n;
      const pb = (prevBlocCount.get(numero) as { n: number }).n;
      if (b !== pb) diff.blocs = { from: pb, to: b };
      const pa = (paCount.get(numero) as { n: number }).n;
      const ppa = (prevPaCount.get(numero) as { n: number }).n;
      if (pa !== ppa) diff.partenaires_actifs = { from: ppa, to: pa };
      insert.run(runDate, numero, type, JSON.stringify(diff));
      n++;
    }
    for (const r of removed) {
      insert.run(runDate, r.numero, "removed", null);
      n++;
    }
  })();
  db.exec("DETACH DATABASE prev");
  return n;
}
