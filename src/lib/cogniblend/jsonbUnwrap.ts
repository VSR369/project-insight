/**
 * jsonbUnwrap.ts — Safe extraction of arrays from JSONB containers.
 *
 * Many challenge JSONB fields use wrapper objects:
 *   deliverables      → { items: [...] } or [...]
 *   evaluation_criteria → { criteria: [...] } or [...]
 *   reward_structure   → { payment_milestones: [...], ... } (object metadata)
 *   phase_schedule     → { phase_durations: [...], ... } (object metadata)
 *
 * These helpers normalise both shapes so UI code never crashes with `.map is not a function`.
 */

import type { Json } from "@/integrations/supabase/types";

/* ── Generic JSON parser ─────────────────────────────── */

export function parseJson<T>(val: Json | null): T | null {
  if (!val) return null;
  if (typeof val === "string") {
    try { return JSON.parse(val) as T; } catch { return null; }
  }
  return val as T;
}

/* ── Array unwrapper ─────────────────────────────────── */

/**
 * Safely extract an array from a JSONB value that may be:
 *  - a plain array
 *  - an object with a known wrapper key (e.g. { items: [...] })
 *  - null / undefined
 *
 * Returns the array or null.
 */
export function unwrapArray<T = unknown>(
  val: Json | null,
  wrapperKey: string,
): T[] | null {
  const raw = parseJson<any>(val);
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object" && Array.isArray(raw[wrapperKey])) {
    return raw[wrapperKey] as T[];
  }
  return null;
}

/* ── "is filled" check for object-shaped metadata ───── */

/**
 * Returns true if the JSONB value is a non-null, non-empty object or non-empty array.
 * Useful for reward_structure / phase_schedule which may be flat objects with metadata.
 */
export function isJsonFilled(val: Json | null): boolean {
  const raw = parseJson<any>(val);
  if (!raw) return false;
  if (Array.isArray(raw)) return raw.length > 0;
  if (typeof raw === "object") return Object.keys(raw).length > 0;
  return false;
}

/* ── Evaluation criteria helpers ─────────────────────── */

export interface NormalizedCriterion {
  name: string;
  weight: number;
  description?: string;
}

/**
 * Extract evaluation criteria from either:
 *   [...] with criterion_name/weight_percentage  OR  name/weight
 *   { criteria: [...] }
 */
export function unwrapEvalCriteria(val: Json | null): NormalizedCriterion[] | null {
  const arr = unwrapArray<any>(val, "criteria");
  if (!arr || arr.length === 0) return null;
  return arr.map((c: any) => ({
    name: c.criterion_name ?? c.name ?? "—",
    weight: c.weight_percentage ?? c.weight ?? 0,
    description: c.description,
  }));
}
