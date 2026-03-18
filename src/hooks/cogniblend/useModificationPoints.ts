/**
 * useModificationPoints — CRUD hooks for modification_points table.
 *
 * Provides:
 *  - useModificationPointsByAmendment: fetch points for a given amendment
 *  - useModificationPointsByChallenge: fetch all points for all amendments of a challenge
 *  - useCreateModificationPoints: bulk-insert points when ID returns a challenge
 *  - useUpdatePointStatus: mark a point as ADDRESSED or WAIVED
 *  - useHasOutstandingRequired: derived check — blocks resubmission
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { handleMutationError } from '@/lib/errorHandler';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModificationPoint {
  id: string;
  amendment_id: string;
  description: string;
  severity: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
  status: 'OUTSTANDING' | 'ADDRESSED' | 'WAIVED';
  addressed_by: string | null;
  addressed_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ModificationPointInput {
  description: string;
  severity: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch modification points for a specific amendment
 */
export function useModificationPointsByAmendment(amendmentId: string | undefined) {
  return useQuery({
    queryKey: ['modification-points', 'amendment', amendmentId],
    queryFn: async () => {
      if (!amendmentId) return [];
      const { data, error } = await supabase
        .from('modification_points')
        .select('id, amendment_id, description, severity, status, addressed_by, addressed_at, created_at, created_by')
        .eq('amendment_id', amendmentId)
        .order('created_at');
      if (error) throw new Error(error.message);
      return (data ?? []) as ModificationPoint[];
    },
    enabled: !!amendmentId,
    staleTime: 30_000,
  });
}

/**
 * Fetch all modification points for a challenge (across all amendments)
 */
export function useModificationPointsByChallenge(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['modification-points', 'challenge', challengeId],
    queryFn: async () => {
      if (!challengeId) return [];

      // First get all amendment IDs for this challenge
      const { data: amendments, error: aErr } = await supabase
        .from('amendment_records')
        .select('id, amendment_number')
        .eq('challenge_id', challengeId)
        .order('amendment_number', { ascending: false });
      if (aErr) throw new Error(aErr.message);
      if (!amendments || amendments.length === 0) return [];

      const amendmentIds = amendments.map((a) => a.id);
      const { data, error } = await supabase
        .from('modification_points')
        .select('id, amendment_id, description, severity, status, addressed_by, addressed_at, created_at, created_by')
        .in('amendment_id', amendmentIds)
        .order('created_at');
      if (error) throw new Error(error.message);

      return (data ?? []) as ModificationPoint[];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Bulk-create modification points for a new amendment
 */
export function useCreateModificationPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      amendmentId: string;
      challengeId: string;
      points: ModificationPointInput[];
    }) => {
      const rows = await Promise.all(
        params.points.map(async (p) => {
          const row = await withCreatedBy({
            amendment_id: params.amendmentId,
            description: p.description,
            severity: p.severity,
            status: 'OUTSTANDING',
          });
          return row;
        }),
      );

      const { data, error } = await supabase
        .from('modification_points')
        .insert(rows)
        .select();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['modification-points', 'amendment', vars.amendmentId] });
      queryClient.invalidateQueries({ queryKey: ['modification-points', 'challenge', vars.challengeId] });
    },
    onError: (error: Error) =>
      handleMutationError(error, { operation: 'create_modification_points' }),
  });
}

/**
 * Update a single modification point's status
 */
export function useUpdatePointStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      pointId: string;
      status: 'ADDRESSED' | 'WAIVED' | 'OUTSTANDING';
      userId: string;
    }) => {
      const updates = await withUpdatedBy({
        status: params.status,
        addressed_by: params.status === 'ADDRESSED' ? params.userId : null,
        addressed_at: params.status === 'ADDRESSED' ? new Date().toISOString() : null,
      });

      const { error } = await supabase
        .from('modification_points')
        .update(updates)
        .eq('id', params.pointId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modification-points'] });
      toast.success('Point status updated');
    },
    onError: (error: Error) =>
      handleMutationError(error, { operation: 'update_modification_point' }),
  });
}
