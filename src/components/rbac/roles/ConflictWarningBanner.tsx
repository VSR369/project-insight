/**
 * ConflictWarningBanner — Displays role fusion conflict feedback.
 *
 * HARD_BLOCK: Red banner with lock icon, assignment blocked.
 * SOFT_WARN: Amber banner with warning icon + override checkbox.
 */

import { AlertTriangle, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import type { RoleConflictResult } from "@/hooks/cogniblend/useValidateRoleAssignment";

interface ConflictWarningBannerProps {
  conflict: RoleConflictResult | null;
  /** For SOFT_WARN: whether the admin has acknowledged the warning */
  acknowledged?: boolean;
  /** For SOFT_WARN: callback when admin toggles acknowledgement */
  onAcknowledgeChange?: (checked: boolean) => void;
}

export function ConflictWarningBanner({
  conflict,
  acknowledged = false,
  onAcknowledgeChange,
}: ConflictWarningBannerProps) {
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

  if (conflict.conflictType === "SOFT_WARN") {
    return (
      <Alert className="border-amber-400/60 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-600/40">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-800 dark:text-amber-300 font-semibold text-sm">
          Role Conflict — Warning
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-400/80 text-xs mt-1">
          {conflict.message ?? "This role combination is not recommended under the current governance mode."}
        </AlertDescription>
        {onAcknowledgeChange && (
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(v) => onAcknowledgeChange(v === true)}
            />
            <span className="text-xs text-amber-800 dark:text-amber-300">
              I understand the reduced governance and wish to proceed
            </span>
          </label>
        )}
      </Alert>
    );
  }

  return null;
}
