/**
 * AssignMemberModal — Fill missing role slots on a challenge team
 * BRD Ref: BR-MP-ASSIGN-001–003, MOD-02
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle, ExternalLink, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAssignMember, useChallengeAssignments } from "@/hooks/queries/useSolutionRequests";
import { usePoolMembers } from "@/hooks/queries/usePoolMembers";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import type { TeamComposition } from "@/hooks/queries/useSolutionRequests";

interface AssignMemberModalProps {
  challengeId: string;
  challengeTitle: string;
  missingRoles: TeamComposition["missingRoles"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignMemberModal({
  challengeId,
  challengeTitle,
  missingRoles,
  open,
  onOpenChange,
}: AssignMemberModalProps) {
  const { data: roleCodes } = useSlmRoleCodes();
  const navigate = useNavigate();
  const assignMutation = useAssignMember();

  // Auto-select if only one missing role
  const [selectedRole, setSelectedRole] = useState<string>(
    missingRoles.length === 1 ? missingRoles[0].role : ""
  );
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const { data: poolMembers } = usePoolMembers({ role: selectedRole || undefined });
  const { data: challengeAssignments } = useChallengeAssignments(challengeId);

  const getRoleLabel = (code: string) => {
    const found = roleCodes?.find((r) => r.code === code);
    return found ? `${found.display_name} (${code})` : code;
  };

  // IDs already assigned to the selected role on this challenge
  const existingMemberIdsForRole = (challengeAssignments ?? [])
    .filter((a) => a.role_code === selectedRole)
    .map((a) => a.pool_member_id);

  // All pool members matching the role but not already assigned
  const allMatchingMembers = (poolMembers ?? []).filter(
    (m) => !existingMemberIdsForRole.includes(m.id)
  );

  // Eligible candidates: not fully booked
  const candidates = allMatchingMembers.filter(
    (m) => m.availability_status !== "fully_booked"
  );

  // Count of members who have the role but are fully booked
  const fullyBookedCount = allMatchingMembers.filter(
    (m) => m.availability_status === "fully_booked"
  ).length;

  const isDuplicateRoleAssignment = existingMemberIdsForRole.includes(selectedMemberId);

  const handleSubmit = async () => {
    if (!selectedRole || !selectedMemberId || isDuplicateRoleAssignment) return;

    await assignMutation.mutateAsync({
      challengeId,
      poolMemberId: selectedMemberId,
      roleCode: selectedRole,
    });
    onOpenChange(false);
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    setSelectedMemberId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Assign Team Member</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-5">
          {/* Challenge context */}
          <div className="rounded-md border bg-muted/30 p-4 space-y-0.5">
            <p className="text-xs text-muted-foreground font-medium">Challenge</p>
            <p className="text-sm font-semibold text-foreground">{challengeTitle}</p>
          </div>

          {/* Role selector */}
          <div className="space-y-1.5">
            <Label>
              Role to Fill <span className="text-destructive">*</span>
            </Label>
            {missingRoles.length === 1 ? (
              <div className="text-sm font-medium text-foreground p-2 rounded-md border bg-muted/20">
                {getRoleLabel(missingRoles[0].role)}
                <span className="text-xs text-muted-foreground ml-2">
                  ({missingRoles[0].required - missingRoles[0].assigned} needed)
                </span>
              </div>
            ) : (
              <Select value={selectedRole} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role to fill" />
                </SelectTrigger>
                <SelectContent>
                  {missingRoles.map((m) => (
                    <SelectItem key={m.role} value={m.role}>
                      {getRoleLabel(m.role)} — {m.required - m.assigned} needed
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Member selector */}
          {selectedRole && (
            <div className="space-y-1.5">
              <Label>
                Pool Member <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
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
                      No eligible pool members found.
                    </div>
                  )}
                </SelectContent>
              </Select>
              {isDuplicateRoleAssignment && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  This member is already assigned as {getRoleLabel(selectedRole)} on this challenge.
                </div>
              )}

              {/* Actionable empty state when no candidates */}
              {candidates.length === 0 && selectedRole && (
                <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-foreground">No available members for this role</p>
                      {fullyBookedCount > 0 ? (
                        <p className="text-muted-foreground">
                          {fullyBookedCount} member{fullyBookedCount > 1 ? "s" : ""} with this role {fullyBookedCount > 1 ? "are" : "is"} currently fully booked.
                          You can increase their capacity or add new members in the Resource Pool.
                        </p>
                      ) : (
                        <p className="text-muted-foreground">
                          No pool members have the {getRoleLabel(selectedRole)} role yet.
                          Add new members in the Resource Pool first.
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      onOpenChange(false);
                      navigate("/admin/marketplace/resource-pool");
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Go to Resource Pool
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedRole || !selectedMemberId || assignMutation.isPending || isDuplicateRoleAssignment}
          >
            {assignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assign Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
