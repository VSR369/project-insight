/**
 * useCommunicationLog — Hooks for the admin communications page.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CommunicationLogRow {
  log_id: string;
  challenge_id: string;
  sender_id: string;
  message_text: string;
  channel: string;
  flagged: boolean;
  flag_reason: string | null;
  logged_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_action: string | null;
}

/** Fetch flagged communication logs. */
export function useFlaggedCommunications() {
  return useQuery({
    queryKey: ['communication_log', 'flagged'],
    queryFn: async (): Promise<CommunicationLogRow[]> => {
      const { data, error } = await supabase
        .from('communication_log' as any)
        .select('log_id, challenge_id, sender_id, message_text, channel, flagged, flag_reason, logged_at, reviewed_at, reviewed_by, review_action')
        .eq('flagged', true)
        .order('logged_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CommunicationLogRow[];
    },
    staleTime: 15_000,
  });
}

/** Review a flagged message (approve or block). */
export function useReviewCommunication() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ logId, action }: { logId: string; action: 'APPROVED' | 'BLOCKED' }) => {
      if (!user?.id) throw new Error('Authentication required');
      const { error } = await supabase
        .from('communication_log' as any)
        .update({
          review_action: action,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        } as any)
        .eq('log_id', logId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['communication_log'] });
      toast.success(`Message ${v.action.toLowerCase()}`);
    },
    onError: (e: Error) => toast.error(`Review failed: ${e.message}`),
  });
}
