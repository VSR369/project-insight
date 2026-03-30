/**
 * AdditionalContextTab — Tab 2 of Challenge Creator Form.
 * Optional fields that enrich AI quality. Field keys match
 * curator section_keys in extended_brief for direct pipeline flow.
 */

import { Controller, useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CreatorFormValues } from './ChallengeCreatorForm';

const TIMELINE_OPTIONS = [
  { value: '4w', label: '4 weeks' },
  { value: '8w', label: '8 weeks' },
  { value: '16w', label: '16 weeks' },
  { value: '32w', label: '32 weeks' },
] as const;

const CONTEXT_FIELDS = [
  { key: 'context_background' as const, label: 'Context & Background', placeholder: 'Tell us about your situation, what led to this challenge, any prior attempts' },
  { key: 'preferred_approach' as const, label: 'Preferred Approach', placeholder: 'Any preferred technology or methodology?' },
  { key: 'approaches_not_of_interest' as const, label: 'Approaches NOT of Interest', placeholder: "Anything you've tried or don't want?" },
  { key: 'affected_stakeholders' as const, label: 'Affected Stakeholders', placeholder: 'Who uses or is affected by this solution?' },
  { key: 'current_deficiencies' as const, label: 'Current Deficiencies', placeholder: "What's broken or missing today?" },
  { key: 'root_causes' as const, label: 'Root Causes', placeholder: 'Why does this problem exist?' },
] as const;

export function AdditionalContextTab() {
  const { control } = useFormContext<CreatorFormValues>();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2.5">
        <span className="text-sm">📋</span>
        <p className="text-xs text-muted-foreground">
          These fields are optional but strongly recommended. They feed directly into the AI
          curation pipeline — richer context produces higher-quality challenge specs.
        </p>
      </div>

      {CONTEXT_FIELDS.map((cf) => (
        <div key={cf.key} className="space-y-2">
          <Label className="text-sm font-medium">{cf.label}</Label>
          <Controller
            name={cf.key}
            control={control}
            render={({ field }) => (
              <RichTextEditor
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder={cf.placeholder}
              />
            )}
          />
        </div>
      ))}

      <div className="space-y-2">
        <Label className="text-sm font-medium">Target Timeline</Label>
        <Controller
          name="expected_timeline"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger className="w-full max-w-xs text-base">
                <SelectValue placeholder="Select expected timeline" />
              </SelectTrigger>
              <SelectContent>
                {TIMELINE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </div>
  );
}
