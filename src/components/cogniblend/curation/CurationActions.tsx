/**
 * CurationActions — Right rail actions for curation review page.
 * Contains Submit, Return, Hold buttons + return modal + modification cycle.
 */

import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompletePhase } from "@/hooks/cogniblend/useCompletePhase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Send,
  RotateCcw,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

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
}

export default function CurationActions({
  challengeId,
  phaseStatus,
  allComplete,
  checklistSummary,
  completedCount,
  totalCount,
  operatingModel,
  readOnly = false,
  legalEscrowBlocked = false,
}: CurationActionsProps) {
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState("");

  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const completePhase = useCompletePhase();

  const { data: modPoints = [] } = useQuery({
    queryKey: ['modification-points', 'challenge', challengeId],
    queryFn: async () => {
      const { data: amendments } = await supabase
        .from('amendment_records')
        .select('id')
        .eq('challenge_id', challengeId);
      if (!amendments?.length) return [];
      const { data } = await supabase
        .from('modification_points')
        .select('severity, status')
        .in('amendment_id', amendments.map((a) => a.id));
      return data ?? [];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });
  const hasOutstandingRequired = modPoints.some(
    (p: any) => p.severity === 'REQUIRED' && p.status === 'OUTSTANDING',
  );

  const { data: amendmentCount = 0 } = useQuery({
    queryKey: ["curation-amendments", challengeId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("amendment_records")
        .select("id", { count: "exact", head: true })
        .eq("challenge_id", challengeId);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!challengeId,
    staleTime: 60_000,
  });

  const { data: creatorUserId } = useQuery({
    queryKey: ["curation-creator", challengeId],
    queryFn: async () => {
      const query = supabase
        .from("user_challenge_roles" as any)
        .select("user_id")
        .eq("challenge_id", challengeId)
        .in("role_code", ["CR", "CA"])
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      const { data, error } = await query;
      if (error || !data) return null;
      return (data as any).user_id as string;
    },
    enabled: !!challengeId,
    staleTime: 5 * 60_000,
  });

  const returnMutation = useMutation({
    mutationFn: async (reason: string) => {
      const newAmendmentNumber = amendmentCount + 1;
      const { error: amendError } = await supabase.from("amendment_records").insert({
        challenge_id: challengeId,
        amendment_number: newAmendmentNumber,
        reason,
        initiated_by: "curator",
        status: "INITIATED",
        created_by: user?.id ?? null,
      } as any);
      if (amendError) throw new Error(amendError.message);

      await supabase.rpc("log_audit", {
        p_user_id: user?.id ?? "",
        p_challenge_id: challengeId,
        p_solution_id: "",
        p_action: "CURATION_RETURNED",
        p_method: "UI",
        p_details: {
          reason,
          amendment_number: newAmendmentNumber,
          cycle: `${newAmendmentNumber} of 3`,
        } as unknown as Json,
      });

      if (creatorUserId) {
        await supabase.from("cogni_notifications").insert({
          user_id: creatorUserId,
          challenge_id: challengeId,
          notification_type: "curation_returned",
          title: "Challenge returned for modification",
          message: `Challenge returned for modification. Reason: ${reason}. Cycle ${newAmendmentNumber} of 3.`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curation-amendments", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["curation-queue"] });
      toast.success("Challenge returned to creator for revision");
      setShowReturnModal(false);
      setReturnReason("");
    },
    onError: (error: Error) => {
      toast.error(`Failed to return challenge: ${error.message}`);
    },
  });

  const isLegalPending = phaseStatus === 'LEGAL_VERIFICATION_PENDING';
  const isAmDeclined = phaseStatus === 'AM_DECLINED';
  const isFinalCycle = amendmentCount >= 3;
  const maxCycles = 3;
  const isMP = operatingModel === 'MP';

  /* ── Fetch AM decline reason (latest) ───────────────── */
  const { data: amDeclineReason } = useQuery({
    queryKey: ['am-decline-reason', challengeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('amendment_records')
        .select('reason, created_at, amendment_number')
        .eq('challenge_id', challengeId)
        .eq('scope_of_change', 'AM_DECLINED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!challengeId && isAmDeclined,
    staleTime: 30_000,
  });

  // Check if AM opted into pre-publish approval
  const { data: extendedBrief } = useQuery({
    queryKey: ['challenge-extended-brief', challengeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('challenges')
        .select('extended_brief')
        .eq('id', challengeId)
        .single();
      return (data?.extended_brief as any) ?? {};
    },
    enabled: !!challengeId,
    staleTime: 5 * 60_000,
  });
  const amApprovalRequired = isMP && (extendedBrief?.am_approval_required !== false);

  // For MP: update phase_status to AM_APPROVAL_PENDING instead of advancing phase
  const amApprovalMutation = useMutation({
    mutationFn: async () => {
      // Set phase_status to AM_APPROVAL_PENDING
      const { error: updateError } = await supabase
        .from('challenges')
        .update({ phase_status: 'AM_APPROVAL_PENDING' } as any)
        .eq('id', challengeId);
      if (updateError) throw new Error(updateError.message);

      // Find the AM user for notification
      const { data: amRole } = await supabase
        .from('user_challenge_roles')
        .select('user_id')
        .eq('challenge_id', challengeId)
        .eq('role_code', 'AM')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const amUserId = (amRole as any)?.user_id;
      if (amUserId) {
        await supabase.from('cogni_notifications').insert({
          user_id: amUserId,
          challenge_id: challengeId,
          notification_type: 'am_approval_requested',
          title: 'Challenge ready for your approval',
          message: 'The Curator has completed the challenge review. Please review and approve before it goes to the Innovation Director.',
        });
      }

      // Audit
      await supabase.rpc("log_audit", {
        p_user_id: user?.id ?? "",
        p_challenge_id: challengeId,
        p_solution_id: "",
        p_action: "CURATION_SENT_TO_AM",
        p_method: "UI",
        p_phase_from: 3,
        p_phase_to: 3,
        p_details: {
          checklist: checklistSummary,
          completed_count: completedCount,
          total_count: totalCount,
          amendment_cycle: amendmentCount,
          target: 'AM_APPROVAL',
        } as unknown as Json,
      });
    },
    onSuccess: () => {
      toast.success("Challenge sent to Account Manager for approval.");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["curation-queue"] });
        navigate("/cogni/curation");
      }, 1500);
    },
    onError: (error: Error) => {
      toast.error(`Failed to send for approval: ${error.message}`);
    },
  });

  const handleSubmitClick = () => {
    if (isLegalPending) {
      toast.error('Legal documents must be attached before curation can begin.');
      return;
    }
    if (hasOutstandingRequired) {
      toast.error('All Required modification points must be Addressed or Waived before submitting.');
      return;
    }
    if (!allComplete) {
      setShowIncompleteModal(true);
      return;
    }
    if (!user?.id) {
      toast.error("Authentication required");
      return;
    }

    // AM declined → resubmit, or MP model with AM approval required → route to AM
    if (isAmDeclined || amApprovalRequired) {
      amApprovalMutation.mutate();
      return;
    }

    // AGG model: submit directly to Innovation Director
    supabase
      .rpc("log_audit", {
        p_user_id: user.id,
        p_challenge_id: challengeId,
        p_solution_id: "",
        p_action: "CURATION_SUBMITTED",
        p_method: "UI",
        p_phase_from: 3,
        p_phase_to: 4,
        p_details: {
          checklist: checklistSummary,
          completed_count: completedCount,
          total_count: totalCount,
          amendment_cycle: amendmentCount,
        } as unknown as Json,
      })
      .then(() => {
        completePhase.mutate(
          { challengeId, userId: user.id },
          {
            onSuccess: () => {
              toast.success("Challenge submitted to Innovation Director for review.");
              setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ["curation-queue"] });
                navigate("/cogni/curation");
              }, 1500);
            },
          }
        );
      });
  };

  const handleReturnSubmit = () => {
    if (returnReason.trim().length < 10) return;
    returnMutation.mutate(returnReason.trim());
  };

  const uncheckedItems = checklistSummary.filter((item) => !item.passed);

  return (
    <>
      {readOnly && (
        <div className="p-3 rounded-lg border border-border bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground font-medium">View-only mode — this challenge is not yet in the curation phase.</p>
        </div>
      )}

      {/* Legal/Escrow blocking notice (non-read-only curators only) */}
      {!readOnly && legalEscrowBlocked && (
        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-900/20 text-center">
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
            Legal Documents and Escrow & Funding must both be accepted before submitting.
          </p>
        </div>
      )}

      {/* Modification Cycle */}
      <div className="p-3 rounded-lg border border-border bg-muted/30">
        <p className="text-xs font-medium text-foreground">
          Modification Cycle: {Math.min(amendmentCount + 1, maxCycles)} of {maxCycles}
        </p>
        {isFinalCycle && (
          <div className="flex items-start gap-1.5 mt-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive font-medium">
              Final cycle. Challenge will be rejected if not resolved.
            </p>
          </div>
        )}
      </div>

      {/* AM Declined Alert */}
      {isAmDeclined && amDeclineReason && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-destructive">Declined by Account Manager</p>
              <p className="text-xs text-foreground mt-1">{amDeclineReason.reason}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Decline cycle {amDeclineReason.amendment_number} · {new Date(amDeclineReason.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons — always visible for Phase 3+ curators */}
      {!readOnly && (
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={handleSubmitClick}
            disabled={completePhase.isPending || amApprovalMutation.isPending || isLegalPending || hasOutstandingRequired || legalEscrowBlocked}
            title={legalEscrowBlocked ? "Legal Documents and Escrow & Funding must both be accepted before submitting" : undefined}
          >
            {(completePhase.isPending || amApprovalMutation.isPending) ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Send className="h-4 w-4 mr-1.5" />
            )}
            {isAmDeclined
              ? 'Resubmit to Account Manager'
              : amApprovalRequired
                ? 'Send to Account Manager for Approval'
                : 'Submit to Innovation Director'}
          </Button>

          <Button
            variant="outline"
            className="w-full border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            onClick={() => setShowReturnModal(true)}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Return to Creator
          </Button>
        </div>
      )}

      {/* Incomplete Items Modal */}
      <Dialog open={showIncompleteModal} onOpenChange={setShowIncompleteModal}>
        <DialogContent className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Cannot Submit — Incomplete Items</DialogTitle>
            <DialogDescription>
              All 15 checklist items must be complete before submitting.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-2">
            {uncheckedItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-sm text-foreground">
                  {item.id}. {item.label}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIncompleteModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return to Creator Modal */}
      <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
        <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Return to Creator</DialogTitle>
            <DialogDescription>
              Provide the reason for returning this challenge for revision.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-3">
            {isFinalCycle && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  This is the final modification cycle. The challenge will be rejected if not
                  resolved after this return.
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="return-reason">Reason for Return *</Label>
              <Textarea
                id="return-reason"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Describe what needs to be corrected (min 10 characters)..."
                className="mt-2"
                rows={5}
              />
              {returnReason.trim().length > 0 && returnReason.trim().length < 10 && (
                <p className="text-xs text-destructive mt-1">
                  Reason must be at least 10 characters.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReturnSubmit}
              disabled={returnReason.trim().length < 10 || returnMutation.isPending}
              className="border-amber-500 bg-amber-500 text-white hover:bg-amber-600"
            >
              {returnMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              )}
              Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
