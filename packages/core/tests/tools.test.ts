import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildMatch, tokenize } from "../src/fts.ts";
import { normalizeSiret, parseNumero } from "../src/numero.ts";
import { connect } from "./helpers.ts";

let t: Awaited<ReturnType<typeof connect>>;
beforeAll(async () => {
  t = await connect();
});
afterAll(async () => {
  await t.close();
});

describe("normalisation des numéros", () => {
  it("accepte toutes les formes usuelles", () => {
    expect(parseNumero("RNCP35419")).toEqual(["RNCP35419"]);
    expect(parseNumero("rncp 35419")).toEqual(["RNCP35419"]);
    expect(parseNumero("RNCP-035419")).toEqual(["RNCP35419"]);
    expect(parseNumero("35419")).toEqual(["RNCP35419", "RS35419"]);
    expect(parseNumero("RS 5000")).toEqual(["RS5000"]);
    expect(parseNumero("https://www.francecompetences.fr/recherche/rs/5000/")).toEqual(["RS5000"]);
    expect(parseNumero("hello")).toEqual([]);
  });
  it("normalise SIRET / SIREN", () => {
    expect(normalizeSiret("808 750 764 00025")).toEqual({ siret: "80875076400025" });
    expect(normalizeSiret("808750764")).toEqual({ siren: "808750764" });
    expect(normalizeSiret("123")).toEqual({});
  });
});

describe("requête FTS", () => {
  it("tokenise sans accents ni mots vides et applique les synonymes", () => {
    expect(tokenize("Développeur d'applications web")).toEqual([
      "developpeur",
      "applications",
      "web",
    ]);
    const m = buildMatch(["dev", "web"], new Map([["dev", "developpeur"]]), "and");
    expect(m).toBe('("dev"* OR "developpeur"*) AND "web"*');
  });
});

describe("serveur MCP : inventaire", () => {
  it("expose 9 outils, 2 resources, 2 prompts, tous en lecture seule", async () => {
    const tools = await t.client.listTools();
    expect(tools.tools.map((x) => x.name).sort()).toEqual([
      "changes_since",
      "check_habilitation",
      "check_validity",
      "compare_certifications",
      "get_certification",
      "get_data_status",
      "list_blocs",
      "list_partenaires",
      "search_certifications",
    ]);
    for (const tool of tools.tools) {
      expect(tool.annotations?.readOnlyHint, tool.name).toBe(true);
      expect(tool.description, tool.name).toMatch(/Example \(FR\)/);
    }
    const res = await t.client.listResources();
    expect(res.resources.map((r) => r.uri).sort()).toEqual(["rncp://about", "rncp://glossaire"]);
    const prompts = await t.client.listPrompts();
    expect(prompts.prompts.map((p) => p.name).sort()).toEqual([
      "rediger_offre_edof",
      "verifier_certification",
    ]);
  });
});

describe("search_certifications", () => {
  it("trouve les fiches développeur web (synonyme dev) en premier", async () => {
    const { data } = await t.call("search_certifications", { query: "dev web" });
    const results = data.results as Array<{ numero: string }>;
    expect(
      results
        .slice(0, 2)
        .map((r) => r.numero)
        .sort(),
    ).toEqual(["RNCP35959", "RNCP37674"]);
    expect(data.source).toMatchObject({ data_updated_at: "2026-08-16" });
  });
  it("filtre par niveau et répertoire", async () => {
    const { data } = await t.call("search_certifications", {
      query: "développeur",
      niveau: 6,
      repertoire: "RNCP",
    });
    const results = data.results as Array<{ numero: string; niveau: number }>;
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.niveau === 6)).toBe(true);
  });
  it("répond par correspondance exacte sur un numéro", async () => {
    const { data } = await t.call("search_certifications", { query: "rncp 35419" });
    expect(data.total).toBe(1);
    expect((data.results as Array<{ statut: string }>)[0]!.statut).toBe("inactive");
  });
  it("actives_only=false remonte les inactives", async () => {
    const a = await t.call("search_certifications", { query: "ingénierie du logiciel" });
    const b = await t.call("search_certifications", {
      query: "ingénierie du logiciel",
      actives_only: false,
    });
    const nums = (d: Record<string, unknown>) =>
      (d.results as Array<{ numero: string }>).map((r) => r.numero);
    expect(nums(a.data)).not.toContain("RNCP35419");
    expect(nums(b.data)[0]).toBe("RNCP35419");
  });
});

describe("get_certification / list_blocs", () => {
  it("renvoie la fiche structurée avec source et troncature explicite", async () => {
    const { data } = await t.call("get_certification", { numero: "37674" });
    expect(data.numero).toBe("RNCP37674");
    expect(data.niveau).toBe(5);
    expect(data.statut).toBe("active");
    expect(data.url_fiche).toBe("https://www.francecompetences.fr/recherche/rncp/37674/");
    expect(typeof data.truncated).toBe("boolean");
    expect(data.source).toMatchObject({ name: "France compétences (data.gouv.fr)" });
    expect((data.certificateurs as unknown[]).length).toBeGreaterThan(0);
  });
  it("liste les blocs dans l'ordre avec codes EDOF", async () => {
    const { data } = await t.call("list_blocs", { numero: "RNCP35419" });
    expect(data.edof_codes).toEqual([
      "RNCP35419BC01",
      "RNCP35419BC02",
      "RNCP35419BC03",
      "RNCP35419BC04",
    ]);
    const blocs = data.blocs as Array<{ ordre: number; competences: string | null }>;
    expect(blocs[0]!.ordre).toBe(1);
    expect(blocs[0]!.competences).toBeTruthy();
  });
  it("une fiche RS n'a pas de blocs", async () => {
    const { data } = await t.call("list_blocs", { numero: "RS5719" });
    expect(data.blocs).toEqual([]);
    expect(String(data.summary)).toMatch(/no blocs/);
  });
  it("erreur explicite si numéro inconnu", async () => {
    const { r, data } = await t.call("get_certification", { numero: "RNCP1" });
    expect(r.isError).toBe(true);
    expect(data.tried).toEqual(["RNCP1"]);
  });
});

describe("check_validity", () => {
  it("fiche inactive : jours négatifs, avertissement, remplaçante", async () => {
    const { data } = await t.call("check_validity", { numero: "RNCP35419" });
    expect(data.actif).toBe(false);
    expect(data.date_fin_enregistrement).toBe("2026-03-17");
    expect(data.jours_restants).toBe(-152);
    expect(data.eligible_cpf_estime).toBe(false);
    expect(String(data.avertissement)).toMatch(/Inactive/);
  });
  it("fiche active qui expire dans 60 jours : avertissement", async () => {
    const { data } = await t.call("check_validity", { numero: "RNCP35959" });
    expect(data.actif).toBe(true);
    expect(data.jours_restants).toBe(60);
    expect(String(data.avertissement)).toMatch(/Expires in 60/);
  });
  it("fiche remplacée pointe vers la nouvelle", async () => {
    const { data } = await t.call("check_validity", { numero: "RS5000" });
    expect(data.remplacee_par).toEqual(["RS6604"]);
  });
});

describe("check_habilitation", () => {
  it("SIRET partenaire actif sur fiche inactive → non habilité (fiche inactive)", async () => {
    const { data } = await t.call("check_habilitation", {
      numero: "RNCP35419",
      siret: "80875076400025",
    });
    expect(data.habilite).toBe(false);
    expect(String(data.avertissement)).toMatch(/inactive/);
    expect((data.partenaires as unknown[]).length).toBe(1);
  });
  it("SIRET partenaire actif sur fiche active → habilité avec rôles", async () => {
    const { data: lp } = await t.call("list_partenaires", { numero: "RNCP37674", limit: 1 });
    const first = (lp.partenaires as Array<{ siret: string; roles: string[] }>)[0]!;
    const { data } = await t.call("check_habilitation", {
      numero: "RNCP37674",
      siret: first.siret,
    });
    expect(data.habilite).toBe(true);
    expect(data.roles).toEqual(first.roles);
  });
  it("SIREN (9 chiffres) et SIRET inconnu", async () => {
    const { data } = await t.call("check_habilitation", {
      numero: "RNCP37674",
      siret: "00000000000000",
    });
    expect(data.habilite).toBe(false);
    expect(String(data.avertissement)).toMatch(/not found/);
    const bad = await t.call("check_habilitation", { numero: "RNCP37674", siret: "12345" });
    expect(bad.r.isError).toBe(true);
  });
});

describe("list_partenaires / compare / changes / status", () => {
  it("pagine et signale la troncature", async () => {
    const { data } = await t.call("list_partenaires", { numero: "RNCP37674", limit: 5 });
    expect((data.partenaires as unknown[]).length).toBe(5);
    expect(data.truncated).toBe(true);
    expect(Number(data.total_actifs)).toBeGreaterThan(5);
  });
  it("compare deux fiches CDA niveau 6", async () => {
    const { data } = await t.call("compare_certifications", {
      numero_a: "RNCP36490",
      numero_b: "RNCP37873",
    });
    expect(data.meme_niveau).toBe(true);
    expect(Number(data.recouvrement_blocs_jaccard)).toBeGreaterThan(0);
    expect((data.blocs_proches as unknown[]).length).toBeGreaterThan(0);
  });
  it("changes_since sans historique explique l'absence", async () => {
    const { data } = await t.call("changes_since", { since: "2026-01-01" });
    expect(data.changes).toEqual([]);
    expect(String(data.note)).toMatch(/No change history/);
  });
  it("get_data_status expose date, âge et compteurs", async () => {
    const { data } = await t.call("get_data_status");
    expect(data.source_date).toBe("2026-08-16");
    expect(data.age_days).toBe(0);
    expect((data.counts as Record<string, number>).total).toBe(20);
  });
});

describe("resources et prompts", () => {
  it("rncp://about contient source, licence et fraîcheur", async () => {
    const r = await t.client.readResource({ uri: "rncp://about" });
    const text = (r.contents[0] as { text: string }).text;
    expect(text).toMatch(/Licence Ouverte/);
    expect(text).toMatch(/2026-08-16/);
  });
  it("le prompt verifier_certification injecte numéro et SIRET", async () => {
    const p = await t.client.getPrompt({
      name: "verifier_certification",
      arguments: { numero: "RNCP37674", siret: "12345678900011" },
    });
    const text = (p.messages[0]!.content as { text: string }).text;
    expect(text).toMatch(/RNCP37674/);
    expect(text).toMatch(/12345678900011/);
  });
});
