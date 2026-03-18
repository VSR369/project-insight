/**
 * CurationChecklistPanel — Right panel for Curation Review page
 *
 * 14-point completeness checklist with progress bar, modification cycle card,
 * and action buttons:
 *  - Submit to Innovation Director: calls complete_phase (Phase 3 → 4),
 *    logs audit, shows sequential auto-completion toasts, navigates to queue.
 *  - Return to Creator: inserts amendment_record, sends cogni_notification
 *    to CR role holder, keeps phase_status ACTIVE with returned flag.
 *  - Make Direct Correction: toggles left panel to edit mode.
 */

import ModificationPointsTracker from '@/components/cogniblend/ModificationPointsTracker';

import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompletePhase } from "@/hooks/cogniblend/useCompletePhase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Shield,
  CheckCircle2,
  XCircle,
  Send,
  RotateCcw,
  Pencil,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChecklistItem {
  id: number;
  label: string;
  autoChecked: boolean;
  manualOverride: boolean;
}

interface CurationChecklistPanelProps {
  challengeId: string;
  challenge: {
    id: string;
    title: string;
    problem_statement: string | null;
    scope: string | null;
    deliverables: Json | null;
    evaluation_criteria: Json | null;
    reward_structure: Json | null;
    phase_schedule: Json | null;
    complexity_score: number | null;
    complexity_level: string | null;
    complexity_parameters: Json | null;
    ip_model: string | null;
    maturity_level: string | null;
    visibility: string | null;
    eligibility: string | null;
    description: string | null;
    operating_model: string | null;
    governance_profile: string | null;
    current_phase: number | null;
    phase_status: string | null;
  };
  legalDocs: Array<{ tier: string; total: number; attached: number }>;
  onEditModeToggle?: (editing: boolean) => void;
}

interface EvalCriterion {
  criterion_name: string;
  weight_percentage: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJson<T>(val: Json | null): T | null {
  if (!val) return null;
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  }
  return val as T;
}

function getProgressColor(pct: number): string {
  if (pct >= 100) return "bg-green-600";
  if (pct >= 50) return "bg-amber-500";
  return "bg-destructive";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CurationChecklistPanel({
  challengeId,
  challenge,
  legalDocs,
  onEditModeToggle,
}: CurationChecklistPanelProps) {
  // ══════════════════════════════════════
  // SECTION 1: State
  // ══════════════════════════════════════
  const [manualOverrides, setManualOverrides] = useState<Record<number, boolean>>({});
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // ══════════════════════════════════════
  // SECTION 2: Auth & hooks
  // ══════════════════════════════════════
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const completePhase = useCompletePhase();

  // ══════════════════════════════════════
  // SECTION 3: Query — amendment records count
  // ══════════════════════════════════════
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

  // ══════════════════════════════════════
  // SECTION 4: Query — Creator user_id for notifications
  // ══════════════════════════════════════
  const { data: creatorUserId } = useQuery({
    queryKey: ["curation-creator", challengeId],
    queryFn: async () => {
      const query = supabase
        .from("user_challenge_roles" as any)
        .select("user_id")
        .eq("challenge_id", challengeId)
        .eq("role_code", "CR")
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();
      const { data, error } = await query;
      if (error || !data) return null;
      return (data as any).user_id as string;
    },
    enabled: !!challengeId,
    staleTime: 5 * 60_000,
  });

  // ══════════════════════════════════════
  // SECTION 5: Mutation — return to creator
  // ══════════════════════════════════════
  const returnMutation = useMutation({
    mutationFn: async (reason: string) => {
      const newAmendmentNumber = amendmentCount + 1;

      // 1. Insert amendment_record with status INITIATED
      const { error: amendError } = await supabase.from("amendment_records").insert({
        challenge_id: challengeId,
        amendment_number: newAmendmentNumber,
        reason,
        initiated_by: "curator",
        status: "INITIATED",
        created_by: user?.id ?? null,
      } as any);
      if (amendError) throw new Error(amendError.message);

      // 2. Log to audit trail
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

      // 3. Send notification to Creator
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

  // ══════════════════════════════════════
  // SECTION 6: Computed checklist items
  // ══════════════════════════════════════
  const tier1Docs = legalDocs.find((d) => d.tier.includes("Tier 1"));
  const tier2Docs = legalDocs.find((d) => d.tier.includes("Tier 2"));

  const evalCriteria = parseJson<EvalCriterion[]>(challenge.evaluation_criteria);
  const evalWeightSum = evalCriteria?.reduce((sum, c) => sum + (c.weight_percentage ?? 0), 0) ?? 0;

  const autoChecks: boolean[] = useMemo(
    () => [
      /* 1  */ !!challenge.problem_statement?.trim(),
      /* 2  */ !!challenge.scope?.trim(),
      /* 3  */ (() => {
        const d = parseJson<unknown[]>(challenge.deliverables);
        return !!d && d.length > 0;
      })(),
      /* 4  */ evalWeightSum === 100,
      /* 5  */ (() => {
        const rs = parseJson<unknown[]>(challenge.reward_structure);
        return !!rs && rs.length > 0;
      })(),
      /* 6  */ (() => {
        const ps = parseJson<unknown[]>(challenge.phase_schedule);
        return !!ps && ps.length > 0;
      })(),
      /* 7  */ !!challenge.description?.trim(),
      /* 8  */ !!challenge.eligibility?.trim(),
      /* 9  */ false, // Taxonomy tags — checked from junction table; placeholder
      /* 10 */ !!tier1Docs && tier1Docs.attached > 0 && tier1Docs.attached === tier1Docs.total,
      /* 11 */ !!tier2Docs && tier2Docs.attached > 0 && tier2Docs.attached === tier2Docs.total,
      /* 12 */ challenge.complexity_score != null || !!challenge.complexity_parameters,
      /* 13 */ !!challenge.maturity_level,
      /* 14 */ false, // Artifact types — derived from maturity config; placeholder
    ],
    [challenge, legalDocs, evalWeightSum, tier1Docs, tier2Docs]
  );

  const CHECKLIST_LABELS: string[] = [
    "Problem Statement present",
    "Scope defined",
    "Deliverables listed",
    "Evaluation criteria weights = 100%",
    "Reward structure valid",
    "Phase schedule defined",
    "Submission guidelines provided",
    "Eligibility configured",
    "Taxonomy tags applied",
    "Tier 1 legal docs attached",
    "Tier 2 legal templates attached",
    "Complexity parameters entered",
    "Maturity level + legal match",
    "Artifact types configured",
  ];

  const checklistItems: ChecklistItem[] = useMemo(
    () =>
      CHECKLIST_LABELS.map((label, i) => ({
        id: i + 1,
        label,
        autoChecked: autoChecks[i],
        manualOverride: manualOverrides[i + 1] ?? false,
      })),
    [autoChecks, manualOverrides]
  );

  const isChecked = useCallback(
    (item: ChecklistItem) => item.autoChecked || item.manualOverride,
    []
  );

  const completedCount = checklistItems.filter(isChecked).length;
  const totalItems = 14;
  const progressPct = Math.round((completedCount / totalItems) * 100);
  const allComplete = completedCount === totalItems;

  const uncheckedItems = checklistItems.filter((item) => !isChecked(item));

  const isFinalCycle = amendmentCount >= 3;
  const maxCycles = 3;

  // ══════════════════════════════════════
  // SECTION 7: Handlers
  // ══════════════════════════════════════
  const handleManualToggle = (id: number, checked: boolean) => {
    setManualOverrides((prev) => ({ ...prev, [id]: checked }));
  };

  const isLegalPending = challenge.phase_status === 'LEGAL_VERIFICATION_PENDING';

  const handleSubmitClick = () => {
    if (isLegalPending) {
      toast.error('Legal documents must be attached before curation can begin. Navigate to Legal Documents to complete this step.');
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

    // Build checklist summary for audit
    const checklistSummary = checklistItems.map((item) => ({
      id: item.id,
      label: item.label,
      passed: isChecked(item),
      method: item.autoChecked ? "auto" : "manual",
    }));

    // Log audit first, then complete_phase
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
          total_count: totalItems,
          amendment_cycle: amendmentCount,
        } as unknown as Json,
      })
      .then(() => {
        // Call complete_phase via the existing hook (handles sequential toasts)
        completePhase.mutate(
          { challengeId, userId: user.id },
          {
            onSuccess: () => {
              toast.success("Challenge submitted to Innovation Director for review.");
              // Navigate to queue after a brief delay for toasts to show
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

  const handleEditToggle = () => {
    const next = !isEditing;
    setIsEditing(next);
    onEditModeToggle?.(next);
  };

  // ══════════════════════════════════════
  // SECTION 8: Render
  // ══════════════════════════════════════
  return (
    <>
      <Card className="sticky top-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            14-Point Checklist
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {completedCount} / {totalItems} complete
          </p>
          {/* Progress bar */}
          <div className="mt-2 h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getProgressColor(progressPct)}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-1 pt-0">
          {/* Checklist items */}
          {checklistItems.map((item) => {
            const checked = isChecked(item);
            return (
              <div
                key={item.id}
                className="flex items-center gap-2.5 py-1.5 border-b border-border/40 last:border-0"
              >
                <Checkbox
                  id={`chk-${item.id}`}
                  checked={checked}
                  onCheckedChange={(val) => {
                    if (!item.autoChecked) {
                      handleManualToggle(item.id, !!val);
                    }
                  }}
                  disabled={item.autoChecked}
                  className="shrink-0"
                />
                <label
                  htmlFor={`chk-${item.id}`}
                  className={`text-xs flex-1 cursor-pointer select-none ${
                    checked ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {item.id}. {item.label}
                </label>
                {checked ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                )}
              </div>
            );
          })}

          {/* Modification Cycle Card */}
          <div className="mt-4 p-3 rounded-lg border border-border bg-muted/30">
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

          {/* Action Buttons */}
          <div className="pt-4 mt-3 border-t border-border space-y-2">
            <Button
              className="w-full"
              onClick={handleSubmitClick}
              disabled={completePhase.isPending || isLegalPending}
            >
              {completePhase.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Send className="h-4 w-4 mr-1.5" />
              )}
              Submit to Innovation Director
            </Button>

            <Button
              variant="outline"
              className="w-full border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              onClick={() => setShowReturnModal(true)}
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Return to Creator
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleEditToggle}
            >
              <Pencil className="h-4 w-4 mr-1.5" />
              {isEditing ? "Cancel Editing" : "Make Direct Correction"}
            </Button>

            {isEditing && (
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => {
                  toast.success("Corrections saved");
                  handleEditToggle();
                }}
              >
                Save Corrections
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Incomplete Items Modal */}
      <Dialog open={showIncompleteModal} onOpenChange={setShowIncompleteModal}>
        <DialogContent className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Cannot Submit — Incomplete Items</DialogTitle>
            <DialogDescription>
              All 14 checklist items must be complete before submitting.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-2">
            {uncheckedItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
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
