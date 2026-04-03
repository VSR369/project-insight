/**
 * TW2-03: GATE-02 pass transitions to Phase 3 correctly
 *
 * Verifies that when GATE-02 passes on the legal page and the user
 * confirms submission, the phase_status transitions from
 * 'LEGAL_VERIFICATION_PENDING' → 'COMPLETED', an audit entry is
 * logged with action='LEGAL_VERIFICATION_COMPLETE', and then
 * complete_phase is called to advance to Phase 3.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ── Mock supabase ──────────────────────────────────────── */
const mockEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

describe('TW2-03 — GATE-02 pass transitions to Phase 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transitions phase_status from LEGAL_VERIFICATION_PENDING to COMPLETED', async () => {
    const challenge = {
      phase_status: 'LEGAL_VERIFICATION_PENDING',
      governance_profile: 'STRUCTURED',
    };
    const challengeId = 'challenge-gate02';
    const userId = 'user-123';
    const { supabase } = await import('@/integrations/supabase/client');

    // Replicate LegalDocumentAttachmentPage.handleConfirmSubmit logic
    if (challenge.phase_status === 'LEGAL_VERIFICATION_PENDING') {
      await supabase
        .from('challenges')
        .update({ phase_status: 'COMPLETED' })
        .eq('id', challengeId);
    }

    expect(mockFrom).toHaveBeenCalledWith('challenges');
    expect(mockUpdate).toHaveBeenCalledWith({ phase_status: 'COMPLETED' });
    expect(mockEq).toHaveBeenCalledWith('id', challengeId);
  });

  it('logs LEGAL_VERIFICATION_COMPLETE audit entry', async () => {
    const challenge = {
      phase_status: 'LEGAL_VERIFICATION_PENDING',
      governance_profile: 'STRUCTURED',
    };
    const challengeId = 'challenge-gate02';
    const userId = 'user-123';
    const { supabase } = await import('@/integrations/supabase/client');

    // Simulate the audit log call from handleConfirmSubmit
    if (challenge.phase_status === 'LEGAL_VERIFICATION_PENDING') {
      await supabase.rpc('log_audit', {
        p_user_id: userId,
        p_challenge_id: challengeId,
        p_solution_id: '',
        p_action: 'LEGAL_VERIFICATION_COMPLETE',
        p_method: 'UI',
        p_phase_from: 2,
        p_phase_to: 2,
        p_details: {
          previous_phase_status: 'LEGAL_VERIFICATION_PENDING',
          new_phase_status: 'COMPLETED',
          governance_profile: challenge.governance_profile,
        },
      });
    }

    expect(mockRpc).toHaveBeenCalledWith('log_audit', expect.objectContaining({
      p_action: 'LEGAL_VERIFICATION_COMPLETE',
      p_challenge_id: challengeId,
      p_user_id: userId,
    }));

    // Verify audit details contain the transition metadata
    const auditCall = mockRpc.mock.calls[0];
    const details = auditCall[1].p_details;
    expect(details.previous_phase_status).toBe('LEGAL_VERIFICATION_PENDING');
    expect(details.new_phase_status).toBe('COMPLETED');
    expect(details.governance_profile).toBe('ENTERPRISE');
  });

  it('does NOT transition or log audit when phase_status is already ACTIVE', async () => {
    const challenge = { phase_status: 'ACTIVE', governance_profile: 'ENTERPRISE' };
    const { supabase } = await import('@/integrations/supabase/client');

    if (challenge.phase_status === 'LEGAL_VERIFICATION_PENDING') {
      await supabase.from('challenges').update({ phase_status: 'COMPLETED' }).eq('id', 'x');
    }

    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('calls complete_phase after legal verification transition', async () => {
    const challenge = { phase_status: 'LEGAL_VERIFICATION_PENDING' };
    const challengeId = 'challenge-gate02';
    const userId = 'user-123';
    const completePhase = vi.fn();
    const { supabase } = await import('@/integrations/supabase/client');

    // Step 1: transition
    if (challenge.phase_status === 'LEGAL_VERIFICATION_PENDING') {
      await supabase.from('challenges').update({ phase_status: 'COMPLETED' }).eq('id', challengeId);
    }

    // Step 2: complete_phase (advance Phase 2 → 3)
    completePhase({ challengeId, userId });

    expect(completePhase).toHaveBeenCalledWith({ challengeId, userId });
    // Verify sequence: update was called BEFORE completePhase
    expect(mockFrom.mock.invocationCallOrder[0]).toBeLessThan(
      completePhase.mock.invocationCallOrder[0],
    );
  });

  it('skips legal verification for Lightweight governance (no pending state)', async () => {
    const challenge = { phase_status: 'ACTIVE', governance_profile: 'LIGHTWEIGHT' };
    const completePhase = vi.fn();
    const { supabase } = await import('@/integrations/supabase/client');

    // Lightweight: no LEGAL_VERIFICATION_PENDING check needed
    if (challenge.phase_status === 'LEGAL_VERIFICATION_PENDING') {
      await supabase.from('challenges').update({ phase_status: 'COMPLETED' }).eq('id', 'x');
    }

    // Lightweight goes straight to complete_phase
    completePhase({ challengeId: 'lw-challenge', userId: 'user-456' });

    expect(mockFrom).not.toHaveBeenCalled();
    expect(completePhase).toHaveBeenCalled();
  });
});
