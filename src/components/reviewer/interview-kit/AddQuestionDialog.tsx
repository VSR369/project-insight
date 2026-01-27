/**
 * Add Question Dialog
 * Dialog to add a custom reviewer question to any section
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const addQuestionSchema = z.object({
  questionText: z.string().min(10, "Question must be at least 10 characters").max(1000, "Question must be less than 1000 characters"),
  expectedAnswer: z.string().max(2000, "Expected answer must be less than 2000 characters").optional(),
});

type AddQuestionFormValues = z.infer<typeof addQuestionSchema>;

interface AddQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionName: string;
  sectionType: string;
  onSubmit: (data: { questionText: string; expectedAnswer: string | null }) => void;
  isSubmitting?: boolean;
}

export function AddQuestionDialog({
  open,
  onOpenChange,
  sectionName,
  sectionType,
  onSubmit,
  isSubmitting,
}: AddQuestionDialogProps) {
  const form = useForm<AddQuestionFormValues>({
    resolver: zodResolver(addQuestionSchema),
    defaultValues: {
      questionText: "",
      expectedAnswer: "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        questionText: "",
        expectedAnswer: "",
      });
    }
  }, [open, form]);

  const handleSubmit = (values: AddQuestionFormValues) => {
    onSubmit({
      questionText: values.questionText,
      expectedAnswer: values.expectedAnswer || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Custom Question</DialogTitle>
          <DialogDescription>
            Add a new question to the "{sectionName}" section.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="questionText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter your question..."
                      className="min-h-[100px] resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expectedAnswer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Answer / Guidance</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe what a strong answer should include..."
                      className="min-h-[80px] resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Question
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
