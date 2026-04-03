/**
 * ConflictWarningBanner — Displays role fusion conflict feedback.
 *
 * Binary only: HARD_BLOCK (red banner) or ALLOWED (no banner).
 */

import { Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { RoleConflictResult } from "@/hooks/cogniblend/useValidateRoleAssignment";

interface ConflictWarningBannerProps {
  conflict: RoleConflictResult | null;
}

export function ConflictWarningBanner({ conflict }: ConflictWarningBannerProps) {
  if (!conflict || conflict.conflictType === "ALLOWED") return null;

  if (conflict.conflictType === "HARD_BLOCK") {
    return (
      <Alert className="border-destructive/60 bg-destructive/10">
        <Lock className="h-4 w-4 text-destructive" />
        <AlertTitle className="text-destructive font-semibold text-sm">
          Role Conflict — Blocked
        </AlertTitle>
        <AlertDescription className="text-destructive/90 text-xs mt-1">
          {conflict.message ?? "This role combination is not permitted under the current governance mode."}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
