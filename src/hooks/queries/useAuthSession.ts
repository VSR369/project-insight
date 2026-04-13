/**
 * useAuthSession — Shared hook for checking auth session state.
 * Extracted per R2: no direct supabase imports in components.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export function useAuthSession() {
  return useQuery<Session | null>({
    queryKey: ['auth-session-check'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 30_000,
  });
}
