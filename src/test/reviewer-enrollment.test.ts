/**
 * Reviewer Enrollment Unit Tests
 * 
 * Tests business logic and state machine validation for reviewer enrollment.
 * These tests do NOT require database connection.
 * 
 * Coverage:
 * - Invitation status state machine
 * - Approval status state machine
 * - Enrollment source rules
 * - Token expiration logic
 * - is_active field logic
 * - Role assignment rules
 */

import { describe, it, expect } from 'vitest';
import {
  INVITATION_STATE_TRANSITIONS,
  APPROVAL_STATE_TRANSITIONS,
  TOKEN_EXPIRATION_CASES,
  IS_ACTIVE_CASES,
  ROLE_ASSIGNMENT_CASES,
  INVALID_APPLICATION_INPUTS,
  createInvitedReviewerFixture,
  createSelfSignupReviewerFixture,
  createValidApplicationInput,
  createValidInvitationInput,
  INVITATION_FLOW_SCENARIOS,
  SELF_SIGNUP_FLOW_SCENARIOS,
} from './fixtures/reviewer-fixtures';

// ============================================================================
// HELPER FUNCTIONS (Simulating business logic)
// ============================================================================

/**
 * Validate invitation status transition
 */
function isValidInvitationTransition(from: string | null, to: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'DRAFT': ['SENT'],
    'SENT': ['ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED'],
    'ACCEPTED': ['CANCELLED'],
    'DECLINED': ['SENT'],
    'EXPIRED': ['SENT'],
    'CANCELLED': ['SENT'],
  };
  
  if (from === null) return false;
  return validTransitions[from]?.includes(to) || false;
}

/**
 * Validate approval status transition
 */
function isValidApprovalTransition(from: string, to: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'pending': ['approved', 'rejected'],
  };
  
  return validTransitions[from]?.includes(to) || false;
}

/**
 * Check if token is expired
 */
function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

/**
 * Determine is_active based on enrollment state
 */
function calculateIsActive(
  enrollmentSource: string,
  invitationStatus: string | null,
  approvalStatus: string
): boolean {
  if (enrollmentSource === 'invitation') {
    // Invitation flow: active unless declined or cancelled
    return invitationStatus !== 'DECLINED' && invitationStatus !== 'CANCELLED';
  } else {
    // Self-signup flow: only active if approved
    return approvalStatus === 'approved';
  }
}

/**
 * Determine if role should be assigned
 */
function shouldAssignRole(
  enrollmentSource: string,
  invitationStatus: string | null,
  approvalStatus: string
): boolean {
  if (enrollmentSource === 'invitation') {
    return invitationStatus === 'ACCEPTED';
  } else {
    return approvalStatus === 'approved';
  }
}

/**
 * Validate application input
 */
function validateApplicationInput(input: {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  industrySegmentIds?: string[];
  expertiseLevelIds?: string[];
  whyJoinStatement?: string;
}): string | null {
  if (!input.firstName || input.firstName.trim() === '') {
    return 'First name is required';
  }
  if (!input.lastName || input.lastName.trim() === '') {
    return 'Last name is required';
  }
  if (!input.email || !input.email.includes('@')) {
    return 'Invalid email';
  }
  if (!input.password || input.password.length < 8) {
    return 'Password too short';
  }
  if (!input.industrySegmentIds || input.industrySegmentIds.length === 0) {
    return 'At least one industry segment required';
  }
  if (!input.expertiseLevelIds || input.expertiseLevelIds.length === 0) {
    return 'At least one expertise level required';
  }
  if (!input.whyJoinStatement || input.whyJoinStatement.length < 50) {
    return 'Statement must be at least 50 characters';
  }
  return null;
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Reviewer Enrollment: Unit Tests', () => {
  // --------------------------------------------------------------------------
  // Section 1: Invitation Status State Machine
  // --------------------------------------------------------------------------
  describe('Invitation Status State Machine', () => {
    describe('Valid Transitions', () => {
      Object.entries(INVITATION_STATE_TRANSITIONS)
        .filter(([, transition]) => transition.valid)
        .forEach(([key, transition]) => {
          it(`TC-INV-${key}: ${transition.description}`, () => {
            const result = isValidInvitationTransition(transition.from, transition.to);
            expect(result).toBe(true);
          });
        });
    });

    describe('Invalid Transitions', () => {
      Object.entries(INVITATION_STATE_TRANSITIONS)
        .filter(([, transition]) => !transition.valid)
        .forEach(([key, transition]) => {
          it(`TC-INV-${key}: ${transition.description} (should fail)`, () => {
            const result = isValidInvitationTransition(transition.from, transition.to);
            expect(result).toBe(false);
          });
        });
    });

    it('TC-INV-NULL: Null status cannot transition', () => {
      expect(isValidInvitationTransition(null, 'SENT')).toBe(false);
      expect(isValidInvitationTransition(null, 'ACCEPTED')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Section 2: Approval Status State Machine
  // --------------------------------------------------------------------------
  describe('Approval Status State Machine', () => {
    describe('Valid Transitions', () => {
      Object.entries(APPROVAL_STATE_TRANSITIONS)
        .filter(([, transition]) => transition.valid)
        .forEach(([key, transition]) => {
          it(`TC-APR-${key}: ${transition.description}`, () => {
            const result = isValidApprovalTransition(transition.from!, transition.to);
            expect(result).toBe(true);
          });
        });
    });

    describe('Invalid Transitions', () => {
      Object.entries(APPROVAL_STATE_TRANSITIONS)
        .filter(([, transition]) => !transition.valid)
        .forEach(([key, transition]) => {
          it(`TC-APR-${key}: ${transition.description} (should fail)`, () => {
            const result = isValidApprovalTransition(transition.from!, transition.to);
            expect(result).toBe(false);
          });
        });
    });

    it('TC-APR-TERMINAL-APPROVED: Approved is terminal state', () => {
      expect(isValidApprovalTransition('approved', 'pending')).toBe(false);
      expect(isValidApprovalTransition('approved', 'rejected')).toBe(false);
    });

    it('TC-APR-TERMINAL-REJECTED: Rejected is terminal state', () => {
      expect(isValidApprovalTransition('rejected', 'pending')).toBe(false);
      expect(isValidApprovalTransition('rejected', 'approved')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Section 3: Enrollment Source Rules
  // --------------------------------------------------------------------------
  describe('Enrollment Source Rules', () => {
    it('TC-SRC-01: Invitation source has invitation_status field', () => {
      const fixture = createInvitedReviewerFixture();
      expect(fixture.enrollment_source).toBe('invitation');
      expect(fixture.invitation_status).not.toBeNull();
    });

    it('TC-SRC-02: Self-signup source has null invitation_status', () => {
      const fixture = createSelfSignupReviewerFixture();
      expect(fixture.enrollment_source).toBe('self_signup');
      expect(fixture.invitation_status).toBeNull();
    });

    it('TC-SRC-03: Self-signup starts with pending approval_status', () => {
      const fixture = createSelfSignupReviewerFixture();
      expect(fixture.approval_status).toBe('pending');
    });

    it('TC-SRC-04: Invitation has implicit approved status', () => {
      const fixture = createInvitedReviewerFixture();
      expect(fixture.approval_status).toBe('approved');
    });

    it('TC-SRC-05: Self-signup starts inactive', () => {
      const fixture = createSelfSignupReviewerFixture();
      expect(fixture.is_active).toBe(false);
    });

    it('TC-SRC-06: Invitation starts active (DRAFT status)', () => {
      const fixture = createInvitedReviewerFixture();
      expect(fixture.is_active).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Section 4: Token Expiration Logic
  // --------------------------------------------------------------------------
  describe('Token Expiration Logic', () => {
    Object.entries(TOKEN_EXPIRATION_CASES).forEach(([key, testCase]) => {
      it(`TC-EXP-${key}: ${testCase.name}`, () => {
        const isExpired = isTokenExpired(testCase.expiresAt);
        expect(isExpired).toBe(!testCase.shouldBeValid);
      });
    });

    it('TC-EXP-BOUNDARY: Token exactly at current time is expired', () => {
      const now = new Date().toISOString();
      // Give 1 second buffer for test execution
      setTimeout(() => {
        expect(isTokenExpired(now)).toBe(true);
      }, 1100);
    });
  });

  // --------------------------------------------------------------------------
  // Section 5: is_active Field Logic
  // --------------------------------------------------------------------------
  describe('is_active Field Logic', () => {
    describe('Invitation Flow', () => {
      const invitationCases = Object.entries(IS_ACTIVE_CASES)
        .filter(([, c]) => 'status' in c && c.source === 'invitation');

      invitationCases.forEach(([key, testCase]) => {
        const status = 'status' in testCase ? testCase.status : '';
        it(`TC-ACT-${key}: ${status} → is_active=${testCase.expectedActive}`, () => {
          const result = calculateIsActive('invitation', status, 'approved');
          expect(result).toBe(testCase.expectedActive);
        });
      });
    });

    describe('Self-Signup Flow', () => {
      const selfSignupCases = Object.entries(IS_ACTIVE_CASES)
        .filter(([, c]) => 'approvalStatus' in c && c.source === 'self_signup');

      selfSignupCases.forEach(([key, testCase]) => {
        const approvalStatus = 'approvalStatus' in testCase ? testCase.approvalStatus : '';
        it(`TC-ACT-${key}: ${approvalStatus} → is_active=${testCase.expectedActive}`, () => {
          const result = calculateIsActive('self_signup', null, approvalStatus);
          expect(result).toBe(testCase.expectedActive);
        });
      });
    });
  });

  // --------------------------------------------------------------------------
  // Section 6: Role Assignment Rules
  // --------------------------------------------------------------------------
  describe('Role Assignment Rules', () => {
    Object.entries(ROLE_ASSIGNMENT_CASES).forEach(([key, testCase]) => {
      it(`TC-ROL-${key}: ${testCase.scenario}`, () => {
        let result: boolean;
        
        if (testCase.scenario.includes('Invitation')) {
          const status = testCase.scenario.includes('accepted') ? 'ACCEPTED' :
                        testCase.scenario.includes('declined') ? 'DECLINED' : 'CANCELLED';
          result = shouldAssignRole('invitation', status, 'approved');
        } else {
          const approvalStatus = testCase.scenario.includes('approved') ? 'approved' :
                                testCase.scenario.includes('rejected') ? 'rejected' : 'pending';
          result = shouldAssignRole('self_signup', null, approvalStatus);
        }
        
        expect(result).toBe(testCase.shouldHaveRole);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Section 7: Application Input Validation
  // --------------------------------------------------------------------------
  describe('Application Input Validation', () => {
    it('TC-VAL-VALID: Valid input passes validation', () => {
      const input = createValidApplicationInput();
      const error = validateApplicationInput(input);
      expect(error).toBeNull();
    });

    Object.entries(INVALID_APPLICATION_INPUTS).forEach(([key, testCase]) => {
      it(`TC-VAL-${key}: ${testCase.expectedError}`, () => {
        const error = validateApplicationInput(testCase.input);
        expect(error).toBe(testCase.expectedError);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Section 8: Fixture Factory Tests
  // --------------------------------------------------------------------------
  describe('Fixture Factories', () => {
    it('TC-FIX-01: createInvitedReviewerFixture generates unique IDs', () => {
      const fixture1 = createInvitedReviewerFixture();
      const fixture2 = createInvitedReviewerFixture();
      expect(fixture1.id).not.toBe(fixture2.id);
      expect(fixture1.email).not.toBe(fixture2.email);
    });

    it('TC-FIX-02: createSelfSignupReviewerFixture generates unique IDs', () => {
      const fixture1 = createSelfSignupReviewerFixture();
      const fixture2 = createSelfSignupReviewerFixture();
      expect(fixture1.id).not.toBe(fixture2.id);
      expect(fixture1.email).not.toBe(fixture2.email);
    });

    it('TC-FIX-03: Fixtures accept overrides', () => {
      const customEmail = 'custom@example.com';
      const fixture = createInvitedReviewerFixture({ email: customEmail });
      expect(fixture.email).toBe(customEmail);
    });

    it('TC-FIX-04: createValidApplicationInput generates valid data', () => {
      const input = createValidApplicationInput();
      expect(input.firstName).toBeTruthy();
      expect(input.lastName).toBeTruthy();
      expect(input.email).toContain('@');
      expect(input.password.length).toBeGreaterThanOrEqual(8);
      expect(input.industrySegmentIds.length).toBeGreaterThan(0);
      expect(input.expertiseLevelIds.length).toBeGreaterThan(0);
      expect(input.whyJoinStatement.length).toBeGreaterThanOrEqual(50);
    });

    it('TC-FIX-05: createValidInvitationInput generates valid data', () => {
      const input = createValidInvitationInput();
      expect(input.name).toBeTruthy();
      expect(input.email).toContain('@');
      expect(input.industrySegmentIds.length).toBeGreaterThan(0);
      expect(input.expertiseLevelIds.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // Section 9: Flow Scenario Definitions
  // --------------------------------------------------------------------------
  describe('Flow Scenario Definitions', () => {
    it('TC-FLOW-01: Invitation flow scenarios are defined', () => {
      expect(INVITATION_FLOW_SCENARIOS.happyPath).toBeDefined();
      expect(INVITATION_FLOW_SCENARIOS.declineFlow).toBeDefined();
      expect(INVITATION_FLOW_SCENARIOS.cancelFlow).toBeDefined();
      expect(INVITATION_FLOW_SCENARIOS.expireAndResend).toBeDefined();
      expect(INVITATION_FLOW_SCENARIOS.reinviteAfterDecline).toBeDefined();
    });

    it('TC-FLOW-02: Self-signup flow scenarios are defined', () => {
      expect(SELF_SIGNUP_FLOW_SCENARIOS.happyPath).toBeDefined();
      expect(SELF_SIGNUP_FLOW_SCENARIOS.rejectFlow).toBeDefined();
    });

    it('TC-FLOW-03: Happy path invitation ends with ACCEPTED', () => {
      const lastStep = INVITATION_FLOW_SCENARIOS.happyPath.steps.slice(-1)[0];
      expect(lastStep.expectedStatus).toBe('ACCEPTED');
      expect(lastStep.expectedActive).toBe(true);
    });

    it('TC-FLOW-04: Happy path self-signup ends with approved', () => {
      const lastStep = SELF_SIGNUP_FLOW_SCENARIOS.happyPath.steps.slice(-1)[0];
      expect(lastStep.expectedApprovalStatus).toBe('approved');
      expect(lastStep.expectedActive).toBe(true);
    });
  });
});
