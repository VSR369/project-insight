/**
 * BulkActionBar — Sticky bar shown after AI review completes.
 * Provides bulk "Accept all passing sections" and "Review warnings" actions.
 */

import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface BulkActionBarProps {
  warningCount: number;
  passCount: number;
  onAcceptAllPassing: () => void;
  onReviewWarnings: () => void;
}

export function BulkActionBar({
  warningCount,
  passCount,
  onAcceptAllPassing,
  onReviewWarnings,
}: BulkActionBarProps) {
  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 py-3 px-6 -mx-4 lg:-mx-6 flex items-center justify-between flex-wrap gap-3">
      <p className="text-sm text-foreground">
        Review complete —{" "}
        {warningCount > 0 && (
          <span className="font-medium text-amber-700">
            {warningCount} section{warningCount !== 1 ? "s" : ""} need{warningCount === 1 ? "s" : ""} attention
          </span>
        )}
        {warningCount > 0 && passCount > 0 && ", "}
        {passCount > 0 && (
          <span className="font-medium text-emerald-700">
            {passCount} section{passCount !== 1 ? "s" : ""} passed
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
        {warningCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="border-amber-400 text-amber-700 hover:bg-amber-50 rounded-lg"
            onClick={onReviewWarnings}
          >
            <AlertTriangle className="h-4 w-4 mr-1.5" />
            Review warnings
          </Button>
        )}
      </div>
    </div>
  );
}
