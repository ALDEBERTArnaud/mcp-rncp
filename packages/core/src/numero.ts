// Accepts "35419", "RNCP35419", "rncp 35419", "RNCP-35419", "RS 5000", "https://.../rncp/35419/".
// Bare digits are ambiguous (RNCP and RS share the number space): candidates are tried in order.
export function parseNumero(input: string): string[] {
  const s = input.trim().toUpperCase().replace(/\s+/g, "");
  const url = /\/(RNCP|RS)\/(\d{1,6})\/?/i.exec(input);
  if (url) return [`${url[1]!.toUpperCase()}${Number(url[2])}`];
  const m = /^(RNCP|RS)?[-_:]?(\d{1,6})$/.exec(s);
  if (!m) return [];
  const n = String(Number(m[2]));
  if (m[1]) return [`${m[1]}${n}`];
  return [`RNCP${n}`, `RS${n}`];
}

export function normalizeSiret(input: string): { siret?: string; siren?: string } {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 14) return { siret: digits };
  if (digits.length === 9) return { siren: digits };
  return {};
}
