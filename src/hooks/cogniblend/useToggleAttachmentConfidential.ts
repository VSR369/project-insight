/**
 * useToggleAttachmentConfidential — marks a challenge attachment Public or
 * Confidential (BR-CHL-P09). Confidential attachments are served to providers
 * only after they accept the challenge's frozen CPA (server-enforced RLS).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withUpdatedBy } from '@/lib/auditFields';

interface ToggleInput {
  attachmentId: string;
  challengeId: string;
  isConfidential: boolean;
}

export function useToggleAttachmentConfidential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ attachmentId, isConfidential }: ToggleInput): Promise<void> => {
      const payload = await withUpdatedBy({ is_confidential: isConfidential });
      const { error } = await supabase
        .from('challenge_attachments')
        .update(payload)
        .eq('id', attachmentId);
      if (error) throw error;
    },
    onSuccess: (_d, { challengeId, isConfidential }) => {
      queryClient.invalidateQueries({ queryKey: ['creator-detail-attachments', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['solver-references', challengeId] });
      toast.success(isConfidential ? 'Attachment marked Confidential' : 'Attachment marked Public');
    },
    onError: (e) => handleMutationError(e, { operation: 'toggle_attachment_confidential' }),
  });
}
