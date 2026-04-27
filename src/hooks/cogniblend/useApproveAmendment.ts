/**
 * useApproveAmendment — Approves a material amendment, sets withdrawal deadline,
 * creates new package version, and notifies solvers.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError, logInfo } from '@/lib/errorHandler';
import {
  normalizeScopes,
  resolveAmendmentRoutingEvents,
  shouldRequireSolverReacceptance,
  isMaterialAmendment,
} from '@/services/legal/amendmentScopeService';
import { bindAmendmentToNewTemplateVersions } from '@/services/legal/amendmentVersionBinding';
import { sendRoutedNotification } from '@/services/notificationRoutingService';

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

      // Parse scope and normalize to canonical buckets
      let rawAreas: string[] = [];
      try {
        const parsed = JSON.parse(amendment.scope_of_change ?? '{}');
        rawAreas = Array.isArray(parsed.areas) ? parsed.areas : [];
      } catch { /* plain text scope */ }
      const canonicalScopes = normalizeScopes(rawAreas);
      const isMaterial = isMaterialAmendment(canonicalScopes);
      const requiresSolverReaccept = shouldRequireSolverReacceptance(canonicalScopes);

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
        .select('id, title, description, status, current_phase, phase_status, organization_id, tenant_id, governance_profile, governance_mode_override, reward_structure, evaluation_method, evaluator_count, solver_audience, submission_deadline, ip_model, operating_model, total_fee, currency_code, complexity_level, complexity_score, scope, eligibility, solution_type, max_solutions, challenge_visibility, visibility, created_at, updated_at')
        .eq('id', challengeId)
        .single();

      const { data: legalDocs } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_type, tier, status, template_version, document_name')
        .eq('challenge_id', challengeId);

      // 4a. Resolve LC/FC/CU user IDs to bind the new template version against.
      const { data: roleRows } = await supabase
        .from('user_challenge_roles')
        .select('user_id, role_code')
        .eq('challenge_id', challengeId)
        .eq('is_active', true)
        .in('role_code', ['CU', 'LC', 'FC']);

      const signatoryUserIds = {
        curatorId: roleRows?.find((r) => r.role_code === 'CU')?.user_id ?? null,
        lcId: roleRows?.find((r) => r.role_code === 'LC')?.user_id ?? null,
        fcId: roleRows?.find((r) => r.role_code === 'FC')?.user_id ?? null,
      };

      // 4b. Bind new CPA template version to in-scope docs + write version-pinned ledger rows.
      // Failure is fatal: we cannot publish a new package version with stale legal versions.
      const binding = await bindAmendmentToNewTemplateVersions({
        challengeId,
        organizationId: challenge?.organization_id ?? null,
        canonicalScopes,
        newPackageVersion: nextVersion,
        approvedBy: userId,
        signatoryUserIds,
      });

      const snapshot = {
        challenge,
        legal_docs: binding.snapshotLegalDocs.length > 0 ? binding.snapshotLegalDocs : (legalDocs ?? []),
        published_at: now,
        published_by: userId,
        amendment_number: amendment.amendment_number,
        version_binding: {
          docs_bumped: binding.docsBumped,
          ledger_rows_written: binding.ledgerRowsWritten,
        },
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
        const legalNote = requiresSolverReaccept
          ? ' Re-acceptance required to keep your enrollment active.'
          : '';
        const scopeLabel = canonicalScopes.length > 0 ? canonicalScopes.join(', ') : 'minor updates';

        const rows = solverIds.map((uid) => ({
          user_id: uid,
          notification_type: 'AMENDMENT_PUBLISHED',
          title: 'Challenge Updated',
          message: `"${challengeTitle}" has been updated (v${nextVersion}.0). Changes: ${scopeLabel}.${withdrawalNote}${legalNote}`,
          challenge_id: challengeId,
          is_read: false,
        }));

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          await supabase.from('cogni_notifications').insert(rows.slice(i, i + BATCH_SIZE));
        }
      }

      // 7. Create solver re-acceptance records when LEGAL or SCOPE_CHANGE in scope
      if (requiresSolverReaccept && solverIds.length > 0) {
        const reacceptDeadline = new Date(
          Date.now() + REACCEPTANCE_WINDOW_DAYS * 24 * 60 * 60 * 1000
        ).toISOString();

        const reacceptRows = solverIds.map((uid) => ({
          challenge_id: challengeId,
          amendment_id: amendmentId,
          user_id: uid,
          status: 'pending',
          deadline_at: reacceptDeadline,
          created_by: userId,
        }));

        for (let i = 0; i < reacceptRows.length; i += BATCH_SIZE) {
          await supabase
            .from('legal_reacceptance_records')
            .insert(reacceptRows.slice(i, i + BATCH_SIZE));
        }

        logInfo(
          `Created ${solverIds.length} solver re-acceptance records with ${REACCEPTANCE_WINDOW_DAYS}-day deadline`,
          { operation: 'approve_amendment', component: 'useApproveAmendment' },
        );
      }

      // 8. Fan out routed notifications to LC / FC / CU per scope matrix
      const routedEvents = resolveAmendmentRoutingEvents(canonicalScopes);
      const challengeMessage = `"${challengeTitle}" amendment v${nextVersion}.0 approved. Scopes: ${
        canonicalScopes.join(', ') || 'none'
      }.`;
      await Promise.all(
        routedEvents.map((eventType) =>
          sendRoutedNotification({
            challengeId,
            phase: 99,
            eventType,
            title: 'Amendment Approved',
            message: challengeMessage,
          }),
        ),
      );
      if (requiresSolverReaccept && solverIds.length > 0) {
        await sendRoutedNotification({
          challengeId,
          phase: 99,
          eventType: 'AMENDMENT_REACCEPT_REQUIRED',
          title: 'Solver Re-acceptance Required',
          message: `${solverIds.length} solver(s) must re-accept the amended package for "${challengeTitle}".`,
        });
      }

      logInfo(
        `Amendment #${amendment.amendment_number} approved. Version ${nextVersion}. Material: ${isMaterial}. Scopes: ${canonicalScopes.join(',')}. Routed events: ${routedEvents.join(',')}.`,
        { operation: 'approve_amendment', component: 'useApproveAmendment' },
      );
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['amendments', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['manage-challenge', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['solver-amendment-status', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['legal-reacceptance'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-open-challenges'] });
      toast.success('Amendment approved and published');
    },

    onError: (error: Error) => {
      handleMutationError(error, { operation: 'approve_amendment' });
    },
  });
}
