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

async function authenticateThroughHarness(email: string): Promise<{ userId: string; email: string } | null> {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-admin-test-accounts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TEST_HARNESS_ACCESS_TOKEN}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'create_test_session', email }),
  });
  const payload = await response.json() as TestSessionResponse;
  if (!response.ok || !payload.success || !payload.data) return null;
  const { data, error } = await supabase.auth.setSession({
    access_token: payload.data.accessToken,
    refresh_token: payload.data.refreshToken,
  });
  if (error || !data.user) return null;
  return { userId: data.user.id, email: data.user.email ?? email };
}

export async function getCurrentUser(): Promise<{ userId: string; email: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { userId: user.id, email: user.email || '' };
}

export async function authenticateTestUser(email = TEST_USER_EMAIL): Promise<{ userId: string; email: string } | null> {
  try {
    const current = await getCurrentUser();
    if (current?.email === email) return current;
    if (TEST_HARNESS_ACCESS_TOKEN) return await authenticateThroughHarness(email);
    if (!TEST_USER_PASSWORD) return null;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: TEST_USER_PASSWORD });
    if (error || !data.user) return null;
    return { userId: data.user.id, email: data.user.email || '' };
  } catch {
    return null;
  }
}

export async function signOutTestUser(): Promise<void> {
  if (!TEST_HARNESS_ACCESS_TOKEN) await supabase.auth.signOut();
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
  if (error || !provider) return null;
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
  return !error;
}

export async function cleanupTestAttempts(providerId: string): Promise<void> {
  if (TEST_HARNESS_ACCESS_TOKEN) {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-provider-test-data`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_HARNESS_ACCESS_TOKEN}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'cleanup_provider_attempts', providerId }),
    });
    return;
  }
  const { data: attempts } = await supabase.from('assessment_attempts')
    .select('id').eq('provider_id', providerId);
  const attemptIds = attempts?.map((attempt) => attempt.id) ?? [];
  if (attemptIds.length > 0) {
    await supabase.from('assessment_attempt_responses').delete().in('attempt_id', attemptIds);
    await supabase.from('assessment_attempts').delete().in('id', attemptIds);
  }
}

export async function getSampleQuestionIds(count: number = 10): Promise<string[]> {
  const { data: questions } = await supabase.from('question_bank').select('id').eq('is_active', true).limit(count);
  return questions?.map((question) => question.id) ?? [];
}
