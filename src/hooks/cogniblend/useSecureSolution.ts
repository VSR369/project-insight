/**
 * useSecureSolution — recorded, access-checked view of one abstract/solution
 * or one challenge submission (BR-SEC-019). Denied attempts are written to
 * the audit trail by the server.
 */
import { useQuery } from '@tanstack/react-query';
import {
  getSolutionSecure,
  getSubmissionSecure,
  SUBMISSION_ACCESS_DENIED_MESSAGE,
  type SecureViewResult,
} from '@/services/cogniblend/lifecycle/solutionConfidentiality';

const QUERY_KEY = 'secure-solution-view';

export function useSecureSolution(solutionId: string | undefined) {
  return useQuery<SecureViewResult>({
    queryKey: [QUERY_KEY, 'solution', solutionId],
    queryFn: () => getSolutionSecure(solutionId as string),
    enabled: !!solutionId,
    retry: false,
  });
}

export function useSecureSubmission(submissionId: string | undefined) {
  return useQuery<SecureViewResult>({
    queryKey: [QUERY_KEY, 'submission', submissionId],
    queryFn: () => getSubmissionSecure(submissionId as string),
    enabled: !!submissionId,
    retry: false,
  });
}

export function isAccessDenied(result: SecureViewResult | undefined): boolean {
  return !!result && !result.allowed && result.error === SUBMISSION_ACCESS_DENIED_MESSAGE;
}
