import type { CallToolResult } from "@modelcontextprotocol/server";
import type { Meta } from "./queries.ts";

export const DATASET_URL =
  "https://www.data.gouv.fr/datasets/repertoire-national-des-certifications-professionnelles-et-repertoire-specifique";

export type Source = {
  name: string;
  licence: string;
  dataset_url: string;
  data_updated_at: string;
};

export function sourceOf(meta: Meta): Source {
  return {
    name: meta.source ?? "France compétences (data.gouv.fr)",
    licence: meta.licence ?? "Licence Ouverte / Open Licence 2.0",
    dataset_url: DATASET_URL,
    data_updated_at: meta.source_date ?? "unknown",
  };
}

// Every tool answer: structured JSON + a short human summary + provenance.
export function ok(payload: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}

export function fail(message: string, extra: Record<string, unknown> = {}): CallToolResult {
  const payload = { error: message, ...extra };
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    structuredContent: payload,
    isError: true,
  };
}

export const MAX_TEXT = 4000;

export function truncate(
  s: string | null,
  max = MAX_TEXT,
): { text: string | null; truncated: boolean } {
  if (s == null || s.length <= max) return { text: s, truncated: false };
  return { text: `${s.slice(0, max)}…`, truncated: true };
}

export function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function daysBetween(from: Date, isoDate: string): number {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const f = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  return Math.round((d.getTime() - f) / 86_400_000) || 0;
}
