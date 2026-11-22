/** DEF-0157: abstract shortlisting controls full-solution submission. */
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  isSubmissionDeadlinePassed,
  SUBMISSION_DEADLINE_PASSED_MESSAGE,
} from './lifecycleJobs';

export type AbstractSelection = 'SHORTLISTED' | 'REJECTED';

export interface ShortlistApprovalResult {
  shortlistedCount: number;
  rejectedCount: number;
}

export interface FullSolutionFile {
  deliverableName: string;
  url: string;
  fileName: string;
  fileSize: number;
}

const SHORTLIST_ERRORS: Record<string, string> = {
  shortlist_requires_two_stage: 'Shortlisting is available only for two-stage challenges.',
  abstract_review_requires_reviewer: 'Only an assigned Evaluation Reviewer can decide an abstract.',
  shortlist_approval_requires_curator: 'Only the Curator of this challenge can approve the shortlist.',
  shortlist_already_approved: 'The shortlist has already been approved and locked.',
  shortlist_has_pending_abstracts: 'Review every submitted abstract before approving the shortlist.',
  shortlist_requires_selection: 'Shortlist at least one abstract before approval.',
  full_solution_requires_owner: 'You can submit only your own full solution.',
  full_solution_requires_shortlist: 'Your abstract must be shortlisted before full-solution submission.',
  full_solution_requires_two_stage: 'Full-solution submission is available only for two-stage challenges.',
  full_solution_files_required: 'Upload at least one deliverable before submitting.',
  solution_deadline_passed: SUBMISSION_DEADLINE_PASSED_MESSAGE,
  abstract_not_submitted: 'The abstract has not been submitted.',
};

export function shortlistErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error ?? '');
  const key = Object.keys(SHORTLIST_ERRORS).find((code) => text.includes(code));
  return key ? SHORTLIST_ERRORS[key] : text;
}

export function isShortlistSelectionStatus(status: string | null): boolean {
  return status === 'SHORTLISTED' || status === 'APPROVED_SHORTLIST';
}

export function canAccessAbstractScreening(isStructured: boolean, isReviewer: boolean, isCurator: boolean): boolean {
  return !isStructured || isReviewer || isCurator;
}

export function canApproveAbstractShortlist(
  isCurator: boolean,
  pendingCount: number,
  shortlistedCount: number,
  isApproved: boolean,
): boolean {
  return isCurator && pendingCount === 0 && shortlistedCount > 0 && !isApproved;
}

export async function setAbstractSelection(solutionId: string, selection: AbstractSelection): Promise<void> {
  const { error } = await supabase.rpc('set_abstract_selection', {
    p_solution_id: solutionId,
    p_selection: selection,
  });
  if (error) throw new Error(shortlistErrorMessage(error));
}

export async function approveAbstractShortlist(challengeId: string): Promise<ShortlistApprovalResult> {
  const { data, error } = await supabase.rpc('approve_abstract_shortlist', { p_challenge_id: challengeId });
  if (error) throw new Error(shortlistErrorMessage(error));
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('The server returned an invalid shortlist result.');
  }
  const result = data as Record<string, unknown>;
  return {
    shortlistedCount: Number(result.shortlistedCount ?? 0),
    rejectedCount: Number(result.rejectedCount ?? 0),
  };
}

export async function assertFullSolutionUploadOpen(solutionId: string): Promise<void> {
  const { data: solution, error: solutionError } = await supabase
    .from('solutions')
    .select('challenge_id')
    .eq('id', solutionId)
    .single();
  if (solutionError) throw new Error(solutionError.message);
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('solution_deadline')
    .eq('id', solution.challenge_id)
    .single();
  if (challengeError) throw new Error(challengeError.message);
  if (isSubmissionDeadlinePassed(challenge.solution_deadline, new Date())) {
    throw new Error(SUBMISSION_DEADLINE_PASSED_MESSAGE);
  }
}

export async function submitFullSolution(solutionId: string, files: FullSolutionFile[]): Promise<void> {
  const payload: Json = files.map((file) => ({
    deliverableName: file.deliverableName,
    url: file.url,
    fileName: file.fileName,
    fileSize: file.fileSize,
  }));
  const { error } = await supabase.rpc('submit_full_solution', {
    p_solution_id: solutionId,
    p_files: payload,
  });
  if (error) throw new Error(shortlistErrorMessage(error));
}
