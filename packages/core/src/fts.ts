// Turns a free-text query into an FTS5 MATCH expression, with synonym expansion.
// Tokens are quoted (no FTS5 syntax injection); tokens >= 3 chars get a prefix wildcard.
export const COMBINING = /[\u0300-\u036f]/g;
const stripDiacritics = (s: string) => s.normalize("NFD").replace(COMBINING, "");

const STOP = new Set([
  "de",
  "des",
  "du",
  "la",
  "le",
  "les",
  "un",
  "une",
  "et",
  "en",
  "au",
  "aux",
  "d",
  "l",
  "a",
  "the",
  "of",
  "pour",
  "sur",
  "dans",
  "par",
  "ou",
  "certification",
  "certifications",
  "certif",
  "titre",
  "diplome",
  "fiche",
  "rncp",
  "rs",
]);

export function tokenize(query: string): string[] {
  return stripDiacritics(query.toLowerCase())
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export function buildMatch(
  tokens: string[],
  synonymes: Map<string, string>,
  mode: "and" | "or",
): string {
  const groups = tokens.map((t) => {
    const alts = [t.length >= 3 ? `"${t}"*` : `"${t}"`];
    const exp = synonymes.get(t);
    if (exp) {
      const words = tokenize(exp);
      if (words.length) alts.push(words.length === 1 ? `"${words[0]}"*` : `"${words.join(" ")}"`);
    }
    return alts.length === 1 ? alts[0]! : `(${alts.join(" OR ")})`;
  });
  return groups.join(mode === "and" ? " AND " : " OR ");
}
