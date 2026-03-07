/**
 * MOD-04 SCR-04-02: Mutation hook for sending registrant messages
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

interface SendMessageInput {
  verificationId: string;
  subject: string;
  bodyHtml: string;
  recipientEmail: string;
  recipientName?: string;
}

export function useSendRegistrantMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendMessageInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('platform_admin_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const { error } = await supabase
        .from('registrant_communications')
        .insert({
          verification_id: input.verificationId,
          direction: 'OUTBOUND',
          message_type: 'MANUAL',
          subject: input.subject,
          body_html: input.bodyHtml,
          body_text: input.bodyHtml.replace(/<[^>]*>/g, ''),
          sent_by_admin_id: profile?.id ?? null,
          recipient_email: input.recipientEmail,
          recipient_name: input.recipientName ?? null,
          email_status: 'PENDING',
        });

      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['registrant-comms', variables.verificationId] });
      toast.success('Message sent to registrant');
    },
    onError: (err: Error) => {
      handleMutationError(err, { operation: 'send_registrant_message' });
    },
  });
}
