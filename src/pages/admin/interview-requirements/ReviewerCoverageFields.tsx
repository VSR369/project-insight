/**
 * ReviewerCoverageFields — Review coverage form fields for the reviewer edit form.
 * Extracted from ReviewerEditForm.tsx.
 */

import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { EXPERIENCE_OPTIONS } from "@/lib/validations/reviewer";

interface ReviewerCoverageFieldsProps {
  form: UseFormReturn<any>;
  industries: Array<{ id: string; name: string }> | undefined;
  sortedLevels: Array<{ id: string; name: string; level_number: number }>;
  watchedLevelIds: string[] | undefined;
  onSelectAllLevels: () => void;
}

export function ReviewerCoverageFields({
  form,
  industries,
  sortedLevels,
  watchedLevelIds,
  onSelectAllLevels,
}: ReviewerCoverageFieldsProps) {
  const toggleLevel = (levelId: string, checked: boolean) => {
    const current = form.getValues("expertise_level_ids") || [];
    if (checked) {
      form.setValue("expertise_level_ids", [...current, levelId]);
    } else {
      form.setValue("expertise_level_ids", current.filter((id: string) => id !== levelId));
    }
  };

  return (
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
                onClick={onSelectAllLevels}
              >
                Select All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {sortedLevels.map((level) => {
                const isChecked = watchedLevelIds?.includes(level.id);
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
  );
}
