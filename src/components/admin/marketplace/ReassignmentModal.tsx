/**
 * ReassignmentModal — SCR-07 Mid-Challenge Reassignment
 * BRD Ref: BR-MP-ASSIGN-005, MOD-02 Tech Spec
 */

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
import { Loader2, AlertTriangle } from "lucide-react";
import { reassignmentSchema, type ReassignmentValues } from "@/lib/validations/challengeAssignment";
import { useReassignMember, useChallengeAssignments, type ChallengeAssignmentRow } from "@/hooks/queries/useSolutionRequests";
import { usePoolMembers } from "@/hooks/queries/usePoolMembers";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";

interface ReassignmentModalProps {
  assignment: ChallengeAssignmentRow;
  challengeTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReassignmentModal({ assignment, challengeTitle, open, onOpenChange }: ReassignmentModalProps) {
  const { data: poolMembers } = usePoolMembers({ role: assignment.role_code });
  const { data: roleCodes } = useSlmRoleCodes();
  const { data: challengeAssignments } = useChallengeAssignments(assignment.challenge_id);
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

  // Get pool member IDs already assigned to the SAME role on this challenge (excluding current assignment being replaced)
  const existingMemberIdsForRole = (challengeAssignments ?? [])
    .filter((a) => a.role_code === assignment.role_code && a.id !== assignment.id)
    .map((a) => a.pool_member_id);

  // Filter out the current assignee, fully booked members, AND members already holding this role on this challenge
  const candidates = (poolMembers ?? []).filter(
    (m) =>
      m.id !== assignment.pool_member_id &&
      m.availability_status !== "fully_booked" &&
      !existingMemberIdsForRole.includes(m.id)
  );

  const reasonLength = form.watch("reason")?.length ?? 0;
  const selectedMemberId = form.watch("new_pool_member_id");

  // Extra guard: check if selected member is already assigned to same role
  const isDuplicateRoleAssignment = existingMemberIdsForRole.includes(selectedMemberId);

  const onSubmit = async (values: ReassignmentValues) => {
    if (isDuplicateRoleAssignment) return;

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
          <DialogTitle>Mid-Challenge Reassignment</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-5">
            {/* Current Assignee — read-only card */}
            <div className="rounded-md border bg-muted/30 p-4 space-y-0.5">
              <p className="text-xs text-muted-foreground font-medium">Current Assignee</p>
              <p className="text-sm font-semibold text-foreground">{assignment.member_name}</p>
              <p className="text-xs text-muted-foreground">
                {roleLabel} ({assignment.role_code})
              </p>
              <p className="text-xs text-muted-foreground">
                Challenge: {challengeTitle}
              </p>
            </div>

            {/* New Member Select */}
            <div className="space-y-1.5">
              <Label htmlFor="new_member">
                New Member <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.watch("new_pool_member_id")}
                onValueChange={(val) => form.setValue("new_pool_member_id", val, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
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
              {isDuplicateRoleAssignment && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  This member is already assigned as {roleLabel} on this challenge.
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="reason">
                Reason for Reassignment <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Minimum 10 characters"
                className="min-h-[100px]"
                {...form.register("reason")}
              />
              {form.formState.errors.reason ? (
                <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {reasonLength} / 10 minimum characters
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={reassignMutation.isPending || isDuplicateRoleAssignment}>
              {reassignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
