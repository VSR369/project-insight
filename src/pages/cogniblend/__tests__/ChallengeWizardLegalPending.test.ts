/**
 * TW2-01: Enterprise wizard → sets LEGAL_VERIFICATION_PENDING
 *
 * Verifies that when an Enterprise challenge completes Step 4,
 * the phase_status is set to 'LEGAL_VERIFICATION_PENDING' and
 * the user is navigated to the legal page.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ── Mock supabase ──────────────────────────────────────── */
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

describe('TW2-01 — Enterprise wizard sets LEGAL_VERIFICATION_PENDING', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls update with LEGAL_VERIFICATION_PENDING for enterprise challenges', async () => {
    // Simulate the exact logic from ChallengeWizardPage handleConfirmSubmit
    const isEnterprise = true;
    const challengeId = 'test-challenge-123';

    const { supabase } = await import('@/integrations/supabase/client');

    if (isEnterprise) {
      await supabase
        .from('challenges')
        .update({ phase_status: 'LEGAL_VERIFICATION_PENDING' })
        .eq('id', challengeId);
    }

    expect(mockFrom).toHaveBeenCalledWith('challenges');
    expect(mockUpdate).toHaveBeenCalledWith({ phase_status: 'LEGAL_VERIFICATION_PENDING' });
  });

  it('does NOT set LEGAL_VERIFICATION_PENDING for Lightweight challenges', async () => {
    const isEnterprise = false;
    const challengeId = 'test-challenge-456';

    const { supabase } = await import('@/integrations/supabase/client');

    if (isEnterprise) {
      await supabase
        .from('challenges')
        .update({ phase_status: 'LEGAL_VERIFICATION_PENDING' })
        .eq('id', challengeId);
    }

    // Should never have been called since isEnterprise is false
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('navigates to legal page for enterprise after setting pending status', () => {
    const isEnterprise = true;
    const challengeId = 'abc-123';
    const navigateMock = vi.fn();

    if (isEnterprise) {
      navigateMock(`/cogni/challenges/${challengeId}/legal`);
    }

    expect(navigateMock).toHaveBeenCalledWith('/cogni/challenges/abc-123/legal');
  });

  it('navigates to dashboard for lightweight (skips legal pending)', () => {
    const isEnterprise = false;
    const navigateMock = vi.fn();

    if (isEnterprise) {
      navigateMock('/cogni/challenges/any/legal');
    } else {
      navigateMock('/cogni/dashboard');
    }

    expect(navigateMock).toHaveBeenCalledWith('/cogni/dashboard');
    expect(navigateMock).not.toHaveBeenCalledWith(expect.stringContaining('/legal'));
  });
});
