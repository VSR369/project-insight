import { useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Switch } from "@/components/ui/switch";
import { User, Mail, Phone, Save, X } from "lucide-react";

import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { 
  PanelReviewer, 
  useUpdatePanelReviewer 
} from "@/hooks/queries/usePanelReviewers";
import { ReviewerCoverageFields } from "./ReviewerCoverageFields";
import { ReviewerPreferenceFields } from "./ReviewerPreferenceFields";

const editReviewerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  industry_segment_ids: z.array(z.string()).min(1, "Select at least one industry"),
  expertise_level_ids: z.array(z.string()).min(1, "Select at least one level"),
  years_experience: z.number().optional(),
  timezone: z.string().default("Asia/Calcutta"),
  languages: z.array(z.string()).default([]),
  max_interviews_per_day: z.number().min(1).max(10).default(4),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
});

type EditReviewerFormData = z.infer<typeof editReviewerSchema>;

interface ReviewerEditFormProps {
  reviewer: PanelReviewer | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReviewerEditForm({ reviewer, onSuccess, onCancel }: ReviewerEditFormProps) {
  const { data: levels } = useExpertiseLevels(false);
  const { data: industries } = useIndustrySegments(false);
  const updateReviewer = useUpdatePanelReviewer();

  const form = useForm<EditReviewerFormData>({
    resolver: zodResolver(editReviewerSchema),
    defaultValues: {
      name: "", email: "", phone: "", industry_segment_ids: [],
      expertise_level_ids: [], years_experience: undefined,
      timezone: "Asia/Calcutta", languages: [], max_interviews_per_day: 4,
      is_active: true, notes: "",
    },
  });

  useEffect(() => {
    if (reviewer) {
      form.reset({
        name: reviewer.name, email: reviewer.email,
        phone: reviewer.phone || "",
        industry_segment_ids: reviewer.industry_segment_ids || [],
        expertise_level_ids: reviewer.expertise_level_ids || [],
        years_experience: reviewer.years_experience || undefined,
        timezone: reviewer.timezone || "Asia/Calcutta",
        languages: (reviewer.languages as string[]) || [],
        max_interviews_per_day: reviewer.max_interviews_per_day || 4,
        is_active: reviewer.is_active ?? true,
        notes: reviewer.notes || "",
      });
    }
  }, [reviewer, form]);

  const watchedValues = form.watch();

  const sortedLevels = useMemo(() => 
    levels?.slice().sort((a, b) => a.level_number - b.level_number) || [],
    [levels]
  );

  const selectAllLevels = () => {
    if (levels) form.setValue("expertise_level_ids", levels.map(l => l.id));
  };

  const handleSubmit = async (data: EditReviewerFormData) => {
    if (!reviewer) return;
    await updateReviewer.mutateAsync({
      id: reviewer.id, name: data.name, email: data.email,
      phone: data.phone || null, industry_segment_ids: data.industry_segment_ids,
      expertise_level_ids: data.expertise_level_ids,
      years_experience: data.years_experience || null,
      timezone: data.timezone, languages: data.languages,
      max_interviews_per_day: data.max_interviews_per_day,
      is_active: data.is_active, notes: data.notes || null,
    });
    onSuccess();
  };

  if (!reviewer) return null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Identity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Enter full name" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="email@example.com" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="+91 9876543210" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="is_active" render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <FormLabel>Status</FormLabel>
                <FormDescription className="text-xs">{field.value ? "Active" : "Inactive"}</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )} />
        </div>

        <ReviewerCoverageFields
          form={form}
          industries={industries}
          sortedLevels={sortedLevels}
          watchedLevelIds={watchedValues.expertise_level_ids}
          onSelectAllLevels={selectAllLevels}
        />

        <ReviewerPreferenceFields
          form={form}
          watchedLanguages={watchedValues.languages}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button type="submit" disabled={updateReviewer.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateReviewer.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
