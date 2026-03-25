/**
 * BulkActionBar — Sticky bar shown after AI review completes.
 * Provides bulk "Accept all passing sections" and "Review warnings" actions.
 * Supports 3 statuses from 2-phase pipeline: pass, warning, inferred.
 */

import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";

interface BulkActionBarProps {
  warningCount: number;
  passCount: number;
  inferredCount?: number;
  onAcceptAllPassing: () => void;
  onReviewWarnings: () => void;
}

export function BulkActionBar({
  warningCount,
  passCount,
  inferredCount = 0,
  onAcceptAllPassing,
  onReviewWarnings,
}: BulkActionBarProps) {
  const attentionCount = warningCount + inferredCount;
  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 py-3 px-6 -mx-4 lg:-mx-6 flex items-center justify-between flex-wrap gap-3">
      <p className="text-sm text-foreground">
        Review complete —{" "}
        {passCount > 0 && (
          <span className="font-medium text-emerald-700">
            {passCount} passed
          </span>
        )}
        {passCount > 0 && warningCount > 0 && ", "}
        {warningCount > 0 && (
          <span className="font-medium text-amber-700">
            {warningCount} warning{warningCount !== 1 ? "s" : ""}
          </span>
        )}
        {(passCount > 0 || warningCount > 0) && inferredCount > 0 && ", "}
        {inferredCount > 0 && (
          <span className="font-medium text-violet-700">
            {inferredCount} AI inferred
          </span>
        )}
      </p>

      <div className="flex items-center gap-2">
        {passCount > 0 && (
          <Button
            onClick={onAcceptAllPassing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            size="sm"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Accept all passing sections
          </Button>
        )}
        {attentionCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="border-amber-400 text-amber-700 hover:bg-amber-50 rounded-lg"
            onClick={onReviewWarnings}
          >
            <AlertTriangle className="h-4 w-4 mr-1.5" />
            Review {attentionCount} section{attentionCount !== 1 ? "s" : ""}
          </Button>
        )}
      </div>
    </div>
  );
}
