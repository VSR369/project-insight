/**
 * useLcPass3Review — Pass 3 (Legal AI Review) state for the LC.
 *
 * Composes useLcPass3Mutations for the four mutations. Same query key
 * `pass3-legal-review` keeps cache shared with the Curator hook.
 * Components must NOT import supabase directly — they use this hook.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLcPass3Mutations } from './useLcPass3Mutations';

export type Pass3Status = 'idle' | 'running' | 'completed' | 'organized' | 'accepted' | 'error';
export type Pass3Confidence = 'high' | 'medium' | 'low' | null;

export interface Pass3Document {
  id: string;
  ai_review_status: string | null;
  content_html: string | null;
  ai_modified_content_html: string | null;
  ai_changes_summary: string | null;
  ai_confidence: Pass3Confidence;
  ai_regulatory_flags: string[];
  pass3_run_count: number;
  version_history: unknown;
  lc_reviewed_by: string | null;
  lc_reviewed_at: string | null;
}

const PASS3_KEY = (challengeId: string | undefined) =>
  ['pass3-legal-review', challengeId] as const;
const STALE_KEY = (challengeId: string | undefined) =>
  ['pass3-stale', challengeId] as const;
const OP_MODEL_KEY = (challengeId: string | undefined) =>
  ['challenge-operating-model', challengeId] as const;

export function useLcPass3Review(challengeId: string | undefined) {
  const query = useQuery({
    queryKey: PASS3_KEY(challengeId),
    enabled: !!challengeId,
    staleTime: 10_000,
    queryFn: async (): Promise<Pass3Document | null> => {
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select(
          'id, ai_review_status, content_html, ai_modified_content_html, ai_changes_summary, ai_confidence, ai_regulatory_flags, pass3_run_count, version_history, lc_reviewed_by, lc_reviewed_at',
        )
        .eq('challenge_id', challengeId!)
        .eq('document_type', 'UNIFIED_SPA')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      const flagsRaw = (data as { ai_regulatory_flags?: unknown }).ai_regulatory_flags;
      const flags: string[] = Array.isArray(flagsRaw)
        ? flagsRaw.map((f) => String(f))
        : [];

      return {
        id: data.id as string,
        ai_review_status: (data.ai_review_status as string | null) ?? null,
        content_html: (data.content_html as string | null) ?? null,
        ai_modified_content_html:
          (data.ai_modified_content_html as string | null) ?? null,
        ai_changes_summary: (data.ai_changes_summary as string | null) ?? null,
        ai_confidence: (data.ai_confidence as Pass3Confidence) ?? null,
        ai_regulatory_flags: flags,
        pass3_run_count: (data.pass3_run_count as number | null) ?? 0,
        version_history: data.version_history,
        lc_reviewed_by: (data.lc_reviewed_by as string | null) ?? null,
        lc_reviewed_at: (data.lc_reviewed_at as string | null) ?? null,
      };
    },
  });

  const staleQuery = useQuery({
    queryKey: STALE_KEY(challengeId),
    enabled: !!challengeId,
    staleTime: 10_000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('challenges')
        .select('pass3_stale')
        .eq('id', challengeId!)
        .maybeSingle();
      if (error) return false;
      return (data as { pass3_stale?: boolean | null } | null)?.pass3_stale === true;
    },
  });

  const opModelQuery = useQuery({
    queryKey: OP_MODEL_KEY(challengeId),
    enabled: !!challengeId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('challenges')
        .select('operating_model')
        .eq('id', challengeId!)
        .maybeSingle();
      if (error) return null;
      return (data as { operating_model?: string | null } | null)?.operating_model ?? null;
    },
  });

  const { runPass3, organizePass3, saveEdits, acceptPass3 } = useLcPass3Mutations({
    challengeId,
    getCurrentDoc: () => ({
      id: query.data?.id ?? null,
      pass3_run_count: query.data?.pass3_run_count ?? 0,
      version_history: query.data?.version_history,
      ai_review_status: query.data?.ai_review_status ?? null,
    }),
  });

  const doc = query.data ?? null;
  const status = doc?.ai_review_status ?? null;
  const isPass3Accepted = status === 'accepted';

  let pass3Status: Pass3Status = 'idle';
  if (runPass3.isPending || organizePass3.isPending) pass3Status = 'running';
  else if ((runPass3.isError || organizePass3.isError) && !doc) pass3Status = 'error';
  else if (status === 'accepted') pass3Status = 'accepted';
  else if (status === 'organized') pass3Status = 'organized';
  else if (status === 'ai_suggested') pass3Status = 'completed';

  const unifiedDocHtml =
    doc?.ai_modified_content_html ?? doc?.content_html ?? '';

  const isAGG = opModelQuery.data === 'AGG';
  const protectedHeadings = isAGG ? ['ANTI-DISINTERMEDIATION'] : [];

  return {
    pass3Status,
    aiReviewStatus: status,
    unifiedDocHtml,
    changesSummary: doc?.ai_changes_summary ?? '',
    confidence: doc?.ai_confidence ?? null,
    regulatoryFlags: doc?.ai_regulatory_flags ?? [],
    runCount: doc?.pass3_run_count ?? 0,
    isLoading: query.isLoading,
    isRunning: runPass3.isPending,
    isOrganizing: organizePass3.isPending,
    isSaving: saveEdits.isPending,
    isAccepting: acceptPass3.isPending,
    error:
      (runPass3.error instanceof Error ? runPass3.error.message : null) ??
      (organizePass3.error instanceof Error ? organizePass3.error.message : null),
    isPass3Accepted,
    isPass3Complete: isPass3Accepted,
    isStale: staleQuery.data === true,
    runPass3: () => runPass3.mutate(),
    organizeOnly: () => organizePass3.mutate(),
    saveEdits: (html: string) => saveEdits.mutate(html),
    acceptPass3: () => acceptPass3.mutate(),
    protectedHeadings,
    isAGG,
    reviewerUserId: doc?.lc_reviewed_by ?? null,
    reviewedAt: doc?.lc_reviewed_at ?? null,
  };
}
