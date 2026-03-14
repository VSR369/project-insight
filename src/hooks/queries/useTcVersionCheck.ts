/**
 * useTcVersionCheck — Checks if the org has accepted the latest T&C version.
 * Returns { needsReAcceptance, latestVersion, isLoading }.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STATIC } from '@/config/queryCache';

interface TcVersion {
  id: string;
  version: string;
  content_url: string | null;
  effective_date: string;
}

export function useTcVersionCheck(orgId: string | undefined, currentTcVersion: string | null | undefined) {
  const { data: latestVersion, isLoading } = useQuery<TcVersion | null>({
    queryKey: ['tc-versions', 'latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tc_versions')
        .select('id, version, content_url, effective_date')
        .lte('effective_date', new Date().toISOString().split('T')[0])
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as TcVersion | null;
    },
    enabled: !!orgId,
    staleTime: CACHE_STATIC.staleTime,
  });

  const needsReAcceptance = !!latestVersion && latestVersion.version !== currentTcVersion;

  return {
    needsReAcceptance,
    latestVersion,
    isLoading,
  };
}
