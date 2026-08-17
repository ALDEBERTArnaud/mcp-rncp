import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";
import type { Db } from "./db.ts";
import { daysBetween, fail, ok, parseJson, sourceOf, truncate } from "./format.ts";
import { COMBINING } from "./fts.ts";
import { normalizeSiret, parseNumero } from "./numero.ts";
import {
  type BlocRow,
  type CertRow,
  changesSince,
  countPartenaires,
  findPartenaire,
  firstChangeDate,
  getBlocs,
  getCertificateurs,
  getCertification,
  getMeta,
  listPartenaires,
  resolveNumero,
  searchCertifications,
} from "./queries.ts";

export type ToolDeps = { db: Db; now?: () => Date };

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const numeroSchema = z
  .string()
  .min(1)
  .max(40)
  .describe(
    'Certification number: "RNCP35419", "35419", "rncp 35419", "RS5000" or a francecompetences.fr URL',
  );

const ROLE_LABELS: Record<string, string[]> = {
  HABILITATION_FORMER: ["former"],
  HABILITATION_ORGANISER: ["evaluer"],
  HABILITATION_ORGA_FORM: ["former", "evaluer"],
};

function statut(c: CertRow): "active" | "inactive" {
  return c.actif === 1 ? "active" : "inactive";
}

function briefCert(c: CertRow) {
  return {
    numero: c.numero,
    repertoire: c.repertoire,
    intitule: c.intitule,
    abrege: c.abrege_libelle,
    niveau: c.niveau,
    statut: statut(c),
    etat_fiche: c.etat_fiche,
    date_fin_enregistrement: c.date_fin_enregistrement,
    url_fiche: c.url_fiche,
  };
}

async function loadCert(db: Db, input: string) {
  const candidates = parseNumero(input);
  if (!candidates.length) return { error: fail(`Unrecognized certification number: "${input}"`) };
  const numero = await resolveNumero(db, candidates);
  if (!numero)
    return {
      error: fail(`No certification found for "${input}"`, { tried: candidates }),
    };
  const cert = (await getCertification(db, numero)) as CertRow;
  return { cert };
}

function blocForEdof(b: BlocRow) {
  return {
    code: b.code,
    ordre: b.ordre,
    intitule: b.intitule,
    competences: b.competences,
    modalites_evaluation: b.modalites_evaluation,
    prerequis_entree: b.prerequis_entree,
    prerequis_validation: b.prerequis_validation,
  };
}

const termSet = (s: string | null | undefined) =>
  new Set(
    (s ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(COMBINING, "")
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((t) => t.length > 3),
  );
const jaccard = (a: Set<string>, b: Set<string>) => {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return Math.round((inter / (a.size + b.size - inter)) * 1000) / 1000;
};
// Overlap coefficient: robust when one bloc text is much longer than the other.
const overlap = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return Math.round((inter / Math.min(a.size, b.size)) * 1000) / 1000;
};

export function registerTools(server: McpServer, deps: ToolDeps): void {
  const { db } = deps;
  const now = deps.now ?? (() => new Date());

  server.registerTool(
    "search_certifications",
    {
      title: "Search RNCP / RS certifications",
      description:
        "Full-text search (BM25 + French synonyms) over the French national registers of professional certifications: RNCP (diplomas, titles, CQP) and RS (specific register: skills certificates, habilitations). Filter by register, level (3-8), NSF or ROME code. Returns ranked matches with status and expiry date; use get_certification for details. Example (FR): « Quelles certifications de niveau 6 en cybersécurité sont actives ? »",
      inputSchema: z.object({
        query: z
          .string()
          .min(1)
          .max(200)
          .describe("Free text, French (e.g. 'développeur web', 'gestion paie')"),
        repertoire: z.enum(["RNCP", "RS"]).optional().describe("Restrict to one register"),
        niveau: z
          .number()
          .int()
          .min(3)
          .max(8)
          .optional()
          .describe("Qualification level 3 (CAP) to 8 (doctorate); RS entries have no level"),
        nsf: z.string().max(4).optional().describe("NSF code or prefix, e.g. '326' (IT)"),
        rome: z.string().max(5).optional().describe("ROME code, e.g. 'M1805'"),
        actives_only: z
          .boolean()
          .default(true)
          .describe("Only certifications currently registered (default true)"),
        limit: z.number().int().min(1).max(20).default(10),
      }),
      annotations: READ_ONLY,
    },
    async (args) => {
      const meta = await getMeta(db);
      const direct = parseNumero(args.query);
      if (direct.length) {
        const numero = await resolveNumero(db, direct);
        if (numero) {
          const c = (await getCertification(db, numero)) as CertRow;
          return ok({
            summary: `Exact match: ${c.numero} — ${c.intitule} (${statut(c)})`,
            query: args.query,
            results: [{ ...briefCert(c), score: null }],
            total: 1,
            source: sourceOf(meta),
          });
        }
      }
      const { hits, match, mode } = await searchCertifications(db, args.query, {
        repertoire: args.repertoire,
        niveau: args.niveau,
        nsf: args.nsf,
        rome: args.rome,
        actives_only: args.actives_only,
        limit: args.limit,
      });
      const results = hits.map((h) => ({
        numero: h.numero,
        repertoire: h.repertoire,
        intitule: h.intitule,
        abrege: h.abrege_libelle,
        niveau: h.niveau,
        statut: h.actif === 1 ? "active" : "inactive",
        date_fin_enregistrement: h.date_fin_enregistrement,
        score: h.score,
      }));
      return ok({
        summary: results.length
          ? `${results.length} result(s) for "${args.query}"${mode === "or" ? " (relaxed match)" : ""}${args.actives_only ? ", active only" : ""}`
          : `No result for "${args.query}"${args.actives_only ? " among active certifications; retry with actives_only=false or broader terms" : ""}`,
        query: args.query,
        fts_match: match,
        results,
        total: results.length,
        truncated: results.length >= args.limit,
        source: sourceOf(meta),
      });
    },
  );

  server.registerTool(
    "get_certification",
    {
      title: "Get a certification sheet",
      description:
        "Full structured sheet of one RNCP or RS certification: title, level, status and expiry, certifier(s), activities, attested skills, NSF/ROME/Formacode codes, access routes, legal texts, replacements, statistics, official URL. Long texts are truncated to 4000 chars unless full=true. Example (FR): « Donne-moi la fiche RNCP 35419 et ses compétences attestées. »",
      inputSchema: z.object({
        numero: numeroSchema,
        full: z.boolean().default(false).describe("Return untruncated long texts"),
      }),
      annotations: READ_ONLY,
    },
    async ({ numero, full }) => {
      const meta = await getMeta(db);
      const r = await loadCert(db, numero);
      if (r.error) return r.error;
      const c = r.cert;
      const [certificateurs, blocs, partenaires] = await Promise.all([
        getCertificateurs(db, c.numero),
        getBlocs(db, c.numero),
        countPartenaires(db, c.numero, true),
      ]);
      const max = full ? Number.POSITIVE_INFINITY : undefined;
      const long = {
        objectifs_contexte: truncate(c.objectifs_contexte, max),
        activites_visees: truncate(c.activites_visees, max),
        competences_attestees: truncate(c.competences_attestees, max),
        secteurs_activite: truncate(c.secteurs_activite, max),
        type_emploi_accessibles: truncate(c.type_emploi_accessibles, max),
        reglementations_activites: truncate(c.reglementations_activites, max),
        prerequis_entree_formation: truncate(c.prerequis_entree_formation, max),
        prerequis_validation: truncate(c.prerequis_validation, max),
      };
      const truncated = Object.values(long).some((v) => v.truncated);
      const jours = c.date_fin_enregistrement
        ? daysBetween(now(), c.date_fin_enregistrement)
        : null;
      return ok({
        summary: `${c.numero} — ${c.intitule} · ${c.repertoire}${c.niveau ? ` niveau ${c.niveau}` : ""} · ${statut(c)}${c.date_fin_enregistrement ? ` until ${c.date_fin_enregistrement}` : ""} · ${certificateurs.map((x) => x.nom).join(", ")}`,
        ...briefCert(c),
        type_enregistrement: c.type_enregistrement,
        niveau_libelle: c.niveau_libelle,
        jours_restants: jours,
        date_publication: c.date_publication,
        date_effet: c.date_effet,
        date_decision: c.date_decision,
        date_limite_delivrance: c.date_limite_delivrance,
        duree_enregistrement: c.duree_enregistrement,
        certificateurs,
        nb_blocs: blocs.length,
        blocs: blocs.map((b) => ({ code: b.code, ordre: b.ordre, intitule: b.intitule })),
        nb_partenaires_actifs: partenaires.actifs,
        ...Object.fromEntries(Object.entries(long).map(([k, v]) => [k, v.text])),
        validation_partielle: c.validation_partielle,
        validation_partielle_perimetre: c.validation_partielle_perimetre,
        voies_acces: parseJson(c.voies_acces_json, {}),
        codes_nsf: parseJson(c.codes_nsf_json, []),
        codes_rome: parseJson(c.codes_rome_json, []),
        formacodes: parseJson(c.formacodes_json, []),
        idcc: parseJson(c.idcc_json, []),
        textes: parseJson(c.textes_json, {}),
        remplace: parseJson(c.anciennes_json, []),
        remplacee_par: parseJson(c.nouvelles_json, []),
        correspondances: parseJson(c.correspondances_json, []),
        statistiques_promotions: parseJson(c.stats_json, []),
        lien_url_description: c.lien_url_description,
        truncated,
        source: sourceOf(meta),
      });
    },
  );

  server.registerTool(
    "list_blocs",
    {
      title: "List skill blocs (blocs de compétences)",
      description:
        "Blocs de compétences of an RNCP certification (code RNCPxxxxxBCyy, title, skills, assessment methods), in the order and wording expected by EDOF / Mon Compte Formation forms. RS certifications have no blocs. Example (FR): « Liste les blocs de compétences du RNCP 37674 à renseigner dans EDOF. »",
      inputSchema: z.object({ numero: numeroSchema }),
      annotations: READ_ONLY,
    },
    async ({ numero }) => {
      const meta = await getMeta(db);
      const r = await loadCert(db, numero);
      if (r.error) return r.error;
      const c = r.cert;
      const blocs = await getBlocs(db, c.numero);
      return ok({
        summary: blocs.length
          ? `${c.numero} — ${blocs.length} bloc(s): ${blocs.map((b) => `${b.code} ${b.intitule}`).join(" | ")}`
          : `${c.numero} has no blocs de compétences${c.repertoire === "RS" ? " (RS certifications are not split into blocs)" : ""}`,
        ...briefCert(c),
        blocs: blocs.map(blocForEdof),
        edof_codes: blocs.map((b) => b.code),
        source: sourceOf(meta),
      });
    },
  );

  server.registerTool(
    "check_validity",
    {
      title: "Check registration validity",
      description:
        "Is this certification currently registered (active) and until when? Returns status, expiry date, remaining days, delivery deadline, replacement certification(s) and an estimated CPF eligibility (a registered active certification is eligible in principle; the training organism must still be habilitated and referenced). Example (FR): « Le RNCP 35419 est-il encore actif ? Jusqu'à quand ? »",
      inputSchema: z.object({ numero: numeroSchema }),
      annotations: READ_ONLY,
    },
    async ({ numero }) => {
      const meta = await getMeta(db);
      const r = await loadCert(db, numero);
      if (r.error) return r.error;
      const c = r.cert;
      const jours = c.date_fin_enregistrement
        ? daysBetween(now(), c.date_fin_enregistrement)
        : null;
      const remplacee = parseJson<string[]>(c.nouvelles_json, []);
      const active = c.actif === 1;
      let avertissement: string | null = null;
      if (!active)
        avertissement = `Inactive: registration ended${c.date_fin_enregistrement ? ` on ${c.date_fin_enregistrement}` : ""}. New enrolments are not possible${remplacee.length ? `; replaced by ${remplacee.join(", ")}` : ""}.`;
      else if (jours !== null && jours <= 90)
        avertissement = `Expires in ${jours} day(s) (${c.date_fin_enregistrement}). Check for a renewal or replacement before enrolling.`;
      else if (c.etat_fiche !== "Publiée") avertissement = `Sheet state: ${c.etat_fiche}.`;
      return ok({
        summary: `${c.numero} — ${c.intitule}: ${active ? "ACTIVE" : "INACTIVE"}${c.date_fin_enregistrement ? `, registration ends ${c.date_fin_enregistrement}` : ""}${jours !== null && active ? ` (${jours} days left)` : ""}${remplacee.length ? `, replaced by ${remplacee.join(", ")}` : ""}`,
        ...briefCert(c),
        actif: active,
        jours_restants: jours,
        date_limite_delivrance: c.date_limite_delivrance,
        remplacee_par: remplacee,
        eligible_cpf_estime: active,
        avertissement,
        source: sourceOf(meta),
      });
    },
  );

  server.registerTool(
    "check_habilitation",
    {
      title: "Check a training organism's habilitation",
      description:
        "Is a given SIRET (or SIREN) habilitated for a certification, and for which role: 'former' (train), 'evaluer' (organise assessment) or both? Also detects when the SIRET is the certifier itself. Habilitation is effective only if the certification is active AND the partner state is 'Actif'. Example (FR): « Le SIRET 80875076400025 est-il habilité sur le RNCP 35419 ? »",
      inputSchema: z.object({
        numero: numeroSchema,
        siret: z
          .string()
          .min(9)
          .max(20)
          .describe("SIRET (14 digits) or SIREN (9 digits, matches all establishments)"),
      }),
      annotations: READ_ONLY,
    },
    async ({ numero, siret }) => {
      const meta = await getMeta(db);
      const r = await loadCert(db, numero);
      if (r.error) return r.error;
      const c = r.cert;
      const id = normalizeSiret(siret);
      if (!id.siret && !id.siren)
        return fail(`Invalid SIRET/SIREN: "${siret}" (expected 14 or 9 digits)`);
      const [rows, certificateurs] = await Promise.all([
        findPartenaire(db, c.numero, id.siret, id.siren),
        getCertificateurs(db, c.numero),
      ]);
      const key = id.siret ?? id.siren!;
      const certifMatch = certificateurs.filter((x) => x.siret?.startsWith(key));
      const actives = rows.filter((p) => p.etat === "Actif");
      const roles = [
        ...new Set(actives.flatMap((p) => ROLE_LABELS[p.habilitation] ?? [p.habilitation])),
      ];
      const habilite = c.actif === 1 && actives.length > 0;
      let avertissement: string | null = null;
      if (c.actif !== 1)
        avertissement = "Certification inactive: no habilitation can be exercised.";
      else if (!rows.length && certifMatch.length)
        avertissement = "This SIRET is the certifier itself (not listed as partner).";
      else if (!rows.length)
        avertissement = "SIRET not found among the partners of this certification.";
      else if (!actives.length)
        avertissement = `Partner found but habilitation state is '${rows[0]!.etat}'.`;
      return ok({
        summary: `${key} on ${c.numero}: ${habilite ? `HABILITATED (${roles.join(" + ")})` : certifMatch.length && c.actif === 1 ? "CERTIFIER of this certification" : "NOT habilitated"}${avertissement ? ` — ${avertissement}` : ""}`,
        ...briefCert(c),
        siret: id.siret ?? null,
        siren: id.siren ?? null,
        habilite,
        roles,
        est_certificateur: certifMatch.length > 0,
        partenaires: rows,
        avertissement,
        source: sourceOf(meta),
      });
    },
  );

  server.registerTool(
    "list_partenaires",
    {
      title: "List habilitated partners",
      description:
        "Training organisms habilitated on a certification (name, SIRET, role former/evaluer/both, state, dates). Paginated; filter by SIRET/SIREN prefix. Example (FR): « Quels organismes sont habilités sur le RNCP 37674 ? »",
      inputSchema: z.object({
        numero: numeroSchema,
        siret_prefix: z.string().max(14).optional().describe("SIRET/SIREN prefix filter"),
        actifs_only: z.boolean().default(true),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
      annotations: READ_ONLY,
    },
    async ({ numero, siret_prefix, actifs_only, limit, offset }) => {
      const meta = await getMeta(db);
      const r = await loadCert(db, numero);
      if (r.error) return r.error;
      const c = r.cert;
      const prefix = siret_prefix?.replace(/\D/g, "") || undefined;
      const [rows, counts] = await Promise.all([
        listPartenaires(db, c.numero, {
          limit,
          offset,
          siretPrefix: prefix,
          actifsOnly: actifs_only,
        }),
        countPartenaires(db, c.numero, actifs_only),
      ]);
      const total = prefix ? null : counts.actifs;
      return ok({
        summary: `${c.numero}: ${counts.actifs} active partner(s) of ${counts.total} listed; showing ${rows.length}${offset ? ` from offset ${offset}` : ""}`,
        ...briefCert(c),
        total_actifs: counts.actifs,
        total: counts.total,
        offset,
        partenaires: rows.map((p) => ({
          ...p,
          roles: ROLE_LABELS[p.habilitation] ?? [p.habilitation],
        })),
        truncated: total !== null ? offset + rows.length < total : rows.length >= limit,
        source: sourceOf(meta),
      });
    },
  );

  server.registerTool(
    "compare_certifications",
    {
      title: "Compare two certifications",
      description:
        "Side-by-side comparison of two certifications: level, status, certifiers, NSF/ROME overlap, number of blocs and lexical overlap of blocs (Jaccard on skill terms) and, for each bloc of A, the closest bloc of B (overlap coefficient). Example (FR): « Compare le RNCP 36490 et le RNCP 37873. »",
      inputSchema: z.object({ numero_a: numeroSchema, numero_b: numeroSchema }),
      annotations: READ_ONLY,
    },
    async ({ numero_a, numero_b }) => {
      const meta = await getMeta(db);
      const ra = await loadCert(db, numero_a);
      if (ra.error) return ra.error;
      const rb = await loadCert(db, numero_b);
      if (rb.error) return rb.error;
      const [a, b] = [ra.cert, rb.cert];
      const [ba, bb, ca, cb] = await Promise.all([
        getBlocs(db, a.numero),
        getBlocs(db, b.numero),
        getCertificateurs(db, a.numero),
        getCertificateurs(db, b.numero),
      ]);
      const codes = (json: string) => parseJson<{ code: string }[]>(json, []).map((x) => x.code);
      const inter = (x: string[], y: string[]) => x.filter((v) => y.includes(v));
      const setA = termSet(ba.map((x) => `${x.intitule} ${x.competences ?? ""}`).join(" "));
      const setB = termSet(bb.map((x) => `${x.intitule} ${x.competences ?? ""}`).join(" "));
      // For each bloc of A, its closest bloc of B (overlap coefficient on skill terms).
      const setsB = bb.map((y) => termSet(`${y.intitule} ${y.competences ?? ""}`));
      const pairs = ba
        .map((x) => {
          const sx = termSet(`${x.intitule} ${x.competences ?? ""}`);
          let best = { bloc_b: null as string | null, similarite: 0 };
          bb.forEach((y, i) => {
            const s = overlap(sx, setsB[i]!);
            if (s > best.similarite) best = { bloc_b: y.code, similarite: s };
          });
          return { bloc_a: x.code, ...best };
        })
        .sort((p, q) => q.similarite - p.similarite);
      const side = (c: CertRow, certs: typeof ca, blocs: BlocRow[]) => ({
        ...briefCert(c),
        certificateurs: certs.map((x) => x.nom),
        codes_nsf: codes(c.codes_nsf_json),
        codes_rome: codes(c.codes_rome_json),
        nb_blocs: blocs.length,
        blocs: blocs.map((x) => ({ code: x.code, intitule: x.intitule })),
      });
      const overall = jaccard(setA, setB);
      return ok({
        summary: `${a.numero} (niv ${a.niveau ?? "-"}, ${statut(a)}) vs ${b.numero} (niv ${b.niveau ?? "-"}, ${statut(b)}): ${ba.length} vs ${bb.length} blocs, skill-term overlap ${Math.round(overall * 100)}%, ${inter(codes(a.codes_nsf_json), codes(b.codes_nsf_json)).length} shared NSF code(s)`,
        a: side(a, ca, ba),
        b: side(b, cb, bb),
        meme_niveau: a.niveau === b.niveau,
        nsf_communs: inter(codes(a.codes_nsf_json), codes(b.codes_nsf_json)),
        rome_communs: inter(codes(a.codes_rome_json), codes(b.codes_rome_json)),
        recouvrement_blocs_jaccard: overall,
        blocs_proches: pairs,
        source: sourceOf(meta),
      });
    },
  );

  server.registerTool(
    "changes_since",
    {
      title: "Recent changes in the registers",
      description:
        "Certifications created, updated, deactivated, reactivated or removed since a date (history starts at the first ingestion run). Filter by change type, register or NSF code. Example (FR): « Quelles fiches informatique (NSF 326) ont changé depuis le 1er juillet ? »",
      inputSchema: z.object({
        since: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("ISO date YYYY-MM-DD"),
        type: z.enum(["created", "updated", "deactivated", "reactivated", "removed"]).optional(),
        repertoire: z.enum(["RNCP", "RS"]).optional(),
        nsf: z.string().max(4).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
      annotations: READ_ONLY,
    },
    async ({ since, type, repertoire, nsf, limit }) => {
      const meta = await getMeta(db);
      const [rows, first] = await Promise.all([
        changesSince(db, since, { type, repertoire, nsf, limit }),
        firstChangeDate(db),
      ]);
      const changes = rows.map((r) => ({
        run_date: r.run_date,
        numero: r.numero,
        change_type: r.change_type,
        intitule: r.intitule,
        repertoire: r.repertoire,
        diff: parseJson(r.diff_json, {}),
      }));
      const note = !first
        ? "No change history yet: this dataset build has no previous run to compare with."
        : since < first
          ? `History starts on ${first}; changes before that date are not tracked.`
          : null;
      return ok({
        summary: `${changes.length} change(s) since ${since}${type ? ` (${type})` : ""}${nsf ? ` in NSF ${nsf}` : ""}${note ? ` — ${note}` : ""}`,
        since,
        history_starts: first,
        changes,
        truncated: changes.length >= limit,
        note,
        source: sourceOf(meta),
      });
    },
  );

  server.registerTool(
    "get_data_status",
    {
      title: "Data freshness and coverage",
      description:
        "Source dataset date, ingestion run, counts (total/active/RNCP/RS/blocs/partners) and age of the data in days. Call this to tell the user how fresh the answers are. Example (FR): « De quand datent les données RNCP ? »",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => {
      const meta = await getMeta(db);
      const age = meta.source_date ? 0 - daysBetween(now(), meta.source_date) : null;
      const counts = Object.fromEntries(
        Object.entries(meta)
          .filter(([k]) => k.startsWith("count_"))
          .map(([k, v]) => [k.slice(6), Number(v)]),
      );
      return ok({
        summary: `Data from France compétences export of ${meta.source_date} (${age} day(s) old): ${counts.total ?? "?"} certifications, ${counts.actives ?? "?"} active`,
        source_date: meta.source_date,
        age_days: age,
        run_id: meta.run_id,
        ingested_at: meta.ingested_at,
        flux_version: meta.flux_version,
        counts,
        source: sourceOf(meta),
      });
    },
  );
}
