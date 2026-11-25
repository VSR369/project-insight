/**
 * DEF-0008 repair: recommending a winner must name the winning solution and the
 * prize amount. This reads the candidates for a challenge and validates the
 * recommendation before it is sent; the server re-checks every rule.
 */
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { AwardLineInput } from './awardDecisionService';

/** Submission states a recommender may still choose as a winner. */
export const ELIGIBLE_AWARD_STATUSES = ['submitted', 'under_review', 'accepted'] as const;

export interface AwardSubmissionCandidate {
  id: string;
  submitterName: string;
  submitterEmail: string;
  status: string;
  submittedAt: string;
}

export interface AwardPrizeTierOption {
  id: string;
  tierName: string;
  rank: number;
  percentageOfPool: number;
  fixedAmount: number | null;
  maxWinners: number;
}

export interface AwardCandidateData {
  submissions: AwardSubmissionCandidate[];
  tiers: AwardPrizeTierOption[];
}

const CANDIDATE_ERROR_MESSAGES: Record<string, string> = {
  winner_requires_line: 'Choose the winning solution and its prize amount before recommending a winner.',
  winner_requires_submission: 'Choose the winning solution before recommending a winner.',
  winner_requires_amount: 'Enter a prize amount greater than zero.',
  winner_submission_not_in_challenge: 'That solution does not belong to this challenge.',
  winner_tier_not_in_challenge: 'That prize tier does not belong to this challenge.',
  winner_duplicate_submission: 'The same solution can be named only once.',
  no_award_cannot_have_lines: 'A no-award recommendation cannot carry a prize.',
  award_lines_must_be_array: 'The award recommendation was not sent. Please try again.',
};

export function awardRecommendationErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error ?? '');
  const key = Object.keys(CANDIDATE_ERROR_MESSAGES).find((code) => text.includes(code));
  return key ? CANDIDATE_ERROR_MESSAGES[key] : text;
}

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export const winnerRecommendSchema = z.object({
  submissionId: z.string().min(1, 'Choose the winning solution.'),
  prizeTierId: z.string(),
  amount: z
    .string()
    .min(1, 'Enter the prize amount.')
    .refine((v) => AMOUNT_PATTERN.test(v.trim()), 'Enter an amount with at most two decimal places.')
    .refine((v) => Number(v.trim()) > 0, 'Enter a prize amount greater than zero.'),
});

export type WinnerRecommendValues = z.infer<typeof winnerRecommendSchema>;

export function buildWinnerLine(values: WinnerRecommendValues): AwardLineInput {
  const tierId = values.prizeTierId.trim();
  return {
    submission_id: values.submissionId,
    prize_tier_id: tierId.length > 0 ? tierId : undefined,
    amount: Number(values.amount.trim()),
  };
}

export async function fetchAwardCandidates(challengeId: string): Promise<AwardCandidateData> {
  const [submissions, tiers] = await Promise.all([
    supabase
      .from('challenge_submissions')
      .select('id, submitter_name, submitter_email, status, created_at')
      .eq('challenge_id', challengeId)
      .eq('is_deleted', false)
      .in('status', [...ELIGIBLE_AWARD_STATUSES])
      .order('created_at', { ascending: false }),
    supabase
      .from('challenge_prize_tiers')
      .select('id, tier_name, rank, percentage_of_pool, fixed_amount, max_winners')
      .eq('challenge_id', challengeId)
      .order('rank', { ascending: true }),
  ]);

  if (submissions.error) throw new Error(submissions.error.message);
  if (tiers.error) throw new Error(tiers.error.message);

  return {
    submissions: (submissions.data ?? []).map((s) => ({
      id: s.id,
      submitterName: s.submitter_name ?? 'Unnamed submitter',
      submitterEmail: s.submitter_email ?? '',
      status: s.status ?? 'submitted',
      submittedAt: s.created_at,
    })),
    tiers: (tiers.data ?? []).map((t) => ({
      id: t.id,
      tierName: t.tier_name,
      rank: t.rank,
      percentageOfPool: Number(t.percentage_of_pool ?? 0),
      fixedAmount: t.fixed_amount === null ? null : Number(t.fixed_amount),
      maxWinners: t.max_winners,
    })),
  };
}
