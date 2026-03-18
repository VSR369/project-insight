/**
 * PaymentScheduleSection — Editable payment milestone table for curators.
 *
 * Displays below the 14-point checklist on the Curation Review page.
 * Milestones define when solvers receive portions of the total award.
 * Running total must equal 100%.
 * Persisted to challenges.reward_structure as { ...existing, payment_schedule: [...] }.
 */

import { useState, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Save, Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaymentMilestone {
  name: string;
  trigger: string;
  percentage: number;
}

interface PaymentScheduleSectionProps {
  challengeId: string;
  /** Current reward_structure JSONB from the challenge row */
  rewardStructure: Json | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRIGGER_OPTIONS = [
  { value: "on_shortlisting", label: "On Shortlisting" },
  { value: "on_full_submission", label: "On Full Submission" },
  { value: "on_evaluation_complete", label: "On Evaluation Complete" },
  { value: "on_selection", label: "On Selection" },
  { value: "on_ip_transfer", label: "On IP Transfer" },
] as const;

const DEFAULT_MILESTONES: PaymentMilestone[] = [
  { name: "Shortlisting Payment", trigger: "on_shortlisting", percentage: 20 },
  { name: "Selection Payment", trigger: "on_selection", percentage: 30 },
  { name: "IP Transfer Payment", trigger: "on_ip_transfer", percentage: 50 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseExistingSchedule(rs: Json | null): PaymentMilestone[] | null {
  if (!rs || typeof rs !== "object" || Array.isArray(rs)) return null;
  const obj = rs as Record<string, Json | undefined>;
  const schedule = obj.payment_schedule;
  if (!Array.isArray(schedule)) return null;
  return schedule as unknown as PaymentMilestone[];
}

function getTriggerLabel(value: string): string {
  return TRIGGER_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PaymentScheduleSection({
  challengeId,
  rewardStructure,
}: PaymentScheduleSectionProps) {
  // ══════════════════════════════════════
  // SECTION 1: State
  // ══════════════════════════════════════
  const existing = parseExistingSchedule(rewardStructure);
  const [milestones, setMilestones] = useState<PaymentMilestone[]>(
    existing ?? [...DEFAULT_MILESTONES]
  );

  // ══════════════════════════════════════
  // SECTION 2: Hooks
  // ══════════════════════════════════════
  const queryClient = useQueryClient();

  // ══════════════════════════════════════
  // SECTION 3: Computed
  // ══════════════════════════════════════
  const runningTotal = useMemo(
    () => milestones.reduce((sum, m) => sum + (m.percentage || 0), 0),
    [milestones]
  );
  const isValid = runningTotal === 100;

  // ══════════════════════════════════════
  // SECTION 4: Mutation — save schedule
  // ══════════════════════════════════════
  const saveMutation = useMutation({
    mutationFn: async (schedule: PaymentMilestone[]) => {
      // Merge payment_schedule into existing reward_structure JSONB
      const currentRs =
        rewardStructure && typeof rewardStructure === "object" && !Array.isArray(rewardStructure)
          ? (rewardStructure as Record<string, Json | undefined>)
          : {};

      // If reward_structure is an array (legacy tier list), wrap it
      const base = Array.isArray(rewardStructure)
        ? { tiers: rewardStructure }
        : currentRs;

      const merged = { ...base, payment_schedule: schedule };
      const withAudit = await withUpdatedBy({ reward_structure: merged as unknown as Json });

      const { error } = await supabase
        .from("challenges")
        .update(withAudit)
        .eq("id", challengeId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curation-review", challengeId] });
      toast.success("Payment schedule saved successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "save_payment_schedule" });
    },
  });

  // ══════════════════════════════════════
  // SECTION 5: Handlers
  // ══════════════════════════════════════
  const handleAdd = useCallback(() => {
    setMilestones((prev) => [
      ...prev,
      { name: "", trigger: "on_full_submission", percentage: 0 },
    ]);
  }, []);

  const handleRemove = useCallback((index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleChange = useCallback(
    (index: number, field: keyof PaymentMilestone, value: string | number) => {
      setMilestones((prev) =>
        prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
      );
    },
    []
  );

  const handleSave = () => {
    if (!isValid) {
      toast.error("Percentages must sum to exactly 100%");
      return;
    }
    const hasEmptyName = milestones.some((m) => !m.name.trim());
    if (hasEmptyName) {
      toast.error("All milestones must have a name");
      return;
    }
    saveMutation.mutate(milestones);
  };

  // ══════════════════════════════════════
  // SECTION 6: Render
  // ══════════════════════════════════════
  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Payment Schedule
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Define how the total award is distributed across milestones.
        </p>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Milestone Name</TableHead>
                <TableHead className="min-w-[160px]">Trigger</TableHead>
                <TableHead className="w-24 text-right">%</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {milestones.map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="py-1.5">
                    <Input
                      value={m.name}
                      onChange={(e) => handleChange(i, "name", e.target.value)}
                      placeholder="e.g. Shortlisting Payment"
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Select
                      value={m.trigger}
                      onValueChange={(val) => handleChange(i, "trigger", val)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGER_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={m.percentage}
                      onChange={(e) =>
                        handleChange(i, "percentage", Number(e.target.value) || 0)
                      }
                      className="h-8 text-sm text-right"
                    />
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRemove(i)}
                      disabled={milestones.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Running total */}
        <div
          className={`flex items-center justify-between px-2 py-2 rounded-md border ${
            isValid
              ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
              : "border-destructive/40 bg-destructive/5"
          }`}
        >
          <span className="text-xs font-medium text-foreground">Running Total</span>
          <span
            className={`text-sm font-bold ${
              isValid ? "text-green-700 dark:text-green-400" : "text-destructive"
            }`}
          >
            {runningTotal}%{" "}
            {!isValid && (
              <span className="text-xs font-normal">
                ({runningTotal < 100 ? `${100 - runningTotal}% remaining` : `${runningTotal - 100}% over`})
              </span>
            )}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Milestone
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isValid || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            Save Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
