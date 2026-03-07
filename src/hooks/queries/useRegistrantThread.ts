/**
 * MOD-04 SCR-04-02: React Query + Realtime hook for registrant communications
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface RegistrantMessage {
  id: string;
  verification_id: string;
  direction: string;
  message_type: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  sent_by_admin_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  email_status: string;
  email_retry_count: number;
  sent_at: string | null;
  created_at: string;
  admin_name?: string;
}

export function useRegistrantThread(verificationId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['registrant-comms', verificationId],
    enabled: !!verificationId,
    queryFn: async () => {
      if (!verificationId) return [];

      const { data, error } = await supabase
        .from('registrant_communications')
        .select('id, verification_id, direction, message_type, subject, body_html, body_text, sent_by_admin_id, recipient_email, recipient_name, email_status, email_retry_count, sent_at, created_at')
        .eq('verification_id', verificationId)
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);

      // Resolve admin names for sent_by_admin_id
      const adminIds = [...new Set((data ?? []).map((m) => m.sent_by_admin_id).filter(Boolean))] as string[];
      let adminMap: Record<string, string> = {};
      if (adminIds.length > 0) {
        const { data: admins } = await supabase
          .from('platform_admin_profiles')
          .select('id, full_name')
          .in('id', adminIds);
        adminMap = Object.fromEntries((admins ?? []).map((a) => [a.id, a.full_name]));
      }

      return (data ?? []).map((m) => ({
        ...m,
        admin_name: m.sent_by_admin_id ? adminMap[m.sent_by_admin_id] ?? 'Admin' : undefined,
      })) as RegistrantMessage[];
    },
    staleTime: 15 * 1000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!verificationId) return;
    const channel = supabase
      .channel(`registrant_comms_${verificationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'registrant_communications',
        filter: `verification_id=eq.${verificationId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['registrant-comms', verificationId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [verificationId, qc]);

  return query;
}
