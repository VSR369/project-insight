/**
 * useLegalDocTemplates — Fetches active legal document templates
 * filtered by governance mode and engagement model.
 *
 * Used by CreatorLegalDocsPreview for read-only display.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GovernanceMode } from '@/lib/governanceMode';

interface LegalDocTemplate {
  template_id: string;
  document_code: string | null;
  document_name: string;
  description: string | null;
  summary: string | null;
  content: string | null;
  is_mandatory: boolean;
  tier: string;
  version: string;
}

const COLUMNS =
  'template_id, document_code, document_name, description, summary, content, is_mandatory, tier, version, applies_to_mode, applies_to_model';

/** Wildcard values that match any mode/model */
const WILDCARD = new Set(['ALL', 'BOTH']);

/**
 * Normalize short engagement-model codes used in the creator form
 * to the canonical values stored in the database.
 */
function normalizeEngagementModel(raw: string): string {
  const upper = raw.toUpperCase().trim();
  const MAP: Record<string, string> = {
    MP: 'MARKETPLACE',
    AGG: 'AGGREGATOR',
  };
  return MAP[upper] ?? upper;
}

export function useLegalDocTemplates(
  governanceMode: GovernanceMode,
  engagementModel: string,
) {
  return useQuery<LegalDocTemplate[]>({
    queryKey: ['legal-doc-templates', governanceMode, engagementModel],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('legal_document_templates') as any)
        .select(COLUMNS)
        .eq('is_active', true)
        .eq('version_status', 'ACTIVE');

      if (error) throw error;
      if (!data) return [];

      const modeKey = governanceMode.toUpperCase();
      const modelKey = normalizeEngagementModel(engagementModel);

      return (
        data as Array<
          LegalDocTemplate & { applies_to_mode: string; applies_to_model: string }
        >
      )
        .filter((doc) => {
          const docMode = (doc.applies_to_mode ?? '').toUpperCase();
          const docModel = (doc.applies_to_model ?? '').toUpperCase();
          const modeMatch = WILDCARD.has(docMode) || docMode === modeKey;
          const modelMatch = WILDCARD.has(docModel) || docModel === modelKey;
          return modeMatch && modelMatch;
        })
        .map(({ applies_to_mode: _m, applies_to_model: _e, ...rest }) => rest);
    },
    staleTime: 5 * 60 * 1000,
  });
}
