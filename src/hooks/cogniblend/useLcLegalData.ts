/**
 * useLcLegalData — Data hooks for the LC Legal Workspace.
 *
 * Unified Pass 3 workflow: only SOURCE_DOC + UNIFIED_SPA rows surface here.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePreviewData } from '@/components/cogniblend/preview/usePreviewData';
import type { AttachedDoc } from '@/lib/cogniblend/lcLegalHelpers';
import type { ChallengeData } from '@/lib/cogniblend/curationTypes';

export type LcChallenge = ChallengeData & {
  lc_compliance_complete?: boolean | null;
  fc_compliance_complete?: boolean | null;
  creator_approval_status?: string | null;
};

export function useChallengeForLC(challengeId: string | undefined) {
  const preview = usePreviewData(challengeId);
  return {
    data: preview.challenge as LcChallenge | null,
    isLoading: preview.isLoading,
    isError: preview.isError,
    error: preview.error,
  };
}

export function useAttachedLegalDocs(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['attached-legal-docs', challengeId],
    queryFn: async (): Promise<AttachedDoc[]> => {
      if (!challengeId) throw new Error('No challenge ID');
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select(
          'id, document_type, tier, document_name, status, lc_status, lc_review_notes, attached_by, created_at, source_origin, ai_review_status',
        )
        .eq('challenge_id', challengeId)
        .in('document_type', ['SOURCE_DOC', 'UNIFIED_SPA'])
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as AttachedDoc[];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });
}

export interface LegalDocContent {
  id: string;
  content_html: string | null;
  ai_modified_content_html: string | null;
  content_summary: string | null;
}

export function useLegalDocContent(docId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['legal-doc-content', docId],
    enabled: !!docId && enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<LegalDocContent | null> => {
      if (!docId) return null;
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select('id, content_html, ai_modified_content_html, content_summary')
        .eq('id', docId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as LegalDocContent | null) ?? null;
    },
  });
}
