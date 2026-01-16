/**
 * Test Fixtures for Solution Provider Lifecycle Testing
 * Provides factory functions for creating test data
 */

import { LIFECYCLE_RANKS } from '@/services/lifecycleService';

// Provider lifecycle status types
export type LifecycleStatus = 
  | 'invited' | 'registered' | 'enrolled' | 'mode_selected'
  | 'org_info_pending' | 'org_validated' | 'expertise_selected'
  | 'proof_points_started' | 'proof_points_min_met'
  | 'assessment_in_progress' | 'assessment_passed'
  | 'panel_scheduled' | 'panel_completed'
  | 'verified' | 'certified' | 'not_verified';

// Base provider fixture
export interface ProviderFixture {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  lifecycle_status: LifecycleStatus;
  lifecycle_rank: number;
  industry_segment_id: string | null;
  expertise_level_id: string | null;
  participation_mode_id: string | null;
  is_student: boolean;
}

// Proof point fixture
export interface ProofPointFixture {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  category: 'general' | 'specialty_specific';
  type: 'project' | 'case_study' | 'certification' | 'award' | 'publication' | 'portfolio' | 'testimonial' | 'other';
  is_deleted: boolean;
}

// Speciality tag fixture
export interface SpecialityTagFixture {
  id: string;
  proof_point_id: string;
  speciality_id: string;
}

/**
 * Creates a provider fixture at a specific lifecycle stage
 */
export function createProviderFixture(
  overrides: Partial<ProviderFixture> = {}
): ProviderFixture {
  const status = overrides.lifecycle_status || 'enrolled';
  return {
    id: overrides.id || `provider-${Date.now()}`,
    user_id: overrides.user_id || `user-${Date.now()}`,
    first_name: 'Test',
    last_name: 'Provider',
    lifecycle_status: status,
    lifecycle_rank: overrides.lifecycle_rank ?? LIFECYCLE_RANKS[status] ?? 20,
    industry_segment_id: overrides.industry_segment_id ?? null,
    expertise_level_id: overrides.expertise_level_id ?? null,
    participation_mode_id: overrides.participation_mode_id ?? null,
    is_student: overrides.is_student ?? false,
    ...overrides,
  };
}

/**
 * Creates a proof point fixture
 */
export function createProofPointFixture(
  overrides: Partial<ProofPointFixture> = {}
): ProofPointFixture {
  return {
    id: overrides.id || `pp-${Date.now()}`,
    provider_id: overrides.provider_id || 'provider-1',
    title: overrides.title || 'Test Proof Point',
    description: overrides.description || 'Test description for proof point',
    category: overrides.category || 'general',
    type: overrides.type || 'project',
    is_deleted: overrides.is_deleted ?? false,
    ...overrides,
  };
}

/**
 * Creates a speciality tag fixture for a proof point
 */
export function createSpecialityTagFixture(
  overrides: Partial<SpecialityTagFixture> = {}
): SpecialityTagFixture {
  return {
    id: overrides.id || `tag-${Date.now()}`,
    proof_point_id: overrides.proof_point_id || 'pp-1',
    speciality_id: overrides.speciality_id || 'speciality-1',
    ...overrides,
  };
}

/**
 * Creates a provider at each lifecycle stage for comprehensive testing
 */
export function createProvidersAtAllStages(): Record<LifecycleStatus, ProviderFixture> {
  const stages: LifecycleStatus[] = [
    'invited', 'registered', 'enrolled', 'mode_selected',
    'org_info_pending', 'org_validated', 'expertise_selected',
    'proof_points_started', 'proof_points_min_met',
    'assessment_in_progress', 'assessment_passed',
    'panel_scheduled', 'panel_completed',
    'verified', 'certified', 'not_verified'
  ];

  return stages.reduce((acc, status) => {
    acc[status] = createProviderFixture({ 
      lifecycle_status: status,
      id: `provider-${status}`,
    });
    return acc;
  }, {} as Record<LifecycleStatus, ProviderFixture>);
}

/**
 * Test scenarios for cascade reset testing
 */
export const CASCADE_TEST_SCENARIOS = {
  // Provider with full data - industry change should trigger hard reset
  fullDataIndustryChange: {
    provider: createProviderFixture({
      lifecycle_status: 'proof_points_min_met',
      lifecycle_rank: 70,
      industry_segment_id: 'industry-1',
      expertise_level_id: 'level-1',
    }),
    generalProofPoints: [
      createProofPointFixture({ id: 'pp-general-1', category: 'general' }),
      createProofPointFixture({ id: 'pp-general-2', category: 'general' }),
    ],
    specialtyProofPoints: [
      createProofPointFixture({ id: 'pp-specialty-1', category: 'specialty_specific' }),
      createProofPointFixture({ id: 'pp-specialty-2', category: 'specialty_specific' }),
    ],
    expectedAfterReset: {
      lifecycle_status: 'enrolled',
      lifecycle_rank: 20,
      deletedProofPointCount: 2, // Only specialty PPs deleted
      retainedProofPointCount: 2, // General PPs retained
    },
  },

  // Provider with expertise change - should trigger partial reset
  expertiseChange: {
    provider: createProviderFixture({
      lifecycle_status: 'proof_points_min_met',
      lifecycle_rank: 70,
      industry_segment_id: 'industry-1',
      expertise_level_id: 'level-2',
    }),
    generalProofPoints: [
      createProofPointFixture({ id: 'pp-general-1', category: 'general' }),
    ],
    specialtyProofPoints: [
      createProofPointFixture({ id: 'pp-specialty-1', category: 'specialty_specific' }),
    ],
    expectedAfterReset: {
      lifecycle_status: 'expertise_selected',
      lifecycle_rank: 50,
      deletedProofPointCount: 1, // Only specialty PPs deleted
      retainedProofPointCount: 1, // General PPs retained
    },
  },

  // Provider at terminal state - no changes allowed
  terminalState: {
    provider: createProviderFixture({
      lifecycle_status: 'verified',
      lifecycle_rank: 140,
      industry_segment_id: 'industry-1',
      expertise_level_id: 'level-1',
    }),
    canModifyConfiguration: false,
    canModifyContent: false,
    canModifyRegistration: false,
  },
};

/**
 * Lock threshold test data
 */
export const LOCK_THRESHOLD_TEST_DATA = {
  // Just before configuration lock
  beforeConfigLock: {
    rank: 99,
    configurationAllowed: true,
    contentAllowed: true,
    registrationAllowed: true,
  },
  // At configuration lock
  atConfigLock: {
    rank: 100,
    configurationAllowed: false,
    contentAllowed: true,
    registrationAllowed: true,
  },
  // Just before content lock
  beforeContentLock: {
    rank: 119,
    configurationAllowed: false,
    contentAllowed: true,
    registrationAllowed: true,
  },
  // At content lock
  atContentLock: {
    rank: 120,
    configurationAllowed: false,
    contentAllowed: false,
    registrationAllowed: false,
  },
  // At terminal state
  atTerminal: {
    rank: 140,
    configurationAllowed: false,
    contentAllowed: false,
    registrationAllowed: false,
  },
};
