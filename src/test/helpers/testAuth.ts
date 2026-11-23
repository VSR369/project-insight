import { supabase } from '@/integrations/supabase/client';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'provider@test.local';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || '';
const TEST_HARNESS_ACCESS_TOKEN = process.env.TEST_HARNESS_ACCESS_TOKEN || '';
const RUN_INTEGRATION_TESTS = process.env.RUN_INTEGRATION_TESTS === 'true';

interface TestSessionResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string };
  };
  error?: { message?: string };
}

export function shouldRunIntegrationTests(): boolean {
  return RUN_INTEGRATION_TESTS && !!TEST_USER_EMAIL && !!(TEST_HARNESS_ACCESS_TOKEN || TEST_USER_PASSWORD);
}

export function getSkipReason(): string {
  if (!RUN_INTEGRATION_TESTS) return 'Integration tests disabled (set RUN_INTEGRATION_TESTS=true to enable)';
  if (!TEST_USER_EMAIL || (!TEST_HARNESS_ACCESS_TOKEN && !TEST_USER_PASSWORD)) {
    return 'Test session access is not configured (use TEST_HARNESS_ACCESS_TOKEN from the Supervisor session)';
  }
  return '';
}

async function authenticateThroughHarness(): Promise<{ userId: string; email: string } | null> {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-admin-test-accounts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TEST_HARNESS_ACCESS_TOKEN}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'create_test_session', email: TEST_USER_EMAIL }),
  });
  const payload = await response.json() as TestSessionResponse;
  if (!response.ok || !payload.success || !payload.data) {
    console.error('Test session issuance failed:', payload.error?.message ?? `HTTP ${response.status}`);
    return null;
  }
  const { data, error } = await supabase.auth.setSession({
    access_token: payload.data.accessToken,
    refresh_token: payload.data.refreshToken,
  });
  if (error || !data.user) {
    console.error('Test session activation failed:', error?.message);
    return null;
  }
  return { userId: data.user.id, email: data.user.email ?? TEST_USER_EMAIL };
}

export async function authenticateTestUser(): Promise<{ userId: string; email: string } | null> {
  try {
    if (TEST_HARNESS_ACCESS_TOKEN) return await authenticateThroughHarness();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });
    if (error || !data.user) {
      console.error('Test authentication failed:', error?.message);
      return null;
    }
    return { userId: data.user.id, email: data.user.email || '' };
  } catch (error) {
    console.error('Test authentication error:', error);
    return null;
  }
}

export async function signOutTestUser(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<{ userId: string; email: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { userId: user.id, email: user.email || '' };
}

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
  if (error || !provider) {
    console.error('Failed to fetch test provider:', error?.message ?? 'No provider found');
    return null;
  }
  return { providerId: provider.id, lifecycleStatus: provider.lifecycle_status, lifecycleRank: provider.lifecycle_rank };
}

export async function resetProviderState(
  providerId: string,
  targetStatus: string = 'proof_points_min_met',
  targetRank: number = 70,
): Promise<boolean> {
  const { error } = await supabase.from('solution_providers').update({
    lifecycle_status: targetStatus as never,
    lifecycle_rank: targetRank,
    updated_at: new Date().toISOString(),
  }).eq('id', providerId);
  if (error) {
    console.error('Failed to reset provider state:', error);
    return false;
  }
  return true;
}

export async function cleanupTestAttempts(providerId: string): Promise<void> {
  const { data: attempts } = await supabase.from('assessment_attempts')
    .select('id').eq('provider_id', providerId).is('submitted_at', null);
  if (attempts && attempts.length > 0) {
    const attemptIds = attempts.map((attempt) => attempt.id);
    await supabase.from('assessment_attempt_responses').delete().in('attempt_id', attemptIds);
    await supabase.from('assessment_attempts').delete().in('id', attemptIds);
  }
}

export async function getSampleQuestionIds(count: number = 10): Promise<string[]> {
  const { data: questions } = await supabase.from('question_bank').select('id').eq('is_active', true).limit(count);
  return questions?.map((question) => question.id) ?? [];
}
