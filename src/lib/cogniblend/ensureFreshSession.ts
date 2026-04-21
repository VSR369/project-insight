/**
 * ensureFreshSession — guarantees the supabase client has a valid, refreshed
 * access token before invoking edge functions. Throws a user-friendly error
 * when the local session is missing or cannot be refreshed, which avoids the
 * cryptic "Edge Function returned 401 / session_not_found" toast.
 */
import { supabase } from '@/integrations/supabase/client';

export async function ensureFreshSession(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error('Your session has expired. Please sign in again.');
  }
  const { error } = await supabase.auth.refreshSession();
  if (error) {
    throw new Error('Your session has expired. Please sign in again.');
  }
}
