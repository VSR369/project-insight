/**
 * quickCpaResolver — Engagement-model-aware Quick CPA template resolver.
 *
 * Phase 9 v4 — Prompt 3.
 *
 * Wraps the SQL helper `resolve_quick_cpa_template(org_id, engagement_model)`.
 *
 * Three-way fallback contract:
 *   1. AGG + org template present  → { source: 'ORG' }
 *   2. AGG + org missing, OR MP    → platform default          → { source: 'PLATFORM_FALLBACK' }
 *   3. Neither org nor platform    → throws MissingPlatformCpaTemplateError
 *
 * Callers (e.g. useChallengeCpaDoc) MUST catch MissingPlatformCpaTemplateError
 * and surface a structured error to the UI — never let the stack trace leak.
 */
import { supabase } from '@/integrations/supabase/client';

export type QuickCpaSource = 'ORG' | 'PLATFORM_FALLBACK';

export interface ResolvedQuickCpa {
  template_id: string;
  document_code: string;
  version: string;
  content: string | null;
  source: QuickCpaSource;
}

export class MissingPlatformCpaTemplateError extends Error {
  readonly code = 'MISSING_PLATFORM_CPA_TEMPLATE';
  constructor(public readonly engagementModel: string) {
    super(
      'Platform CPA template missing for Quick mode — contact Platform Admin.',
    );
    this.name = 'MissingPlatformCpaTemplateError';
  }
}

export async function resolveQuickCpaTemplate(
  orgId: string | null,
  engagementModel: string,
): Promise<ResolvedQuickCpa> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('resolve_quick_cpa_template', {
    p_org_id: orgId,
    p_engagement_model: engagementModel,
  });
  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.template_id) {
    throw new MissingPlatformCpaTemplateError(engagementModel);
  }
  return row as ResolvedQuickCpa;
}
