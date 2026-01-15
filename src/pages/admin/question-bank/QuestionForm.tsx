import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, GripVertical, CheckCircle2, X, Tags } from "lucide-react";

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DIFFICULTY_OPTIONS, QUESTION_TYPE_OPTIONS, USAGE_MODE_OPTIONS } from "@/hooks/queries/useQuestionBank";
import { useCapabilityTags } from "@/hooks/queries/useCapabilityTags";

const optionSchema = z.object({
  text: z.string().min(1, "Option text is required").max(500, "Option must be 500 characters or less"),
});

const questionSchema = z.object({
  question_text: z.string().min(10, "Question must be at least 10 characters").max(2000, "Question must be 2000 characters or less"),
  options: z.array(optionSchema).min(2, "At least 2 options required").max(6, "Maximum 6 options allowed"),
  correct_option: z.coerce.number().int().min(1, "Select the correct answer"),
  difficulty: z.enum(["introductory", "applied", "advanced", "strategic"]).optional().nullable(),
  question_type: z.enum(["conceptual", "scenario", "experience", "decision", "proof"]).default("conceptual"),
  usage_mode: z.enum(["self_assessment", "interview", "both"]).default("both"),
  expected_answer_guidance: z.string().max(2000).optional().nullable(),
  is_active: z.boolean().default(true),
  capability_tag_ids: z.array(z.string()).default([]),
}).refine((data) => data.correct_option <= data.options.length, {
  message: "Correct option must be within the available options",
  path: ["correct_option"],
});

type QuestionFormData = z.infer<typeof questionSchema>;

export type { QuestionFormData };

interface QuestionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  defaultValues?: Partial<QuestionFormData>;
  onSubmit: (data: QuestionFormData) => Promise<void>;
  isLoading?: boolean;
}

export function QuestionForm({
  open,
  onOpenChange,
  title,
  defaultValues,
  onSubmit,
  isLoading = false,
}: QuestionFormProps) {
  const { data: capabilityTags = [] } = useCapabilityTags();
  const [tagPopoverOpen, setTagPopoverOpen] = React.useState(false);

  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      question_text: "",
      options: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
      correct_option: 1,
      difficulty: "applied",
      question_type: "conceptual",
      usage_mode: "both",
      expected_answer_guidance: "",
      is_active: true,
      capability_tag_ids: [],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        question_text: "",
        options: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
        correct_option: 1,
        difficulty: "applied",
        question_type: "conceptual",
        usage_mode: "both",
        expected_answer_guidance: "",
        is_active: true,
        capability_tag_ids: [],
        ...defaultValues,
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = async (data: QuestionFormData) => {
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch {
      // Error handled by parent
    }
  };

  const correctOption = form.watch("correct_option");
  const usageMode = form.watch("usage_mode");
  const selectedTagIds = form.watch("capability_tag_ids");
  const showAnswerGuidance = usageMode === "interview" || usageMode === "both";

  const selectedTags = capabilityTags.filter(tag => selectedTagIds.includes(tag.id));

  const handleTagToggle = (tagId: string) => {
    const current = form.getValues("capability_tag_ids");
    if (current.includes(tagId)) {
      form.setValue("capability_tag_ids", current.filter(id => id !== tagId));
    } else {
      form.setValue("capability_tag_ids", [...current, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    const current = form.getValues("capability_tag_ids");
    form.setValue("capability_tag_ids", current.filter(id => id !== tagId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Create a multiple choice question with 2-6 options.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Question Text */}
            <FormField
              control={form.control}
              name="question_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter the question text..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0}/2000 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Answer Options *</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ text: "" })}
                  disabled={fields.length >= 6}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      correctOption === index + 1
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    )}
                  >
                    <div className="flex items-center gap-2 pt-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={correctOption === index + 1 ? "default" : "outline"}>
                        {index + 1}
                      </Badge>
                    </div>

                    <FormField
                      control={form.control}
                      name={`options.${index}.text`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder={`Option ${index + 1}`}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        variant={correctOption === index + 1 ? "default" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => form.setValue("correct_option", index + 1)}
                        title="Set as correct answer"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (fields.length > 2) {
                            remove(index);
                            // Adjust correct option if needed
                            if (correctOption > fields.length - 1) {
                              form.setValue("correct_option", fields.length - 1);
                            } else if (correctOption > index) {
                              form.setValue("correct_option", correctOption - 1);
                            }
                          }
                        }}
                        disabled={fields.length <= 2}
                        title="Remove option"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <FormField
                control={form.control}
                name="correct_option"
                render={() => <FormMessage />}
              />
            </div>

            {/* Question Type & Usage Mode */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="question_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "conceptual"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {QUESTION_TYPE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="usage_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usage Mode</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "both"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {USAGE_MODE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Difficulty & Active */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DIFFICULTY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription className="text-xs">
                        Include in assessments
                      </FormDescription>
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

            {/* Capability Tags */}
            <FormField
              control={form.control}
              name="capability_tag_ids"
              render={() => (
                <FormItem>
                  <FormLabel>Capability Tags</FormLabel>
                  <div className="space-y-2">
                    <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Tags className="mr-2 h-4 w-4" />
                          {selectedTags.length === 0
                            ? "Select capability tags..."
                            : `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} selected`}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <ScrollArea className="h-64">
                          <div className="p-2 space-y-1">
                            {capabilityTags.length === 0 ? (
                              <div className="text-sm text-muted-foreground p-2 text-center">
                                No capability tags available
                              </div>
                            ) : (
                              capabilityTags.map((tag) => (
                                <div
                                  key={tag.id}
                                  className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                                  onClick={() => handleTagToggle(tag.id)}
                                >
                                  <Checkbox
                                    checked={selectedTagIds.includes(tag.id)}
                                    onCheckedChange={() => handleTagToggle(tag.id)}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{tag.name}</p>
                                    {tag.description && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {tag.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>

                    {/* Selected Tags Display */}
                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedTags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className="gap-1 pr-1"
                          >
                            {tag.name}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 hover:bg-transparent"
                              onClick={() => handleRemoveTag(tag.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormDescription>
                    Tag questions with relevant capabilities for filtering and analysis
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expected Answer Guidance (for interview mode) */}
            {showAnswerGuidance && (
              <FormField
                control={form.control}
                name="expected_answer_guidance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Answer Guidance</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what a good answer looks like for the interviewer..."
                        className="min-h-[80px]"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      For interviewers: describe key points a good answer should cover
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Question"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}