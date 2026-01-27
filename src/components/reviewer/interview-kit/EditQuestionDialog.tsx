/**
 * Edit Question Dialog Component
 * 
 * Dialog for editing existing questions.
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { InterviewQuestionResponse } from "@/hooks/queries/useInterviewKitEvaluation";

const editQuestionSchema = z.object({
  questionText: z.string().min(10, "Question must be at least 10 characters"),
  expectedAnswer: z.string().optional(),
});

type EditQuestionFormData = z.infer<typeof editQuestionSchema>;

interface EditQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: InterviewQuestionResponse | null;
  onSubmit: (questionId: string, data: { questionText: string; expectedAnswer?: string }) => void;
  isSubmitting?: boolean;
}

export function EditQuestionDialog({
  open,
  onOpenChange,
  question,
  onSubmit,
  isSubmitting = false,
}: EditQuestionDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditQuestionFormData>({
    resolver: zodResolver(editQuestionSchema),
  });

  // Reset form when question changes
  useEffect(() => {
    if (question) {
      reset({
        questionText: question.questionText,
        expectedAnswer: question.expectedAnswer || "",
      });
    }
  }, [question, reset]);

  const handleFormSubmit = (data: EditQuestionFormData) => {
    if (!question) return;
    
    onSubmit(question.id, {
      questionText: data.questionText,
      expectedAnswer: data.expectedAnswer || undefined,
    });
    onOpenChange(false);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  if (!question) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
          <DialogDescription>
            Modify the question text and expected answer guidance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="questionText">
              Question <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="questionText"
              placeholder="Enter your question..."
              className="min-h-[100px]"
              {...register("questionText")}
            />
            {errors.questionText && (
              <p className="text-sm text-destructive">{errors.questionText.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedAnswer">
              Expected Answer / Guidance (optional)
            </Label>
            <Textarea
              id="expectedAnswer"
              placeholder="What should a strong answer include..."
              className="min-h-[100px]"
              {...register("expectedAnswer")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
