import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import {
  canAccessAbstractScreening,
  canApproveAbstractShortlist,
  isShortlistSelectionStatus,
  shortlistErrorMessage,
} from '../shortlisting';
import { deriveSolutionDisplayStatus } from '@/constants/solutionStatus.constants';

describe('DEF-0157 shortlist access', () => {
  it('allows both provisional and approved shortlist statuses to upload', () => {
    expect(isShortlistSelectionStatus('SHORTLISTED')).toBe(true);
    expect(isShortlistSelectionStatus('APPROVED_SHORTLIST')).toBe(true);
  });

  it('refuses pending and rejected abstracts', () => {
    expect(isShortlistSelectionStatus('PENDING')).toBe(false);
    expect(isShortlistSelectionStatus('REJECTED')).toBe(false);
    expect(isShortlistSelectionStatus(null)).toBe(false);
  });

  it('shows an approved shortlist as Shortlisted rather than Draft', () => {
    expect(deriveSolutionDisplayStatus(9, 'ACTIVE', 'APPROVED_SHORTLIST')).toBe('SHORTLISTED');
  });

  it('lets reviewers screen and Curators approve without granting review rights', () => {
    expect(canAccessAbstractScreening(true, true, false)).toBe(true);
    expect(canAccessAbstractScreening(true, false, true)).toBe(true);
    expect(canAccessAbstractScreening(true, false, false)).toBe(false);
  });

  it('requires a Curator, no pending abstracts, a selection, and no prior approval', () => {
    expect(canApproveAbstractShortlist(true, 0, 1, false)).toBe(true);
    expect(canApproveAbstractShortlist(false, 0, 1, false)).toBe(false);
    expect(canApproveAbstractShortlist(true, 1, 1, false)).toBe(false);
    expect(canApproveAbstractShortlist(true, 0, 0, false)).toBe(false);
    expect(canApproveAbstractShortlist(true, 0, 1, true)).toBe(false);
  });

  it('explains the server-side ownership and shortlist refusals', () => {
    expect(shortlistErrorMessage(new Error('full_solution_requires_owner'))).toBe(
      'You can submit only your own full solution.',
    );
    expect(shortlistErrorMessage(new Error('full_solution_requires_shortlist'))).toBe(
      'Your abstract must be shortlisted before full-solution submission.',
    );
  });
});
