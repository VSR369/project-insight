/**
 * Add Question Dialog Component
 * 
 * Dialog for adding custom questions to any section.
 */

import { useState } from "react";
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

const addQuestionSchema = z.object({
  questionText: z.string().min(10, "Question must be at least 10 characters"),
  expectedAnswer: z.string().optional(),
});

type AddQuestionFormData = z.infer<typeof addQuestionSchema>;

interface AddQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionName: string;
  sectionType: 'domain' | 'proof_point' | 'competency';
  sectionLabel?: string;
  proofPointId?: string;
  onSubmit: (data: {
    questionText: string;
    expectedAnswer?: string;
    sectionName: string;
    sectionType: 'domain' | 'proof_point' | 'competency';
    sectionLabel?: string;
    proofPointId?: string;
  }) => void;
  isSubmitting?: boolean;
}

export function AddQuestionDialog({
  open,
  onOpenChange,
  sectionName,
  sectionType,
  sectionLabel,
  proofPointId,
  onSubmit,
  isSubmitting = false,
}: AddQuestionDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddQuestionFormData>({
    resolver: zodResolver(addQuestionSchema),
    defaultValues: {
      questionText: "",
      expectedAnswer: "",
    },
  });

  const handleFormSubmit = (data: AddQuestionFormData) => {
    onSubmit({
      questionText: data.questionText,
      expectedAnswer: data.expectedAnswer || undefined,
      sectionName,
      sectionType,
      sectionLabel,
      proofPointId,
    });
    reset();
    onOpenChange(false);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Question</DialogTitle>
          <DialogDescription>
            Add a custom question to {sectionLabel || sectionName}
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
              Add Question
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
