/**
 * useLifecyclePhaseConfig — Query + mutation hooks for md_lifecycle_phase_config.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withUpdatedBy } from '@/lib/auditFields';
import { handleMutationError } from '@/lib/errorHandler';
import { toast } from 'sonner';

export interface LifecyclePhaseConfig {
  id: string;
  governance_mode: string;
  phase_number: number;
  phase_name: string;
  phase_description: string | null;
  required_role: string | null;
  secondary_role: string | null;
  phase_type: string;
  auto_complete: boolean;
  gate_flags: string[] | null;
  sla_days: number | null;
  display_order: number;
  icon_name: string | null;
  is_active: boolean;
}

const PHASE_COLUMNS = 'id, governance_mode, phase_number, phase_name, phase_description, required_role, secondary_role, phase_type, auto_complete, gate_flags, sla_days, display_order, icon_name, is_active';

export function useLifecyclePhaseConfig(mode: string) {
  return useQuery<LifecyclePhaseConfig[]>({
    queryKey: ['lifecycle-phase-config', mode],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> })
        .from('md_lifecycle_phase_config')
        .select(PHASE_COLUMNS)
        .eq('governance_mode', mode)
        .order('phase_number', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as LifecyclePhaseConfig[];
    },
    staleTime: 5 * 60_000,
  });
}

interface UpdatePayload {
  id: string;
  phase_name?: string;
  required_role?: string | null;
  secondary_role?: string | null;
  phase_type?: string;
  auto_complete?: boolean;
  gate_flags?: string[] | null;
  sla_days?: number | null;
}

export function useUpdateLifecyclePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePayload) => {
      const payload = await withUpdatedBy({ ...updates, updated_at: new Date().toISOString() });
      const { error } = await (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> })
        .from('md_lifecycle_phase_config')
        .update(payload)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-phase-config'] });
      toast.success('Phase configuration saved');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_lifecycle_phase' });
    },
  });
}
