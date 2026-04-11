/**
 * useLegalTemplatePreview — Shared hook for Phase 2 legal template preview.
 * Shows planned legal templates when actual challenge_legal_docs don't exist yet.
 * Used by both Creator detail view and Curator curation review.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/errorHandler';

export interface LegalTemplatePreview {
  template_id: string;
  document_name: string;
  document_type?: string;
  tier: string;
  is_mandatory: boolean;
}

/**
 * Fetches legal template previews for a challenge in Phase 2.
 * Resolves from org_legal_document_templates for AGG, or
 * platform legal_document_templates for Marketplace.
 */
export function useLegalTemplatePreview(
  challengeId: string,
  currentPhase: number | undefined,
  hasActualDocs: boolean,
  engagementModel?: string,
  organizationId?: string,
) {
  const isPhase2 = (currentPhase ?? 1) < 3 && !hasActualDocs;
  const isAgg = engagementModel?.toUpperCase() === 'AGG';

  return useQuery<LegalTemplatePreview[]>({
    queryKey: ['legal-template-preview', challengeId, isAgg, organizationId],
    queryFn: async () => {
      if (isAgg && organizationId) {
        const { data, error } = await supabase
          .from('org_legal_document_templates')
          .select('id, document_name, document_type, tier, is_mandatory')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('tier', { ascending: true });
        if (error) {
          handleQueryError(error, { operation: 'fetch_org_legal_template_preview' });
          return [];
        }
        return (data ?? []).map((d) => ({
          template_id: d.id,
          document_name: d.document_name,
          document_type: d.document_type,
          tier: d.tier,
          is_mandatory: d.is_mandatory,
        }));
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('legal_document_templates') as any)
        .select('template_id, document_name, document_type, tier, is_mandatory')
        .eq('is_active', true)
        .eq('version_status', 'ACTIVE');
      if (error) {
        handleQueryError(error, { operation: 'fetch_legal_template_preview' });
        return [];
      }
      return (data ?? []) as LegalTemplatePreview[];
    },
    enabled: isPhase2,
    staleTime: 5 * 60_000,
  });
}