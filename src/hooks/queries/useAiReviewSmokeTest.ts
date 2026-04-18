/**
 * useAiReviewSmokeTest — TanStack Query mutation that triggers the
 * ai-review-smoke-test edge function and returns a SmokeTestReport.
 *
 * Admin-only — calling component is gated by AdminGuard.
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import type { SmokeTestReport } from '@/types/diagnostics';

interface SmokeInvokeResponse {
  success: boolean;
  data?: SmokeTestReport;
  error?: { code: string; message: string; correlationId?: string };
}

async function runSmokeTest(): Promise<SmokeTestReport> {
  const { data, error } = await supabase.functions.invoke<SmokeInvokeResponse>(
    'ai-review-smoke-test',
    { body: {} },
  );
  if (error) throw new Error(error.message);
  if (!data?.success || !data.data) {
    throw new Error(data?.error?.message ?? 'Smoke test returned no data');
  }
  return data.data;
}

export function useAiReviewSmokeTest() {
  return useMutation({
    mutationFn: runSmokeTest,
    onError: (e) =>
      handleMutationError(e, {
        operation: 'run_ai_review_smoke_test',
        component: 'AIReviewSmokeTestPanel',
      }),
  });
}
