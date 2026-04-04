/**
 * useCreatorFileUpload — Uploads attached files to storage after challenge submit.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';

interface UploadContext {
  challengeId: string;
  orgId: string;
  userId: string;
}

export function useCreatorFileUpload() {
  const uploadFiles = useCallback(async (files: File[], ctx: UploadContext) => {
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${ctx.orgId}/challenges/${ctx.challengeId}/${crypto.randomUUID()}_${safeName}`;
      try {
        const { error: uploadError } = await supabase.storage
          .from('challenge-attachments')
          .upload(storagePath, file, { upsert: false, cacheControl: '3600' });
        if (!uploadError) {
          await supabase.from('challenge_attachments').insert({
            challenge_id: ctx.challengeId,
            section_key: 'creator_reference',
            source_type: 'file',
            storage_path: storagePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: ctx.userId,
          });
        }
      } catch (error) {
        handleMutationError(error as Error, {
          operation: 'upload_creator_file',
          component: 'useCreatorFileUpload',
        });
      }
    }
  }, []);

  return { uploadFiles };
}
