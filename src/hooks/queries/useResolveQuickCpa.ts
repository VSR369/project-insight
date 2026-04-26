/**
 * useResolveQuickCpa — Probes `resolve_quick_cpa_template` for a Quick-mode
 * challenge to surface (a) the source badge (Org / Platform default) and
 * (b) the structured `MissingPlatformCpaTemplateError` for the UI catch.
 *
 * Phase 9 v4 — Prompt 3.
 */
import { useQuery } from '@tanstack/react-query';
import {
  resolveQuickCpaTemplate,
  MissingPlatformCpaTemplateError,
  type ResolvedQuickCpa,
} from '@/services/legal/quickCpaResolver';

interface UseResolveQuickCpaParams {
  organizationId?: string | null;
  engagementModel?: string | null;
  enabled?: boolean;
}

export interface UseResolveQuickCpaResult {
  template: ResolvedQuickCpa | null;
  isMissingPlatformTemplate: boolean;
  isLoading: boolean;
  isError: boolean;
}

export function useResolveQuickCpa({
  organizationId,
  engagementModel,
  enabled = true,
}: UseResolveQuickCpaParams): UseResolveQuickCpaResult {
  const query = useQuery<ResolvedQuickCpa>({
    queryKey: ['resolve-quick-cpa', organizationId ?? null, engagementModel ?? 'MP'],
    queryFn: () => resolveQuickCpaTemplate(organizationId ?? null, engagementModel ?? 'MP'),
    enabled: enabled && !!engagementModel,
    retry: (_count, err) => !(err instanceof MissingPlatformCpaTemplateError),
    staleTime: 5 * 60_000,
  });

  return {
    template: query.data ?? null,
    isMissingPlatformTemplate: query.error instanceof MissingPlatformCpaTemplateError,
    isLoading: query.isLoading,
    isError: query.isError && !(query.error instanceof MissingPlatformCpaTemplateError),
  };
}
