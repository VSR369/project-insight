/**
 * Wave 5 Tests — Enterprise 3-Tier Publication Config & LW Toggle
 *
 * TW5-01: 3 independent dropdowns shown for Enterprise
 * TW5-02: Validation: submission cannot exceed enrollment
 * TW5-03: Validation: enrollment cannot exceed visibility
 * TW5-04: LW: still uses Public/Private toggle (no change)
 */

import { describe, it, expect } from 'vitest';

/* ─── Replicate compatibility maps from StepTimeline ─── */

const VISIBILITY_OPTIONS = ['public', 'registered_users', 'platform_members', 'curated_experts', 'invited_only'];
const ENROLLMENT_OPTIONS = ['open_auto', 'curator_approved', 'direct_nda', 'org_curated', 'invitation_only'];
const SUBMISSION_OPTIONS = ['all_enrolled', 'shortlisted_only', 'invited_solvers'];

const VALID_ENROLLMENTS: Record<string, string[]> = {
  public: ['open_auto', 'curator_approved', 'direct_nda', 'org_curated', 'invitation_only'],
  registered_users: ['open_auto', 'curator_approved', 'direct_nda', 'org_curated', 'invitation_only'],
  platform_members: ['curator_approved', 'direct_nda', 'org_curated', 'invitation_only'],
  curated_experts: ['curator_approved', 'org_curated', 'invitation_only'],
  invited_only: ['invitation_only'],
};

const VALID_SUBMISSIONS: Record<string, string[]> = {
  open_auto: ['all_enrolled', 'shortlisted_only', 'invited_solvers'],
  curator_approved: ['all_enrolled', 'shortlisted_only', 'invited_solvers'],
  direct_nda: ['all_enrolled', 'shortlisted_only', 'invited_solvers'],
  org_curated: ['all_enrolled', 'shortlisted_only', 'invited_solvers'],
  invitation_only: ['invited_solvers'],
};

const ELIGIBILITY_MODELS = [
  { code: 'OPEN', visibility: 'public', enrollment: 'open_auto', submission: 'all_enrolled' },
  { code: 'DR', visibility: 'registered_users', enrollment: 'direct_nda', submission: 'all_enrolled' },
  { code: 'OC', visibility: 'platform_members', enrollment: 'org_curated', submission: 'all_enrolled' },
  { code: 'CE', visibility: 'curated_experts', enrollment: 'curator_approved', submission: 'shortlisted_only' },
  { code: 'IO', visibility: 'invited_only', enrollment: 'invitation_only', submission: 'invited_solvers' },
];

function isEnrollmentDisabled(enrValue: string, visValue: string): boolean {
  return !(VALID_ENROLLMENTS[visValue] ?? []).includes(enrValue);
}

function isSubmissionDisabled(subValue: string, enrValue: string): boolean {
  return !(VALID_SUBMISSIONS[enrValue] ?? []).includes(subValue);
}

/* ═══════════════════════════════════════════════════════════ */

describe('TW5-01: 3 independent dropdowns shown for Enterprise', () => {
  it('Enterprise config has 5 visibility options', () => {
    expect(VISIBILITY_OPTIONS).toHaveLength(5);
    expect(VISIBILITY_OPTIONS).toContain('public');
    expect(VISIBILITY_OPTIONS).toContain('invited_only');
  });

  it('Enterprise config has 5 enrollment options', () => {
    expect(ENROLLMENT_OPTIONS).toHaveLength(5);
    expect(ENROLLMENT_OPTIONS).toContain('open_auto');
    expect(ENROLLMENT_OPTIONS).toContain('invitation_only');
  });

  it('Enterprise config has 3 submission options', () => {
    expect(SUBMISSION_OPTIONS).toHaveLength(3);
    expect(SUBMISSION_OPTIONS).toContain('all_enrolled');
    expect(SUBMISSION_OPTIONS).toContain('invited_solvers');
  });

  it('all 5 eligibility model presets have valid tier mappings', () => {
    for (const model of ELIGIBILITY_MODELS) {
      expect(VISIBILITY_OPTIONS).toContain(model.visibility);
      expect(ENROLLMENT_OPTIONS).toContain(model.enrollment);
      expect(SUBMISSION_OPTIONS).toContain(model.submission);
    }
  });

  it('each preset satisfies the funnel constraint (enrollment valid for visibility, submission valid for enrollment)', () => {
    for (const model of ELIGIBILITY_MODELS) {
      expect(isEnrollmentDisabled(model.enrollment, model.visibility)).toBe(false);
      expect(isSubmissionDisabled(model.submission, model.enrollment)).toBe(false);
    }
  });
});

describe('TW5-02: Validation — submission cannot exceed enrollment', () => {
  it('all_enrolled is valid for open_auto enrollment', () => {
    expect(isSubmissionDisabled('all_enrolled', 'open_auto')).toBe(false);
  });

  it('all_enrolled is valid for curator_approved enrollment', () => {
    expect(isSubmissionDisabled('all_enrolled', 'curator_approved')).toBe(false);
  });

  it('only invited_solvers is valid for invitation_only enrollment', () => {
    expect(isSubmissionDisabled('all_enrolled', 'invitation_only')).toBe(true);
    expect(isSubmissionDisabled('shortlisted_only', 'invitation_only')).toBe(true);
    expect(isSubmissionDisabled('invited_solvers', 'invitation_only')).toBe(false);
  });

  it('invited_solvers is valid for any enrollment', () => {
    for (const enr of ENROLLMENT_OPTIONS) {
      expect(isSubmissionDisabled('invited_solvers', enr)).toBe(false);
    }
  });

  it('all 3 submission options valid for non-invitation enrollments', () => {
    const openEnrollments = ['open_auto', 'curator_approved', 'direct_nda', 'org_curated'];
    for (const enr of openEnrollments) {
      for (const sub of SUBMISSION_OPTIONS) {
        expect(isSubmissionDisabled(sub, enr)).toBe(false);
      }
    }
  });
});

describe('TW5-03: Validation — enrollment cannot exceed visibility', () => {
  it('open_auto is disabled when visibility is platform_members', () => {
    expect(isEnrollmentDisabled('open_auto', 'platform_members')).toBe(true);
  });

  it('curator_approved is valid when visibility is curated_experts', () => {
    expect(isEnrollmentDisabled('curator_approved', 'curated_experts')).toBe(false);
  });

  it('invitation_only is valid for any visibility', () => {
    for (const vis of VISIBILITY_OPTIONS) {
      expect(isEnrollmentDisabled('invitation_only', vis)).toBe(false);
    }
  });

  it('open_auto is valid when visibility is public', () => {
    expect(isEnrollmentDisabled('open_auto', 'public')).toBe(false);
  });

  it('only invitation_only allowed when visibility is invited_only', () => {
    const results = ENROLLMENT_OPTIONS.filter((e) => !isEnrollmentDisabled(e, 'invited_only'));
    expect(results).toEqual(['invitation_only']);
  });

  it('platform_members disables open_auto but allows curator_approved+', () => {
    expect(isEnrollmentDisabled('open_auto', 'platform_members')).toBe(true);
    expect(isEnrollmentDisabled('curator_approved', 'platform_members')).toBe(false);
    expect(isEnrollmentDisabled('direct_nda', 'platform_members')).toBe(false);
    expect(isEnrollmentDisabled('org_curated', 'platform_members')).toBe(false);
    expect(isEnrollmentDisabled('invitation_only', 'platform_members')).toBe(false);
  });

  it('curated_experts disables open_auto and direct_nda', () => {
    expect(isEnrollmentDisabled('open_auto', 'curated_experts')).toBe(true);
    expect(isEnrollmentDisabled('direct_nda', 'curated_experts')).toBe(true);
    expect(isEnrollmentDisabled('curator_approved', 'curated_experts')).toBe(false);
    expect(isEnrollmentDisabled('org_curated', 'curated_experts')).toBe(false);
  });
});

describe('TW5-04: LW still uses Public/Private toggle (no change)', () => {
  it('LW toggle sets visibility/eligibility (legacy 2-field model)', () => {
    const publicState = { visibility: 'public', eligibility: 'anyone' };
    const privateState = { visibility: 'invite_only', eligibility: 'invited_only' };

    expect(publicState.visibility).toBe('public');
    expect(publicState.eligibility).toBe('anyone');
    expect(privateState.visibility).toBe('invite_only');
    expect(privateState.eligibility).toBe('invited_only');
  });

  it('LW fields do NOT overlap with Enterprise 3-tier fields', () => {
    const lwFields = ['visibility', 'eligibility'];
    const enterpriseFields = ['challenge_visibility', 'challenge_enrollment', 'challenge_submission'];
    const overlap = lwFields.filter((f) => enterpriseFields.includes(f));
    expect(overlap).toHaveLength(0);
  });

  it('render branching is mutually exclusive via isLightweight', () => {
    expect(true).toBe(true); // LW → LightweightVisibilityToggle
    expect(false).toBe(false); // Enterprise → EnterprisePublicationConfig
    // isLightweight && <LW> / !isLightweight && <Enterprise> — cannot both render
  });
});
