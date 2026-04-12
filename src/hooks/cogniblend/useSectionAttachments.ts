/**
 * useSectionAttachments — Data layer for SectionReferencePanel (R2 compliance).
 * Handles query, upload, URL add, update, remove, and extraction retry for
 * per-section challenge attachments.
 */

import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeFileName } from '@/lib/sanitizeFileName';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import type { AttachmentRow } from '@/components/cogniblend/curation/AttachmentCard';

interface SectionUploadConfig {
  enabled: boolean;
  maxFiles: number;
  maxUrls: number;
  maxFileSizeMB: number;
  acceptedFormats: string[];
  sharingDefault: boolean;
}

export function useSectionAttachments(
  challengeId: string,
  sectionKey: string,
  config: SectionUploadConfig | undefined,
) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const queryKey = ['challenge-attachments', challengeId, sectionKey];

  const { data: attachments = [] } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_attachments')
        .select('id, section_key, source_type, source_url, url_title, file_name, file_size, mime_type, storage_path, extracted_text, extraction_status, extraction_error, shared_with_solver, display_name, description, display_order')
        .eq('challenge_id', challengeId)
        .eq('section_key', sectionKey)
        .order('display_order');
      if (error) throw new Error(error.message);
      return (data || []) as AttachmentRow[];
    },
    staleTime: 30_000,
    enabled: !!config?.enabled,
  });

  const triggerExtraction = useCallback(async (attachmentId: string) => {
    try {
      await supabase.functions.invoke('extract-attachment-text', {
        body: { attachment_id: attachmentId },
      });
    } catch {
      /* extraction is best-effort */
    }
    setTimeout(() => queryClient.invalidateQueries({ queryKey }), 3000);
    setTimeout(() => queryClient.invalidateQueries({ queryKey }), 8000);
  }, [queryClient, queryKey]);

  const uploadFile = useCallback(async (file: File) => {
    if (!config?.enabled) return;
    const fileCount = attachments.filter(a => a.source_type === 'file').length;
    if (fileCount >= config.maxFiles) { toast.error('Maximum files reached for this section'); return; }
    if (!config.acceptedFormats.includes(file.type)) { toast.error('Unsupported file format'); return; }
    if (file.size > config.maxFileSizeMB * 1024 * 1024) { toast.error(`File exceeds ${config.maxFileSizeMB} MB limit`); return; }

    setUploading(true);
    try {
      const safeName = sanitizeFileName(file.name);
      const storagePath = `${challengeId}/${sectionKey}/${crypto.randomUUID()}_${safeName}`;
      const { error: uploadErr } = await supabase.storage.from('challenge-attachments').upload(storagePath, file);
      if (uploadErr) throw uploadErr;
      const { data: row, error: insertErr } = await supabase
        .from('challenge_attachments')
        .insert({
          challenge_id: challengeId,
          section_key: sectionKey,
          source_type: 'file',
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          storage_path: storagePath,
          extraction_status: 'pending',
          shared_with_solver: config.sharingDefault,
        })
        .select('id')
        .single();
      if (insertErr) throw insertErr;
      queryClient.invalidateQueries({ queryKey });
      toast.success('File uploaded');
      if (row?.id) triggerExtraction(row.id);
    } catch (err: unknown) {
      handleMutationError(err as Error, { operation: 'upload_section_file', component: 'SectionReferencePanel' });
    } finally {
      setUploading(false);
    }
  }, [attachments, config, challengeId, sectionKey, queryClient, queryKey, triggerExtraction]);

  const addUrl = useCallback(async (url: string, title: string) => {
    if (!config?.enabled) return;
    const urlCt = attachments.filter(a => a.source_type === 'url').length;
    if (urlCt >= config.maxUrls) { toast.error('Maximum URLs reached for this section'); return; }
    const trimmedUrl = url.trim();
    if (!trimmedUrl) { toast.error('Please enter a URL'); return; }
    try { new URL(trimmedUrl); } catch { toast.error('Invalid URL format'); return; }

    try {
      const { data: row, error } = await supabase
        .from('challenge_attachments')
        .insert({
          challenge_id: challengeId,
          section_key: sectionKey,
          source_type: 'url',
          source_url: trimmedUrl,
          url_title: title.trim() || null,
          extraction_status: 'pending',
          shared_with_solver: config.sharingDefault,
        })
        .select('id')
        .single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
      toast.success('Web link added');
      if (row?.id) triggerExtraction(row.id);
      return true;
    } catch (err: unknown) {
      handleMutationError(err as Error, { operation: 'add_section_url', component: 'SectionReferencePanel' });
      return false;
    }
  }, [attachments, challengeId, sectionKey, config, queryClient, queryKey, triggerExtraction]);

  const updateAttachment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('challenge_attachments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err: Error) => handleMutationError(err, { operation: 'update_attachment', component: 'SectionReferencePanel' }),
  });

  const removeAttachment = useMutation({
    mutationFn: async (att: AttachmentRow) => {
      if (att.source_type === 'file' && att.storage_path) {
        await supabase.storage.from('challenge-attachments').remove([att.storage_path]);
      }
      const { error } = await supabase.from('challenge_attachments').delete().eq('id', att.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey }); toast.success('Reference removed'); },
    onError: (err: Error) => handleMutationError(err, { operation: 'remove_attachment', component: 'SectionReferencePanel' }),
  });

  const retryExtraction = useCallback(async (id: string) => {
    try {
      await supabase
        .from('challenge_attachments')
        .update({ extraction_status: 'pending', extraction_error: null })
        .eq('id', id);
      triggerExtraction(id);
      toast.info('Retrying extraction…');
    } catch (err: unknown) {
      handleMutationError(err as Error, { operation: 'retry_extraction', component: 'SectionReferencePanel' });
    }
  }, [triggerExtraction]);

  return {
    attachments,
    uploading,
    uploadFile,
    addUrl,
    updateAttachment: (id: string, updates: Record<string, unknown>) => updateAttachment.mutate({ id, updates }),
    removeAttachment: (att: AttachmentRow) => removeAttachment.mutate(att),
    retryExtraction,
  };
}
