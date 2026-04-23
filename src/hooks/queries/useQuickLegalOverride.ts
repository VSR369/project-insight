import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError, handleQueryError } from '@/lib/errorHandler';
import { sanitizeFileName } from '@/lib/sanitizeFileName';
import { parseFileToHtml, validateSourceFile } from '@/services/legal/sourceDocService';

const QUERY_KEY = 'quick-legal-override';
const TARGET_TEMPLATE_CODE = 'CPA_QUICK';
const OVERRIDE_STRATEGY = 'REPLACE_DEFAULT';

interface QueryErrorLike {
  message: string;
}

interface MaybeSingleResult<T> {
  data: T | null;
  error: QueryErrorLike | null;
}

interface ManyResult<T> {
  data: T[] | null;
  error: QueryErrorLike | null;
}

interface QueryChain<T> {
  eq(column: string, value: string): QueryChain<T>;
  order(column: string, options: { ascending: boolean }): QueryChain<T>;
  limit(count: number): QueryChain<T>;
  single(): Promise<MaybeSingleResult<T>>;
  maybeSingle(): Promise<MaybeSingleResult<T>>;
}

interface SelectChain<T> extends QueryChain<T> {}

interface DeleteChain {
  eq(column: string, value: string): Promise<{ error: QueryErrorLike | null }>;
  in(column: string, values: string[]): Promise<{ error: QueryErrorLike | null }>;
}

interface ChallengeLegalDocsTable {
  select(columns: string): SelectChain<QuickLegalOverrideRow> & SelectChain<{ id: string; lc_review_notes: string | null }>;
  insert(values: Record<string, unknown>): Promise<{ error: QueryErrorLike | null }>;
  delete(): DeleteChain;
}

function getChallengeLegalDocsTable(): ChallengeLegalDocsTable {
  return supabase.from('challenge_legal_docs' as never) as unknown as ChallengeLegalDocsTable;
}

export interface QuickLegalOverrideRow {
  id: string;
  challenge_id: string;
  document_name: string | null;
  content_html: string | null;
  lc_review_notes: string | null;
  created_at: string;
  override_strategy: string | null;
  target_template_code: string | null;
}

interface UploadQuickLegalOverrideArgs {
  challengeId: string;
  userId: string;
  file: File;
}

interface DeleteQuickLegalOverrideArgs {
  challengeId: string;
  docId: string;
  storagePath: string | null;
}

export function useQuickLegalOverride(challengeId: string | undefined) {
  return useQuery<QuickLegalOverrideRow | null>({
    queryKey: [QUERY_KEY, challengeId],
    enabled: !!challengeId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!challengeId) return null;
      const { data, error } = await getChallengeLegalDocsTable()
        .select(
          'id, challenge_id, document_name, content_html, lc_review_notes, created_at, override_strategy, target_template_code',
        )
        .eq('challenge_id', challengeId)
        .eq('document_type', 'SOURCE_DOC')
        .eq('source_origin', 'creator')
        .eq('override_strategy', OVERRIDE_STRATEGY)
        .eq('target_template_code', TARGET_TEMPLATE_CODE)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        handleQueryError(error, { operation: 'fetch_quick_legal_override' });
        throw error;
      }

      return (data ?? null) as QuickLegalOverrideRow | null;
    },
  });
}

export function useUploadQuickLegalOverride() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ challengeId, userId, file }: UploadQuickLegalOverrideArgs) => {
      const validationErr = validateSourceFile(file);
      if (validationErr) throw new Error(validationErr);

      const { data: existing, error: existingError } = await getChallengeLegalDocsTable()
        .select('id, lc_review_notes')
        .eq('challenge_id', challengeId)
        .eq('document_type', 'SOURCE_DOC')
        .eq('source_origin', 'creator')
        .eq('override_strategy', OVERRIDE_STRATEGY)
        .eq('target_template_code', TARGET_TEMPLATE_CODE)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const existingRows = existing ? [existing as { id: string; lc_review_notes: string | null }] : [];

      if (existingError) throw new Error(existingError.message);

      const parsed = await parseFileToHtml(file);
      const safe = sanitizeFileName(file.name);
      let storagePath: string | null = null;

      if (parsed.isPdf) {
        const path = `${challengeId}/source/${crypto.randomUUID()}_${safe}`;
        const { error: upErr } = await supabase.storage.from('legal-docs').upload(path, file);
        if (upErr) throw new Error(upErr.message);
        storagePath = path;
      }

      const { error: insErr } = await supabase.from('challenge_legal_docs').insert({
        challenge_id: challengeId,
        document_type: 'SOURCE_DOC',
        document_name: file.name,
        tier: 'TIER_1',
        status: 'uploaded',
        source_origin: 'creator',
        content_html: parsed.contentHtml,
        lc_review_notes: storagePath,
        created_by: userId,
        attached_by: userId,
        override_strategy: OVERRIDE_STRATEGY,
        target_template_code: TARGET_TEMPLATE_CODE,
      });
      if (insErr) throw new Error(insErr.message);

      const staleIds = existingRows.map((row) => row.id);
      if (staleIds.length > 0) {
        const { error: delErr } = await supabase
          .from('challenge_legal_docs')
          .delete()
          .in('id', staleIds);
        if (delErr) throw new Error(delErr.message);

        const stalePaths = existingRows
          .map((row) => row.lc_review_notes)
          .filter((path): path is string => !!path);
        if (stalePaths.length > 0) {
          await supabase.storage.from('legal-docs').remove(stalePaths);
        }
      }
    },
    onSuccess: (_data, variables) => {
      toast.success('Quick challenge legal replacement saved');
      qc.invalidateQueries({ queryKey: [QUERY_KEY, variables.challengeId] });
      qc.invalidateQueries({ queryKey: ['cpa-enrollment', variables.challengeId] });
      qc.invalidateQueries({ queryKey: ['public-challenge-legal', variables.challengeId] });
    },
    onError: (error) => handleMutationError(error, { operation: 'upload_quick_legal_override' }),
  });
}

export function useDeleteQuickLegalOverride() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ challengeId: _challengeId, docId, storagePath }: DeleteQuickLegalOverrideArgs) => {
      if (storagePath) {
        await supabase.storage.from('legal-docs').remove([storagePath]);
      }
      const { error } = await supabase.from('challenge_legal_docs').delete().eq('id', docId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      toast.success('Quick challenge legal replacement removed');
      qc.invalidateQueries({ queryKey: [QUERY_KEY, variables.challengeId] });
      qc.invalidateQueries({ queryKey: ['cpa-enrollment', variables.challengeId] });
      qc.invalidateQueries({ queryKey: ['public-challenge-legal', variables.challengeId] });
    },
    onError: (error) => handleMutationError(error, { operation: 'delete_quick_legal_override' }),
  });
}