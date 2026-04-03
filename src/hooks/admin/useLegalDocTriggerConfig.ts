/**
 * useLegalDocTriggerConfig — CRUD hooks for legal_doc_trigger_config table.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { handleMutationError } from '@/lib/errorHandler';
import type { LegalDocTriggerConfig } from '@/types/legal.types';

const QK = 'legal_doc_trigger_config';
const TABLE = 'legal_doc_trigger_config' as const;
const COLS = 'id, document_code, document_section, trigger_event, required_roles, applies_to_mode, is_mandatory, display_order, is_active, created_at, updated_at';

export function useLegalDocTriggerConfig() {
  return useQuery({
    queryKey: [QK],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from(TABLE) as any).select(COLS).order('display_order');
      if (error) throw new Error(error.message);
      return data as LegalDocTriggerConfig[];
    },
    staleTime: 300_000,
  });
}

export function useCreateTriggerConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Partial<LegalDocTriggerConfig>) => {
      const d = await withCreatedBy(item);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(TABLE) as any).insert(d);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK] }); toast.success('Trigger created'); },
    onError: (e: Error) => handleMutationError(e, { operation: 'create_trigger_config' }),
  });
}

export function useUpdateTriggerConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LegalDocTriggerConfig> & { id: string }) => {
      const d = await withUpdatedBy({ ...updates, updated_at: new Date().toISOString() });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(TABLE) as any).update(d).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK] }); toast.success('Trigger updated'); },
    onError: (e: Error) => handleMutationError(e, { operation: 'update_trigger_config' }),
  });
}

export function useDeleteTriggerConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(TABLE) as any).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK] }); toast.success('Trigger deleted'); },
    onError: (e: Error) => handleMutationError(e, { operation: 'delete_trigger_config' }),
  });
}
