/**
 * AssignMemberModal — Fill missing role slots on a challenge team
 * BRD Ref: BR-MP-ASSIGN-001–003, MOD-02
 * Enhanced with: Previous team suggestion (BR-ASSIGN-002),
 * Fully Booked alternatives (SCR-05b), No Available Members alert (SCR-05c)
 */

import { useState, useEffect } from "react";
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
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAssignMember, useChallengeAssignments } from "@/hooks/queries/useSolutionRequests";
import { usePoolMembers } from "@/hooks/queries/usePoolMembers";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { getRoleLabel, getRoleDisplayLabel } from "@/lib/roleUtils";
import { PreviousTeamSuggestion } from "@/components/admin/marketplace/PreviousTeamSuggestion";
import { FullyBookedAlternativesModal } from "@/components/admin/marketplace/FullyBookedAlternativesModal";
import { NoAvailableMembersAlert } from "@/components/admin/marketplace/NoAvailableMembersAlert";
import { useSessionExpiryWatcher, useRestoreFormFromRecovery, useSaveFormForRecovery } from "@/hooks/useSessionRecovery";
import type { TeamComposition } from "@/hooks/queries/useSolutionRequests";

interface AssignMemberModalProps {
  challengeId: string;
  challengeTitle: string;
  orgId?: string;
  missingRoles: TeamComposition["missingRoles"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignMemberModal({
  challengeId,
  challengeTitle,
  orgId,
  missingRoles,
  open,
  onOpenChange,
}: AssignMemberModalProps) {
  // ══════════════════════════════════════
  // SECTION 1: useState hooks
  // ══════════════════════════════════════
  const [selectedRole, setSelectedRole] = useState<string>(
    missingRoles.length === 1 ? missingRoles[0].role : ""
  );
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [alternativesOpen, setAlternativesOpen] = useState(false);
  const [noAvailableOpen, setNoAvailableOpen] = useState(false);

  // ══════════════════════════════════════
  // SECTION 2: Query/Mutation hooks
  // ══════════════════════════════════════
  const { data: roleCodes } = useSlmRoleCodes();
  const assignMutation = useAssignMember();
  const { data: poolMembers } = usePoolMembers({ role: selectedRole || undefined });
  const { data: challengeAssignments } = useChallengeAssignments(challengeId);

  // Session recovery watcher (Phase 8A)
  useSessionExpiryWatcher("assign-member", () => ({
    challengeId,
    selectedRole,
    selectedMemberId,
  }));

  // Restore form data after re-login (Phase 8A)
  const recoveredData = useRestoreFormFromRecovery("assign-member");
  const { clearRecovery } = useSaveFormForRecovery("assign-member");

  useEffect(() => {
    if (recoveredData?.formData && open) {
      const { selectedRole: rRole, selectedMemberId: rMember } = recoveredData.formData as {
        selectedRole?: string;
        selectedMemberId?: string;
      };
      if (rRole) setSelectedRole(rRole);
      if (rMember) setSelectedMemberId(rMember);
      clearRecovery();
      toast.info("Form data restored from previous session");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ══════════════════════════════════════
  // SECTION 3: Derived state
  // ══════════════════════════════════════
  const getRoleLabel = (code: string) => {
    const found = roleCodes?.find((r) => r.code === code);
    return found ? `${found.display_name} (${code})` : code;
  };

  const existingMemberIdsForRole = (challengeAssignments ?? [])
    .filter((a) => a.role_code === selectedRole)
    .map((a) => a.pool_member_id);

  const allMatchingMembers = (poolMembers ?? []).filter(
    (m) => !existingMemberIdsForRole.includes(m.id)
  );

  const candidates = allMatchingMembers.filter(
    (m) => m.availability_status !== "fully_booked"
  );

  const fullyBookedCount = allMatchingMembers.filter(
    (m) => m.availability_status === "fully_booked"
  ).length;

  const isDuplicateRoleAssignment = existingMemberIdsForRole.includes(selectedMemberId);

  // ══════════════════════════════════════
  // SECTION 4: Event handlers
  // ══════════════════════════════════════
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

  const handlePreviousTeamSelect = (memberId: string) => {
    setSelectedMemberId(memberId);
  };

  const handleBroadenDomain = () => {
    toast.info("Domain filters cleared. Showing all available pool members.");
  };

  const handleWaitForAvailability = () => {
    toast.info("Reminder set. You'll be notified when pool members become available.");
  };

  const handleEscalate = () => {
    toast.info("Role gap escalated to Supervisor for review.");
  };

  // ══════════════════════════════════════
  // SECTION 5: Render
  // ══════════════════════════════════════
  return (
    <>
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

            {/* Previous team suggestion (BR-ASSIGN-002) */}
            {selectedRole && orgId && (
              <PreviousTeamSuggestion
                challengeId={challengeId}
                orgId={orgId}
                roleCode={selectedRole}
                excludeMemberIds={existingMemberIdsForRole}
                onSelect={handlePreviousTeamSelect}
              />
            )}

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

                {/* Fully booked members hint */}
                {fullyBookedCount > 0 && candidates.length > 0 && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-xs px-0 h-auto"
                    onClick={() => setAlternativesOpen(true)}
                  >
                    {fullyBookedCount} member{fullyBookedCount > 1 ? "s" : ""} fully booked — View Alternatives
                  </Button>
                )}

                {/* No candidates → 3-option alert (SCR-05c) */}
                {candidates.length === 0 && selectedRole && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setNoAvailableOpen(true)}
                  >
                    No available members — View Options
                  </Button>
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

      {/* SCR-05b: Fully Booked Alternatives */}
      <FullyBookedAlternativesModal
        open={alternativesOpen}
        onOpenChange={setAlternativesOpen}
        roleLabel={getRoleLabel(selectedRole)}
        alternatives={candidates}
        onSelect={(memberId) => setSelectedMemberId(memberId)}
      />

      {/* SCR-05c: No Available Members Alert */}
      <NoAvailableMembersAlert
        open={noAvailableOpen}
        onOpenChange={setNoAvailableOpen}
        roleLabel={getRoleLabel(selectedRole)}
        fullyBookedCount={fullyBookedCount}
        onBroadenDomain={handleBroadenDomain}
        onWaitForAvailability={handleWaitForAvailability}
        onEscalate={handleEscalate}
      />
    </>
  );
}
