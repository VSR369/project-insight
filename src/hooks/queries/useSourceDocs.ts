/**
 * useSourceDocs — Data layer for source legal document upload + Pass 3 actions.
 * Owns ALL Supabase calls. Components must NOT import supabase directly.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError, handleQueryError } from '@/lib/errorHandler';
import { sanitizeFileName } from '@/lib/sanitizeFileName';
import { ensureFreshSession } from '@/lib/cogniblend/ensureFreshSession';
import {
  parseFileToHtml,
  validateSourceFile,
  type SourceOrigin,
} from '@/services/legal/sourceDocService';

export interface SourceDocRow {
  id: string;
  document_name: string | null;
  content_html: string | null;
  source_origin: SourceOrigin | null;
  status: string | null;
  created_at: string;
  lc_review_notes: string | null;
}

export function useSourceDocs(challengeId: string | undefined) {
  return useQuery<SourceDocRow[]>({
    queryKey: ['source-legal-docs', challengeId],
    enabled: !!challengeId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!challengeId) return [];
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_name, content_html, source_origin, status, created_at, lc_review_notes')
        .eq('challenge_id', challengeId)
        .eq('document_type', 'SOURCE_DOC')
        .order('created_at', { ascending: true });
      if (error) {
        handleQueryError(error, { operation: 'fetch_source_docs' });
        throw error;
      }
      return (data ?? []) as SourceDocRow[];
    },
  });
}

interface UploadArgs {
  challengeId: string;
  userId: string;
  sourceOrigin: SourceOrigin;
  file: File;
}

export function useUploadSourceDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId, userId, sourceOrigin, file }: UploadArgs) => {
      const validationErr = validateSourceFile(file);
      if (validationErr) throw new Error(validationErr);

      const parsed = await parseFileToHtml(file);

      let storagePath: string | null = null;
      if (parsed.isPdf) {
        const safe = sanitizeFileName(file.name);
        const path = `${challengeId}/source/${crypto.randomUUID()}_${safe}`;
        const { error: upErr } = await supabase.storage
          .from('legal-docs')
          .upload(path, file);
        if (upErr) throw new Error(upErr.message);
        storagePath = path;
      }

      // status: 'uploaded' is the canonical SOURCE_DOC lifecycle entry value.
      // Permitted by trigger trg_challenge_legal_docs_validate (see migration
      // 20260421* — fix_challenge_legal_doc_status_trigger).
      const { error: insErr } = await supabase.from('challenge_legal_docs').insert({
        challenge_id: challengeId,
        document_type: 'SOURCE_DOC',
        document_name: file.name,
        tier: 'TIER_1',
        status: 'uploaded',
        source_origin: sourceOrigin,
        content_html: parsed.contentHtml,
        lc_review_notes: storagePath,
        created_by: userId,
        attached_by: userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      if (insErr) throw new Error(insErr.message);
    },
    onSuccess: (_d, vars) => {
      toast.success('Source document uploaded');
      qc.invalidateQueries({ queryKey: ['source-legal-docs', vars.challengeId] });
      qc.invalidateQueries({ queryKey: ['attached-legal-docs', vars.challengeId] });
      qc.invalidateQueries({ queryKey: ['challenge-preview', vars.challengeId] });
    },
    onError: (e) => handleMutationError(e, { operation: 'upload_source_doc' }),
  });
}

interface DeleteArgs {
  challengeId: string;
  docId: string;
  storagePath: string | null;
}

export function useDeleteSourceDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, storagePath }: DeleteArgs) => {
      if (storagePath) {
        await supabase.storage.from('legal-docs').remove([storagePath]);
      }
      const { error } = await supabase
        .from('challenge_legal_docs')
        .delete()
        .eq('id', docId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      toast.success('Source document removed');
      qc.invalidateQueries({ queryKey: ['source-legal-docs', vars.challengeId] });
      qc.invalidateQueries({ queryKey: ['attached-legal-docs', vars.challengeId] });
    },
    onError: (e) => handleMutationError(e, { operation: 'delete_source_doc' }),
  });
}

interface OrganizeArgs {
  challengeId: string;
}

/**
 * Calls the Pass 3 edge function in organize_only mode — AI dedupes and
 * harmonises uploaded source clauses into the configured sections WITHOUT
 * generating new substantive content (empty sections render a placeholder).
 */
export function useOrganizeAndMerge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId }: OrganizeArgs) => {
      await ensureFreshSession();
      const { data, error } = await supabase.functions.invoke(
        'suggest-legal-documents',
        {
          body: {
            challenge_id: challengeId,
            pass3_mode: true,
            organize_only: true,
          },
        },
      );
      if (error) throw new Error(error.message ?? 'Failed to organize');
      if (!data?.success) {
        throw new Error(data?.error?.message ?? 'Organize failed');
      }
      return data;
    },
    onSuccess: (_d, vars) => {
      toast.success('Source documents organized & merged into sections');
      qc.invalidateQueries({ queryKey: ['pass3-legal-review', vars.challengeId] });
      qc.invalidateQueries({ queryKey: ['pass3-stale', vars.challengeId] });
      qc.invalidateQueries({ queryKey: ['curator-legal-review', vars.challengeId] });
      qc.invalidateQueries({ queryKey: ['attached-legal-docs', vars.challengeId] });
    },
    onError: (e) => handleMutationError(e, { operation: 'organize_source_docs' }),
  });
}

