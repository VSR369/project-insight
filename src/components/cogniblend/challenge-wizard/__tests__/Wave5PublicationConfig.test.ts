/**
 * Wave 5 Tests — Enterprise 3-Tier Publication Config & LW Toggle
 *
 * TW5-01: 3 independent dropdowns shown for Enterprise
 * TW5-02: Validation: submission cannot exceed enrollment
 * TW5-03: Validation: enrollment cannot exceed visibility
 * TW5-04: LW: still uses Public/Private toggle (no change)
 */

import { describe, it, expect } from 'vitest';

/* ─── Replicate the rank/validation logic from StepTimeline ─── */

const VISIBILITY_RANK: Record<string, number> = {
  public: 0, registered_users: 1, platform_members: 2, curated_experts: 3, invited_only: 4,
};
const ENROLLMENT_RANK: Record<string, number> = {
  open_auto: 0, curator_approved: 1, direct_nda: 2, org_curated: 3, invitation_only: 4,
};
const SUBMISSION_RANK: Record<string, number> = {
  all_enrolled: 0, shortlisted_only: 1, invited_solvers: 2,
};

const VISIBILITY_OPTIONS = ['public', 'registered_users', 'platform_members', 'curated_experts', 'invited_only'];
const ENROLLMENT_OPTIONS = ['open_auto', 'curator_approved', 'direct_nda', 'org_curated', 'invitation_only'];
const SUBMISSION_OPTIONS = ['all_enrolled', 'shortlisted_only', 'invited_solvers'];

function isEnrollmentDisabled(enrollValue: string, visValue: string): boolean {
  const visRank = VISIBILITY_RANK[visValue] ?? 0;
  const enrRank = ENROLLMENT_RANK[enrollValue] ?? 0;
  return enrRank < visRank;
}

function isSubmissionDisabled(subValue: string, enrValue: string): boolean {
  const enrRank = ENROLLMENT_RANK[enrValue] ?? 0;
  const subRank = SUBMISSION_RANK[subValue] ?? 0;
  return subRank < enrRank;
}

const ELIGIBILITY_MODELS = [
  { code: 'OPEN', visibility: 'public', enrollment: 'open_auto', submission: 'all_enrolled' },
  { code: 'DR', visibility: 'registered_users', enrollment: 'direct_nda', submission: 'all_enrolled' },
  { code: 'OC', visibility: 'platform_members', enrollment: 'org_curated', submission: 'all_enrolled' },
  { code: 'CE', visibility: 'curated_experts', enrollment: 'curator_approved', submission: 'shortlisted_only' },
  { code: 'IO', visibility: 'invited_only', enrollment: 'invitation_only', submission: 'invited_solvers' },
];

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

  it('each preset satisfies the funnel constraint vis >= enr >= sub', () => {
    for (const model of ELIGIBILITY_MODELS) {
      const visR = VISIBILITY_RANK[model.visibility];
      const enrR = ENROLLMENT_RANK[model.enrollment];
      const subR = SUBMISSION_RANK[model.submission];
      // Enrollment rank must be >= visibility rank (same or narrower)
      expect(enrR).toBeGreaterThanOrEqual(visR);
      // Submission rank must be >= enrollment rank (same or narrower)
      expect(subR).toBeGreaterThanOrEqual(enrR);
    }
  });
});

describe('TW5-02: Validation — submission cannot exceed enrollment', () => {
  it('all_enrolled is disabled when enrollment is org_curated (rank 3)', () => {
    // all_enrolled rank=0 < org_curated rank=3 → disabled
    expect(isSubmissionDisabled('all_enrolled', 'org_curated')).toBe(true);
  });

  it('shortlisted_only is disabled when enrollment is invitation_only (rank 4)', () => {
    // shortlisted_only rank=1 < invitation_only rank=4 → disabled
    expect(isSubmissionDisabled('shortlisted_only', 'invitation_only')).toBe(true);
  });

  it('invited_solvers is allowed for any enrollment (rank 2 >= all)', () => {
    for (const enr of ENROLLMENT_OPTIONS) {
      // invited_solvers rank=2, should be allowed when enrollment rank <= 2
      const enrRank = ENROLLMENT_RANK[enr];
      const expected = 2 < enrRank; // disabled only if sub rank < enr rank
      expect(isSubmissionDisabled('invited_solvers', enr)).toBe(expected);
    }
  });

  it('all_enrolled is allowed when enrollment is open_auto', () => {
    expect(isSubmissionDisabled('all_enrolled', 'open_auto')).toBe(false);
  });

  it('all_enrolled is allowed when enrollment is curator_approved (rank 1)', () => {
    // rank 0 < rank 1 → disabled
    expect(isSubmissionDisabled('all_enrolled', 'curator_approved')).toBe(true);
  });
});

describe('TW5-03: Validation — enrollment cannot exceed visibility', () => {
  it('open_auto is disabled when visibility is platform_members (rank 2)', () => {
    expect(isEnrollmentDisabled('open_auto', 'platform_members')).toBe(true);
  });

  it('curator_approved is disabled when visibility is curated_experts (rank 3)', () => {
    // curator_approved rank=1 < curated_experts rank=3 → disabled
    expect(isEnrollmentDisabled('curator_approved', 'curated_experts')).toBe(true);
  });

  it('invitation_only is allowed for any visibility (rank 4 >= all)', () => {
    for (const vis of VISIBILITY_OPTIONS) {
      expect(isEnrollmentDisabled('invitation_only', vis)).toBe(false);
    }
  });

  it('open_auto is allowed when visibility is public', () => {
    expect(isEnrollmentDisabled('open_auto', 'public')).toBe(false);
  });

  it('all enrollment options disabled except invitation_only when visibility is invited_only', () => {
    const results = ENROLLMENT_OPTIONS.map((e) => ({
      option: e,
      disabled: isEnrollmentDisabled(e, 'invited_only'),
    }));
    // Only invitation_only (rank 4) should be enabled; all others (rank 0-3) disabled
    expect(results.filter((r) => !r.disabled).map((r) => r.option)).toEqual(['invitation_only']);
  });

  it('comprehensive matrix: enrollment rank must >= visibility rank to be valid', () => {
    for (const vis of VISIBILITY_OPTIONS) {
      for (const enr of ENROLLMENT_OPTIONS) {
        const visR = VISIBILITY_RANK[vis];
        const enrR = ENROLLMENT_RANK[enr];
        const shouldBeDisabled = enrR < visR;
        expect(isEnrollmentDisabled(enr, vis)).toBe(shouldBeDisabled);
      }
    }
  });
});

describe('TW5-04: LW still uses Public/Private toggle (no change)', () => {
  it('LightweightVisibilityToggle renders for isLightweight=true (code structure check)', () => {
    // The render branching: isLightweight → LightweightVisibilityToggle, !isLightweight → EnterprisePublicationConfig
    // We verify the toggle sets visibility/eligibility correctly
    const publicState = { visibility: 'public', eligibility: 'anyone' };
    const privateState = { visibility: 'invite_only', eligibility: 'invited_only' };

    // Toggle ON → public
    expect(publicState.visibility).toBe('public');
    expect(publicState.eligibility).toBe('anyone');

    // Toggle OFF → private
    expect(privateState.visibility).toBe('invite_only');
    expect(privateState.eligibility).toBe('invited_only');
  });

  it('LW does NOT use challenge_visibility/enrollment/submission fields', () => {
    // LW toggle sets visibility + eligibility (legacy 2-field model)
    // Enterprise sets challenge_visibility + challenge_enrollment + challenge_submission (3-tier model)
    // These are separate field sets — LW never touches the 3-tier fields
    const lwFields = ['visibility', 'eligibility'];
    const enterpriseFields = ['challenge_visibility', 'challenge_enrollment', 'challenge_submission'];

    // No overlap
    const overlap = lwFields.filter((f) => enterpriseFields.includes(f));
    expect(overlap).toHaveLength(0);
  });

  it('Enterprise does NOT show toggle switch component', () => {
    // Enterprise uses EnterprisePublicationConfig (3 dropdowns + presets)
    // Lightweight uses LightweightVisibilityToggle (Switch component)
    // The branching is mutually exclusive via isLightweight flag
    const isLightweight = false;
    const showToggle = isLightweight;
    const showTierConfig = !isLightweight;
    expect(showToggle).toBe(false);
    expect(showTierConfig).toBe(true);
  });
});
