/**
 * MOD-04: React Query hook for Notification Audit Log (SCR-04-01)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { withUpdatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';
import type { AuditFilters } from '@/components/admin/notifications/NotificationAuditFilters';

export interface AuditLogEntry {
  id: string;
  created_at: string;
  notification_type: string;
  recipient_email: string | null;
  recipient_name: string | null;
  recipient_type: string;
  verification_id: string | null;
  in_app_status: string;
  email_status: string;
  email_retry_count: number;
  last_retry_at: string | null;
  sms_status: string | null;
  email_error_message: string | null;
  email_provider_id: string | null;
  triggered_by: string | null;
}

export function useNotificationAuditLog(filters: AuditFilters) {
  return useQuery({
    queryKey: ['notification-audit-log', filters],
    queryFn: async () => {
      let query = supabase
        .from('notification_audit_log')
        .select('id, created_at, notification_type, recipient_email, recipient_name, recipient_type, verification_id, in_app_status, email_status, email_retry_count, last_retry_at, sms_status, email_error_message, email_provider_id, triggered_by')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters.type && filters.type !== 'ALL') {
        query = query.eq('notification_type', filters.type);
      }
      if (filters.emailStatus && filters.emailStatus !== 'ALL') {
        query = query.eq('email_status', filters.emailStatus);
      }
      if (filters.recipientSearch) {
        query = query.or(`recipient_email.ilike.%${filters.recipientSearch}%,recipient_name.ilike.%${filters.recipientSearch}%`);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        // Include the full end-of-day
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as AuditLogEntry[];
    },
    staleTime: 30_000,
    gcTime: 300_000,
  });
}

/** Compute summary stats from fetched data */
export function computeAuditSummary(data: AuditLogEntry[] | undefined) {
  if (!data) return { totalToday: 0, sentPct: 0, retryQueued: 0, exhausted: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const todayRows = data.filter((r) => r.created_at.startsWith(today));
  const totalToday = todayRows.length;
  const sentCount = todayRows.filter((r) => r.email_status === 'SENT').length;
  const sentPct = totalToday > 0 ? Math.round((sentCount / totalToday) * 100) : 0;
  const retryQueued = data.filter((r) => r.email_status === 'RETRY_QUEUED').length;
  const exhausted = data.filter((r) => r.email_status === 'EXHAUSTED').length;

  return { totalToday, sentPct, retryQueued, exhausted };
}

/** Re-send an exhausted notification (resets retry cycle) */
export function useResendNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (auditLogId: string) => {
      const withAudit = await withUpdatedBy({
        email_status: 'PENDING',
        email_retry_count: 0,
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('notification_audit_log')
        .update(withAudit)
        .eq('id', auditLogId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-audit-log'] });
      toast.success('Notification queued for re-send');
    },
    onError: (err: Error) => {
      handleMutationError(err, { operation: 'resend_notification' });
    },
  });
}
