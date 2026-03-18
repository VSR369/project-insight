/**
 * useAmendments — Data & mutation hooks for challenge amendments.
 *
 * Fetches amendment history and provides initiation mutation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_FREQUENT } from '@/config/queryCache';
import { toast } from 'sonner';
import { handleMutationError, logInfo } from '@/lib/errorHandler';

/* ─── Types ──────────────────────────────────────────────── */

export interface AmendmentRecord {
  id: string;
  amendmentNumber: number;
  status: string;
  scopeOfChange: string | null;
  reason: string | null;
  isMaterial: boolean;
  createdAt: string;
  versionBefore: number | null;
  versionAfter: number | null;
}

export interface InitiateAmendmentPayload {
  challengeId: string;
  challengeTitle: string;
  userId: string;
  scopes: string[];
  reason: string;
  isMaterial: boolean;
}

/* ─── Constants ──────────────────────────────────────────── */

const BATCH_SIZE = 50;

/* ─── Fetch Hook ─────────────────────────────────────────── */

export function useAmendmentHistory(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['amendments', challengeId],
    enabled: !!challengeId,
    queryFn: async (): Promise<AmendmentRecord[]> => {
      if (!challengeId) return [];

      const { data, error } = await supabase
        .from('amendment_records')
        .select('id, amendment_number, status, scope_of_change, reason, created_at, version_before, version_after')
        .eq('challenge_id', challengeId)
        .order('amendment_number', { ascending: true });

      if (error) throw new Error(error.message);

      return (data ?? []).map((a) => {
        let isMaterial = false;
        try {
          const parsed = typeof a.scope_of_change === 'string' ? JSON.parse(a.scope_of_change) : null;
          if (parsed?.is_material) isMaterial = true;
        } catch {
          // scope_of_change is plain text
        }

        return {
          id: a.id,
          amendmentNumber: a.amendment_number,
          status: a.status ?? 'INITIATED',
          scopeOfChange: a.scope_of_change,
          reason: a.reason,
          isMaterial,
          createdAt: a.created_at,
          versionBefore: a.version_before,
          versionAfter: a.version_after,
        };
      });
    },
    ...CACHE_FREQUENT,
  });
}

/* ─── Initiate Mutation ──────────────────────────────────── */

export function useInitiateAmendment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: InitiateAmendmentPayload): Promise<void> => {
      const { challengeId, challengeTitle, userId, scopes, reason, isMaterial } = payload;

      // 1. Get current max amendment_number
      const { data: existing } = await supabase
        .from('amendment_records')
        .select('amendment_number')
        .eq('challenge_id', challengeId)
        .order('amendment_number', { ascending: false })
        .limit(1);

      const nextNumber = (existing?.[0]?.amendment_number ?? 0) + 1;

      // 2. Get current version number
      const { data: versions } = await supabase
        .from('challenge_package_versions')
        .select('version_number')
        .eq('challenge_id', challengeId)
        .order('version_number', { ascending: false })
        .limit(1);

      const currentVersion = versions?.[0]?.version_number ?? 1;

      // 3. Build scope_of_change payload
      const scopePayload = JSON.stringify({
        areas: scopes,
        is_material: isMaterial,
      });

      // 4. Compute withdrawal deadline (7 days from now if material)
      const withdrawalDeadline = isMaterial
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // 5. Insert amendment_record
      const { error: insertErr } = await supabase.from('amendment_records').insert({
        challenge_id: challengeId,
        amendment_number: nextNumber,
        status: 'INITIATED',
        scope_of_change: scopePayload,
        reason,
        initiated_by: userId,
        version_before: currentVersion,
        withdrawal_deadline: withdrawalDeadline,
        created_by: userId,
      });

      if (insertErr) throw new Error(insertErr.message);

      // 5. Audit trail
      const { error: auditErr } = await supabase.from('audit_trail').insert({
        user_id: userId,
        challenge_id: challengeId,
        action: 'AMENDMENT_INITIATED',
        method: 'manual',
        details: {
          amendment_number: nextNumber,
          scopes,
          is_material: isMaterial,
          reason,
        } as any,
        created_by: userId,
      });

      if (auditErr) {
        logInfo(`Audit log failed for amendment initiation: ${auditErr.message}`, {
          operation: 'initiate_amendment_audit',
        });
      }

      // 6. Notify enrolled solvers if material change
      if (isMaterial) {
        const { data: submissions } = await supabase
          .from('challenge_submissions')
          .select('user_id')
          .eq('challenge_id', challengeId)
          .eq('is_deleted', false)
          .not('user_id', 'is', null);

        const solverIds = [...new Set((submissions ?? []).map((s) => s.user_id).filter(Boolean))] as string[];

        if (solverIds.length > 0) {
          const rows = solverIds.map((uid) => ({
            user_id: uid,
            notification_type: 'AMENDMENT_INITIATED',
            title: 'Challenge Amendment in Progress',
            message: `An amendment to "${challengeTitle}" has been initiated affecting: ${scopes.join(', ')}. This is a material change — you will have 7 days to withdraw without penalty once published.`,
            challenge_id: challengeId,
            is_read: false,
          }));

          for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            await supabase.from('cogni_notifications').insert(rows.slice(i, i + BATCH_SIZE));
          }
        }
      }
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['amendments', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['manage-challenge', variables.challengeId] });
      toast.success('Amendment initiated successfully');
    },

    onError: (error: Error) => {
      handleMutationError(error, { operation: 'initiate_amendment' });
    },
  });
}
