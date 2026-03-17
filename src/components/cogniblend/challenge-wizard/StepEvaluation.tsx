/**
 * Step 3 — Evaluation Criteria
 * Mandatory fields: evaluation_criteria, reward_structure
 * Enterprise-only (advanced): submission_guidelines, taxonomy_tags
 */

import { useState } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ChallengeFormValues } from './challengeFormSchema';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'INR', label: 'INR (₹)' },
] as const;

interface StepEvaluationProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isLightweight: boolean;
}

export function StepEvaluation({ form, mandatoryFields, isLightweight }: StepEvaluationProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { register, formState: { errors }, control, watch, setValue } = form;

  const isRequired = (field: string) => mandatoryFields.includes(field);

  const criteriaList = watch('criteria_list') ?? [''];

  const addCriterion = () => setValue('criteria_list', [...criteriaList, '']);
  const removeCriterion = (index: number) => {
    if (criteriaList.length <= 1) return;
    setValue('criteria_list', criteriaList.filter((_: string, i: number) => i !== index));
  };
  const updateCriterion = (index: number, value: string) => {
    const updated = [...criteriaList];
    updated[index] = value;
    setValue('criteria_list', updated);
  };

  const hasAdvanced = isLightweight;

  return (
    <div className="space-y-5">
      {/* Evaluation Criteria */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Evaluation Criteria {isRequired('evaluation_criteria') && <span className="text-destructive">*</span>}
        </Label>
        <p className="text-xs text-muted-foreground">Define how submissions will be scored</p>
        <div className="space-y-2">
          {criteriaList.map((item: string, index: number) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                placeholder={`Criterion ${index + 1} (e.g., Innovation, Feasibility)`}
                value={item}
                onChange={(e) => updateCriterion(index, e.target.value)}
                className="text-base"
              />
              {criteriaList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCriterion(index)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addCriterion}
          className="text-muted-foreground"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Criterion
        </Button>
      </div>

      {/* Reward Structure */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Reward Structure {isRequired('reward_structure') && <span className="text-destructive">*</span>}
        </Label>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Currency */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Currency</Label>
            <Controller
              name="currency_code"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? 'USD'} onValueChange={field.onChange}>
                  <SelectTrigger className="text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Budget Min */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Min Budget</Label>
            <Input
              type="number"
              placeholder="0"
              className="text-base"
              {...register('budget_min', { valueAsNumber: true })}
            />
          </div>

          {/* Budget Max */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Max Budget</Label>
            <Input
              type="number"
              placeholder="0"
              className="text-base"
              {...register('budget_max', { valueAsNumber: true })}
            />
          </div>
        </div>

        {/* Max Solutions */}
        <div className="space-y-1 max-w-xs">
          <Label className="text-xs text-muted-foreground">Max Winners</Label>
          <Input
            type="number"
            placeholder="1"
            min={1}
            className="text-base"
            {...register('max_solutions', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Advanced (Lightweight) */}
      {hasAdvanced && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Show Advanced Options
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-4 pl-4 border-l-2 border-muted ml-1.5">
              <div className="space-y-1.5">
                <Label htmlFor="submission_guidelines" className="text-sm font-medium">
                  Submission Guidelines <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="submission_guidelines"
                  placeholder="Describe format, file types, and submission requirements..."
                  rows={3}
                  className="text-base resize-none"
                  {...register('submission_guidelines')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxonomy_tags" className="text-sm font-medium">
                  Taxonomy Tags <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="taxonomy_tags"
                  placeholder="e.g., AI, Machine Learning, Healthcare (comma-separated)"
                  className="text-base"
                  {...register('taxonomy_tags')}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enterprise-only fields */}
      {!isLightweight && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="submission_guidelines_ent" className="text-sm font-medium">
              Submission Guidelines {isRequired('submission_guidelines') && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="submission_guidelines_ent"
              placeholder="Describe format, file types, and submission requirements..."
              rows={3}
              className="text-base resize-none"
              {...register('submission_guidelines')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taxonomy_tags_ent" className="text-sm font-medium">
              Taxonomy Tags {isRequired('taxonomy_tags') && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="taxonomy_tags_ent"
              placeholder="e.g., AI, Machine Learning, Healthcare (comma-separated)"
              className="text-base"
              {...register('taxonomy_tags')}
            />
          </div>
        </>
      )}
    </div>
  );
}
