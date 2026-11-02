/**
 * Tests for BR-CHL-P10 (DEF-0035, carrying DEF-0023 and DEF-0363).
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateChallengeAccess,
  isCertifiedEnrollment,
  accessDeniedMessage,
  type ProviderEnrollmentLike,
} from '../challengeVisibility';

const ENERGY = 'seg-energy';
const HEALTHCARE = 'seg-healthcare';

function enrollment(over: Partial<ProviderEnrollmentLike>): ProviderEnrollmentLike {
  return { industrySegmentId: ENERGY, levelNumber: 2, lifecycleStatus: 'certified', ...over };
}

const base = {
  challengeIndustrySegmentId: HEALTHCARE,
  minExpertiseLevel: 1,
  enrollments: [] as ProviderEnrollmentLike[],
  hasValidInvitation: false,
};

describe('BR-CHL-P10: eligible certified providers (default)', () => {
  it('DEF-0023 AC: provider certified in Energy only cannot join a Healthcare challenge', () => {
    const result = evaluateChallengeAccess({
      ...base,
      visibility: 'eligible_certified',
      enrollments: [enrollment({})],
    });
    expect(result).toEqual({ allowed: false, reason: 'not_certified' });
  });

  it('allows a provider certified in the challenge segment at the minimum level', () => {
    const result = evaluateChallengeAccess({
      ...base,
      visibility: 'eligible_certified',
      enrollments: [enrollment({ industrySegmentId: HEALTHCARE, levelNumber: 1 })],
    });
    expect(result).toEqual({ allowed: true, reason: 'certified' });
  });

  it('denies a certified provider below the minimum expertise level', () => {
    const result = evaluateChallengeAccess({
      ...base,
      visibility: 'eligible_certified',
      minExpertiseLevel: 3,
      enrollments: [enrollment({ industrySegmentId: HEALTHCARE, levelNumber: 2 })],
    });
    expect(result.allowed).toBe(false);
  });

  it.each(['interview_unsuccessful', 'suspended', 'inactive', 'not_certified', 'enrolled', 'panel_scheduled'])(
    'treats lifecycle status %s as not certified',
    (status) => {
      expect(isCertifiedEnrollment(enrollment({ lifecycleStatus: status }))).toBe(false);
      const result = evaluateChallengeAccess({
        ...base,
        visibility: 'eligible_certified',
        enrollments: [enrollment({ industrySegmentId: HEALTHCARE, lifecycleStatus: status })],
      });
      expect(result).toEqual({ allowed: false, reason: 'not_certified' });
    },
  );

  it('matches any segment when the challenge has no industry segment', () => {
    const result = evaluateChallengeAccess({
      ...base,
      visibility: 'eligible_certified',
      challengeIndustrySegmentId: null,
      enrollments: [enrollment({})],
    });
    expect(result.allowed).toBe(true);
  });
});

describe('BR-CHL-P10: invite only', () => {
  it('DEF-0363 AC: an uninvited certified provider does not see an invite-only challenge', () => {
    const result = evaluateChallengeAccess({
      ...base,
      visibility: 'invite_only',
      enrollments: [enrollment({ industrySegmentId: HEALTHCARE })],
      hasValidInvitation: false,
    });
    expect(result).toEqual({ allowed: false, reason: 'not_invited' });
  });

  it('allows the invited provider', () => {
    const result = evaluateChallengeAccess({
      ...base,
      visibility: 'invite_only',
      hasValidInvitation: true,
    });
    expect(result).toEqual({ allowed: true, reason: 'invited' });
  });
});

describe('BR-CHL-P10: public', () => {
  it('allows any registered provider regardless of certification', () => {
    const result = evaluateChallengeAccess({ ...base, visibility: 'public' });
    expect(result).toEqual({ allowed: true, reason: 'public' });
  });
});

describe('accessDeniedMessage', () => {
  it('DEF-0023 AC: names the industry for not-certified providers', () => {
    expect(accessDeniedMessage('not_certified', 'Healthcare')).toBe(
      'You must be certified in Healthcare to join this challenge',
    );
  });

  it('falls back to a generic industry phrase when the segment is unknown', () => {
    expect(accessDeniedMessage('not_certified', null)).toContain('this industry');
  });

  it('explains the invite-only gate', () => {
    expect(accessDeniedMessage('not_invited', null)).toContain('invite only');
  });
});
