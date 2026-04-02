/**
 * ReviewerPreferenceFields — Preference form fields for the reviewer edit form.
 * Extracted from ReviewerEditForm.tsx.
 */

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Globe, Plus, X } from "lucide-react";
import { TIMEZONE_OPTIONS } from "@/lib/validations/reviewer";

interface ReviewerPreferenceFieldsProps {
  form: UseFormReturn<any>;
  watchedLanguages: string[] | undefined;
}

export function ReviewerPreferenceFields({
  form,
  watchedLanguages,
}: ReviewerPreferenceFieldsProps) {
  const [newLanguage, setNewLanguage] = useState("");

  const handleAddLanguage = () => {
    if (newLanguage.trim()) {
      const current = form.getValues("languages") || [];
      if (!current.includes(newLanguage.trim())) {
        form.setValue("languages", [...current, newLanguage.trim()]);
      }
      setNewLanguage("");
    }
  };

  const handleRemoveLanguage = (lang: string) => {
    const current = form.getValues("languages") || [];
    form.setValue("languages", current.filter((l: string) => l !== lang));
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Preferences
      </h4>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              {watchedLanguages?.map((lang) => (
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
  );
}
