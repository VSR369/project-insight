/**
 * useLegalReviewThresholds — CRUD hook for md_legal_review_thresholds.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError, handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';

const QUERY_KEY = 'legal-review-thresholds';
const SELECT_COLS = 'id, country_id, currency_code, threshold_amount, governance_mode, is_active, created_at';

export interface LegalReviewThresholdRow {
  id: string;
  country_id: string;
  currency_code: string;
  threshold_amount: number;
  governance_mode: string;
  is_active: boolean;
  created_at: string;
}

export function useLegalReviewThresholds() {
  return useQuery<LegalReviewThresholdRow[]>({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_legal_review_thresholds')
        .select(SELECT_COLS)
        .order('governance_mode')
        .order('currency_code');
      if (error) { handleQueryError(error, { operation: 'fetch_legal_thresholds' }); return []; }
      return (data ?? []) as LegalReviewThresholdRow[];
    },
    staleTime: 5 * 60_000,
  });
}

export interface ThresholdInput {
  country_id: string;
  currency_code: string;
  threshold_amount: number;
  governance_mode: string;
  is_active?: boolean;
}

export function useCreateThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ThresholdInput) => {
      const payload = await withCreatedBy(input);
      const { error } = await supabase.from('md_legal_review_thresholds').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success('Threshold created'); },
    onError: (e) => handleMutationError(e, { operation: 'create_threshold' }),
  });
}

export function useUpdateThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ThresholdInput & { id: string }) => {
      const payload = await withUpdatedBy(updates);
      const { error } = await supabase.from('md_legal_review_thresholds').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success('Threshold updated'); },
    onError: (e) => handleMutationError(e, { operation: 'update_threshold' }),
  });
}

export function useDeleteThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('md_legal_review_thresholds').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success('Threshold deactivated'); },
    onError: (e) => handleMutationError(e, { operation: 'delete_threshold' }),
  });
}
