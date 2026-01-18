/**
 * Reviewer Enrollment Test Fixtures
 * 
 * Factory functions and test data for reviewer enrollment testing.
 * Covers both invitation-based and self-signup flows.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type EnrollmentSource = 'invitation' | 'self_signup';

export type InvitationStatus = 
  | 'DRAFT' 
  | 'SENT' 
  | 'ACCEPTED' 
  | 'DECLINED' 
  | 'EXPIRED' 
  | 'CANCELLED' 
  | null;

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ReviewerFixture {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone?: string;
  timezone?: string;
  years_experience?: number;
  industry_segment_ids: string[];
  expertise_level_ids: string[];
  why_join_statement?: string;
  enrollment_source: EnrollmentSource;
  invitation_status: InvitationStatus;
  invitation_channel?: string;
  invitation_message?: string;
  invitation_sent_at?: string;
  invitation_accepted_at?: string;
  invitation_token_hash?: string;
  invitation_token_expires_at?: string;
  approval_status: ApprovalStatus;
  approved_at?: string;
  approved_by?: string;
  approval_notes?: string;
  is_active: boolean;
  created_at: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface StateTransition {
  from: string | null;
  to: string;
  valid: boolean;
  description: string;
}

export interface ReviewerApplicationInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  timezone?: string;
  yearsExperience?: number;
  industrySegmentIds: string[];
  expertiseLevelIds: string[];
  whyJoinStatement: string;
}

export interface InvitationInput {
  name: string;
  email: string;
  phone?: string;
  timezone?: string;
  yearsExperience?: number;
  industrySegmentIds: string[];
  expertiseLevelIds: string[];
  notes?: string;
  invitationChannel?: string;
  invitationMessage?: string;
  expiryDays?: number;
}

// ============================================================================
// STATE MACHINE DEFINITIONS
// ============================================================================

/**
 * Valid and invalid invitation status transitions
 */
export const INVITATION_STATE_TRANSITIONS: Record<string, StateTransition> = {
  // Valid transitions
  'DRAFT_TO_SENT': {
    from: 'DRAFT',
    to: 'SENT',
    valid: true,
    description: 'Admin sends invitation',
  },
  'SENT_TO_ACCEPTED': {
    from: 'SENT',
    to: 'ACCEPTED',
    valid: true,
    description: 'Reviewer accepts invitation',
  },
  'SENT_TO_DECLINED': {
    from: 'SENT',
    to: 'DECLINED',
    valid: true,
    description: 'Reviewer declines invitation',
  },
  'SENT_TO_EXPIRED': {
    from: 'SENT',
    to: 'EXPIRED',
    valid: true,
    description: 'Invitation token expires',
  },
  'SENT_TO_CANCELLED': {
    from: 'SENT',
    to: 'CANCELLED',
    valid: true,
    description: 'Admin cancels invitation',
  },
  'ACCEPTED_TO_CANCELLED': {
    from: 'ACCEPTED',
    to: 'CANCELLED',
    valid: true,
    description: 'Admin removes accepted reviewer',
  },
  'EXPIRED_TO_SENT': {
    from: 'EXPIRED',
    to: 'SENT',
    valid: true,
    description: 'Admin resends expired invitation',
  },
  'CANCELLED_TO_SENT': {
    from: 'CANCELLED',
    to: 'SENT',
    valid: true,
    description: 'Admin re-invites cancelled reviewer',
  },
  'DECLINED_TO_SENT': {
    from: 'DECLINED',
    to: 'SENT',
    valid: true,
    description: 'Admin re-invites declined reviewer',
  },
  
  // Invalid transitions
  'DRAFT_TO_ACCEPTED': {
    from: 'DRAFT',
    to: 'ACCEPTED',
    valid: false,
    description: 'Cannot accept without sending first',
  },
  'DRAFT_TO_DECLINED': {
    from: 'DRAFT',
    to: 'DECLINED',
    valid: false,
    description: 'Cannot decline without sending first',
  },
  'ACCEPTED_TO_SENT': {
    from: 'ACCEPTED',
    to: 'SENT',
    valid: false,
    description: 'Cannot resend to already accepted reviewer',
  },
  'ACCEPTED_TO_DECLINED': {
    from: 'ACCEPTED',
    to: 'DECLINED',
    valid: false,
    description: 'Cannot decline after accepting',
  },
  'DECLINED_TO_ACCEPTED': {
    from: 'DECLINED',
    to: 'ACCEPTED',
    valid: false,
    description: 'Cannot accept after declining (must resend)',
  },
  'EXPIRED_TO_ACCEPTED': {
    from: 'EXPIRED',
    to: 'ACCEPTED',
    valid: false,
    description: 'Cannot accept expired invitation',
  },
  'CANCELLED_TO_ACCEPTED': {
    from: 'CANCELLED',
    to: 'ACCEPTED',
    valid: false,
    description: 'Cannot accept cancelled invitation',
  },
};

/**
 * Valid and invalid approval status transitions
 */
export const APPROVAL_STATE_TRANSITIONS: Record<string, StateTransition> = {
  // Valid transitions
  'PENDING_TO_APPROVED': {
    from: 'pending',
    to: 'approved',
    valid: true,
    description: 'Admin approves application',
  },
  'PENDING_TO_REJECTED': {
    from: 'pending',
    to: 'rejected',
    valid: true,
    description: 'Admin rejects application',
  },
  
  // Invalid transitions
  'APPROVED_TO_REJECTED': {
    from: 'approved',
    to: 'rejected',
    valid: false,
    description: 'Cannot reject after approval',
  },
  'REJECTED_TO_APPROVED': {
    from: 'rejected',
    to: 'approved',
    valid: false,
    description: 'Cannot approve after rejection',
  },
  'APPROVED_TO_PENDING': {
    from: 'approved',
    to: 'pending',
    valid: false,
    description: 'Cannot return to pending after approval',
  },
  'REJECTED_TO_PENDING': {
    from: 'rejected',
    to: 'pending',
    valid: false,
    description: 'Cannot return to pending after rejection',
  },
};

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let fixtureCounter = 0;

/**
 * Generate a unique test email
 */
export function generateTestEmail(prefix = 'reviewer'): string {
  fixtureCounter++;
  return `test-${prefix}-${Date.now()}-${fixtureCounter}@example.com`;
}

/**
 * Generate a unique test ID
 */
export function generateTestId(): string {
  fixtureCounter++;
  return `test-${Date.now()}-${fixtureCounter}`;
}

/**
 * Create a reviewer fixture for invitation flow
 */
export function createInvitedReviewerFixture(
  overrides: Partial<ReviewerFixture> = {}
): ReviewerFixture {
  const now = new Date().toISOString();
  const id = generateTestId();
  
  return {
    id,
    user_id: null,
    name: `Test Reviewer ${id}`,
    email: generateTestEmail('invited'),
    phone: '+1234567890',
    timezone: 'UTC',
    years_experience: 5,
    industry_segment_ids: ['test-segment-1'],
    expertise_level_ids: ['test-level-1'],
    enrollment_source: 'invitation',
    invitation_status: 'DRAFT',
    invitation_channel: 'email',
    approval_status: 'approved', // Invitation flow = implicit approval
    is_active: true,
    created_at: now,
    ...overrides,
  };
}

/**
 * Create a reviewer fixture for self-signup flow
 */
export function createSelfSignupReviewerFixture(
  overrides: Partial<ReviewerFixture> = {}
): ReviewerFixture {
  const now = new Date().toISOString();
  const id = generateTestId();
  
  return {
    id,
    user_id: `user-${id}`,
    name: `Self Signup ${id}`,
    email: generateTestEmail('selfsignup'),
    phone: '+1234567890',
    timezone: 'UTC',
    years_experience: 3,
    industry_segment_ids: ['test-segment-1'],
    expertise_level_ids: ['test-level-1'],
    why_join_statement: 'I want to contribute my expertise to help evaluate solution providers.',
    enrollment_source: 'self_signup',
    invitation_status: null, // Self-signup has no invitation
    approval_status: 'pending',
    is_active: false, // Inactive until approved
    created_at: now,
    ...overrides,
  };
}

/**
 * Create valid reviewer application input
 */
export function createValidApplicationInput(
  overrides: Partial<ReviewerApplicationInput> = {}
): ReviewerApplicationInput {
  return {
    firstName: 'Test',
    lastName: 'Reviewer',
    email: generateTestEmail('application'),
    password: 'SecureP@ssw0rd123!',
    phone: '+1234567890',
    timezone: 'America/New_York',
    yearsExperience: 5,
    industrySegmentIds: ['test-segment-1'],
    expertiseLevelIds: ['test-level-1'],
    whyJoinStatement: 'I have extensive experience in this industry and want to help evaluate solution providers to ensure quality standards are met.',
    ...overrides,
  };
}

/**
 * Create valid invitation input
 */
export function createValidInvitationInput(
  overrides: Partial<InvitationInput> = {}
): InvitationInput {
  return {
    name: 'Invited Reviewer',
    email: generateTestEmail('invitation'),
    phone: '+1234567890',
    timezone: 'Europe/London',
    yearsExperience: 10,
    industrySegmentIds: ['test-segment-1'],
    expertiseLevelIds: ['test-level-1'],
    notes: 'Industry expert with strong background',
    invitationChannel: 'email',
    invitationMessage: 'We would like to invite you to join our panel.',
    expiryDays: 7,
    ...overrides,
  };
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

/**
 * Complete invitation flow test scenarios
 */
export const INVITATION_FLOW_SCENARIOS = {
  happyPath: {
    name: 'Happy Path: Create → Send → Accept',
    steps: [
      { action: 'create', expectedStatus: 'DRAFT', expectedActive: true },
      { action: 'send', expectedStatus: 'SENT', expectedActive: true },
      { action: 'accept', expectedStatus: 'ACCEPTED', expectedActive: true },
    ],
  },
  declineFlow: {
    name: 'Decline Flow: Create → Send → Decline',
    steps: [
      { action: 'create', expectedStatus: 'DRAFT', expectedActive: true },
      { action: 'send', expectedStatus: 'SENT', expectedActive: true },
      { action: 'decline', expectedStatus: 'DECLINED', expectedActive: false },
    ],
  },
  cancelFlow: {
    name: 'Cancel Flow: Create → Send → Cancel',
    steps: [
      { action: 'create', expectedStatus: 'DRAFT', expectedActive: true },
      { action: 'send', expectedStatus: 'SENT', expectedActive: true },
      { action: 'cancel', expectedStatus: 'CANCELLED', expectedActive: false },
    ],
  },
  expireAndResend: {
    name: 'Expire and Resend: Create → Send → Expire → Resend → Accept',
    steps: [
      { action: 'create', expectedStatus: 'DRAFT', expectedActive: true },
      { action: 'send', expectedStatus: 'SENT', expectedActive: true },
      { action: 'expire', expectedStatus: 'EXPIRED', expectedActive: true },
      { action: 'resend', expectedStatus: 'SENT', expectedActive: true },
      { action: 'accept', expectedStatus: 'ACCEPTED', expectedActive: true },
    ],
  },
  reinviteAfterDecline: {
    name: 'Re-invite After Decline: Create → Send → Decline → Resend → Accept',
    steps: [
      { action: 'create', expectedStatus: 'DRAFT', expectedActive: true },
      { action: 'send', expectedStatus: 'SENT', expectedActive: true },
      { action: 'decline', expectedStatus: 'DECLINED', expectedActive: false },
      { action: 'resend', expectedStatus: 'SENT', expectedActive: true },
      { action: 'accept', expectedStatus: 'ACCEPTED', expectedActive: true },
    ],
  },
};

/**
 * Complete self-signup flow test scenarios
 */
export const SELF_SIGNUP_FLOW_SCENARIOS = {
  happyPath: {
    name: 'Happy Path: Register → Approve',
    steps: [
      { action: 'register', expectedApprovalStatus: 'pending', expectedActive: false },
      { action: 'approve', expectedApprovalStatus: 'approved', expectedActive: true },
    ],
  },
  rejectFlow: {
    name: 'Reject Flow: Register → Reject',
    steps: [
      { action: 'register', expectedApprovalStatus: 'pending', expectedActive: false },
      { action: 'reject', expectedApprovalStatus: 'rejected', expectedActive: false },
    ],
  },
};

// ============================================================================
// VALIDATION TEST CASES
// ============================================================================

/**
 * Invalid application inputs for validation testing
 */
export const INVALID_APPLICATION_INPUTS = {
  missingFirstName: {
    input: createValidApplicationInput({ firstName: '' }),
    expectedError: 'First name is required',
  },
  missingLastName: {
    input: createValidApplicationInput({ lastName: '' }),
    expectedError: 'Last name is required',
  },
  invalidEmail: {
    input: createValidApplicationInput({ email: 'not-an-email' }),
    expectedError: 'Invalid email',
  },
  shortPassword: {
    input: createValidApplicationInput({ password: 'short' }),
    expectedError: 'Password too short',
  },
  emptyIndustrySegments: {
    input: createValidApplicationInput({ industrySegmentIds: [] }),
    expectedError: 'At least one industry segment required',
  },
  emptyExpertiseLevels: {
    input: createValidApplicationInput({ expertiseLevelIds: [] }),
    expectedError: 'At least one expertise level required',
  },
  shortStatement: {
    input: createValidApplicationInput({ whyJoinStatement: 'Too short' }),
    expectedError: 'Statement must be at least 50 characters',
  },
};

/**
 * Token expiration test cases
 */
export const TOKEN_EXPIRATION_CASES = {
  valid: {
    name: 'Valid Token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    shouldBeValid: true,
  },
  expiredYesterday: {
    name: 'Expired Yesterday',
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    shouldBeValid: false,
  },
  expiredJustNow: {
    name: 'Expired Just Now',
    expiresAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
    shouldBeValid: false,
  },
  expiresInOneMinute: {
    name: 'Expires in One Minute',
    expiresAt: new Date(Date.now() + 60 * 1000).toISOString(), // 1 minute from now
    shouldBeValid: true,
  },
};

// ============================================================================
// ROLE ASSIGNMENT TEST CASES
// ============================================================================

export const ROLE_ASSIGNMENT_CASES = {
  invitationAccepted: {
    scenario: 'Invitation accepted',
    shouldHaveRole: true,
    roleName: 'panel_reviewer',
  },
  invitationDeclined: {
    scenario: 'Invitation declined',
    shouldHaveRole: false,
    roleName: 'panel_reviewer',
  },
  invitationCancelled: {
    scenario: 'Invitation cancelled',
    shouldHaveRole: false,
    roleName: 'panel_reviewer',
  },
  selfSignupApproved: {
    scenario: 'Self-signup approved',
    shouldHaveRole: true,
    roleName: 'panel_reviewer',
  },
  selfSignupRejected: {
    scenario: 'Self-signup rejected',
    shouldHaveRole: false,
    roleName: 'panel_reviewer',
  },
  selfSignupPending: {
    scenario: 'Self-signup pending',
    shouldHaveRole: false,
    roleName: 'panel_reviewer',
  },
};

// ============================================================================
// is_active FIELD TEST CASES
// ============================================================================

export const IS_ACTIVE_CASES = {
  // Invitation flow
  invitationDraft: { status: 'DRAFT', source: 'invitation', expectedActive: true },
  invitationSent: { status: 'SENT', source: 'invitation', expectedActive: true },
  invitationAccepted: { status: 'ACCEPTED', source: 'invitation', expectedActive: true },
  invitationDeclined: { status: 'DECLINED', source: 'invitation', expectedActive: false },
  invitationExpired: { status: 'EXPIRED', source: 'invitation', expectedActive: true },
  invitationCancelled: { status: 'CANCELLED', source: 'invitation', expectedActive: false },
  
  // Self-signup flow
  selfSignupPending: { approvalStatus: 'pending', source: 'self_signup', expectedActive: false },
  selfSignupApproved: { approvalStatus: 'approved', source: 'self_signup', expectedActive: true },
  selfSignupRejected: { approvalStatus: 'rejected', source: 'self_signup', expectedActive: false },
};
