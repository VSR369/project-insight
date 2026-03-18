/**
 * useSolutionSubmission — Hooks for solver solution abstract submission.
 * - useSolverSolution: Fetch existing draft/submitted solution
 * - useSaveSolutionDraft: Save without validation
 * - useSubmitSolution: Validate and submit
 * - useTier2LegalStatus: Check Tier 2 legal acceptance
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { CACHE_STANDARD } from '@/config/queryCache';

/* ─── Types ──────────────────────────────────────────────── */

export interface SolutionRecord {
  id: string;
  challenge_id: string;
  provider_id: string;
  abstract_text: string | null;
  methodology: string | null;
  timeline: string | null;
  experience: string | null;
  ai_usage_declaration: string | null;
  current_phase: number | null;
  phase_status: string | null;
  selection_status: string | null;
  payment_status: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface SolutionDraftPayload {
  challengeId: string;
  providerId: string;
  abstractText?: string;
  methodology?: string;
  timeline?: string;
  experience?: string;
  aiUsageDeclaration?: string;
}

export interface SolutionSubmitPayload extends SolutionDraftPayload {
  abstractText: string;
  methodology: string;
  timeline: string;
  experience: string;
  aiUsageDeclaration: string;
}

/* ─── Tier 2 Legal Documents ─────────────────────────────── */

const TIER_2_DOCUMENT_TYPES = [
  'SOLUTION_EVALUATION_CONSENT',
  'AI_USAGE_POLICY',
  'DISPUTE_AGREEMENT',
  'WITHDRAWAL_TERMS',
] as const;

/* ─── useTier2LegalStatus ────────────────────────────────── */

export function useTier2LegalStatus(challengeId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['tier2-legal-status', challengeId, userId],
    queryFn: async () => {
      if (!challengeId || !userId) return { allAccepted: false, missing: TIER_2_DOCUMENT_TYPES as unknown as string[] };

      const { data, error } = await supabase
        .from('legal_acceptance_ledger')
        .select('document_type')
        .eq('challenge_id', challengeId)
        .eq('user_id', userId);

      if (error) throw new Error(error.message);

      const acceptedTypes = new Set((data ?? []).map((d: any) => d.document_type));
      const missing = TIER_2_DOCUMENT_TYPES.filter(t => !acceptedTypes.has(t));

      return { allAccepted: missing.length === 0, missing };
    },
    enabled: !!challengeId && !!userId,
    ...CACHE_STANDARD,
  });
}

/* ─── useSolverSolution ──────────────────────────────────── */

export function useSolverSolution(challengeId: string | undefined, providerId: string | undefined) {
  return useQuery({
    queryKey: ['solver-solution', challengeId, providerId],
    queryFn: async (): Promise<SolutionRecord | null> => {
      if (!challengeId || !providerId) return null;

      const { data, error } = await supabase
        .from('solutions')
        .select('id, challenge_id, provider_id, abstract_text, methodology, timeline, experience, ai_usage_declaration, current_phase, phase_status, submitted_at, created_at')
        .eq('challenge_id', challengeId)
        .eq('provider_id', providerId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as SolutionRecord | null;
    },
    enabled: !!challengeId && !!providerId,
    ...CACHE_STANDARD,
  });
}

/* ─── useSaveSolutionDraft ───────────────────────────────── */

export function useSaveSolutionDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ existingId, ...payload }: SolutionDraftPayload & { existingId?: string }) => {
      if (existingId) {
        const withAudit = await withUpdatedBy({
          abstract_text: payload.abstractText ?? null,
          methodology: payload.methodology ?? null,
          timeline: payload.timeline ?? null,
          experience: payload.experience ?? null,
          ai_usage_declaration: payload.aiUsageDeclaration ?? null,
          updated_at: new Date().toISOString(),
        });
        const { data, error } = await supabase
          .from('solutions')
          .update(withAudit as any)
          .eq('id', existingId)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data;
      } else {
        const withAudit = await withCreatedBy({
          challenge_id: payload.challengeId,
          provider_id: payload.providerId,
          abstract_text: payload.abstractText ?? null,
          methodology: payload.methodology ?? null,
          timeline: payload.timeline ?? null,
          experience: payload.experience ?? null,
          ai_usage_declaration: payload.aiUsageDeclaration ?? null,
          current_phase: 7,
          phase_status: 'DRAFT',
        });
        const { data, error } = await supabase
          .from('solutions')
          .insert(withAudit as any)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['solver-solution', variables.challengeId] });
      toast.success('Draft saved');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'save_solution_draft' });
    },
  });
}

/* ─── useSubmitSolution ──────────────────────────────────── */

export function useSubmitSolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ existingId, ...payload }: SolutionSubmitPayload & { existingId?: string }) => {
      const now = new Date().toISOString();

      if (existingId) {
        const withAudit = await withUpdatedBy({
          abstract_text: payload.abstractText,
          methodology: payload.methodology,
          timeline: payload.timeline,
          experience: payload.experience,
          ai_usage_declaration: payload.aiUsageDeclaration,
          current_phase: 7,
          phase_status: 'ACTIVE',
          submitted_at: now,
          updated_at: now,
        });
        const { data, error } = await supabase
          .from('solutions')
          .update(withAudit as any)
          .eq('id', existingId)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data;
      } else {
        const withAudit = await withCreatedBy({
          challenge_id: payload.challengeId,
          provider_id: payload.providerId,
          abstract_text: payload.abstractText,
          methodology: payload.methodology,
          timeline: payload.timeline,
          experience: payload.experience,
          ai_usage_declaration: payload.aiUsageDeclaration,
          current_phase: 7,
          phase_status: 'ACTIVE',
          submitted_at: now,
        });
        const { data, error } = await supabase
          .from('solutions')
          .insert(withAudit as any)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['solver-solution', variables.challengeId] });
      toast.success('Abstract submitted successfully.');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'submit_solution' });
    },
  });
}
