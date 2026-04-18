/**
 * useRepairMalformedSections — Mutation hook for the one-click data-repair
 * action. Calls the `repair-malformed-sections` edge function which scans
 * for empty / `[object Object]` / JSON-in-text / truncated content and
 * regenerates AI suggestions for each via review-challenge-sections.
 *
 * On success, invalidates the challenge detail query so the UI re-renders
 * fresh suggestions. The curator must then click "Accept All AI Suggestions"
 * to commit them to the persisted DB columns.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError, logInfo } from '@/lib/errorHandler';

export type RepairDetection =
  | 'empty'
  | 'json_in_text'
  | 'object_object'
  | 'truncated'
  | 'duplicated_token';

export interface RepairFinding {
  section_key: string;
  detection: RepairDetection;
  preview: string;
}

export interface RepairResultRow {
  section_key: string;
  detection: RepairDetection;
  status: 'regenerated' | 'skipped' | 'error';
  message?: string;
}

export interface RepairResponse {
  challenge_id: string;
  findings: RepairFinding[];
  repaired: RepairResultRow[];
  summary?: {
    scanned: number;
    detected: number;
    regenerated: number;
    failed: number;
  };
  message?: string;
  dry_run?: boolean;
}

interface RepairArgs {
  challengeId: string;
  dryRun?: boolean;
}

export function useRepairMalformedSections() {
  const qc = useQueryClient();

  return useMutation<RepairResponse, Error, RepairArgs>({
    mutationFn: async ({ challengeId, dryRun = false }) => {
      const { data, error } = await supabase.functions.invoke('repair-malformed-sections', {
        body: { challenge_id: challengeId, dry_run: dryRun },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) {
        throw new Error(data?.error?.message ?? 'Repair failed');
      }
      logInfo('repair_malformed_sections.success', {
        operation: 'repair_malformed_sections',
        additionalData: {
          challengeId,
          detected: data.data?.summary?.detected ?? 0,
          regenerated: data.data?.summary?.regenerated ?? 0,
        },
      });
      return data.data as RepairResponse;
    },
    onSuccess: (_data, { challengeId }) => {
      qc.invalidateQueries({ queryKey: ['challenge', challengeId] });
      qc.invalidateQueries({ queryKey: ['challenges'] });
    },
    onError: (error) => {
      handleMutationError(error, {
        operation: 'repair_malformed_sections',
        component: 'useRepairMalformedSections',
      });
    },
  });
}
