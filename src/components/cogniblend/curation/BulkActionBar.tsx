/**
 * BulkActionBar — Sticky bar shown after AI review completes.
 * Provides bulk "Accept all AI suggestions" and "Review warnings" actions.
 * Supports 3 statuses from 2-phase pipeline: pass, warning, inferred.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BulkActionBarProps {
  warningCount: number;
  passCount: number;
  inferredCount?: number;
  totalCount?: number;
  suggestionsCount: number;
  onAcceptAllSuggestions: () => void;
  onReviewWarnings: () => void;
  isBulkAccepting?: boolean;
}

export function BulkActionBar({
  warningCount,
  passCount,
  inferredCount = 0,
  totalCount,
  suggestionsCount,
  onAcceptAllSuggestions,
  onReviewWarnings,
  isBulkAccepting = false,
}: BulkActionBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const attentionCount = warningCount + inferredCount;
  const displayTotal = totalCount ?? (passCount + warningCount + inferredCount);

  const handleConfirmAccept = () => {
    setConfirmOpen(false);
    onAcceptAllSuggestions();
  };

  return (
    <>
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 py-3 px-6 -mx-4 lg:-mx-6 flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-foreground">
          Review complete —{" "}
          <span className="font-semibold">{displayTotal} section{displayTotal !== 1 ? "s" : ""} reviewed</span>
          {(passCount > 0 || warningCount > 0 || inferredCount > 0) && ": "}
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
          {suggestionsCount > 0 && (
            <Button
              onClick={() => setConfirmOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              size="sm"
              disabled={isBulkAccepting}
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              {isBulkAccepting
                ? "Accepting…"
                : `Accept all AI suggestions (${suggestionsCount})`}
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Accept AI suggestions for {suggestionsCount} section{suggestionsCount !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will save AI-generated content to the database for all sections with pending suggestions.
              Extended brief subsections will be merged into a single write. You can still edit any section afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAccept}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Accept All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
