/**
 * SCR-16a: Delegated SOA Limit Warning
 * Shows progress bar + warnings at 80% and 100% capacity
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ShieldAlert } from "lucide-react";

interface DelegatedAdminLimitWarningProps {
  current: number;
  max: number;
}

export function DelegatedAdminLimitWarning({ current, max }: DelegatedAdminLimitWarningProps) {
  if (max <= 0) return null;

  const pct = Math.round((current / max) * 100);
  const isWarning = pct >= 80 && pct < 100;
  const isAtLimit = current >= max;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Delegated Admin Slots</span>
        <span className={isAtLimit ? "text-destructive font-medium" : isWarning ? "text-amber-600 font-medium" : ""}>
          {current}/{max} used
        </span>
      </div>
      <Progress
        value={Math.min(pct, 100)}
        className={`h-2 ${isAtLimit ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-amber-500" : ""}`}
      />

      {isAtLimit && (
        <Alert variant="destructive" className="py-2">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Delegated admin limit reached ({current}/{max}). Deactivate an existing admin before adding a new one.
          </AlertDescription>
        </Alert>
      )}

      {isWarning && !isAtLimit && (
        <Alert className="py-2 border-amber-200 dark:border-amber-800/30">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
            You are at {pct}% of your Delegated Admin limit ({current}/{max}).
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
