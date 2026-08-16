// Builds fixtures/ (20 real fiches) from full exports. Run once per schema change:
//   bun run fixture --rncp-xml <path> --rs-xml <path>
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { build } from "./build.ts";
import { iterFiches, text, type XmlNode } from "./parse.ts";

export const FIXTURE_NUMEROS = {
  RNCP: [
    "RNCP35419", // Expert en ingénierie du logiciel — inactive depuis 2026-03-17, 4 blocs, 3 partenaires
    "RNCP37674", // Développeur web et web mobile — niv 5, active, ~470 partenaires
    "RNCP37873", // Concepteur développeur d'applications — niv 6, active
    "RNCP36490", // Concepteur développeur d'applications — niv 6, active, expire 2027
    "RNCP35959", // Développeur web — niv 5, expire 2026-10-15
    "RNCP37488", // Cybersécurité — niv 4, active
    "RNCP36612", // Assistant en ressources humaines — niv 5
    "RNCP35809", // BTS Finition, aménagement des bâtiments — de droit, 0 partenaire
    "RNCP40344", // Auxiliaire spécialisé vétérinaire — état « Modifications à valider », active
    "RNCP35625", // Diplôme ATT conception lumière — « Modifications à valider par le ministère », inactive
    "RNCP34762", // PGE management — inactive, remplacée par RNCP39568
    "RNCP39568", // remplaçante de RNCP34762
  ],
  RS: [
    "RS5000", // Blockchain — inactive, remplacée par RS6604
    "RS6604", // remplaçante de RS5000
    "RS5568", // Référent cybersécurité en TPE/PME — active
    "RS6547", // Enseigner l'anglais (CELTA)
    "RS5719", // Premiers secours en équipe niveau 1 — expire 2026-12-31
    "RS7423", // IA dans les pratiques RH
    "RS6232", // Repérage amiante navires — inactive, remplacée par RS7485
    "RS7485", // remplaçante de RS6232
  ],
};

const esc = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
function serialize(n: XmlNode, depth = 0): string {
  const pad = "  ".repeat(depth);
  if (!n.children.length) return `${pad}<${n.name}>${esc(n.text.trim())}</${n.name}>\n`;
  return `${pad}<${n.name}>\n${n.children.map((c) => serialize(c, depth + 1)).join("")}${pad}</${n.name}>\n`;
}

const { values: args } = parseArgs({
  options: {
    "rncp-xml": { type: "string" },
    "rs-xml": { type: "string" },
    out: { type: "string", default: "../../fixtures" },
  },
});
if (!args["rncp-xml"] || !args["rs-xml"]) throw new Error("--rncp-xml and --rs-xml required");
const outDir = resolve(args.out!);
mkdirSync(outDir, { recursive: true });

const paths: Record<string, string> = {};
for (const [rep, src] of [
  ["RNCP", args["rncp-xml"]],
  ["RS", args["rs-xml"]],
] as const) {
  const wanted = new Set(FIXTURE_NUMEROS[rep]);
  const parts: string[] = [];
  for await (const node of iterFiches(src)) {
    if (node.name !== "FICHE") continue;
    const num = text(node, "NUMERO_FICHE");
    if (num && wanted.has(num)) {
      parts.push(serialize(node, 1));
      wanted.delete(num);
    }
    if (!wanted.size) break;
  }
  if (wanted.size) throw new Error(`missing in ${rep}: ${[...wanted].join(", ")}`);
  const out = resolve(outDir, `export_fiches_${rep}_fixture.xml`);
  await Bun.write(
    out,
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<FICHES>\n  <VERSION_FLUX>4.1</VERSION_FLUX>\n${parts.join("")}</FICHES>\n`,
  );
  paths[rep] = out;
  console.log(`${rep}: ${parts.length} fiches → ${out}`);
}

const r = await build({
  rncpXml: paths.RNCP!,
  rsXml: paths.RS!,
  out: resolve(outDir, "rncp.fixture.sqlite"),
  sourceDate: "2026-08-16",
  runId: "fixture",
});
console.log(JSON.stringify(r));
