/**
 * useContextLibraryMutations — Write mutation hooks for Context Library.
 * Split from useContextLibrary.ts for R1 compliance.
 *
 * D3 FIX: Reset extraction_status on accept to force fresh extraction
 * D7 FIX: Await cache invalidation before showing toasts
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { invalidateAllContextKeys, CONTEXT_KEYS } from './contextLibraryKeys';
import type { ContextSource } from './useContextLibraryQueries';

/* ── Helpers ── */

const EXTRACTION_POLL_INTERVAL_MS = 2000;
const EXTRACTION_MAX_WAIT_MS = 45000;

async function waitForExtraction(attachmentId: string): Promise<void> {
  const maxAttempts = Math.ceil(EXTRACTION_MAX_WAIT_MS / EXTRACTION_POLL_INTERVAL_MS);
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, EXTRACTION_POLL_INTERVAL_MS));
    const { data } = await supabase
      .from('challenge_attachments')
      .select('extraction_status')
      .eq('id', attachmentId)
      .single();
    if (data?.extraction_status === 'completed' || data?.extraction_status === 'failed' || data?.extraction_status === 'partial') return;
  }
}

/* ── Discovery ── */

export function useDiscoverSources(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('discover-context-resources', {
        body: { challenge_id: challengeId },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async (data) => {
      // D7 FIX: Await refetch so UI reflects new data before toast
      await qc.refetchQueries({ queryKey: CONTEXT_KEYS.sources(challengeId) });
      await qc.refetchQueries({ queryKey: CONTEXT_KEYS.pendingCount(challengeId) });
      await qc.refetchQueries({ queryKey: CONTEXT_KEYS.sourceCount(challengeId) });
      const autoCount = data?.auto_accepted ?? 0;
      const sugCount = data?.suggested ?? 0;
      const total = data?.count ?? 0;
      if (autoCount > 0) {
        toast.success(`Discovered ${total} sources: ${autoCount} auto-accepted (high confidence), ${sugCount} pending review`);
      } else {
        toast.success(`Discovered ${total} potential sources`);
      }
    },
    onError: (err: Error) => {
      const msg = err.message ?? '';
      if (msg.includes('AI_CREDITS_EXHAUSTED')) {
        toast.error('AI credits exhausted — discovery cannot run. Check your plan or contact support.', { duration: 8000 });
      } else if (msg.includes('AI_RATE_LIMITED')) {
        toast.error('AI rate limit reached — please wait a moment and retry discovery.', { duration: 5000 });
      } else {
        toast.error(`Discovery failed: ${msg}`);
      }
    },
  });
}

/* ── Accept / Reject ── */

export function useAcceptSuggestion(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      // D3 FIX: Reset extraction state to force fresh extraction
      const { error } = await supabase
        .from('challenge_attachments')
        .update({
          discovery_status: 'accepted',
          extraction_status: 'pending',
          extracted_summary: null,
          extracted_key_data: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', attachmentId);
      if (error) throw new Error(error.message);
      // Gap 2 FIX: Seed baseline summary from relevance_explanation before extraction
      const { data: sourceRow } = await supabase
        .from('challenge_attachments')
        .select('relevance_explanation')
        .eq('id', attachmentId)
        .single();
      if (sourceRow?.relevance_explanation) {
        await supabase.from('challenge_attachments')
          .update({ extracted_summary: `[AI Relevance] ${sourceRow.relevance_explanation}` })
          .eq('id', attachmentId);
      }
      await supabase.functions.invoke('extract-attachment-text', {
        body: { attachment_id: attachmentId },
      });
      await waitForExtraction(attachmentId);
    },
    onSuccess: async () => {
      // D7 FIX: Await invalidation
      await Promise.all([
        qc.invalidateQueries({ queryKey: CONTEXT_KEYS.sources(challengeId) }),
        qc.invalidateQueries({ queryKey: CONTEXT_KEYS.sourceCount(challengeId) }),
        qc.invalidateQueries({ queryKey: CONTEXT_KEYS.pendingCount(challengeId) }),
      ]);
      toast.success('Source accepted and indexed');
    },
    onError: (err: Error) => toast.error(`Accept failed: ${err.message}`),
  });
}

export function useRejectSuggestion(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase
        .from('challenge_attachments')
        .update({ discovery_status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', attachmentId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateAllContextKeys(qc, challengeId),
    onError: (err: Error) => toast.error(`Reject failed: ${err.message}`),
  });
}

export function useAcceptMultipleSuggestions(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      // D3 FIX: Reset extraction state for all accepted sources
      const { error } = await supabase
        .from('challenge_attachments')
        .update({
          discovery_status: 'accepted',
          extraction_status: 'pending',
          extracted_summary: null,
          extracted_key_data: null,
          updated_at: new Date().toISOString(),
        })
        .in('id', ids);
      if (error) throw new Error(error.message);
      await Promise.allSettled(
        ids.map(id => supabase.functions.invoke('extract-attachment-text', { body: { attachment_id: id } }))
      );
      await Promise.allSettled(ids.map(id => waitForExtraction(id)));
    },
    onSuccess: async () => {
      // D7 FIX: Await invalidation
      await Promise.all([
        qc.invalidateQueries({ queryKey: CONTEXT_KEYS.sources(challengeId) }),
        qc.invalidateQueries({ queryKey: CONTEXT_KEYS.sourceCount(challengeId) }),
        qc.invalidateQueries({ queryKey: CONTEXT_KEYS.pendingCount(challengeId) }),
      ]);
      toast.success('Sources accepted and indexed');
    },
    onError: (err: Error) => toast.error(`Batch accept failed: ${err.message}`),
  });
}

export function useRejectAllSuggestions(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('challenge_attachments')
        .update({ discovery_status: 'rejected', updated_at: new Date().toISOString() })
        .eq('challenge_id', challengeId)
        .eq('discovery_status', 'suggested');
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidateAllContextKeys(qc, challengeId);
      toast.success('All suggestions rejected');
    },
    onError: (err: Error) => toast.error(`Reject all failed: ${err.message}`),
  });
}

export function useUnacceptSource(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase
        .from('challenge_attachments')
        .update({ discovery_status: 'suggested', updated_at: new Date().toISOString() })
        .eq('id', attachmentId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidateAllContextKeys(qc, challengeId);
      toast.success('Source moved back to suggested');
    },
    onError: (err: Error) => toast.error(`Unaccept failed: ${err.message}`),
  });
}

/* ── Upload / Add URL ── */

export function useUploadContextFile(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, sectionKey }: { file: File; sectionKey: string }) => {
      const storagePath = `${challengeId}/${crypto.randomUUID()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('challenge-attachments')
        .upload(storagePath, file);
      if (uploadErr) throw new Error(uploadErr.message);

      const { data: att, error: insertErr } = await supabase
        .from('challenge_attachments')
        .insert({
          challenge_id: challengeId,
          section_key: sectionKey,
          source_type: 'file',
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
          discovery_source: 'manual',
          discovery_status: 'suggested',
          extraction_status: 'pending',
        })
        .select('id')
        .single();
      if (insertErr) throw new Error(insertErr.message);

      await supabase.functions.invoke('extract-attachment-text', { body: { attachment_id: att.id } });
      await waitForExtraction(att.id);
      return att;
    },
    onSuccess: () => {
      invalidateAllContextKeys(qc, challengeId);
      toast.success('File uploaded and indexed');
    },
    onError: (err: Error) => toast.error(`Upload failed: ${err.message}`),
  });
}

export function useAddContextUrl(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ url, sectionKey }: { url: string; sectionKey: string }) => {
      const { data: att, error } = await supabase
        .from('challenge_attachments')
        .insert({
          challenge_id: challengeId,
          section_key: sectionKey,
          source_type: 'url',
          source_url: url,
          discovery_source: 'manual',
          discovery_status: 'suggested',
          extraction_status: 'pending',
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);

      await supabase.functions.invoke('extract-attachment-text', { body: { attachment_id: att.id } });
      await waitForExtraction(att.id);
      return att;
    },
    onSuccess: () => {
      invalidateAllContextKeys(qc, challengeId);
      toast.success('URL added and indexed');
    },
    onError: (err: Error) => toast.error(`Add URL failed: ${err.message}`),
  });
}

/* ── Delete / Re-extract / Update ── */

export function useDeleteContextSource(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (source: ContextSource) => {
      if (source.source_type === 'file' && source.storage_path) {
        await supabase.storage.from('challenge-attachments').remove([source.storage_path]);
      }
      const { error } = await supabase.from('challenge_attachments').delete().eq('id', source.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidateAllContextKeys(qc, challengeId);
      toast.success('Source deleted');
    },
    onError: (err: Error) => toast.error(`Delete failed: ${err.message}`),
  });
}

export function useReExtractSource(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      await supabase
        .from('challenge_attachments')
        .update({ extraction_status: 'pending', extraction_error: null, updated_at: new Date().toISOString() })
        .eq('id', attachmentId);
      await supabase.functions.invoke('extract-attachment-text', { body: { attachment_id: attachmentId } });
      await waitForExtraction(attachmentId);
    },
    onSuccess: () => {
      invalidateAllContextKeys(qc, challengeId);
      toast.success('Content re-extracted');
    },
    onError: (err: Error) => {
      const msg = err.message ?? '';
      if (msg.includes('AI_CREDITS_EXHAUSTED') || msg.includes('credits_exhausted')) {
        toast.error('AI credits exhausted — extraction cannot complete. Check your plan.', { duration: 8000 });
      } else if (msg.includes('AI_RATE_LIMITED') || msg.includes('rate_limited')) {
        toast.error('AI rate limit reached — please wait and retry.', { duration: 5000 });
      } else {
        toast.error(`Extraction failed: ${msg}`);
      }
    },
  });
}

export function useUpdateSourceSharing(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, shared }: { id: string; shared: boolean }) => {
      const { error } = await supabase
        .from('challenge_attachments')
        .update({ shared_with_solver: shared, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateAllContextKeys(qc, challengeId),
    onError: (err: Error) => toast.error(`Update failed: ${err.message}`),
  });
}

export function useUpdateSourceSections(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, sectionKey }: { id: string; sectionKey: string }) => {
      const { error } = await supabase
        .from('challenge_attachments')
        .update({ section_key: sectionKey, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateAllContextKeys(qc, challengeId),
    onError: (err: Error) => toast.error(`Update failed: ${err.message}`),
  });
}

/* ── Digest ── */

export function useRegenerateDigest(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-context-digest', {
        body: { challenge_id: challengeId },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async () => {
      // D7 FIX: Await refetch before toast
      await qc.refetchQueries({ queryKey: CONTEXT_KEYS.digest(challengeId) });
      invalidateAllContextKeys(qc, challengeId);
      toast.success('Context digest generated');
    },
    onError: (err: Error) => {
      const msg = err.message ?? '';
      const isNoSources = msg.includes('NO_SOURCES') || msg.includes('No accepted sources') || msg.includes('NO_EXTRACTABLE_CONTENT');
      if (isNoSources) {
        toast.error('No accepted sources available. Accept some sources first, then generate the digest.');
      } else {
        toast.error(`Digest generation failed: ${msg}`);
      }
    },
  });
}

export function useSaveDigest(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (editedText: string) => {
      const { data: existing } = await supabase
        .from('challenge_context_digest')
        .select('digest_text, curator_edited, original_digest_text')
        .eq('challenge_id', challengeId)
        .maybeSingle();

      const originalText = existing?.curator_edited
        ? existing.original_digest_text
        : existing?.digest_text ?? null;

      const { error } = await supabase
        .from('challenge_context_digest')
        .update({
          digest_text: editedText,
          curator_edited: true,
          curator_edited_at: new Date().toISOString(),
          original_digest_text: originalText,
        })
        .eq('challenge_id', challengeId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTEXT_KEYS.digest(challengeId) });
      toast.success('Digest saved');
    },
    onError: (err: Error) => toast.error(`Failed to save digest: ${err.message}`),
  });
}

export function useClearAllSources(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: deletedRows, error: digestErr } = await supabase
        .from('challenge_context_digest')
        .delete()
        .eq('challenge_id', challengeId)
        .select('id');
      if (digestErr) throw new Error(digestErr.message);

      if (deletedRows && deletedRows.length === 0) {
        const { data: stillExists } = await supabase
          .from('challenge_context_digest')
          .select('id')
          .eq('challenge_id', challengeId)
          .maybeSingle();
        if (stillExists) {
          throw new Error('Access denied — your role does not have permission to clear the digest. Contact a Curator or Admin.');
        }
      }

      const { data: fileSources } = await supabase
        .from('challenge_attachments')
        .select('storage_path')
        .eq('challenge_id', challengeId)
        .eq('source_type', 'file')
        .not('storage_path', 'is', null);

      const paths = (fileSources ?? [])
        .map(s => s.storage_path)
        .filter((p): p is string => !!p);
      if (paths.length > 0) {
        await supabase.storage.from('challenge-attachments').remove(paths);
      }

      const { error: delErr } = await supabase
        .from('challenge_attachments')
        .delete()
        .eq('challenge_id', challengeId);
      if (delErr) throw new Error(delErr.message);
    },
    onSuccess: () => {
      qc.setQueryData(CONTEXT_KEYS.digest(challengeId), null);
      invalidateAllContextKeys(qc, challengeId);
      toast.success('All sources and digest cleared');
    },
    onError: (err: Error) => toast.error(`Clear failed: ${err.message}`),
  });
}

/** @deprecated curation-intelligence edge function has been removed in favor of wave-based architecture */
export function useCurationIntelligence(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_stages?: string[]) => {
      throw new Error('curation-intelligence has been replaced by wave-based review. Use Analyse + Generate Suggestions instead.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
