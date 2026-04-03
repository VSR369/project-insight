/**
 * useScreeningReview — Data hooks for the screening & shortlisting review interface.
 * - useScreeningData: Fetches submitted abstracts + challenge evaluation criteria
 * - useScoreAbstract: Saves evaluation scores for an abstract
 * - useShortlistAbstract: Marks abstract as SHORTLISTED
 * - useRejectAbstract: Marks abstract as REJECTED
 * - useApproveShortlist: Locks the shortlist and notifies solvers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { CACHE_STANDARD } from '@/config/queryCache';
import { resolveGovernanceMode, isStructuredOrAbove } from '@/lib/governanceMode';

/* ─── Types ──────────────────────────────────────────────── */

export interface EvaluationCriterion {
  criterion_name: string;
  weight_percentage: number;
}

export interface ScreeningAbstract {
  id: string;
  providerId: string;
  providerName: string | null;
  anonymousLabel: string;
  abstractText: string | null;
  methodology: string | null;
  timeline: string | null;
  experience: string | null;
  aiUsageDeclaration: string | null;
  submittedAt: string | null;
  selectionStatus: string | null;
  phaseStatus: string | null;
  existingScores: Record<string, number> | null;
  existingCommentary: string | null;
  existingEvalId: string | null;
  weightedTotal: number | null;
}

export interface ScreeningData {
  challengeId: string;
  title: string;
  governanceProfile: string;
  isEnterprise: boolean;
  evaluationCriteria: EvaluationCriterion[];
  abstracts: ScreeningAbstract[];
  shortlistApproved: boolean;
}

/* ─── Helpers ────────────────────────────────────────────── */

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function anonymiseIndex(idx: number): string {
  if (idx < 26) return `Solver-${ALPHA[idx]}`;
  const first = ALPHA[Math.floor(idx / 26) - 1] ?? 'Z';
  const second = ALPHA[idx % 26];
  return `Solver-${first}${second}`;
}

function computeWeightedTotal(
  scores: Record<string, number> | null,
  criteria: EvaluationCriterion[],
): number | null {
  if (!scores || criteria.length === 0) return null;
  let total = 0;
  let weightSum = 0;
  for (const c of criteria) {
    const score = scores[c.criterion_name];
    if (score != null) {
      total += score * (c.weight_percentage / 100);
      weightSum += c.weight_percentage;
    }
  }
  if (weightSum === 0) return null;
  return Math.round(total * 100) / 100;
}

/* ─── useScreeningData ───────────────────────────────────── */

export function useScreeningData(challengeId: string | undefined, reviewerId: string | undefined) {
  return useQuery({
    queryKey: ['screening-review', challengeId],
    queryFn: async (): Promise<ScreeningData> => {
      if (!challengeId) throw new Error('Challenge ID required');

      // 1. Challenge metadata
      const { data: challenge, error: cErr } = await supabase
        .from('challenges')
        .select('id, title, governance_profile, evaluation_criteria, master_status')
        .eq('id', challengeId)
        .single();

      if (cErr) throw new Error(cErr.message);
      if (!challenge) throw new Error('Challenge not found');

      const isEnterprise = isEnterpriseGrade(resolveGovernanceMode(challenge.governance_profile));
      const rawCriteria = (challenge.evaluation_criteria as unknown as EvaluationCriterion[]) ?? [];

      // 2. Submitted abstracts (phase_status ACTIVE or SHORTLISTED/REJECTED via selection_status)
      const { data: solutions, error: sErr } = await supabase
        .from('solutions')
        .select('id, provider_id, abstract_text, methodology, timeline, experience, ai_usage_declaration, submitted_at, selection_status, phase_status')
        .eq('challenge_id', challengeId)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: true });

      if (sErr) throw new Error(sErr.message);

      // 3. Get provider names (for LIGHTWEIGHT display)
      const providerIds = (solutions ?? []).map(s => s.provider_id);
      let providerNameMap = new Map<string, string>();
      if (providerIds.length > 0 && !isEnterprise) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', providerIds);
        for (const p of profiles ?? []) {
          providerNameMap.set(p.id, [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown');
        }
      }

      // 4. Existing evaluation records for this reviewer
      const solutionIds = (solutions ?? []).map(s => s.id);
      let evalMap = new Map<string, { id: string; rubric_scores: Record<string, number> | null; commentary: string | null }>();
      if (solutionIds.length > 0 && reviewerId) {
        const { data: evals } = await supabase
          .from('evaluation_records')
          .select('id, solution_id, rubric_scores, commentary')
          .eq('reviewer_id', reviewerId)
          .in('solution_id', solutionIds);
        for (const e of evals ?? []) {
          evalMap.set(e.solution_id, {
            id: e.id,
            rubric_scores: e.rubric_scores as Record<string, number> | null,
            commentary: e.commentary,
          });
        }
      }

      // 5. Check if shortlist is already approved (all non-DRAFT solutions have selection_status set)
      const shortlistApproved = (solutions ?? []).length > 0 &&
        (solutions ?? []).every(s => s.selection_status === 'SHORTLISTED' || s.selection_status === 'REJECTED' || s.selection_status === 'APPROVED_SHORTLIST');

      const abstracts: ScreeningAbstract[] = (solutions ?? []).map((s, idx) => {
        const existing = evalMap.get(s.id);
        const scores = existing?.rubric_scores ?? null;
        return {
          id: s.id,
          providerId: s.provider_id,
          providerName: isEnterprise ? null : (providerNameMap.get(s.provider_id) ?? 'Unknown'),
          anonymousLabel: anonymiseIndex(idx),
          abstractText: s.abstract_text,
          methodology: s.methodology,
          timeline: s.timeline,
          experience: s.experience,
          aiUsageDeclaration: s.ai_usage_declaration,
          submittedAt: s.submitted_at,
          selectionStatus: s.selection_status ?? 'PENDING',
          phaseStatus: s.phase_status,
          existingScores: scores,
          existingCommentary: existing?.commentary ?? null,
          existingEvalId: existing?.id ?? null,
          weightedTotal: computeWeightedTotal(scores, rawCriteria),
        };
      });

      return {
        challengeId: challenge.id,
        title: challenge.title,
        governanceProfile: challenge.governance_profile ?? 'ENTERPRISE',
        isEnterprise,
        evaluationCriteria: rawCriteria,
        abstracts,
        shortlistApproved,
      };
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });
}

/* ─── useScoreAbstract ───────────────────────────────────── */

export function useScoreAbstract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      existingEvalId,
      solutionId,
      reviewerId,
      rubricScores,
      commentary,
      individualScore,
    }: {
      existingEvalId: string | null;
      solutionId: string;
      reviewerId: string;
      rubricScores: Record<string, number>;
      commentary: string;
      individualScore: number;
    }) => {
      if (existingEvalId) {
        const withAudit = await withUpdatedBy({
          rubric_scores: rubricScores,
          commentary,
          individual_score: individualScore,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        const { data, error } = await supabase
          .from('evaluation_records')
          .update(withAudit as any)
          .eq('id', existingEvalId)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data;
      } else {
        const withAudit = await withCreatedBy({
          solution_id: solutionId,
          reviewer_id: reviewerId,
          review_round: 1,
          rubric_scores: rubricScores,
          commentary,
          individual_score: individualScore,
          conflict_declared: false,
          submitted_at: new Date().toISOString(),
        });
        const { data, error } = await supabase
          .from('evaluation_records')
          .insert(withAudit as any)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-review'] });
      toast.success('Scores saved successfully');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'score_abstract' });
    },
  });
}

/* ─── useShortlistAbstract ───────────────────────────────── */

export function useShortlistAbstract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ solutionId }: { solutionId: string }) => {
      const withAudit = await withUpdatedBy({
        selection_status: 'SHORTLISTED',
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('solutions')
        .update(withAudit as any)
        .eq('id', solutionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-review'] });
      toast.success('Abstract shortlisted');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'shortlist_abstract' });
    },
  });
}

/* ─── useRejectAbstract ──────────────────────────────────── */

export function useRejectAbstract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ solutionId }: { solutionId: string }) => {
      const withAudit = await withUpdatedBy({
        selection_status: 'REJECTED',
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('solutions')
        .update(withAudit as any)
        .eq('id', solutionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-review'] });
      toast.success('Abstract rejected');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'reject_abstract' });
    },
  });
}

/* ─── useApproveShortlist ────────────────────────────────── */

export function useApproveShortlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ challengeId }: { challengeId: string }) => {
      // 1. Get all solutions for this challenge
      const { data: solutions, error: sErr } = await supabase
        .from('solutions')
        .select('id, provider_id, selection_status')
        .eq('challenge_id', challengeId)
        .not('submitted_at', 'is', null);

      if (sErr) throw new Error(sErr.message);

      const shortlisted = (solutions ?? []).filter(s => s.selection_status === 'SHORTLISTED');
      const rejected = (solutions ?? []).filter(s => s.selection_status === 'REJECTED');

      if (shortlisted.length === 0) {
        throw new Error('No abstracts have been shortlisted. Please shortlist at least one abstract.');
      }

      // 2. Get challenge title for notifications
      const { data: challenge } = await supabase
        .from('challenges')
        .select('title')
        .eq('id', challengeId)
        .single();

      const challengeTitle = challenge?.title ?? 'Challenge';

      // 3. Send notifications to shortlisted solvers
      const shortlistNotifications = shortlisted.map(s => ({
        user_id: s.provider_id,
        challenge_id: challengeId,
        notification_type: 'SHORTLISTED',
        title: 'Congratulations! Your abstract has been shortlisted.',
        message: `Your abstract for "${challengeTitle}" has been shortlisted. You may now upload your full solution.`,
      }));

      // 4. Send notifications to rejected solvers
      const rejectNotifications = rejected.map(s => ({
        user_id: s.provider_id,
        challenge_id: challengeId,
        notification_type: 'ABSTRACT_REJECTED',
        title: 'Abstract not selected',
        message: `Your abstract for "${challengeTitle}" was not selected for the shortlist. Thank you for your submission.`,
      }));

      const allNotifications = [...shortlistNotifications, ...rejectNotifications];
      if (allNotifications.length > 0) {
        const { error: nErr } = await supabase
          .from('cogni_notifications')
          .insert(allNotifications);
        if (nErr) throw new Error(nErr.message);
      }

      // 5. Mark shortlist as approved on all solutions
      const allIds = (solutions ?? []).map(s => s.id);
      if (allIds.length > 0) {
        const withAudit = await withUpdatedBy({ updated_at: new Date().toISOString() });
        // Tag shortlisted as APPROVED_SHORTLIST to lock
        for (const s of shortlisted) {
          await supabase
            .from('solutions')
            .update({ ...withAudit, selection_status: 'APPROVED_SHORTLIST' } as any)
            .eq('id', s.id);
        }
      }

      return { shortlistedCount: shortlisted.length, rejectedCount: rejected.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['screening-review'] });
      toast.success(`Shortlist approved: ${result.shortlistedCount} shortlisted, ${result.rejectedCount} rejected. Solvers notified.`);
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'approve_shortlist' });
    },
  });
}
