/**
 * Delete Question Confirmation Dialog
 * Confirms before soft-deleting a question
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
import type { InterviewQuestionResponse } from "@/hooks/queries/useInterviewKit";

interface DeleteQuestionConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: InterviewQuestionResponse | null;
  onConfirm: (responseId: string) => void;
  isDeleting?: boolean;
}

export function DeleteQuestionConfirm({
  open,
  onOpenChange,
  question,
  onConfirm,
  isDeleting,
}: DeleteQuestionConfirmProps) {
  const handleConfirm = () => {
    if (question) {
      onConfirm(question.id);
    }
  };

  const truncatedText = question?.question_text
    ? question.question_text.length > 100
      ? question.question_text.slice(0, 100) + "..."
      : question.question_text
    : "";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Question?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Are you sure you want to remove this question from the interview kit?</p>
            {truncatedText && (
              <p className="text-sm italic text-muted-foreground border-l-2 pl-3 mt-2">
                "{truncatedText}"
              </p>
            )}
            <p className="text-sm mt-2">
              This action can be undone by regenerating the interview kit.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
