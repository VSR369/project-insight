/**
 * ReassignmentModal — SCR-07 Reassignment
 * BRD Ref: BR-MP-ASSIGN-005, MOD-02 Tech Spec
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { reassignmentSchema, type ReassignmentValues } from "@/lib/validations/challengeAssignment";
import { useReassignMember, type ChallengeAssignmentRow } from "@/hooks/queries/useSolutionRequests";
import { usePoolMembers } from "@/hooks/queries/usePoolMembers";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";

interface ReassignmentModalProps {
  assignment: ChallengeAssignmentRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReassignmentModal({ assignment, open, onOpenChange }: ReassignmentModalProps) {
  const { data: poolMembers } = usePoolMembers({ role: assignment.role_code });
  const { data: roleCodes } = useSlmRoleCodes();
  const reassignMutation = useReassignMember();

  const form = useForm<ReassignmentValues>({
    resolver: zodResolver(reassignmentSchema),
    defaultValues: {
      assignment_id: assignment.id,
      role_code: assignment.role_code as ReassignmentValues["role_code"],
      new_pool_member_id: "",
      reason: "",
    },
  });

  const roleLabel = roleCodes?.find((r) => r.code === assignment.role_code)?.display_name ?? assignment.role_code;

  // Filter out the current assignee from candidates
  const candidates = (poolMembers ?? []).filter(
    (m) => m.id !== assignment.pool_member_id && m.availability_status !== "fully_booked"
  );

  const onSubmit = async (values: ReassignmentValues) => {
    await reassignMutation.mutateAsync({
      assignmentId: assignment.id,
      newPoolMemberId: values.new_pool_member_id,
      roleCode: assignment.role_code,
      challengeId: assignment.challenge_id,
      reason: values.reason,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Reassign Team Member</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
            {/* Current Assignee (read-only) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Current Assignee</Label>
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border">
                <span className="text-sm text-muted-foreground">{assignment.member_name}</span>
                <Badge variant="outline" className="text-xs">{roleLabel}</Badge>
              </div>
            </div>

            {/* New Member Select */}
            <div className="space-y-1.5">
              <Label htmlFor="new_member">Replacement Member *</Label>
              <Select
                value={form.watch("new_pool_member_id")}
                onValueChange={(val) => form.setValue("new_pool_member_id", val, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a pool member…" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name} — {m.availability_status === "available" ? "Available" : "Partially Available"}
                    </SelectItem>
                  ))}
                  {!candidates.length && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No eligible pool members found for this role.
                    </div>
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.new_pool_member_id && (
                <p className="text-xs text-destructive">{form.formState.errors.new_pool_member_id.message}</p>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason for Reassignment *</Label>
              <Textarea
                id="reason"
                placeholder="Provide a reason for this reassignment (min 10 characters)…"
                className="min-h-[100px]"
                {...form.register("reason")}
              />
              {form.formState.errors.reason && (
                <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>
              )}
              <p className="text-xs text-muted-foreground text-right">
                {form.watch("reason")?.length ?? 0}/500
              </p>
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={reassignMutation.isPending}>
              {reassignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Reassignment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
