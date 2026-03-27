/**
 * deepMerge — Array-aware recursive merge utility.
 *
 * Rules:
 * - Objects: merged key-by-key recursively
 * - Primitives: target value overwrites source
 * - Arrays at keys ending in `items`, `tiers`, or `entries`:
 *   merged by unique field (`id`, then `label` fallback).
 *   Existing items preserved, matching items updated, new items added.
 * - All other arrays: replaced wholesale
 *
 * IMPORTANT: Never call with null/undefined target. Source must be a valid object.
 */

/** Keys whose arrays should be merged by identity rather than replaced */
const ARRAY_MERGE_SUFFIXES = ['items', 'tiers', 'entries'] as const;

function shouldMergeArray(key: string): boolean {
  const lower = key.toLowerCase();
  return ARRAY_MERGE_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

/**
 * Find the identity field for array-merge items.
 * Prefers `id`, falls back to `label`.
 */
function getIdentityField(items: unknown[]): string | null {
  if (items.length === 0) return null;
  const first = items[0];
  if (first && typeof first === 'object' && first !== null) {
    if ('id' in first) return 'id';
    if ('label' in first) return 'label';
  }
  return null;
}

/**
 * Merge two arrays by identity field.
 * - Items in `target` that match a `source` item by identity are updated (deep-merged).
 * - Items in `source` not present in `target` are appended.
 * - Items in `source` only (no match in `target`) are preserved as-is.
 */
function mergeArraysByIdentity<T extends Record<string, unknown>>(
  source: T[],
  target: T[],
  identityField: string,
): T[] {
  const sourceMap = new Map<unknown, T>();
  for (const item of source) {
    const key = item[identityField];
    if (key !== undefined && key !== null) {
      sourceMap.set(key, item);
    }
  }

  const result: T[] = [];
  const seen = new Set<unknown>();

  // Update existing source items with matching target items
  for (const srcItem of source) {
    const key = srcItem[identityField];
    const targetMatch = key != null ? target.find((t) => t[identityField] === key) : undefined;
    if (targetMatch) {
      result.push(deepMerge(srcItem, targetMatch) as T);
      seen.add(key);
    } else {
      result.push(srcItem);
    }
  }

  // Append new items from target not in source
  for (const tgtItem of target) {
    const key = tgtItem[identityField];
    if (key != null && !seen.has(key)) {
      result.push(tgtItem);
    }
  }

  return result;
}

/**
 * Deep merge `target` into `source`, returning a new object.
 * `target` values take precedence over `source` values.
 *
 * @param source - The base object
 * @param target - The object whose values should be merged in (takes precedence)
 * @returns A new merged object
 */
export function deepMerge<S extends Record<string, unknown>, T extends Record<string, unknown>>(
  source: S,
  target: T,
): S & T {
  const result: Record<string, unknown> = { ...source };

  for (const key of Object.keys(target)) {
    const srcVal = (source as Record<string, unknown>)[key];
    const tgtVal = (target as Record<string, unknown>)[key];

    // null/undefined in target overwrites
    if (tgtVal === null || tgtVal === undefined) {
      result[key] = tgtVal;
      continue;
    }

    // Both are arrays
    if (Array.isArray(srcVal) && Array.isArray(tgtVal)) {
      if (shouldMergeArray(key)) {
        const identityField = getIdentityField([...srcVal, ...tgtVal]);
        if (identityField) {
          result[key] = mergeArraysByIdentity(srcVal, tgtVal, identityField);
        } else {
          // No identity field — replace wholesale
          result[key] = [...tgtVal];
        }
      } else {
        // Non-identity arrays: replace wholesale
        result[key] = [...tgtVal];
      }
      continue;
    }

    // Both are plain objects — recurse
    if (
      srcVal !== null &&
      tgtVal !== null &&
      typeof srcVal === 'object' &&
      typeof tgtVal === 'object' &&
      !Array.isArray(srcVal) &&
      !Array.isArray(tgtVal)
    ) {
      result[key] = deepMerge(
        srcVal as Record<string, unknown>,
        tgtVal as Record<string, unknown>,
      );
      continue;
    }

    // Primitives or type mismatch — target wins
    result[key] = tgtVal;
  }

  return result as S & T;
}

/**
 * Ensure all items in array-aware keys have an `id` field.
 * Used during hydration to migrate legacy data that lacks IDs.
 */
export function ensureArrayItemIds<T extends Record<string, unknown>>(data: T): T {
  if (!data || typeof data !== 'object') return data;

  const result: Record<string, unknown> = { ...data };

  for (const [key, value] of Object.entries(result)) {
    if (Array.isArray(value) && shouldMergeArray(key)) {
      result[key] = value.map((item) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const obj = item as Record<string, unknown>;
          if (!obj.id) {
            return { ...obj, id: crypto.randomUUID() };
          }
        }
        return item;
      });
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = ensureArrayItemIds(value as Record<string, unknown>);
    }
  }

  return result as T;
}
