/**
 * TeamCompletionBanner — Amber warning banner for incomplete team assignments
 * BRD Ref: BR-MP-ASSIGN-001, MOD-02
 */

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import type { TeamComposition } from "@/hooks/queries/useSolutionRequests";

interface TeamCompletionBannerProps {
  team: TeamComposition;
}

export function TeamCompletionBanner({ team }: TeamCompletionBannerProps) {
  const { data: roleCodes } = useSlmRoleCodes();

  if (team.isComplete) return null;

  const getRoleLabel = (code: string) => {
    const found = roleCodes?.find((r) => r.code === code);
    return found?.display_name ?? code;
  };

  return (
    <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-amber-800 dark:text-amber-300">
        <span className="font-semibold">Team Incomplete</span>
        <span className="mx-1">—</span>
        {team.missingRoles.map((m, i) => (
          <span key={m.role}>
            {i > 0 && ", "}
            {m.required - m.assigned} more {getRoleLabel(m.role)} ({m.role}) needed
          </span>
        ))}
        <span className="block text-xs mt-1 text-amber-700 dark:text-amber-400">
          Assign different team members to proceed.
        </span>
      </AlertDescription>
    </Alert>
  );
}
