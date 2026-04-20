/**
 * useLcLegalData — Data hooks for the LC Legal Workspace.
 *
 * S7A-1: useChallengeForLC is now a thin wrapper around usePreviewData so the
 * LC sees the SAME 33-section challenge view that Curator/Creator share.
 * The legacy `LcChallenge` type is preserved as an alias for `ChallengeData`
 * so non-Pass-3 callers keep compiling.
 *
 * Components must NOT import supabase directly — use these hooks.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePreviewData } from '@/components/cogniblend/preview/usePreviewData';
import type { AttachedDoc, SuggestedDoc } from '@/lib/cogniblend/lcLegalHelpers';
import type { ChallengeData } from '@/lib/cogniblend/curationTypes';

/**
 * Legacy alias retained for downstream callers (LcChallengeDetailsCard etc.)
 * The full ChallengeData superset gives them every field they need.
 */
export type LcChallenge = ChallengeData & {
  lc_compliance_complete?: boolean | null;
  fc_compliance_complete?: boolean | null;
  creator_approval_status?: string | null;
};

/**
 * Full-fidelity challenge loader. Composes usePreviewData and exposes a
 * shape compatible with the previous narrow query so existing call-sites
 * (`data.title`, `data.maturity_level`, …) continue to work unchanged.
 */
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
          'id, document_type, tier, document_name, status, lc_status, lc_review_notes, attached_by, created_at',
        )
        .eq('challenge_id', challengeId)
        .neq('status', 'ai_suggested')
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as AttachedDoc[];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });
}

export function usePersistedSuggestions(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['ai-legal-suggestions', challengeId],
    queryFn: async (): Promise<SuggestedDoc[]> => {
      if (!challengeId) throw new Error('No challenge ID');
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select(
          'id, document_type, tier, document_name, status, content_summary, rationale, priority',
        )
        .eq('challenge_id', challengeId)
        .eq('status', 'ai_suggested')
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((d) => {
        const r = d as Record<string, unknown>;
        return {
          id: r.id as string,
          document_type: r.document_type as string,
          tier: r.tier as string,
          title: ((r.document_name as string) ?? (r.document_type as string)) as string,
          rationale: ((r.rationale as string) ?? '') as string,
          content_summary: ((r.content_summary as string) ?? '') as string,
          priority: ((r.priority as 'required' | 'recommended') ?? 'recommended'),
        };
      });
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });
}

/**
 * S7A-3: Lazy fetcher for a single legal-doc's HTML body. Used by the
 * "View content" expand button in LcAttachedDocsCard. The result is
 * rendered through LegalDocumentViewer for contract-grade styling.
 */
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
