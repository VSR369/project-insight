/**
 * Interview KIT Question Form Dialog
 * Per Project Knowledge Section 9.3 - Form Handling Standard
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";
import {
  useInterviewKitCompetencies,
  useCreateInterviewKitQuestion,
  useUpdateInterviewKitQuestion,
  InterviewKitQuestionWithRelations,
} from "@/hooks/queries/useInterviewKitQuestions";

// Form validation schema
const questionFormSchema = z.object({
  industry_segment_id: z.string().min(1, "Industry segment is required"),
  expertise_level_id: z.string().min(1, "Expertise level is required"),
  competency_id: z.string().min(1, "Competency is required"),
  question_text: z
    .string()
    .min(10, "Question must be at least 10 characters")
    .max(2000, "Question must be 2000 characters or less"),
  expected_answer: z
    .string()
    .max(3000, "Expected answer must be 3000 characters or less")
    .optional()
    .nullable(),
  display_order: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

type QuestionFormData = z.infer<typeof questionFormSchema>;

interface InterviewKitQuestionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question?: InterviewKitQuestionWithRelations | null;
  defaultCompetencyId?: string;
}

export function InterviewKitQuestionForm({
  open,
  onOpenChange,
  question,
  defaultCompetencyId,
}: InterviewKitQuestionFormProps) {
  const isEditing = !!question;

  // Data hooks
  const { data: industrySegments = [], isLoading: loadingSegments } = useIndustrySegments();
  const { data: expertiseLevels = [], isLoading: loadingLevels } = useExpertiseLevels();
  const { data: competencies = [], isLoading: loadingCompetencies } = useInterviewKitCompetencies();

  // Mutation hooks
  const createMutation = useCreateInterviewKitQuestion();
  const updateMutation = useUpdateInterviewKitQuestion();

  const isLoading = loadingSegments || loadingLevels || loadingCompetencies;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Form setup
  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      industry_segment_id: "",
      expertise_level_id: "",
      competency_id: defaultCompetencyId || "",
      question_text: "",
      expected_answer: "",
      display_order: 0,
      is_active: true,
    },
  });

  // Reset form when dialog opens/closes or question changes
  useEffect(() => {
    if (open) {
      if (question) {
        form.reset({
          industry_segment_id: question.industry_segment_id,
          expertise_level_id: question.expertise_level_id,
          competency_id: question.competency_id,
          question_text: question.question_text,
          expected_answer: question.expected_answer || "",
          display_order: question.display_order || 0,
          is_active: question.is_active,
        });
      } else {
        form.reset({
          industry_segment_id: "",
          expertise_level_id: "",
          competency_id: defaultCompetencyId || "",
          question_text: "",
          expected_answer: "",
          display_order: 0,
          is_active: true,
        });
      }
    }
  }, [open, question, defaultCompetencyId, form]);

  const onSubmit = async (data: QuestionFormData) => {
    try {
      if (isEditing && question) {
        await updateMutation.mutateAsync({
          id: question.id,
          ...data,
        });
      } else {
        await createMutation.mutateAsync({
          industry_segment_id: data.industry_segment_id,
          expertise_level_id: data.expertise_level_id,
          competency_id: data.competency_id,
          question_text: data.question_text,
          expected_answer: data.expected_answer || null,
          display_order: data.display_order,
          is_active: data.is_active,
        });
      }
      onOpenChange(false);
    } catch {
      // Error handled by mutation hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Question" : "Add Question"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the interview question details below."
              : "Create a new interview question for the KIT."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Industry Segment */}
              <FormField
                control={form.control}
                name="industry_segment_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry Segment *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select industry segment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {industrySegments.map((segment) => (
                          <SelectItem key={segment.id} value={segment.id}>
                            {segment.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Expertise Level */}
              <FormField
                control={form.control}
                name="expertise_level_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expertise Level *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select expertise level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {expertiseLevels.map((level) => (
                          <SelectItem key={level.id} value={level.id}>
                            {level.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Competency */}
              <FormField
                control={form.control}
                name="competency_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Competency *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select competency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {competencies.map((comp) => (
                          <SelectItem key={comp.id} value={comp.id}>
                            {comp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Question Text */}
              <FormField
                control={form.control}
                name="question_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Text *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter the interview question..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Expected Answer */}
              <FormField
                control={form.control}
                name="expected_answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Answer (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter expected answer guidance..."
                        className="min-h-[100px]"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Display Order */}
                <FormField
                  control={form.control}
                  name="display_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Active Status */}
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? "Save Changes" : "Create Question"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
