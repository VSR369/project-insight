/**
 * Delete Question Confirmation Dialog
 * Confirms deletion of an interview question
 */

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
import { Loader2 } from "lucide-react";

interface DeleteQuestionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionText: string;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteQuestionConfirmDialog({
  open,
  onOpenChange,
  questionText,
  onConfirm,
  isDeleting,
}: DeleteQuestionConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Question?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Are you sure you want to delete this question?</p>
            <p className="text-sm bg-muted p-2 rounded-md italic line-clamp-2">
              "{questionText}"
            </p>
            <p className="text-destructive font-medium">
              This action cannot be undone. The question will be removed from your interview evaluation.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              "Delete Question"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
