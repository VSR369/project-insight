/**
 * usePriorAcceptanceCheck — Checks if user previously accepted an older version
 * of a document_code, indicating a version update scenario.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PriorAcceptanceResult {
  hasPriorVersion: boolean;
  previousVersion: string | null;
}

export function usePriorAcceptanceCheck(
  documentCode: string | undefined,
  currentVersion: string | undefined,
  enabled = true,
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['prior-acceptance', documentCode, currentVersion, user?.id],
    queryFn: async (): Promise<PriorAcceptanceResult> => {
      if (!user?.id || !documentCode) {
        return { hasPriorVersion: false, previousVersion: null };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('legal_acceptance_log') as any)
        .select('document_version')
        .eq('user_id', user.id)
        .eq('document_code', documentCode)
        .eq('action', 'ACCEPTED')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return { hasPriorVersion: false, previousVersion: null };
      }

      const lastAcceptedVersion = data[0].document_version as string;
      const isOlderVersion = lastAcceptedVersion !== currentVersion;

      return {
        hasPriorVersion: isOlderVersion,
        previousVersion: isOlderVersion ? lastAcceptedVersion : null,
      };
    },
    enabled: enabled && !!user?.id && !!documentCode && !!currentVersion,
    staleTime: 30_000,
  });
}
