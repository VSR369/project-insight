/**
 * ChecklistActionButtons — Action buttons for the curation checklist.
 * Extracted from CurationChecklistPanel.tsx.
 */

import { Button } from "@/components/ui/button";
import { Send, RotateCcw, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ChecklistActionButtonsProps {
  onSubmitClick: () => void;
  onReturnClick: () => void;
  onEditToggle: () => void;
  isEditing: boolean;
  isSubmitting: boolean;
  isLegalPending: boolean;
  hasOutstandingRequired: boolean;
}

export function ChecklistActionButtons({
  onSubmitClick, onReturnClick, onEditToggle,
  isEditing, isSubmitting, isLegalPending, hasOutstandingRequired,
}: ChecklistActionButtonsProps) {
  return (
    <div className="pt-4 mt-3 border-t border-border space-y-2">
      <Button
        className="w-full"
        onClick={onSubmitClick}
        disabled={isSubmitting || isLegalPending || hasOutstandingRequired}
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
        ) : (
          <Send className="h-4 w-4 mr-1.5" />
        )}
        Approve & Submit for Publication
      </Button>

      <Button
        variant="outline"
        className="w-full border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
        onClick={onReturnClick}
      >
        <RotateCcw className="h-4 w-4 mr-1.5" />
        Return to Creator
      </Button>

      <Button variant="outline" className="w-full" onClick={onEditToggle}>
        <Pencil className="h-4 w-4 mr-1.5" />
        {isEditing ? "Cancel Editing" : "Make Direct Correction"}
      </Button>

      {isEditing && (
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => { toast.success("Corrections saved"); onEditToggle(); }}
        >
          Save Corrections
        </Button>
      )}
    </div>
  );
}
