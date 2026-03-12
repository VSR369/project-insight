import { useState, useMemo, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Clock,
  Globe,
  Save,
  X,
  Plus,
} from "lucide-react";

import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { 
  PanelReviewer, 
  useUpdatePanelReviewer 
} from "@/hooks/queries/usePanelReviewers";
import {
  TIMEZONE_OPTIONS,
  EXPERIENCE_OPTIONS,
} from "@/lib/validations/reviewer";

// Edit form schema (subset of full schema)
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
  const [newLanguage, setNewLanguage] = useState("");

  const { data: levels } = useExpertiseLevels(false);
  const { data: industries } = useIndustrySegments(false);
  const updateReviewer = useUpdatePanelReviewer();

  const form = useForm<EditReviewerFormData>({
    resolver: zodResolver(editReviewerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      industry_segment_ids: [],
      expertise_level_ids: [],
      years_experience: undefined,
      timezone: "Asia/Calcutta",
      languages: [],
      max_interviews_per_day: 4,
      is_active: true,
      notes: "",
    },
  });

  // Pre-populate form when reviewer changes
  useEffect(() => {
    if (reviewer) {
      form.reset({
        name: reviewer.name,
        email: reviewer.email,
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

  // Add language
  const handleAddLanguage = () => {
    if (newLanguage.trim()) {
      const current = form.getValues("languages") || [];
      if (!current.includes(newLanguage.trim())) {
        form.setValue("languages", [...current, newLanguage.trim()]);
      }
      setNewLanguage("");
    }
  };

  // Remove language
  const handleRemoveLanguage = (lang: string) => {
    const current = form.getValues("languages") || [];
    form.setValue("languages", current.filter(l => l !== lang));
  };

  // Toggle expertise level
  const toggleLevel = (levelId: string, checked: boolean) => {
    const current = form.getValues("expertise_level_ids") || [];
    if (checked) {
      form.setValue("expertise_level_ids", [...current, levelId]);
    } else {
      form.setValue("expertise_level_ids", current.filter(id => id !== levelId));
    }
  };

  // Select all levels
  const selectAllLevels = () => {
    if (levels) {
      form.setValue("expertise_level_ids", levels.map(l => l.id));
    }
  };

  const handleSubmit = async (data: EditReviewerFormData) => {
    if (!reviewer) return;

    await updateReviewer.mutateAsync({
      id: reviewer.id,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      industry_segment_ids: data.industry_segment_ids,
      expertise_level_ids: data.expertise_level_ids,
      years_experience: data.years_experience || null,
      timezone: data.timezone,
      languages: data.languages,
      max_interviews_per_day: data.max_interviews_per_day,
      is_active: data.is_active,
      notes: data.notes || null,
    });

    onSuccess();
  };

  const sortedLevels = useMemo(() => 
    levels?.slice().sort((a, b) => a.level_number - b.level_number) || [],
    [levels]
  );

  if (!reviewer) return null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Identity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
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
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
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
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
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
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <FormLabel>Status</FormLabel>
                  <FormDescription className="text-xs">
                    {field.value ? "Active" : "Inactive"}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Review Coverage Section */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Review Coverage
          </h4>

          <FormField
            control={form.control}
            name="industry_segment_ids"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry Segment *</FormLabel>
                <Select
                  value={field.value?.[0] || ""}
                  onValueChange={(value) => field.onChange([value])}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry segment" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {industries?.map((industry) => (
                      <SelectItem key={industry.id} value={industry.id}>
                        {industry.name}
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
            name="expertise_level_ids"
            render={() => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Expertise Levels to Review *</FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAllLevels}
                  >
                    Select All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sortedLevels.map((level) => {
                    const isChecked = watchedValues.expertise_level_ids?.includes(level.id);
                    return (
                      <label
                        key={level.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          isChecked 
                            ? "bg-primary/10 border-primary" 
                            : "hover:bg-muted"
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => toggleLevel(level.id, !!checked)}
                        />
                        <span className="text-sm">L{level.level_number}</span>
                        <span className="text-xs text-muted-foreground">{level.name}</span>
                      </label>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="years_experience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Years of Experience</FormLabel>
                <Select
                  value={field.value?.toString() || ""}
                  onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience range" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        {/* Preferences Section */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Preferences
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_interviews_per_day"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Interviews/Day</FormLabel>
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(v) => field.onChange(parseInt(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} interview{n > 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* Languages */}
          <FormField
            control={form.control}
            name="languages"
            render={() => (
              <FormItem>
                <FormLabel>Languages</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add language"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddLanguage();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddLanguage}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {watchedValues.languages?.map((lang) => (
                    <Badge key={lang} variant="secondary" className="gap-1">
                      {lang}
                      <button
                        type="button"
                        onClick={() => handleRemoveLanguage(lang)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Internal notes about this reviewer..."
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
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
