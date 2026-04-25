/**
 * usePwaGateContext — Lightweight context for `PwaAcceptanceGate`.
 * When `challengeId` is provided, includes challenge title for the gate banner;
 * otherwise returns user/role-only context.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { handleQueryError } from '@/lib/errorHandler';
import {
  buildCpaPreviewInput,
  type TemplateContextChallenge,
} from '@/services/legal/templateContextBuilder';
import {
  buildPreviewVariables,
  type CpaPreviewVariables,
} from '@/services/legal/cpaPreviewInterpolator';
import { ROLE_LABELS } from '@/constants/legalPreview.constants';
import { CACHE_FREQUENT } from '@/config/queryCache';

const COLUMNS = 'id, title, governance_mode_override, currency_code, operating_model';

interface PwaGateContextResult {
  variables: CpaPreviewVariables;
  isLoading: boolean;
}

export function usePwaGateContext(challengeId: string | undefined): PwaGateContextResult {
  const { user } = useAuth();

  const { data: challenge, isLoading } = useQuery({
    queryKey: ['pwa-gate-challenge', challengeId],
    queryFn: async (): Promise<TemplateContextChallenge | null> => {
      if (!challengeId) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('challenges') as any)
        .select(COLUMNS)
        .eq('id', challengeId)
        .maybeSingle();
      if (error) {
        handleQueryError(error, { operation: 'fetch_challenge_for_pwa_gate' });
        return null;
      }
      return (data ?? null) as TemplateContextChallenge | null;
    },
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
  });

  const variables = useMemo<CpaPreviewVariables>(() => {
    const input = buildCpaPreviewInput({
      challenge: challenge ?? null,
      user: user
        ? {
            full_name:
              (user.user_metadata?.full_name as string | undefined) ??
              user.email?.split('@')[0] ??
              null,
            email: user.email ?? null,
          }
        : null,
      roleLabelOverride: ROLE_LABELS.workforce,
      acceptanceDate: new Date().toISOString().slice(0, 10),
    });
    return buildPreviewVariables(input);
  }, [challenge, user]);

  return { variables, isLoading: !!challengeId && isLoading };
}
