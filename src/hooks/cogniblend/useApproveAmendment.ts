/**
 * useApproveAmendment — Approves a material amendment, sets withdrawal deadline,
 * creates new package version, and notifies solvers.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError, logInfo } from '@/lib/errorHandler';

/* ─── Types ──────────────────────────────────────────────── */

interface ApproveAmendmentPayload {
  amendmentId: string;
  challengeId: string;
  challengeTitle: string;
  userId: string;
}

/* ─── Constants ──────────────────────────────────────────── */

const WITHDRAWAL_WINDOW_DAYS = 7;
const REACCEPTANCE_WINDOW_DAYS = 7;
const BATCH_SIZE = 50;

/* ─── Hook ───────────────────────────────────────────────── */

export function useApproveAmendment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ApproveAmendmentPayload): Promise<void> => {
      const { amendmentId, challengeId, challengeTitle, userId } = payload;

      // 1. Fetch amendment details
      const { data: amendment, error: aErr } = await supabase
        .from('amendment_records')
        .select('amendment_number, scope_of_change, version_before')
        .eq('id', amendmentId)
        .single();

      if (aErr || !amendment) throw new Error(aErr?.message ?? 'Amendment not found');

      // Parse scope
      let isMaterial = false;
      let scopeAreas: string[] = [];
      try {
        const parsed = JSON.parse(amendment.scope_of_change ?? '{}');
        scopeAreas = parsed.areas ?? [];
        isMaterial = parsed.is_material === true;
      } catch { /* plain text */ }

      const nextVersion = (amendment.version_before ?? 1) + 1;
      const now = new Date().toISOString();

      // 2. Set withdrawal deadline if material
      const withdrawalDeadline = isMaterial
        ? new Date(Date.now() + WITHDRAWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // 3. Update amendment_records → APPROVED + withdrawal_deadline
      const { error: updateErr } = await supabase
        .from('amendment_records')
        .update({
          status: 'APPROVED',
          version_after: nextVersion,
          withdrawal_deadline: withdrawalDeadline,
          updated_at: now,
          updated_by: userId,
        } as any)
        .eq('id', amendmentId);

      if (updateErr) throw new Error(updateErr.message);

      // 4. Create new challenge_package_versions
      const { data: challenge } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      const { data: legalDocs } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_type, tier, status, template_version, document_name')
        .eq('challenge_id', challengeId);

      const snapshot = {
        challenge,
        legal_docs: legalDocs ?? [],
        published_at: now,
        published_by: userId,
        amendment_number: amendment.amendment_number,
      };

      const { error: versionErr } = await supabase
        .from('challenge_package_versions')
        .insert({
          challenge_id: challengeId,
          version_number: nextVersion,
          snapshot: snapshot as any,
          created_by: userId,
        });

      if (versionErr) throw new Error(versionErr.message);

      // 5. Audit trail
      await supabase.from('audit_trail').insert({
        user_id: userId,
        challenge_id: challengeId,
        action: 'AMENDMENT_APPROVED',
        method: 'manual',
        details: {
          amendment_id: amendmentId,
          amendment_number: amendment.amendment_number,
          new_version: nextVersion,
          is_material: isMaterial,
          withdrawal_deadline: withdrawalDeadline,
        } as any,
        created_by: userId,
      });

      // 6. Notify all enrolled solvers
      const { data: submissions } = await supabase
        .from('challenge_submissions')
        .select('user_id')
        .eq('challenge_id', challengeId)
        .eq('is_deleted', false)
        .not('user_id', 'is', null);

      const solverIds = [...new Set((submissions ?? []).map((s) => s.user_id).filter(Boolean))] as string[];

      if (solverIds.length > 0) {
        const withdrawalNote = isMaterial
          ? ' You have 7 days to withdraw without penalty.'
          : '';
        const legalNote = scopeAreas.includes('Legal Terms')
          ? ' Legal terms have been updated — re-acceptance required.'
          : '';

        const rows = solverIds.map((uid) => ({
          user_id: uid,
          notification_type: 'AMENDMENT_PUBLISHED',
          title: 'Challenge Updated',
          message: `"${challengeTitle}" has been updated (v${nextVersion}.0). Changes: ${scopeAreas.join(', ')}.${withdrawalNote}${legalNote}`,
          challenge_id: challengeId,
          is_read: false,
        }));

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          await supabase.from('cogni_notifications').insert(rows.slice(i, i + BATCH_SIZE));
        }
      }

      logInfo(
        `Amendment #${amendment.amendment_number} approved. Version ${nextVersion}. Material: ${isMaterial}`,
        { operation: 'approve_amendment', component: 'useApproveAmendment' },
      );
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['amendments', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['manage-challenge', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['solver-amendment-status', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['cogni-open-challenges'] });
      toast.success('Amendment approved and published');
    },

    onError: (error: Error) => {
      handleMutationError(error, { operation: 'approve_amendment' });
    },
  });
}
