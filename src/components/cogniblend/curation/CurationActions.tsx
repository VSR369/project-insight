/**
 * CurationActions — Right rail actions for curation review page.
 * Data fetching delegated to useCurationActionData hook.
 */

import { useState, useCallback } from 'react';
import { IncompleteItemsModal, ReturnToCreatorModal } from './CurationActionModals';
import { useCurationActionData } from '@/hooks/cogniblend/useCurationActionData';
import { computeQualityScore } from '@/lib/cogniblend/computeQualityScore';
import { Button } from '@/components/ui/button';
import { Send, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface StaleSectionInfo { key: string; name: string; causes: string[]; staleAt: string; }
interface UnreviewedSectionInfo { key: string; name: string; }

interface CurationActionsProps {
  challengeId: string;
  phaseStatus: string | null;
  allComplete: boolean;
  checklistSummary: Array<{ id: number; label: string; passed: boolean; method: string }>;
  completedCount: number;
  totalCount: number;
  operatingModel?: string | null;
  readOnly?: boolean;
  legalEscrowBlocked?: boolean;
  blockingReason?: string;
  staleSections?: StaleSectionInfo[];
  unreviewedSections?: UnreviewedSectionInfo[];
  onNavigateToStale?: () => void;
  onReReviewStale?: () => void;
  /** Curation lock status: OPEN | FROZEN */
  lockStatus?: string;
  /** Governance mode: QUICK | STRUCTURED | CONTROLLED */
  governanceMode?: string;
  /** Called when curator freezes for legal review (STRUCTURED/CONTROLLED) */
  onFreezeForLegal?: () => void;
}

export default function CurationActions({
  challengeId, phaseStatus, allComplete, checklistSummary, completedCount, totalCount,
  operatingModel, readOnly = false, legalEscrowBlocked = false, blockingReason,
  staleSections = [], unreviewedSections = [], onNavigateToStale, onReReviewStale,
  lockStatus = 'OPEN', governanceMode = 'QUICK', onFreezeForLegal,
}: CurationActionsProps) {
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  const {
    user, navigate, completePhase, hasOutstandingRequired, amendmentCount,
    returnMutation, amDeclineReason, crApprovalRequired, crApprovalMutation,
  } = useCurationActionData({ challengeId, checklistSummary, completedCount, totalCount, operatingModel, governanceMode });

  const isAmDeclined = phaseStatus === 'AM_DECLINED';
  const isFinalCycle = amendmentCount >= 3;
  const maxCycles = 3;

  const handleSubmitClick = useCallback(() => {
    if (staleSections.length > 0) {
      toast.error(`${staleSections.length} section(s) are stale and need re-review before submitting.`);
      return;
    }
    if (legalEscrowBlocked) {
      toast.error(blockingReason || 'Legal Documents and Escrow & Funding must be accepted before submitting.');
      return;
    }
    if (hasOutstandingRequired) {
      toast.error('All Required modification points must be Addressed or Waived before submitting.');
      return;
    }
    if (!allComplete) { setShowIncompleteModal(true); return; }
    if (!user?.id) { toast.error('Authentication required'); return; }

    if (isAmDeclined || crApprovalRequired) {
      crApprovalMutation.mutate();
      return;
    }

    const auditDetails = {
      checklist: checklistSummary,
      completed_count: completedCount,
      total_count: totalCount,
      amendment_cycle: amendmentCount,
    } as unknown as Json;

    completePhase.mutate(
      { challengeId, userId: user.id },
      {
        onSuccess: async () => {
          toast.success('Challenge approved and submitted for compliance review.');
          try { computeQualityScore([]); } catch { /* non-critical */ }

          // For CONTROLLED: auto-assign LC and FC from pool after curation approval
          try {
            const { autoAssignChallengeRole } = await import('@/hooks/cogniblend/useAutoAssignChallengeRoles');
            const { supabase: sb } = await import('@/integrations/supabase/client');
            const { data: challenge } = await sb
              .from('challenges')
              .select('governance_mode_override, governance_profile')
              .eq('id', challengeId)
              .single();
            const govMode = (challenge?.governance_mode_override ?? challenge?.governance_profile ?? 'STRUCTURED').toUpperCase();
            if (govMode === 'CONTROLLED') {
              await autoAssignChallengeRole({ challengeId, roleCode: 'LC', assignedBy: user.id });
              await autoAssignChallengeRole({ challengeId, roleCode: 'FC', assignedBy: user.id });
            }
          } catch (assignErr) {
            const { logWarning } = await import('@/lib/errorHandler');
            logWarning('LC/FC auto-assign after curation failed', {
              operation: 'auto_assign_lc_fc_controlled',
              additionalData: { challengeId, error: String(assignErr) },
            });
          }

          setTimeout(() => { navigate('/cogni/curation'); }, 1500);
        },
      },
    );
  }, [staleSections, legalEscrowBlocked, blockingReason, hasOutstandingRequired, allComplete, user, isAmDeclined, crApprovalRequired, crApprovalMutation, challengeId, checklistSummary, completedCount, totalCount, amendmentCount, completePhase, navigate]);

  const handleReturnSubmit = useCallback(() => {
    if (returnReason.trim().length < 10) return;
    returnMutation.mutate(returnReason.trim());
    setShowReturnModal(false);
    setReturnReason('');
  }, [returnReason, returnMutation]);

  const uncheckedItems = checklistSummary.filter((item) => !item.passed);

  return (
    <>
      {readOnly && (
        <div className="p-3 rounded-lg border border-border bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground font-medium">Preview mode — editing and submission disabled. AI review is available.</p>
        </div>
      )}

      {!readOnly && legalEscrowBlocked && (
        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-900/20 text-center">
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
            {blockingReason || 'Legal Documents and Escrow & Funding must be accepted before submitting.'}
          </p>
        </div>
      )}

      <div className="p-3 rounded-lg border border-border bg-muted/30">
        <p className="text-xs font-medium text-foreground">
          Modification Cycle: {Math.min(amendmentCount + 1, maxCycles)} of {maxCycles}
        </p>
        {isFinalCycle && (
          <div className="flex items-start gap-1.5 mt-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive font-medium">Final cycle. Challenge will be rejected if not resolved.</p>
          </div>
        )}
      </div>

      {isAmDeclined && amDeclineReason && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-destructive">Declined by Challenge Creator</p>
              <p className="text-xs text-foreground mt-1">{amDeclineReason.reason}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Decline cycle {amDeclineReason.amendment_number} · {new Date(amDeclineReason.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      )}

      {!readOnly && staleSections.length > 0 && (
        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-900/20 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Submission blocked — {staleSections.length} section{staleSections.length !== 1 ? 's' : ''} need{staleSections.length === 1 ? 's' : ''} re-review
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Stale: {staleSections.map(s => s.name).join(', ')}
              </p>
              {unreviewedSections.length > 0 && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Unreviewed: {unreviewedSections.map(s => s.name).join(', ')}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-6">
            {onReReviewStale && (
              <Button variant="outline" size="sm" className="h-7 text-xs border-amber-400 text-amber-700 hover:bg-amber-100" onClick={onReReviewStale}>
                Re-review {staleSections.length} stale section{staleSections.length !== 1 ? 's' : ''}
              </Button>
            )}
            {onNavigateToStale && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-700" onClick={onNavigateToStale}>View stale sections</Button>
            )}
          </div>
        </div>
      )}

      {!readOnly && lockStatus === 'FROZEN' && (
        <div className="p-3 rounded-lg border border-blue-400/30 bg-blue-50 dark:bg-blue-900/20 text-center space-y-2">
          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
            Content Frozen — Awaiting Legal Review
          </p>
          {onFreezeForLegal && (
            <Button
              variant="outline"
              size="sm"
              className="text-amber-600 border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              onClick={() => {
                if (confirm('This will reset legal approval. You must re-review legal documents. Continue?')) {
                  onFreezeForLegal();
                }
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Unlock for Re-curation
            </Button>
          )}
        </div>
      )}

      {!readOnly && lockStatus !== 'FROZEN' && (
        <div className="space-y-2">
          {governanceMode !== 'QUICK' && onFreezeForLegal ? (
            <Button className="w-full" onClick={onFreezeForLegal}
              disabled={completePhase.isPending || crApprovalMutation.isPending || hasOutstandingRequired || legalEscrowBlocked || staleSections.length > 0}
              title={staleSections.length > 0 ? `${staleSections.length} stale section(s) need re-review` : legalEscrowBlocked ? (blockingReason || 'Legal Documents and Escrow & Funding must be accepted before submitting') : undefined}
            >
              {(completePhase.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
              Complete Curation & Send to Legal
            </Button>
          ) : (
            <Button className="w-full" onClick={handleSubmitClick}
              disabled={completePhase.isPending || crApprovalMutation.isPending || hasOutstandingRequired || legalEscrowBlocked || staleSections.length > 0}
              title={staleSections.length > 0 ? `${staleSections.length} stale section(s) need re-review` : legalEscrowBlocked ? (blockingReason || 'Legal Documents and Escrow & Funding must be accepted before submitting') : undefined}
            >
              {(completePhase.isPending || crApprovalMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
              {isAmDeclined ? 'Resubmit to Challenge Creator' : crApprovalRequired ? 'Send to Creator for Approval' : 'Approve & Submit for Publication'}
            </Button>
          )}
          <Button variant="outline" className="w-full border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" onClick={() => setShowReturnModal(true)} disabled={lockStatus === 'FROZEN'}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Return to Creator
          </Button>
        </div>
      )}

      <IncompleteItemsModal open={showIncompleteModal} onOpenChange={setShowIncompleteModal} uncheckedItems={uncheckedItems} />
      <ReturnToCreatorModal open={showReturnModal} onOpenChange={setShowReturnModal} returnReason={returnReason} onReturnReasonChange={setReturnReason} onSubmit={handleReturnSubmit} isPending={returnMutation.isPending} isFinalCycle={isFinalCycle} />
    </>
  );
}
