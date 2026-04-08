/**
 * useLegalDocTemplates — Fetches active legal document templates
 * filtered by governance mode and engagement model.
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

const COLUMNS = 'template_id, document_code, document_name, description, summary, content, is_mandatory, tier, version, applies_to_mode, applies_to_model';

export function useLegalDocTemplates(governanceMode: GovernanceMode, engagementModel: string) {
  return useQuery<LegalDocTemplate[]>({
    queryKey: ['legal-doc-templates', governanceMode, engagementModel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_document_templates')
        .select(COLUMNS)
        .eq('is_active', true)
        .eq('version_status', 'ACTIVE');

      if (error) throw error;
      if (!data) return [];

      const modeKey = governanceMode.toUpperCase();
      const modelKey = engagementModel.toUpperCase();

      return (data as Array<LegalDocTemplate & { applies_to_mode: string; applies_to_model: string }>)
        .filter((doc) => {
          const modeMatch = ['ALL', 'BOTH'].includes(doc.applies_to_mode.toUpperCase()) || doc.applies_to_mode.toUpperCase() === modeKey;
          const modelMatch = ['ALL', 'BOTH'].includes(doc.applies_to_model.toUpperCase()) || doc.applies_to_model.toUpperCase() === modelKey;
          return modeMatch && modelMatch;
        })
        .map(({ applies_to_mode: _m, applies_to_model: _e, ...rest }) => rest);
    },
    staleTime: 5 * 60 * 1000,
  });
}
