/**
 * CurationChecklistPanel — Right panel for Curation Review page.
 * Checklist items, modals, and action buttons extracted to sub-components.
 */

import ModificationPointsTracker from '@/components/cogniblend/ModificationPointsTracker';
import { useState, useMemo, useCallback } from "react";
import { resolveGovernanceMode, isControlledMode } from '@/lib/governanceMode';
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompletePhase } from "@/hooks/cogniblend/useCompletePhase";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, ChevronDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { unwrapArray, unwrapEvalCriteria, isJsonFilled, parseJson } from "@/lib/cogniblend/jsonbUnwrap";
import { cn } from "@/lib/utils";
import { ChecklistItemList } from "./ChecklistItemList";
import { ChecklistActionButtons } from "./ChecklistActionButtons";
import { IncompleteItemsModal, ReturnToCreatorModal } from "./ChecklistModals";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChecklistItem {
  id: number; label: string; autoChecked: boolean; manualOverride: boolean; locked: boolean;
}

interface EscrowData { escrow_status: string; }

interface CurationChecklistPanelProps {
  challengeId: string;
  challenge: {
    id: string; title: string; problem_statement: string | null; scope: string | null;
    deliverables: Json | null; evaluation_criteria: Json | null; reward_structure: Json | null;
    phase_schedule: Json | null; complexity_score: number | null; complexity_level: string | null;
    complexity_parameters: Json | null; ip_model: string | null; maturity_level: string | null;
    visibility: string | null; eligibility: string | null; description: string | null;
    operating_model: string | null; governance_profile: string | null;
    current_phase: number | null; phase_status: string | null;
  };
  legalDocs: Array<{ tier: string; total: number; attached: number }>;
  escrowRecord?: EscrowData | null;
  onEditModeToggle?: (editing: boolean) => void;
}

const LOCKED_ITEM_IDS = new Set([13]);

export default function CurationChecklistPanel({
  challengeId, challenge, legalDocs, escrowRecord, onEditModeToggle,
}: CurationChecklistPanelProps) {
  const [manualOverrides, setManualOverrides] = useState<Record<number, boolean>>({});
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const completePhase = useCompletePhase();

  const { data: modPoints = [] } = useQuery({
    queryKey: ['modification-points', 'challenge', challengeId],
    queryFn: async () => {
      const { data: amendments } = await supabase.from('amendment_records').select('id').eq('challenge_id', challengeId);
      if (!amendments?.length) return [];
      const { data } = await supabase.from('modification_points').select('severity, status').in('amendment_id', amendments.map((a) => a.id));
      return data ?? [];
    },
    enabled: !!challengeId, staleTime: 30_000,
  });
  const hasOutstandingRequired = modPoints.some((p: any) => p.severity === 'REQUIRED' && p.status === 'OUTSTANDING');

  const { data: amendmentCount = 0 } = useQuery({
    queryKey: ["curation-amendments", challengeId],
    queryFn: async () => {
      const { count, error } = await supabase.from("amendment_records").select("id", { count: "exact", head: true }).eq("challenge_id", challengeId);
      return error ? 0 : count ?? 0;
    },
    enabled: !!challengeId, staleTime: 60_000,
  });

  const { data: creatorUserId } = useQuery({
    queryKey: ["curation-creator", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_challenge_roles" as any).select("user_id").eq("challenge_id", challengeId).eq("role_code", "CR").eq("status", "ACTIVE").limit(1).maybeSingle();
      return error || !data ? null : (data as any).user_id as string;
    },
    enabled: !!challengeId, staleTime: 5 * 60_000,
  });

  const returnMutation = useMutation({
    mutationFn: async (reason: string) => {
      const newNum = amendmentCount + 1;
      const { error: amendError } = await supabase.from("amendment_records").insert({
        challenge_id: challengeId, amendment_number: newNum, reason, initiated_by: "curator", status: "INITIATED", created_by: user?.id ?? null,
      } as any);
      if (amendError) throw new Error(amendError.message);
      await supabase.rpc("log_audit", {
        p_user_id: user?.id ?? "", p_challenge_id: challengeId, p_solution_id: "", p_action: "CURATION_RETURNED", p_method: "UI",
        p_details: { reason, amendment_number: newNum, cycle: `${newNum} of 3` } as unknown as Json,
      });
      if (creatorUserId) {
        await supabase.from("cogni_notifications").insert({
          user_id: creatorUserId, challenge_id: challengeId, notification_type: "curation_returned",
          title: "Challenge returned for modification", message: `Challenge returned for modification. Reason: ${reason}. Cycle ${newNum} of 3.`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curation-amendments", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["curation-queue"] });
      toast.success("Challenge returned to creator for revision");
      setShowReturnModal(false); setReturnReason("");
    },
    onError: (error: Error) => toast.error(`Failed to return challenge: ${error.message}`),
  });

  // Computed checklist
  const tier1Docs = legalDocs.find((d) => d.tier.includes("Tier 1"));
  const tier2Docs = legalDocs.find((d) => d.tier.includes("Tier 2"));
  const evalCriteria = unwrapEvalCriteria(challenge.evaluation_criteria);
  const evalWeightSum = evalCriteria?.reduce((sum, c) => sum + (c.weight ?? 0), 0) ?? 0;

  const autoChecks: boolean[] = useMemo(() => [
    !!challenge.problem_statement?.trim(),
    !!challenge.scope?.trim(),
    (() => { const d = unwrapArray(challenge.deliverables, "items"); return !!d && d.length > 0; })(),
    evalWeightSum === 100,
    (() => {
      if (!isJsonFilled(challenge.reward_structure)) return false;
      const rs = parseJson<Record<string, unknown>>(challenge.reward_structure as any);
      const ms = rs?.payment_milestones;
      if (Array.isArray(ms) && ms.length > 0 && ms.reduce((s: number, m: any) => s + (m.pct ?? 0), 0) !== 100) return false;
      return true;
    })(),
    isJsonFilled(challenge.phase_schedule),
    !!challenge.description?.trim(),
    !!challenge.eligibility?.trim(),
    !!challenge.ip_model?.trim(),
    !!tier1Docs && tier1Docs.attached > 0 && tier1Docs.attached === tier1Docs.total,
    !!tier2Docs && tier2Docs.attached > 0 && tier2Docs.attached === tier2Docs.total,
    challenge.complexity_score != null || !!challenge.complexity_parameters,
    !!challenge.maturity_level,
    (() => { const del = parseJson<Record<string, unknown>>(challenge.deliverables); const a = del?.permitted_artifact_types; return Array.isArray(a) && a.length > 0; })(),
    isControlledMode(resolveGovernanceMode(challenge.governance_profile)) ? escrowRecord?.escrow_status === "FUNDED" : true,
  ], [challenge, legalDocs, evalWeightSum, tier1Docs, tier2Docs, escrowRecord]);

  const CHECKLIST_LABELS: string[] = [
    "Problem Statement present", "Scope defined", "Deliverables listed",
    "Evaluation criteria weights = 100%", "Reward structure valid", "Phase schedule defined",
    "Submission guidelines provided", "Eligibility configured", "IP model confirmed",
    "Tier 1 legal docs attached", "Tier 2 legal templates attached", "Complexity parameters entered",
    "Maturity level + legal match", "Artifact types configured",
    isControlledMode(resolveGovernanceMode(challenge.governance_profile)) ? "Escrow funding confirmed" : "Escrow funding (not required)",
  ];

  const checklistItems: ChecklistItem[] = useMemo(() =>
    CHECKLIST_LABELS.map((label, i) => ({
      id: i + 1, label, autoChecked: autoChecks[i], manualOverride: manualOverrides[i + 1] ?? false, locked: LOCKED_ITEM_IDS.has(i + 1),
    })), [autoChecks, manualOverrides]);

  const isChecked = useCallback((item: ChecklistItem) => item.autoChecked || item.manualOverride, []);
  const completedCount = checklistItems.filter(isChecked).length;
  const progressPct = Math.round((completedCount / 15) * 100);
  const allComplete = completedCount === 15;
  const uncheckedItems = checklistItems.filter((item) => !isChecked(item));
  const isFinalCycle = amendmentCount >= 3;
  const isLegalPending = challenge.phase_status === 'LEGAL_VERIFICATION_PENDING';

  const handleManualToggle = (id: number, checked: boolean) => {
    if (LOCKED_ITEM_IDS.has(id)) return;
    setManualOverrides((prev) => ({ ...prev, [id]: checked }));
  };

  const handleSubmitClick = () => {
    if (isLegalPending) { toast.error('Legal documents must be attached before curation can begin.'); return; }
    if (hasOutstandingRequired) { toast.error('All Required modification points must be Addressed or Waived before submitting.'); return; }
    if (!allComplete) { setShowIncompleteModal(true); return; }
    if (!user?.id) { toast.error("Authentication required"); return; }
    const summary = checklistItems.map((item) => ({ id: item.id, label: item.label, passed: isChecked(item), method: item.autoChecked ? "auto" : "manual" }));
    supabase.rpc("log_audit", {
      p_user_id: user.id, p_challenge_id: challengeId, p_solution_id: "", p_action: "CURATION_SUBMITTED",
      p_method: "UI", p_phase_from: 3, p_phase_to: 4,
      p_details: { checklist: summary, completed_count: completedCount, total_count: 15, amendment_cycle: amendmentCount } as unknown as Json,
    }).then(() => {
      completePhase.mutate({ challengeId, userId: user.id }, {
        onSuccess: () => { toast.success("Challenge approved and submitted for publication."); setTimeout(() => { queryClient.invalidateQueries({ queryKey: ["curation-queue"] }); navigate("/cogni/curation"); }, 1500); },
      });
    });
  };

  const handleEditToggle = () => { const next = !isEditing; setIsEditing(next); onEditModeToggle?.(next); };

  return (
    <>
      <Card className="sticky top-4">
        <CardHeader className="pb-3">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-base font-bold">15-Point Checklist</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-semibold", allComplete ? "text-green-600" : "text-muted-foreground")}>{completedCount}/15</span>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                </div>
              </div>
            </CollapsibleTrigger>
            <div className="mt-2"><Progress value={progressPct} className="h-2.5" /></div>
            <CollapsibleContent>
              <ChecklistItemList items={checklistItems} onManualToggle={handleManualToggle} />
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>

        <CardContent className="space-y-1 pt-0">
          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <p className="text-xs font-medium text-foreground">Modification Cycle: {Math.min(amendmentCount + 1, 3)} of 3</p>
            {isFinalCycle && (
              <div className="flex items-start gap-1.5 mt-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive font-medium">Final cycle. Challenge will be rejected if not resolved.</p>
              </div>
            )}
          </div>
          <ChecklistActionButtons
            onSubmitClick={handleSubmitClick} onReturnClick={() => setShowReturnModal(true)}
            onEditToggle={handleEditToggle} isEditing={isEditing}
            isSubmitting={completePhase.isPending} isLegalPending={isLegalPending}
            hasOutstandingRequired={hasOutstandingRequired}
          />
        </CardContent>
      </Card>

      <ModificationPointsTracker challengeId={challengeId} mode="curator" />

      <IncompleteItemsModal open={showIncompleteModal} onOpenChange={setShowIncompleteModal} uncheckedItems={uncheckedItems} />
      <ReturnToCreatorModal
        open={showReturnModal} onOpenChange={setShowReturnModal} isFinalCycle={isFinalCycle}
        returnReason={returnReason} onReasonChange={setReturnReason}
        onSubmit={() => { if (returnReason.trim().length >= 10) returnMutation.mutate(returnReason.trim()); }}
        isPending={returnMutation.isPending}
      />
    </>
  );
}
