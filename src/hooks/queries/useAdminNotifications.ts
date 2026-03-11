/**
 * React Query hook + Supabase Realtime for admin notifications (MOD-02).
 * GAP-11: Toast on real-time notification arrival.
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type NotificationType =
  | 'ASSIGNMENT'
  | 'TIER1_WARNING'
  | 'TIER2_BREACH'
  | 'TIER3_CRITICAL'
  | 'REASSIGNMENT_IN'
  | 'REASSIGNMENT_OUT'
  | 'QUEUE_ESCALATION'
  | 'EMAIL_FAIL'
  | 'LEAVE_REMINDER'
  | 'REGISTRANT_COURTESY'
  | 'ROLE_NOT_READY'
  | 'ROLE_READY';

export interface AdminNotification {
  id: string;
  admin_id: string;
  type: NotificationType;
  title: string;
  body: string;
  deep_link: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

const NOTIFICATION_QUERY_KEY = ['admin-notifications'];

export function useAdminNotifications(limit = 20) {
  return useQuery({
    queryKey: [...NOTIFICATION_QUERY_KEY, { limit }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('id, admin_id, type, title, body, deep_link, metadata, is_read, read_at, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as AdminNotification[];
    },
    staleTime: 10 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: [...NOTIFICATION_QUERY_KEY, 'unread-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('admin_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    staleTime: 10 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });
    },
  });
}

/** Subscribe to realtime notifications — auto-invalidate + toast (GAP-11) */
export function useNotificationRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('admin_notifications_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });

          // GAP-11: Show toast on new notification arrival
          const newNotif = payload.new as Record<string, unknown>;
          const title = (newNotif?.title as string) ?? 'New notification';
          const meta = (newNotif?.metadata ?? {}) as Record<string, unknown>;
          const orgName = meta.org_name as string | undefined;

          toast.info(orgName ? `${title}: ${orgName}` : title, {
            duration: 4000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
