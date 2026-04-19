/**
 * useLcLegalData — Data hooks for the LC Legal Workspace.
 * Centralizes Supabase queries for the LC page (challenge, attached docs,
 * AI suggestions). Components must NOT import supabase directly.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AttachedDoc, SuggestedDoc } from '@/lib/cogniblend/lcLegalHelpers';

export interface LcChallenge {
  title: string | null;
  problem_statement: string | null;
  scope: string | null;
  description: string | null;
  ip_model: string | null;
  maturity_level: string | null;
  deliverables: unknown;
  current_phase: number | null;
  master_status: string | null;
  governance_profile: string | null;
  evaluation_criteria: unknown;
  eligibility: string | null;
  solver_eligibility_types: unknown;
  hook: string | null;
  reward_structure: unknown;
  operating_model: string | null;
  solver_visibility_types: unknown;
}

export function useChallengeForLC(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['challenge-lc-detail', challengeId],
    queryFn: async (): Promise<LcChallenge> => {
      if (!challengeId) throw new Error('No challenge ID');
      const { data, error } = await supabase
        .from('challenges')
        .select(
          'title, problem_statement, scope, description, ip_model, maturity_level, deliverables, current_phase, master_status, governance_profile, evaluation_criteria, eligibility, solver_eligibility_types, hook, reward_structure, operating_model, solver_visibility_types',
        )
        .eq('id', challengeId)
        .single();
      if (error) throw new Error(error.message);
      return data as LcChallenge;
    },
    enabled: !!challengeId,
    staleTime: 60_000,
  });
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
