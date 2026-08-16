import { createHash } from "node:crypto";
import { child, children, text, type XmlNode } from "./parse.ts";

export type CertRow = {
  numero: string;
  id_fiche: number | null;
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
  date_dernier_jo: string | null;
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
  existence_partenaires: number | null;
  accessible_nc: number | null;
  accessible_pf: number | null;
  lien_url_description: string | null;
  voies_acces_json: string;
  codes_nsf_json: string;
  codes_rome_json: string;
  formacodes_json: string;
  idcc_json: string;
  ccn_json: string;
  textes_json: string;
  anciennes_json: string;
  nouvelles_json: string;
  correspondances_json: string;
  stats_json: string;
  url_fiche: string;
  content_hash: string;
};

export type CertificateurRow = {
  numero: string;
  nom: string;
  siret: string | null;
  etat: string | null;
  date_modif_etat: string | null;
  nom_commercial: string | null;
  site_internet: string | null;
};

export type PartenaireRow = {
  numero: string;
  nom: string;
  siret: string | null;
  habilitation: string;
  etat: string;
  date_actif: string | null;
  date_modif_etat: string | null;
};

export type BlocRow = {
  code: string;
  numero: string;
  ordre: number;
  intitule: string;
  competences: string | null;
  modalites_evaluation: string | null;
  prerequis_entree: string | null;
  prerequis_validation: string | null;
};

export type Fiche = {
  cert: CertRow;
  certificateurs: CertificateurRow[];
  partenaires: PartenaireRow[];
  blocs: BlocRow[];
};

// "JJ/MM/AAAA" → "AAAA-MM-JJ"
export function isoDate(fr: string | null): string | null {
  if (!fr) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fr);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const ouiNon = (v: string | null): number | null => (v === "Oui" ? 1 : v === "Non" ? 0 : null);
const int = (v: string | null): number | null => (v && /^\d+$/.test(v) ? Number(v) : null);

function codeLibelle(nodes: XmlNode[]) {
  return nodes.map((n) => ({ code: text(n, "CODE"), libelle: text(n, "LIBELLE") }));
}

export function ficheUrl(numero: string): string {
  const m = /^(RNCP|RS)(\d+)$/.exec(numero);
  if (!m) return `https://www.francecompetences.fr/recherche/?q=${encodeURIComponent(numero)}`;
  return `https://www.francecompetences.fr/recherche/${m[1]!.toLowerCase()}/${m[2]}/`;
}

function serialize(n: XmlNode): string {
  return `<${n.name}>${n.text.trim()}${n.children.map(serialize).join("")}</${n.name}>`;
}

const JURY_KEYS = {
  FI: "SI_JURY_FI",
  CA: "SI_JURY_CA",
  FC: "SI_JURY_FC",
  CQ: "SI_JURY_CQ",
  CL: "SI_JURY_CL",
  VAE: "SI_JURY_VAE",
};

export function mapFiche(node: XmlNode, repertoire: "RNCP" | "RS"): Fiche {
  const numero = text(node, "NUMERO_FICHE");
  if (!numero) throw new Error("FICHE without NUMERO_FICHE");
  const niveauRaw = text(node, "NOMENCLATURE_EUROPE", "NIVEAU");
  const niveau = niveauRaw && /^NIV\d$/.test(niveauRaw) ? Number(niveauRaw.slice(3)) : null;

  const voies: Record<string, { actif: number | null; date: string | null }> = {};
  for (const [k, tag] of Object.entries(JURY_KEYS)) {
    const j = child(node, tag);
    if (j)
      voies[k] = {
        actif: ouiNon(text(j, "ACTIF")),
        date: isoDate(text(j, "DATE_DERNIERE_MODIFICATION")),
      };
  }

  const textes: Record<string, { titre: string | null; date: string | null }[]> = {};
  for (const [k, tag] of Object.entries({
    general: "PUBLICATION_DECRET_GENERAL",
    creation: "PUBLICATION_DECRET_CREATION",
    autre: "PUBLICATION_DECRET_AUTRE",
  })) {
    const pubs = children(node, tag, "PUBLICATION_JO");
    if (pubs.length)
      textes[k] = pubs.map((p) => ({
        titre: text(p, "TITRE"),
        date: isoDate(text(p, "DATE_PUBLICATION_JO")),
      }));
  }

  const ccn = ["CCN_1", "CCN_2", "CCN_3"]
    .map((t) => child(node, t))
    .filter((c): c is XmlNode => !!c)
    .map((c) => ({ numero: text(c, "NUMERO"), libelle: text(c, "LIBELLE") }));

  const correspondances = children(node, "CORRESPONDANCES", "CORRESPONDANCE").map((c) => ({
    source_blocs: children(c, "SOURCE", "BLOC_COMPETENCES").map((b) => text(b, "CODE")),
    destination: {
      numero: text(c, "DESTINATION", "NUMERO_FICHE"),
      blocs: children(c, "DESTINATION", "BLOC_COMPETENCES").map((b) => text(b, "CODE")),
    },
  }));

  const stats = children(node, "STATISTIQUES_PROMOTIONS", "STATISTIQUES_PROMOTION").map((s) => ({
    annee: int(text(s, "ANNEE")),
    certifies: int(text(s, "NOMBRE_CERTIFIES")),
    certifies_vae: int(text(s, "NOMBRE_CERTIFIES_VAE")),
    insertion_globale_6m: int(text(s, "TAUX_INSERTION_GLOBAL_6MOIS")),
    insertion_metier_6m: int(text(s, "TAUX_INSERTION_METIER_6MOIS")),
    insertion_metier_2a: int(text(s, "TAUX_INSERTION_METIER_2ANS")),
  }));

  const cert: CertRow = {
    numero,
    id_fiche: int(text(node, "ID_FICHE")),
    repertoire,
    intitule: text(node, "INTITULE") ?? "",
    abrege_code: text(node, "ABREGE", "CODE"),
    abrege_libelle: text(node, "ABREGE", "LIBELLE"),
    etat_fiche: text(node, "ETAT_FICHE") ?? "",
    actif: ouiNon(text(node, "ACTIF")) ?? 0,
    type_enregistrement: text(node, "TYPE_ENREGISTREMENT"),
    niveau,
    niveau_libelle: text(node, "NOMENCLATURE_EUROPE", "LIBELLE"),
    date_fin_enregistrement: isoDate(text(node, "DATE_FIN_ENREGISTREMENT")),
    date_publication: isoDate(text(node, "DATE_DE_PUBLICATION")),
    date_effet: isoDate(text(node, "DATE_EFFET")),
    date_decision: isoDate(text(node, "DATE_DECISION")),
    date_dernier_jo: isoDate(text(node, "DATE_DERNIER_JO")),
    date_limite_delivrance: isoDate(text(node, "DATE_LIMITE_DELIVRANCE")),
    duree_enregistrement: int(text(node, "DUREE_ENREGISTREMENT")),
    activites_visees: text(node, "ACTIVITES_VISEES"),
    competences_attestees: text(node, "CAPACITES_ATTESTEES"),
    secteurs_activite: text(node, "SECTEURS_ACTIVITE"),
    type_emploi_accessibles: text(node, "TYPE_EMPLOI_ACCESSIBLES"),
    objectifs_contexte: text(node, "OBJECTIFS_CONTEXTE"),
    reglementations_activites: text(node, "REGLEMENTATIONS_ACTIVITES"),
    prerequis_entree_formation: text(node, "PREREQUIS_ENTREE_FORMATION"),
    prerequis_validation: text(node, "PREREQUIS_VALIDATION_CERTIFICATION"),
    validation_partielle: ouiNon(text(node, "VALIDATION_PARTIELLE")),
    validation_partielle_perimetre: text(node, "VALIDATION_PARTIELLE_PERIMETRE"),
    existence_partenaires: ouiNon(text(node, "EXISTENCE_PARTENAIRES")),
    accessible_nc: ouiNon(text(node, "ACCESSIBLE_NOUVELLE_CALEDONIE")),
    accessible_pf: ouiNon(text(node, "ACCESSIBLE_POLYNESIE_FRANCAISE")),
    lien_url_description: text(node, "LIEN_URL_DESCRIPTION"),
    voies_acces_json: JSON.stringify(voies),
    codes_nsf_json: JSON.stringify(codeLibelle(children(node, "CODES_NSF", "NSF"))),
    codes_rome_json: JSON.stringify(codeLibelle(children(node, "CODES_ROME", "ROME"))),
    formacodes_json: JSON.stringify(codeLibelle(children(node, "FORMACODES", "FORMACODE"))),
    idcc_json: JSON.stringify(codeLibelle(children(node, "CODES_IDCC", "IDCC"))),
    ccn_json: JSON.stringify(ccn),
    textes_json: JSON.stringify(textes),
    anciennes_json: JSON.stringify(
      children(node, "ANCIENNES_CERTIFICATIONS", "ANCIENNE_CERTIFICATION").map((a) =>
        text(a, "ID_FICHE_ANCIENNE_CERTIFICATION"),
      ),
    ),
    nouvelles_json: JSON.stringify(
      children(node, "NOUVELLES_CERTIFICATIONS", "NOUVELLE_CERTIFICATION").map((a) =>
        text(a, "ID_FICHE_NOUVELLE_CERTIFICATION"),
      ),
    ),
    correspondances_json: JSON.stringify(correspondances),
    stats_json: JSON.stringify(stats),
    url_fiche: ficheUrl(numero),
    content_hash: createHash("sha256").update(serialize(node)).digest("hex"),
  };

  const certificateurs = children(node, "CERTIFICATEURS", "CERTIFICATEUR").map((c) => ({
    numero,
    nom: text(c, "NOM_CERTIFICATEUR") ?? "",
    siret: text(c, "SIRET_CERTIFICATEUR"),
    etat: text(c, "ETAT_CERTIFICATEUR"),
    date_modif_etat: isoDate(text(c, "DATE_DERNIERE_MODIFICATION_ETAT")),
    nom_commercial: text(c, "NOM_COMMERCIAL"),
    site_internet: text(c, "SITE_INTERNET"),
  }));

  const partenaires = children(node, "PARTENAIRES", "PARTENAIRE").map((p) => ({
    numero,
    nom: text(p, "NOM_PARTENAIRE") ?? "",
    siret: text(p, "SIRET_PARTENAIRE"),
    habilitation: text(p, "HABILITATION_PARTENAIRE") ?? "",
    etat: text(p, "ETAT_HABILITATION") ?? "",
    date_actif: isoDate(text(p, "DATE_ACTIF")),
    date_modif_etat: isoDate(text(p, "DATE_DERNIERE_MODIFICATION_ETAT")),
  }));

  const blocs = children(node, "BLOCS_COMPETENCES", "BLOC_COMPETENCES").map((b, i) => ({
    code: text(b, "CODE") ?? `${numero}BC${String(i + 1).padStart(2, "0")}`,
    numero,
    ordre: i + 1,
    intitule: text(b, "LIBELLE") ?? "",
    competences: text(b, "LISTE_COMPETENCES"),
    modalites_evaluation: text(b, "MODALITES_EVALUATION"),
    prerequis_entree: text(b, "PREREQUIS_ENTREE_FORMATION_BLOC"),
    prerequis_validation: text(b, "PREREQUIS_VALIDATION_BLOC"),
  }));

  return { cert, certificateurs, partenaires, blocs };
}
