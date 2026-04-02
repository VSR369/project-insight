/**
 * complexityUtils — Pure helpers shared between useComplexityState and ComplexitySubComponents.
 */

import type { ComplexityParam } from '@/hooks/queries/useComplexityParams';

export function buildDraftFromExisting(
  currentParams: { param_key?: string; key?: string; name?: string; value?: number; score?: number }[] | null,
  complexityParams: ComplexityParam[],
): Record<string, number> {
  const draft: Record<string, number> = {};
  complexityParams.forEach((p) => {
    draft[p.param_key] = 5;
  });
  if (Array.isArray(currentParams)) {
    currentParams.forEach((cp: any) => {
      const key = cp.param_key ?? cp.key;
      if (key && draft.hasOwnProperty(key)) {
        draft[key] = cp.value ?? cp.score ?? 5;
      }
    });
  }
  return draft;
}
