/**
 * TeamCompletionBanner — Amber warning banner for incomplete team assignments
 * BRD Ref: BR-MP-ASSIGN-001, MOD-02
 */

import { useState } from "react";
import { AlertTriangle, UserPlus, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { getRoleLabel } from "@/lib/roleUtils";
import { AssignMemberModal } from "@/components/admin/marketplace/AssignMemberModal";
import type { TeamComposition } from "@/hooks/queries/useSolutionRequests";

interface TeamCompletionBannerProps {
  team: TeamComposition;
  challengeId: string;
  challengeTitle: string;
}

export function TeamCompletionBanner({ team, challengeId, challengeTitle }: TeamCompletionBannerProps) {
  const { data: roleCodes } = useSlmRoleCodes();
  const [assignOpen, setAssignOpen] = useState(false);

  if (team.isComplete) return null;

  const getRoleLabel = (code: string) => {
    const found = roleCodes?.find((r) => r.code === code);
    return found?.display_name ?? code;
  };

  return (
    <>
      <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-800 dark:text-amber-300">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
            <div>
              <span className="font-semibold">Team Incomplete</span>
              <span className="mx-1">—</span>
              {team.missingRoles.map((m, i) => (
                <span key={m.role}>
                  {i > 0 && ", "}
                  {m.required - m.assigned} more {getRoleLabel(m.role)} ({m.role}) needed
                </span>
              ))}
              <span className="block text-xs mt-1 text-amber-700 dark:text-amber-400">
                Assign team members to proceed. If no eligible members are available,{" "}
                <Link
                  to="/admin/marketplace/resource-pool"
                  className="underline underline-offset-2 font-medium hover:text-amber-900 dark:hover:text-amber-200 inline-flex items-center gap-0.5"
                >
                  add new members in the Resource Pool
                  <ArrowRight className="h-3 w-3" />
                </Link>
                {" "}first.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="self-start border-amber-400 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-950/40"
              onClick={() => setAssignOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Assign Members
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {assignOpen && (
        <AssignMemberModal
          challengeId={challengeId}
          challengeTitle={challengeTitle}
          missingRoles={team.missingRoles}
          open={assignOpen}
          onOpenChange={setAssignOpen}
        />
      )}
    </>
  );
}
