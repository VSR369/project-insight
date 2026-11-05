import { describe, expect, it } from 'vitest';
import { deriveInvitationState, type CertifiedProviderRow } from '../challengeInvitations';

const NOW = new Date('2026-11-05T00:00:00Z');

function row(overrides: Partial<CertifiedProviderRow>): CertifiedProviderRow {
  return {
    provider_id: 'p1',
    provider_name: 'Test Provider',
    industry_segment_name: 'Manufacturing',
    expertise_level: 3,
    star_rating: null,
    invitation_id: null,
    invitation_status: null,
    invited_at: null,
    valid_until: null,
    ...overrides,
  };
}

describe('deriveInvitationState (DEF-0035 invitation lifecycle)', () => {
  it('a provider with no invitation row is not_invited and can be invited', () => {
    const s = deriveInvitationState(row({}), NOW);
    expect(s.uiStatus).toBe('not_invited');
    expect(s.canInvite).toBe(true);
    expect(s.canRevoke).toBe(false);
  });

  it('an invited provider whose valid_until is in the future stays invited and can be revoked, not re-invited', () => {
    const s = deriveInvitationState(
      row({ invitation_status: 'invited', valid_until: '2026-12-01T00:00:00Z' }),
      NOW,
    );
    expect(s.uiStatus).toBe('invited');
    expect(s.canInvite).toBe(false);
    expect(s.canRevoke).toBe(true);
  });

  it('an invited provider whose valid_until has passed is expired and can be re-invited', () => {
    const s = deriveInvitationState(
      row({ invitation_status: 'invited', valid_until: '2026-10-01T00:00:00Z' }),
      NOW,
    );
    expect(s.uiStatus).toBe('expired');
    expect(s.canInvite).toBe(true);
    expect(s.canRevoke).toBe(false);
  });

  it('an invited provider with no valid_until stays invited', () => {
    const s = deriveInvitationState(row({ invitation_status: 'invited' }), NOW);
    expect(s.uiStatus).toBe('invited');
    expect(s.canRevoke).toBe(true);
  });

  it('a revoked invitation can be re-invited but not revoked again', () => {
    const s = deriveInvitationState(row({ invitation_status: 'revoked' }), NOW);
    expect(s.uiStatus).toBe('revoked');
    expect(s.canInvite).toBe(true);
    expect(s.canRevoke).toBe(false);
  });

  it('a declined invitation can be re-invited but not revoked', () => {
    const s = deriveInvitationState(row({ invitation_status: 'declined' }), NOW);
    expect(s.uiStatus).toBe('declined');
    expect(s.canInvite).toBe(true);
    expect(s.canRevoke).toBe(false);
  });

  it('an accepted invitation is final: no invite, no revoke', () => {
    const s = deriveInvitationState(row({ invitation_status: 'accepted' }), NOW);
    expect(s.uiStatus).toBe('accepted');
    expect(s.canInvite).toBe(false);
    expect(s.canRevoke).toBe(false);
  });
});
