/**
 * useCuratorCpaActions — Data layer for CuratorCpaReviewPanel (R2 compliance).
 * Handles CPA query, save, approve+publish, and return flows.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError, handleQueryError } from '@/lib/errorHandler';
import { toast } from 'sonner';
import { CACHE_STANDARD } from '@/config/queryCache';

export interface AssembledDoc {
  id: string;
  document_type: string;
  document_name: string | null;
  content: string | null;
  assembly_variables: Record<string, string> | null;
  status: string | null;
}

export function useAssembledCpa(challengeId: string) {
  return useQuery<AssembledDoc[]>({
    queryKey: ['assembled-cpa', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_type, document_name, content, assembly_variables, status')
        .eq('challenge_id', challengeId)
        .eq('is_assembled', true)
        .order('created_at', { ascending: false });
      if (error) {
        handleQueryError(error, { operation: 'fetch_assembled_cpa' });
        throw error;
      }
      return (data ?? []) as AssembledDoc[];
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });
}

export async function saveCpaContent(
  docId: string,
  content: string,
  userId: string,
  challengeId: string,
): Promise<void> {
  const { error } = await supabase
    .from('challenge_legal_docs')
    .update({
      content,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', docId);
  if (error) throw error;
}

export async function approveLegalAndPublish(
  challengeId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('challenge_legal_docs')
    .update({
      status: 'curator_reviewed',
      lc_status: 'approved',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('challenge_id', challengeId);
  if (error) throw error;

  const { error: rpcErr } = await supabase.rpc('complete_phase', {
    p_challenge_id: challengeId,
    p_user_id: userId,
  });
  if (rpcErr) throw rpcErr;
}
