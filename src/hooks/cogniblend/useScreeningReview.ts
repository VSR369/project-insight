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
  isBlindMode: boolean;
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

      const isBlindMode = isStructuredOrAbove(resolveGovernanceMode(challenge.governance_profile));
      const rawCriteria = (challenge.evaluation_criteria as unknown as EvaluationCriterion[]) ?? [];

      // 2. Submitted abstracts (phase_status ACTIVE or SHORTLISTED/REJECTED via selection_status)
      const { data: solutions, error: sErr } = await supabase
        .from('solutions')
        .select('id, provider_id, abstract_text, methodology, timeline, experience, ai_usage_declaration, submitted_at, selection_status, phase_status')
        .eq('challenge_id', challengeId)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: true });

      if (sErr) throw new Error(sErr.message);

      // 3. Get provider names (hidden in blind mode for STRUCTURED/CONTROLLED)
      const providerIds = (solutions ?? []).map(s => s.provider_id);
      let providerNameMap = new Map<string, string>();
      if (providerIds.length > 0 && !isBlindMode) {
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
          providerName: isBlindMode ? null : (providerNameMap.get(s.provider_id) ?? 'Unknown'),
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
        governanceProfile: challenge.governance_profile ?? 'STRUCTURED',
        isBlindMode,
        evaluationCriteria: rawCriteria,
        abstracts,
        shortlistApproved,
      };
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });
}

// Re-export mutation hooks from split file
export { useScoreAbstract, useShortlistAbstract, useRejectAbstract, useApproveShortlist } from './useScreeningMutations';
