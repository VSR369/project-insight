/**
 * useCreatorOrgAttachments — Query + upload + delete for org profile
 * documents attached to a challenge (section_key='org_profile').
 * Used by CreatorOrgContextCard.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeFileName } from '@/lib/sanitizeFileName';
import { handleMutationError } from '@/lib/errorHandler';
import { toast } from 'sonner';

const SECTION_KEY = 'org_profile';

interface OrgAttachment {
  id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string;
  extraction_status: string | null;
  storage_path: string;
}

export function useCreatorOrgAttachments(challengeId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['creator-org-attachments', challengeId];

  const { data: attachments = [], isLoading } = useQuery({
    queryKey,
    enabled: !!challengeId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_attachments')
        .select('id, file_name, file_size, mime_type, extraction_status, storage_path')
        .eq('challenge_id', challengeId!)
        .eq('section_key', SECTION_KEY)
        .eq('source_type', 'file')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as OrgAttachment[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!challengeId) throw new Error('Save draft first to upload documents');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const safeName = sanitizeFileName(file.name);
      const storagePath = `${challengeId}/${SECTION_KEY}/${Date.now()}_${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from('challenge-attachments')
        .upload(storagePath, file, { upsert: false, cacheControl: '3600' });
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

      const { error: insertErr } = await supabase
        .from('challenge_attachments')
        .insert({
          challenge_id: challengeId,
          section_key: SECTION_KEY,
          source_type: 'file',
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          storage_path: storagePath,
          extraction_status: 'pending',
          uploaded_by: user.id,
        });
      if (insertErr) throw new Error(`Failed to save attachment: ${insertErr.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Organization document uploaded');
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        operation: 'upload_org_attachment',
        component: 'useCreatorOrgAttachments',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (att: OrgAttachment) => {
      if (att.storage_path) {
        await supabase.storage
          .from('challenge-attachments')
          .remove([att.storage_path]);
      }
      const { error } = await supabase
        .from('challenge_attachments')
        .delete()
        .eq('id', att.id);
      if (error) throw new Error(`Failed to delete: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Document removed');
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        operation: 'delete_org_attachment',
        component: 'useCreatorOrgAttachments',
      });
    },
  });

  return {
    attachments,
    isLoading,
    upload: (file: File) => uploadMutation.mutateAsync(file),
    remove: (att: OrgAttachment) => deleteMutation.mutateAsync(att),
  };
}
