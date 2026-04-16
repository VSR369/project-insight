/**
 * useQualityFindings — Query + mutation hooks for consistency/ambiguity findings.
 * Used by diagnostics panels for accept/dismiss workflow.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { toast } from 'sonner';

export interface ConsistencyFinding {
  id: string;
  challenge_id: string;
  section_a: string;
  section_b: string;
  contradiction_type: string;
  description: string;
  severity: string;
  suggested_resolution: string | null;
  curator_accepted: boolean | null;
  created_at: string;
}

export interface AmbiguityFinding {
  id: string;
  challenge_id: string;
  section_key: string;
  snippet: string;
  pattern_matched: string;
  suggested_replacement: string | null;
  curator_accepted: boolean | null;
  created_at: string;
}

export interface QualityScore {
  consistencyCount: number;
  ambiguityCount: number;
  consistencyErrors: number;
  ambiguityAccepted: number;
}

export function useConsistencyFindings(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['consistency-findings', challengeId],
    queryFn: async () => {
      if (!challengeId) return [];
      const { data, error } = await supabase
        .from('challenge_consistency_findings')
        .select('id, challenge_id, section_a, section_b, contradiction_type, description, severity, suggested_resolution, curator_accepted, created_at')
        .eq('challenge_id', challengeId)
        .order('severity', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as ConsistencyFinding[];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });
}

export function useAmbiguityFindings(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['ambiguity-findings', challengeId],
    queryFn: async () => {
      if (!challengeId) return [];
      const { data, error } = await supabase
        .from('challenge_ambiguity_findings')
        .select('id, challenge_id, section_key, snippet, pattern_matched, suggested_replacement, curator_accepted, created_at')
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as AmbiguityFinding[];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });
}

export function useUpdateFindingAcceptance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ table, id, accepted }: { table: 'consistency' | 'ambiguity'; id: string; accepted: boolean | null }) => {
      const tableName = table === 'consistency' ? 'challenge_consistency_findings' : 'challenge_ambiguity_findings';
      const { error } = await supabase
        .from(tableName)
        .update({ curator_accepted: accepted })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      const key = variables.table === 'consistency' ? 'consistency-findings' : 'ambiguity-findings';
      queryClient.invalidateQueries({ queryKey: [key] });
      toast.success('Finding updated');
    },
    onError: (error) => handleMutationError(error, { operation: 'update_finding', component: 'useQualityFindings' }),
  });
}

export function computeQualityScore(
  consistencyFindings: ConsistencyFinding[],
  ambiguityFindings: AmbiguityFinding[],
): QualityScore {
  return {
    consistencyCount: consistencyFindings.length,
    ambiguityCount: ambiguityFindings.length,
    consistencyErrors: consistencyFindings.filter(f => f.severity === 'error').length,
    ambiguityAccepted: ambiguityFindings.filter(f => f.curator_accepted === true).length,
  };
}
