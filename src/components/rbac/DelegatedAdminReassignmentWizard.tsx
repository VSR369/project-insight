/**
 * SCR-15a: Reassignment Wizard — 3-step modal for orphan role reassignment
 * BRD Ref: BR-RL-010, MOD-03
 * Steps: 1) Review orphan roles → 2) Select target admin → 3) Confirm
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle, CheckCircle2, Users, ArrowRight } from "lucide-react";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { getRoleLabel as resolveRoleLabel } from "@/lib/roleUtils";
import type { RoleAssignment } from "@/hooks/queries/useRoleAssignments";

interface ReassignmentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orphanRoles: RoleAssignment[];
  orgId: string;
  deactivatingAdminName: string;
  /** Available admins to reassign to */
  availableAdmins: { id: string; name: string; email: string }[];
  onConfirm: (reassignments: { roleAssignmentId: string; targetAdminEmail: string }[]) => Promise<void>;
  isSubmitting?: boolean;
}

type Step = 1 | 2 | 3;

export function ReassignmentWizard({
  open,
  onOpenChange,
  orphanRoles,
  orgId,
  deactivatingAdminName,
  availableAdmins,
  onConfirm,
  isSubmitting,
}: ReassignmentWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const { data: roleCodes } = useSlmRoleCodes();

  const getRoleLabel = (code: string) => resolveRoleLabel(roleCodes, code);

  const allAssigned = orphanRoles.every((r) => assignments[r.id]);

  const handleConfirm = async () => {
    const reassignments = orphanRoles.map((r) => ({
      roleAssignmentId: r.id,
      targetAdminEmail: assignments[r.id],
    }));
    await onConfirm(reassignments);
    onOpenChange(false);
  };

  const stepLabels = ["Review Orphan Roles", "Assign Targets", "Confirm"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Reassignment Wizard</DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step > i + 1
                      ? "bg-primary text-primary-foreground"
                      : step === i + 1
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > i + 1 ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`text-xs ${step === i + 1 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {label}
                </span>
                {i < 2 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
          {/* Step 1: Review orphan roles */}
          {step === 1 && (
            <>
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-md px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Deactivating <strong>{deactivatingAdminName}</strong> will orphan {orphanRoles.length} role
                  assignment{orphanRoles.length !== 1 ? "s" : ""}. You must reassign them before proceeding.
                </p>
              </div>

              <div className="space-y-2">
                {orphanRoles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">{getRoleLabel(role.role_code)}</p>
                      <p className="text-xs text-muted-foreground font-mono">{role.role_code}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {role.user_name ?? role.user_email}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Assign targets */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a target admin for each orphaned role assignment.
              </p>
              {orphanRoles.map((role) => (
                <div key={role.id} className="space-y-1.5">
                  <Label className="text-xs">
                    {getRoleLabel(role.role_code)} ({role.role_code})
                  </Label>
                  <Select
                    value={assignments[role.id] ?? ""}
                    onValueChange={(val) =>
                      setAssignments((prev) => ({ ...prev, [role.id]: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target admin" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAdmins.map((admin) => (
                        <SelectItem key={admin.id} value={admin.email}>
                          {admin.name} ({admin.email})
                        </SelectItem>
                      ))}
                      {!availableAdmins.length && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No available admins found.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review and confirm the following reassignments:
              </p>
              <div className="space-y-2">
                {orphanRoles.map((role) => {
                  const target = availableAdmins.find((a) => a.email === assignments[role.id]);
                  return (
                    <div key={role.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                      <div>
                        <p className="text-sm font-medium text-foreground">{getRoleLabel(role.role_code)}</p>
                        <p className="text-xs text-muted-foreground">
                          From: {role.user_name ?? role.user_email}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-primary">→ {target?.name ?? assignments[role.id]}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-4 flex gap-2">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={() => setStep((s) => (s - 1) as Step)}>
              Back
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => (s + 1) as Step)} disabled={step === 2 && !allAssigned}>
              Next
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Reassignment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
