import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { type Fiche, ficheUrl, isoDate, mapFiche } from "../src/map.ts";
import { iterFiches } from "../src/parse.ts";

const FIX = resolve(import.meta.dirname, "../../../fixtures");

async function loadAll(): Promise<Map<string, Fiche>> {
  const out = new Map<string, Fiche>();
  for (const [file, rep] of [
    ["export_fiches_RNCP_fixture.xml", "RNCP"],
    ["export_fiches_RS_fixture.xml", "RS"],
  ] as const) {
    for await (const node of iterFiches(resolve(FIX, file))) {
      if (node.name !== "FICHE") continue;
      const f = mapFiche(node, rep);
      out.set(f.cert.numero, f);
    }
  }
  return out;
}

describe("parseur SAX + mapping V4.1", () => {
  it("lit les 20 fiches de la fixture", async () => {
    const all = await loadAll();
    expect(all.size).toBe(20);
    expect([...all.values()].filter((f) => f.cert.repertoire === "RS")).toHaveLength(8);
  });

  it("mappe RNCP35419 (inactive, 4 blocs, 3 partenaires ORGA_FORM)", async () => {
    const f = (await loadAll()).get("RNCP35419")!;
    expect(f.cert.intitule).toBe("Expert en ingénierie du logiciel");
    expect(f.cert.actif).toBe(0);
    expect(f.cert.niveau).toBe(7);
    expect(f.cert.date_fin_enregistrement).toBe("2026-03-17");
    expect(f.cert.url_fiche).toBe("https://www.francecompetences.fr/recherche/rncp/35419/");
    expect(f.blocs.map((b) => b.code)).toEqual([
      "RNCP35419BC01",
      "RNCP35419BC02",
      "RNCP35419BC03",
      "RNCP35419BC04",
    ]);
    expect(f.partenaires).toHaveLength(3);
    expect(f.partenaires.every((p) => p.habilitation === "HABILITATION_ORGA_FORM")).toBe(true);
    expect(f.cert.content_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("mappe une fiche RS sans niveau ni bloc, avec textes et voies d'accès", async () => {
    const f = (await loadAll()).get("RS5719")!;
    expect(f.cert.repertoire).toBe("RS");
    expect(f.cert.niveau).toBeNull();
    expect(f.blocs).toHaveLength(0);
    expect(JSON.parse(f.cert.voies_acces_json).FC.actif).toBe(1);
    expect(JSON.parse(f.cert.textes_json).creation[0].date).toBe("2007-09-05");
    expect(JSON.parse(f.cert.codes_nsf_json)[0].code).toBe("344");
  });

  it("suit les remplacements anciennes/nouvelles", async () => {
    const all = await loadAll();
    expect(JSON.parse(all.get("RS5000")!.cert.nouvelles_json)).toEqual(["RS6604"]);
    expect(JSON.parse(all.get("RNCP39568")!.cert.anciennes_json)).toContain("RNCP34762");
  });

  it("normalise dates et URL", () => {
    expect(isoDate("17/03/2026")).toBe("2026-03-17");
    expect(isoDate(null)).toBeNull();
    expect(isoDate("2026-03-17")).toBeNull();
    expect(ficheUrl("RS5000")).toBe("https://www.francecompetences.fr/recherche/rs/5000/");
  });
});
