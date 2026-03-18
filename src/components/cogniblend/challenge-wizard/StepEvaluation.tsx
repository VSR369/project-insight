/**
 * Step 3 — Evaluation
 *
 * Fields:
 *   1. Evaluation Criteria — weighted table, must sum to 100%
 *   2. Reward Structure — tiered awards (Platinum > Gold > Silver)
 *   3. Rejection Fee % — Enterprise only, slider 5–20%
 */

import { UseFormReturn, Controller } from 'react-hook-form';
import {
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ChallengeFormValues } from './challengeFormSchema';

/* ─── Constants ──────────────────────────────────────── */

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'INR', label: 'INR (₹)', symbol: '₹' },
] as const;

/* ─── Props ──────────────────────────────────────────── */

interface StepEvaluationProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isLightweight: boolean;
}

/* ─── Component ──────────────────────────────────────── */

export function StepEvaluation({ form, mandatoryFields, isLightweight }: StepEvaluationProps) {
  const { register, formState: { errors }, control, watch, setValue } = form;

  const isRequired = (field: string) => mandatoryFields.includes(field);

  // ── Weighted criteria ──
  const weightedCriteria = watch('weighted_criteria') ?? [];
  const totalWeight = weightedCriteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  const addCriterion = () => {
    if (isLightweight) {
      // Auto-distribute weights equally
      const newList = [...weightedCriteria, { name: '', weight: 0 }];
      const evenWeight = Math.floor(100 / newList.length);
      const distributed = newList.map((c, i) => ({
        ...c,
        weight: i === newList.length - 1 ? 100 - evenWeight * (newList.length - 1) : evenWeight,
      }));
      setValue('weighted_criteria', distributed);
    } else {
      setValue('weighted_criteria', [...weightedCriteria, { name: '', weight: 0 }]);
    }
  };

  const removeCriterion = (index: number) => {
    if (weightedCriteria.length <= 1) return;
    const filtered = weightedCriteria.filter((_, i) => i !== index);
    if (isLightweight) {
      const evenWeight = Math.floor(100 / filtered.length);
      const distributed = filtered.map((c, i) => ({
        ...c,
        weight: i === filtered.length - 1 ? 100 - evenWeight * (filtered.length - 1) : evenWeight,
      }));
      setValue('weighted_criteria', distributed);
    } else {
      setValue('weighted_criteria', filtered);
    }
  };

  const updateCriterionName = (index: number, name: string) => {
    const updated = [...weightedCriteria];
    updated[index] = { ...updated[index], name };
    setValue('weighted_criteria', updated);
  };

  const updateCriterionWeight = (index: number, weight: number) => {
    const updated = [...weightedCriteria];
    updated[index] = { ...updated[index], weight };
    setValue('weighted_criteria', updated);
  };

  // ── Rewards ──
  const platinumAward = watch('platinum_award') ?? 0;
  const goldAward = watch('gold_award') ?? 0;
  const silverAward = watch('silver_award');
  const currencyCode = watch('currency_code') ?? 'USD';
  const currencySymbol = CURRENCY_OPTIONS.find((c) => c.value === currencyCode)?.symbol ?? '$';

  const rewardOrderValid =
    platinumAward > goldAward &&
    (silverAward === undefined || silverAward === 0 || goldAward > silverAward);
  const hasRewardValues = platinumAward > 0 && goldAward > 0;

  // ── Rejection fee ──
  const rejectionFeePct = watch('rejection_fee_pct') ?? 10;

  return (
    <div className="space-y-6">
      {/* ── 1. Evaluation Criteria ── */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Evaluation Criteria <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          {isLightweight
            ? 'Define criteria for evaluating submissions. All criteria are weighted equally.'
            : 'Define criteria and assign weights that sum to 100%'}
        </p>

        {isLightweight ? (
          /* ─── Lightweight: simple checklist (no weight column) ─── */
          <>
            <div className="space-y-2">
              {weightedCriteria.map((criterion, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="e.g., Technical Feasibility"
                    value={criterion.name}
                    onChange={(e) => updateCriterionName(index, e.target.value)}
                    className="text-base flex-1"
                  />
                  {weightedCriteria.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCriterion(index)}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="h-9 w-9 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addCriterion}
              className="text-primary hover:text-primary/80"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Criterion
            </Button>

            <p className="text-xs italic text-muted-foreground">
              All criteria are weighted equally in Lightweight mode. Enterprise mode allows custom weighting.
            </p>
          </>
        ) : (
          /* ─── Enterprise: full weighted table ─── */
          <>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_100px_40px] gap-2 px-1">
              <span className="text-xs font-medium text-muted-foreground">Criterion Name</span>
              <span className="text-xs font-medium text-muted-foreground text-center">Weight %</span>
              <span />
            </div>

            {/* Table rows */}
            <div className="space-y-2">
              {weightedCriteria.map((criterion, index) => (
                <div key={index} className="grid grid-cols-[1fr_100px_40px] gap-2 items-center">
                  <Input
                    placeholder="e.g., Technical Feasibility"
                    value={criterion.name}
                    onChange={(e) => updateCriterionName(index, e.target.value)}
                    className="text-base"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={criterion.weight}
                    onChange={(e) => updateCriterionWeight(index, Number(e.target.value) || 0)}
                    className="text-base text-center"
                  />
                  {weightedCriteria.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCriterion(index)}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="h-9 w-9" />
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addCriterion}
              className="text-primary hover:text-primary/80"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Criterion
            </Button>

            {/* Weight total indicator */}
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium',
                totalWeight === 100
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : totalWeight > 100
                    ? 'border-destructive/30 bg-destructive/5 text-destructive'
                    : 'border-amber-200 bg-amber-50 text-amber-700',
              )}
            >
              {totalWeight === 100 ? (
                <>
                  <Check className="h-4 w-4" />
                  Weights sum to 100%
                </>
              ) : totalWeight > 100 ? (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Weights exceed 100% (currently {totalWeight}%)
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Weights must sum to 100% (currently {totalWeight}%)
                </>
              )}
            </div>
          </>
        )}

        {errors.weighted_criteria && (
          <p className="text-xs text-destructive">{errors.weighted_criteria.message}</p>
        )}
      </div>

      {/* ── 2. Reward Structure ── */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Reward Structure <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Define tiered awards. Amounts must be in descending order.
        </p>

        {/* Currency selector */}
        <div className="max-w-[180px]">
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

        {/* Award tiers */}
        <div className="space-y-3">
          {/* Platinum */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 text-white text-xs font-bold shrink-0">
              P
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-sm font-medium">
                Platinum Award <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  className="text-base pl-8"
                  {...register('platinum_award', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Gold */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-white text-xs font-bold shrink-0">
              G
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-sm font-medium">
                Gold Award <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  className="text-base pl-8"
                  {...register('gold_award', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Silver */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 text-white text-xs font-bold shrink-0">
              S
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-sm font-medium">
                Silver Award <span className="text-xs text-muted-foreground ml-1">(optional)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  className="text-base pl-8"
                  {...register('silver_award', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Order validation */}
        {hasRewardValues && !rewardOrderValid && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Awards must be in descending order: Platinum &gt; Gold &gt; Silver
          </p>
        )}
      </div>

      {/* ── 3. Rejection Fee (Enterprise only) ── */}
      {!isLightweight && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">
              Rejection Fee
            </Label>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-xs">
                  The rejection fee is the percentage of the award that will be released to shortlisted
                  solvers if all submitted solutions are ultimately rejected by the challenge owner.
                  This protects solvers who invest time and resources in good-faith submissions.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-muted-foreground">
            Percentage of award released to shortlisted solvers if all solutions are rejected.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">5%</span>
              <span className="text-lg font-semibold text-foreground">{rejectionFeePct}%</span>
              <span className="text-xs text-muted-foreground">20%</span>
            </div>
            <Controller
              name="rejection_fee_pct"
              control={control}
              render={({ field }) => (
                <Slider
                  min={5}
                  max={20}
                  step={1}
                  value={[field.value ?? 10]}
                  onValueChange={([val]) => field.onChange(val)}
                  className="w-full"
                />
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
