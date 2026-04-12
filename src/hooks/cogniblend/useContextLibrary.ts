/**
 * useContextLibrary — Central hook for all Context Library data operations.
 * Digest generation is decoupled from accept/upload — explicit via useRegenerateDigest.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CACHE_STANDARD, CACHE_FREQUENT } from '@/config/queryCache';

/* ── Types ── */

export interface ContextSource {
  id: string;
  challenge_id: string;
  section_key: string;
  source_type: string;
  source_url: string | null;
  display_name: string | null;
  file_name: string | null;
  url_title: string | null;
  description: string | null;
  mime_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  extracted_text: string | null;
  extracted_summary: string | null;
  extracted_key_data: Record<string, unknown> | null;
  extraction_status: string | null;
  extraction_error: string | null;
  extraction_method?: string | null;
  shared_with_solver: boolean;
  discovery_source: string;
  discovery_status: string;
  resource_type: string | null;
  relevance_explanation: string | null;
  confidence_score: number | null;
  suggested_sections: string[] | null;
  access_status: string | null;
  created_at: string | null;
}

export interface ContextDigest {
  id: string;
  challenge_id: string;
  digest_text: string;
  key_facts: Record<string, unknown> | null;
  source_count: number;
  generated_at: string;
  curator_edited: boolean;
  curator_edited_at: string | null;
  original_digest_text: string | null;
}

/* ── Query keys ── */

const KEYS = {
  sources: (cid: string) => ['context-sources', cid] as const,
  digest: (cid: string) => ['context-digest', cid] as const,
  sourceCount: (cid: string) => ['context-source-count', cid] as const,
  pendingCount: (cid: string) => ['context-pending-count', cid] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>, challengeId: string) {
  qc.invalidateQueries({ queryKey: KEYS.sources(challengeId) });
  qc.invalidateQueries({ queryKey: KEYS.digest(challengeId) });
  qc.invalidateQueries({ queryKey: KEYS.sourceCount(challengeId) });
  qc.invalidateQueries({ queryKey: KEYS.pendingCount(challengeId) });
  qc.invalidateQueries({ queryKey: ['challenge-attachments', challengeId] });
}

/* ── Queries ── */

const SOURCE_COLUMNS = 'id, challenge_id, section_key, source_type, source_url, display_name, file_name, url_title, description, mime_type, file_size, storage_path, extracted_text, extracted_summary, extracted_key_data, extraction_status, extraction_error, shared_with_solver, discovery_source, discovery_status, resource_type, relevance_explanation, confidence_score, suggested_sections, access_status, created_at';

export function useContextSources(challengeId: string | null) {
  return useQuery({
    queryKey: KEYS.sources(challengeId ?? ''),
    queryFn: async () => {
      if (!challengeId) return [];
      const { data, error } = await supabase
        .from('challenge_attachments')
        .select(SOURCE_COLUMNS)
        .eq('challenge_id', challengeId)
        .in('discovery_status', ['accepted', 'suggested'])
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ContextSource[];
    },
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
  });
}

const DIGEST_COLUMNS = 'id, challenge_id, digest_text, key_facts, source_count, generated_at, curator_edited, curator_edited_at, original_digest_text';

export function useContextDigest(challengeId: string | null) {
  return useQuery({
    queryKey: KEYS.digest(challengeId ?? ''),
    queryFn: async () => {
      if (!challengeId) return null;
      const { data, error } = await supabase
        .from('challenge_context_digest')
        .select(DIGEST_COLUMNS)
        .eq('challenge_id', challengeId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as ContextDigest | null;
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });
}

export function useContextSourceCount(challengeId: string | null) {
  return useQuery({
    queryKey: KEYS.sourceCount(challengeId ?? ''),
    queryFn: async () => {
      if (!challengeId) return 0;
      const { count, error } = await supabase
        .from('challenge_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('challenge_id', challengeId)
        .eq('discovery_status', 'accepted');
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
  });
}

export function usePendingSuggestionCount(challengeId: string | null) {
  return useQuery({
    queryKey: KEYS.pendingCount(challengeId ?? ''),
    queryFn: async () => {
      if (!challengeId) return 0;
      const { count, error } = await supabase
        .from('challenge_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('challenge_id', challengeId)
        .eq('discovery_status', 'suggested');
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
  });
}

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
    if (data?.extraction_status === 'completed' || data?.extraction_status === 'failed') return;
  }
}

/* ── Mutations ── */

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
    onSuccess: (data) => {
      invalidateAll(qc, challengeId);
      toast.success(`Discovered ${data?.count ?? 0} potential sources`);
    },
    onError: (err: Error) => toast.error(`Discovery failed: ${err.message}`),
  });
}

export function useAcceptSuggestion(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase
        .from('challenge_attachments')
        .update({ discovery_status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', attachmentId);
      if (error) throw new Error(error.message);

      // Fire extraction but don't auto-regenerate digest
      await supabase.functions.invoke('extract-attachment-text', {
        body: { attachment_id: attachmentId },
      });
      await waitForExtraction(attachmentId);
    },
    onSuccess: () => {
      invalidateAll(qc, challengeId);
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
    onSuccess: () => invalidateAll(qc, challengeId),
    onError: (err: Error) => toast.error(`Reject failed: ${err.message}`),
  });
}

export function useAcceptMultipleSuggestions(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('challenge_attachments')
        .update({ discovery_status: 'accepted', updated_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw new Error(error.message);

      await Promise.allSettled(
        ids.map(id =>
          supabase.functions.invoke('extract-attachment-text', {
            body: { attachment_id: id },
          })
        )
      );
      await Promise.allSettled(ids.map(id => waitForExtraction(id)));
    },
    onSuccess: () => {
      invalidateAll(qc, challengeId);
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
      invalidateAll(qc, challengeId);
      toast.success('All suggestions rejected');
    },
    onError: (err: Error) => toast.error(`Reject all failed: ${err.message}`),
  });
}

/** Revert an accepted source back to suggested status */
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
      invalidateAll(qc, challengeId);
      toast.success('Source moved back to suggested');
    },
    onError: (err: Error) => toast.error(`Unaccept failed: ${err.message}`),
  });
}

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
          discovery_status: 'accepted',
          extraction_status: 'pending',
        })
        .select('id')
        .single();
      if (insertErr) throw new Error(insertErr.message);

      await supabase.functions.invoke('extract-attachment-text', {
        body: { attachment_id: att.id },
      });
      await waitForExtraction(att.id);

      return att;
    },
    onSuccess: () => {
      invalidateAll(qc, challengeId);
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
          discovery_status: 'accepted',
          extraction_status: 'pending',
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);

      await supabase.functions.invoke('extract-attachment-text', {
        body: { attachment_id: att.id },
      });
      await waitForExtraction(att.id);

      return att;
    },
    onSuccess: () => {
      invalidateAll(qc, challengeId);
      toast.success('URL added and indexed');
    },
    onError: (err: Error) => toast.error(`Add URL failed: ${err.message}`),
  });
}

export function useDeleteContextSource(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (source: ContextSource) => {
      if (source.source_type === 'file' && source.storage_path) {
        await supabase.storage
          .from('challenge-attachments')
          .remove([source.storage_path]);
      }
      const { error } = await supabase
        .from('challenge_attachments')
        .delete()
        .eq('id', source.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidateAll(qc, challengeId);
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
      invalidateAll(qc, challengeId);
      toast.success('Content re-extracted');
    },
    onError: (err: Error) => toast.error(`Extraction failed: ${err.message}`),
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
    onSuccess: () => invalidateAll(qc, challengeId),
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
    onSuccess: () => invalidateAll(qc, challengeId),
    onError: (err: Error) => toast.error(`Update failed: ${err.message}`),
  });
}

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
    onSuccess: () => {
      invalidateAll(qc, challengeId);
      toast.success('Context digest generated');
    },
    onError: (err: Error) => toast.error(`Digest generation failed: ${err.message}`),
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
      qc.invalidateQueries({ queryKey: KEYS.digest(challengeId) });
      toast.success('Digest saved');
    },
    onError: (err: Error) => toast.error(`Failed to save digest: ${err.message}`),
  });
}

/* ── Intake Status Query ── */

export function useIntakeStatus(challengeId: string | null) {
  return useQuery({
    queryKey: ['context-intake-status', challengeId ?? ''],
    queryFn: async () => {
      if (!challengeId) return null;
      const { data, error } = await supabase
        .from('challenges')
        .select('context_intake_status')
        .eq('id', challengeId)
        .single();
      if (error) throw new Error(error.message);
      return (data as Record<string, unknown>)?.context_intake_status as string | null;
    },
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
  });
}

/* ── Curation Intelligence Pipeline ── */

export function useCurationIntelligence(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stages?: string[]) => {
      const { data, error } = await supabase.functions.invoke('curation-intelligence', {
        body: { challenge_id: challengeId, stages },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      invalidateAll(qc, challengeId);
      toast.success('Intelligence pipeline complete');
    },
    onError: (err: Error) => toast.error(`Intelligence pipeline failed: ${err.message}`),
  });
}
