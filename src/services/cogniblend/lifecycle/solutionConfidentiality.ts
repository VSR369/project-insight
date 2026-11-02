/**
 * BR-SEC-019 (DEF-0060) — solution confidentiality + deadline freeze.
 * canViewSolution mirrors public.fn_can_view_solution so screens can reason
 * about access before calling the server; the database is the authority.
 */
import { supabase } from '@/integrations/supabase/client';

export const SUBMISSION_ACCESS_DENIED_MESSAGE =
  'You do not have access to this submission.';
export const SUBMISSION_FROZEN_MESSAGE =
  'Submissions are frozen at the deadline and can no longer be edited.';

/** Role codes that may review abstracts/solutions (legacy + SLM codes). */
export const EVALUATOR_ROLE_CODES = ['ER', 'R7_AGG', 'R7_MP'] as const;

/** Challenge statuses in which the seeking org may view winning solutions. */
export const POST_AWARD_STATUSES = ['AWARDED', 'COMPLETED', 'DISPUTED'] as const;

export interface SolutionAccessInput {
  isOwner: boolean;
  isPlatformAdmin: boolean;
  hasOpenDisputeCase: boolean;
  isWinner: boolean;
  challengeStatus: string;
  isSeekerTenantMember: boolean;
  hasAcceptedPwa: boolean;
  isAssignedEvaluator: boolean;
  isAwardRecommenderOrConfirmer: boolean;
}

export function canViewSolution(input: SolutionAccessInput): boolean {
  if (input.isOwner) return true;
  if (input.isPlatformAdmin && input.hasOpenDisputeCase) return true;
  if (
    input.isWinner &&
    POST_AWARD_STATUSES.includes(input.challengeStatus as (typeof POST_AWARD_STATUSES)[number]) &&
    input.isSeekerTenantMember
  ) {
    return true;
  }
  if (!input.hasAcceptedPwa) return false;
  return input.isAssignedEvaluator || input.isAwardRecommenderOrConfirmer;
}

/** A provider may not edit their submission once the deadline has passed. */
export function isSubmissionFrozen(
  submissionDeadline: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!submissionDeadline) return false;
  return now.getTime() > new Date(submissionDeadline).getTime();
}

export interface SecureViewResult {
  allowed: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

export async function getSolutionSecure(solutionId: string): Promise<SecureViewResult> {
  const { data, error } = await supabase.rpc('get_solution_secure', {
    p_solution_id: solutionId,
  } as never);
  if (error) throw new Error(error.message);
  return data as unknown as SecureViewResult;
}

export async function getSubmissionSecure(submissionId: string): Promise<SecureViewResult> {
  const { data, error } = await supabase.rpc('get_submission_secure', {
    p_submission_id: submissionId,
  } as never);
  if (error) throw new Error(error.message);
  return data as unknown as SecureViewResult;
}
