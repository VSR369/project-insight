/**
 * useLifecyclePhaseConfig — Query + mutation hooks for md_lifecycle_phase_config.
 * Uses raw PostgREST calls since the table is not yet in generated types.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserId } from '@/lib/auditFields';
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

async function fetchPhaseConfig(mode: string): Promise<LifecyclePhaseConfig[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/md_lifecycle_phase_config?governance_mode=eq.${mode}&order=phase_number.asc&select=id,governance_mode,phase_number,phase_name,phase_description,required_role,secondary_role,phase_type,auto_complete,gate_flags,sla_days,display_order,icon_name,is_active`;
  const res = await fetch(url, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
  return res.json();
}

export function useLifecyclePhaseConfig(mode: string) {
  return useQuery<LifecyclePhaseConfig[]>({
    queryKey: ['lifecycle-phase-config', mode],
    queryFn: () => fetchPhaseConfig(mode),
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
      const userId = await getCurrentUserId();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/md_lifecycle_phase_config?id=eq.${id}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ ...updates, updated_at: new Date().toISOString(), updated_by: userId }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || res.statusText);
      }
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
