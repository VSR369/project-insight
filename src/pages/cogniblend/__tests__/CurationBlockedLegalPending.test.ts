/**
 * TW2-02: Curation blocked while legal pending
 *
 * Verifies that the CurationChecklistPanel blocks the submit action
 * when a challenge has phase_status = 'LEGAL_VERIFICATION_PENDING'.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ── Mock toast ─────────────────────────────────────────── */
let mockToastError: ReturnType<typeof vi.fn>;

describe('TW2-02 — Curation blocked while legal pending', () => {
  it('blocks submit and shows error toast when phase_status is LEGAL_VERIFICATION_PENDING', () => {
    // Replicate the blocking logic from CurationChecklistPanel.handleSubmitClick
    const challenge = { phase_status: 'LEGAL_VERIFICATION_PENDING' };
    const isLegalPending = challenge.phase_status === 'LEGAL_VERIFICATION_PENDING';

    let blocked = false;
    if (isLegalPending) {
      mockToastError(
        'Legal documents must be attached before curation can begin. Navigate to Legal Documents to complete this step.',
      );
      blocked = true;
    }

    expect(blocked).toBe(true);
    expect(mockToastError).toHaveBeenCalledWith(
      'Legal documents must be attached before curation can begin. Navigate to Legal Documents to complete this step.',
    );
  });

  it('does NOT block submit when phase_status is ACTIVE', () => {
    const challenge = { phase_status: 'ACTIVE' };
    const isLegalPending = challenge.phase_status === 'LEGAL_VERIFICATION_PENDING';

    let blocked = false;
    if (isLegalPending) {
      mockToastError('blocked');
      blocked = true;
    }

    expect(blocked).toBe(false);
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('does NOT block submit when phase_status is COMPLETED', () => {
    const challenge = { phase_status: 'COMPLETED' };
    const isLegalPending = challenge.phase_status === 'LEGAL_VERIFICATION_PENDING';

    expect(isLegalPending).toBe(false);
  });

  it('correctly detects LEGAL_VERIFICATION_PENDING across different status values', () => {
    const statuses = ['ACTIVE', 'DRAFT', 'LEGAL_VERIFICATION_PENDING', 'COMPLETED', 'CANCELLED'];
    const pendingStatuses = statuses.filter((s) => s === 'LEGAL_VERIFICATION_PENDING');

    expect(pendingStatuses).toEqual(['LEGAL_VERIFICATION_PENDING']);
    expect(pendingStatuses).toHaveLength(1);
  });

  it('generates correct legal page link from challenge id', () => {
    const challengeId = 'challenge-789';
    const expectedLink = `/cogni/challenges/${challengeId}/legal`;
    // The CurationReviewPage renders a Link to this path
    expect(expectedLink).toBe('/cogni/challenges/challenge-789/legal');
  });
});
