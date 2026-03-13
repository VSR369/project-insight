/**
 * SCR-17: Availability Confirmation Modal (AGG)
 * BRD Ref: BR-AGG-001, MOD-05
 * Modal shown when an AGG role holder confirms their availability for a challenge.
 * Includes role summary, commitment acknowledgment, and confirmation.
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Shield, Loader2 } from "lucide-react";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { getRoleLabel as resolveRoleLabel } from "@/lib/roleUtils";

interface AggAvailabilityConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  roleCodes: string[];
  challengeTitle?: string;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
}

export function AggAvailabilityConfirmModal({
  open,
  onOpenChange,
  userName,
  roleCodes,
  challengeTitle,
  onConfirm,
  isSubmitting,
}: AggAvailabilityConfirmModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const { data: allRoles } = useSlmRoleCodes();

  const getRoleLabel = (code: string) => resolveRoleLabel(allRoles, code);

  const handleConfirm = async () => {
    await onConfirm();
    setAcknowledged(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Confirm Availability
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            <strong>{userName}</strong>, please confirm your availability for the following Aggregator role{roleCodes.length !== 1 ? "s" : ""}:
          </p>

          {challengeTitle && (
            <div className="bg-muted/30 rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Challenge</p>
              <p className="text-sm font-medium text-foreground">{challengeTitle}</p>
            </div>
          )}

          <div className="space-y-2">
            {roleCodes.map((code) => (
              <div key={code} className="flex items-center gap-2 p-2.5 rounded-md border bg-muted/20">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{getRoleLabel(code)}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{code}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 pt-2">
            <Checkbox
              id="ack-availability"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
            />
            <Label htmlFor="ack-availability" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
              I confirm my availability and commit to fulfilling the responsibilities of the assigned role{roleCodes.length !== 1 ? "s" : ""} for the duration of this challenge.
            </Label>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!acknowledged || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm Availability
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
