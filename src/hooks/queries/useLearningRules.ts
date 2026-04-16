/**
 * useLearningRules — Query + mutation hooks for section_example_library learning rules.
 * Used by the Supervisor Learning Admin page for rule management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { toast } from 'sonner';

export interface LearningRuleRow {
  id: string;
  section_key: string;
  learning_rule: string;
  correction_class: string | null;
  activation_confidence: number;
  distinct_curator_count: number;
  is_active: boolean;
  quality_tier: string;
  usage_count: number;
  created_at: string;
}

const QUERY_KEY = ['learning-rules'] as const;

export function useLearningRules() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('section_example_library')
        .select('id, section_key, learning_rule, correction_class, activation_confidence, distinct_curator_count, is_active, quality_tier, usage_count, created_at')
        .not('learning_rule', 'is', null)
        .order('activation_confidence', { ascending: false })
        .limit(200);

      if (error) throw new Error(error.message);
      return (data ?? []) as LearningRuleRow[];
    },
    staleTime: 30_000,
  });
}

export function useUpdateLearningRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<LearningRuleRow, 'learning_rule' | 'activation_confidence' | 'is_active'>> }) => {
      const { error } = await supabase
        .from('section_example_library')
        .update(updates)
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Rule updated successfully');
    },
    onError: (error) => handleMutationError(error, { operation: 'update_learning_rule', component: 'useLearningRules' }),
  });
}

export function useMergeLearningRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ keepId, removeId }: { keepId: string; removeId: string }) => {
      // Deactivate the duplicate rule
      const { error } = await supabase
        .from('section_example_library')
        .update({ is_active: false })
        .eq('id', removeId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Rules merged — duplicate deactivated');
    },
    onError: (error) => handleMutationError(error, { operation: 'merge_learning_rules', component: 'useLearningRules' }),
  });
}
