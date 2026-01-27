/**
 * Edit Question Dialog
 * Dialog to edit an existing question's text and expected answer
 */

import { useEffect } from "react";
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
import type { InterviewQuestionResponse } from "@/hooks/queries/useInterviewKit";

const editQuestionSchema = z.object({
  questionText: z.string().min(10, "Question must be at least 10 characters").max(1000, "Question must be less than 1000 characters"),
  expectedAnswer: z.string().max(2000, "Expected answer must be less than 2000 characters").optional(),
});

type EditQuestionFormValues = z.infer<typeof editQuestionSchema>;

interface EditQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: InterviewQuestionResponse | null;
  onSubmit: (data: { responseId: string; questionText: string; expectedAnswer: string | null }) => void;
  isSubmitting?: boolean;
}

export function EditQuestionDialog({
  open,
  onOpenChange,
  question,
  onSubmit,
  isSubmitting,
}: EditQuestionDialogProps) {
  const form = useForm<EditQuestionFormValues>({
    resolver: zodResolver(editQuestionSchema),
    defaultValues: {
      questionText: "",
      expectedAnswer: "",
    },
  });

  // Populate form when question changes
  useEffect(() => {
    if (question && open) {
      form.reset({
        questionText: question.question_text,
        expectedAnswer: question.expected_answer || "",
      });
    }
  }, [question, open, form]);

  const handleSubmit = (values: EditQuestionFormValues) => {
    if (!question) return;
    
    onSubmit({
      responseId: question.id,
      questionText: values.questionText,
      expectedAnswer: values.expectedAnswer || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
          <DialogDescription>
            Modify the question text and expected answer guidance.
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
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
