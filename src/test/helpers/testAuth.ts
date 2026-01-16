/**
 * Test Authentication Helper
 * 
 * Provides authentication utilities for integration tests.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a test user in Supabase Auth
 * 2. Set environment variables before running tests:
 *    - TEST_USER_EMAIL: The test user's email
 *    - TEST_USER_PASSWORD: The test user's password
 *    - RUN_INTEGRATION_TESTS: Set to 'true' to enable integration tests
 * 
 * Example:
 *   RUN_INTEGRATION_TESTS=true TEST_USER_EMAIL=test@example.com TEST_USER_PASSWORD=testpass123 npm run test
 */

import { supabase } from '@/integrations/supabase/client';

// Environment configuration
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || '';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || '';
const RUN_INTEGRATION_TESTS = process.env.RUN_INTEGRATION_TESTS === 'true';

/**
 * Check if integration tests should run
 */
export function shouldRunIntegrationTests(): boolean {
  return RUN_INTEGRATION_TESTS && !!TEST_USER_EMAIL && !!TEST_USER_PASSWORD;
}

/**
 * Get skip reason for integration tests
 */
export function getSkipReason(): string {
  if (!RUN_INTEGRATION_TESTS) {
    return 'Integration tests disabled (set RUN_INTEGRATION_TESTS=true to enable)';
  }
  if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
    return 'Test credentials not configured (set TEST_USER_EMAIL and TEST_USER_PASSWORD)';
  }
  return '';
}

/**
 * Authenticate with test user credentials
 * Returns authenticated user data or null if authentication fails
 */
export async function authenticateTestUser(): Promise<{
  userId: string;
  email: string;
} | null> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    if (error || !data.user) {
      console.error('Test authentication failed:', error?.message);
      return null;
    }

    return {
      userId: data.user.id,
      email: data.user.email || '',
    };
  } catch (error) {
    console.error('Test authentication error:', error);
    return null;
  }
}

/**
 * Sign out test user
 */
export async function signOutTestUser(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<{
  userId: string;
  email: string;
} | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  return {
    userId: user.id,
    email: user.email || '',
  };
}

/**
 * Get or create test provider for authenticated user
 */
export async function getTestProvider(userId: string): Promise<{
  providerId: string;
  lifecycleStatus: string;
  lifecycleRank: number;
} | null> {
  const { data: provider, error } = await supabase
    .from('solution_providers')
    .select('id, lifecycle_status, lifecycle_rank')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch test provider:', error);
    return null;
  }

  if (!provider) {
    console.error('No provider found for test user');
    return null;
  }

  return {
    providerId: provider.id,
    lifecycleStatus: provider.lifecycle_status,
    lifecycleRank: provider.lifecycle_rank,
  };
}

/**
 * Reset provider state for clean test runs
 */
export async function resetProviderState(
  providerId: string,
  targetStatus: string = 'proof_points_min_met',
  targetRank: number = 70
): Promise<boolean> {
  const { error } = await supabase
    .from('solution_providers')
    .update({
      lifecycle_status: targetStatus as any,
      lifecycle_rank: targetRank,
      updated_at: new Date().toISOString(),
    })
    .eq('id', providerId);

  if (error) {
    console.error('Failed to reset provider state:', error);
    return false;
  }

  return true;
}

/**
 * Clean up test assessment attempts
 */
export async function cleanupTestAttempts(providerId: string): Promise<void> {
  // Get all unsubmitted attempts for cleanup
  const { data: attempts } = await supabase
    .from('assessment_attempts')
    .select('id')
    .eq('provider_id', providerId)
    .is('submitted_at', null);

  if (attempts && attempts.length > 0) {
    const attemptIds = attempts.map(a => a.id);
    
    // Delete responses first (FK constraint)
    await supabase
      .from('assessment_attempt_responses')
      .delete()
      .in('attempt_id', attemptIds);
    
    // Delete attempts
    await supabase
      .from('assessment_attempts')
      .delete()
      .in('id', attemptIds);
  }
}

/**
 * Get sample question IDs for test responses
 */
export async function getSampleQuestionIds(count: number = 10): Promise<string[]> {
  const { data: questions } = await supabase
    .from('question_bank')
    .select('id')
    .eq('is_active', true)
    .limit(count);

  return questions?.map(q => q.id) ?? [];
}
