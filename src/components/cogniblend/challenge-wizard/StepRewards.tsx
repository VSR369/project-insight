/**
 * Step 3 — Rewards & Payment
 *
 * Extracted from the old StepEvaluation.
 * Lightweight: monetary/non-monetary toggle + single amount
 * Enterprise: 3-tier (Platinum/Gold/Silver) + rejection fee slider
 */

import { UseFormReturn, Controller } from 'react-hook-form';
import {
  AlertTriangle,
  Info,
  DollarSign,
  Award,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
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

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'INR', label: 'INR (₹)', symbol: '₹' },
] as const;

interface StepRewardsProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isLightweight: boolean;
}

export function StepRewards({ form, isLightweight }: StepRewardsProps) {
  const { register, control, watch, setValue } = form;

  const platinumAward = watch('platinum_award') ?? 0;
  const goldAward = watch('gold_award') ?? 0;
  const silverAward = watch('silver_award');
  const currencyCode = watch('currency_code') ?? 'USD';
  const currencySymbol = CURRENCY_OPTIONS.find((c) => c.value === currencyCode)?.symbol ?? '$';
  const rewardType = watch('reward_type') ?? 'monetary';
  const rejectionFeePct = watch('rejection_fee_pct') ?? 10;

  const rewardOrderValid =
    platinumAward > goldAward &&
    (silverAward === undefined || silverAward === 0 || goldAward > silverAward);
  const hasRewardValues = platinumAward > 0 && goldAward > 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground mb-1">Rewards & Payment</h3>
        <p className="text-sm text-muted-foreground">
          Define the reward structure for winning solutions.
        </p>
      </div>

      {/* ── Reward Structure ── */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Reward Structure <span className="text-destructive">*</span>
        </Label>

        {isLightweight ? (
          <>
            <p className="text-xs text-muted-foreground">Choose a reward type for this challenge.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setValue('reward_type', 'monetary', { shouldDirty: true })}
                className={cn('flex-1 flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
                  rewardType === 'monetary' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted/50')}>
                <DollarSign className={cn('h-5 w-5 shrink-0', rewardType === 'monetary' ? 'text-primary' : 'text-muted-foreground')} />
                <div>
                  <p className="text-sm font-medium text-foreground">Monetary Award</p>
                  <p className="text-xs text-muted-foreground">Cash prize for winning solutions</p>
                </div>
              </button>
              <button type="button" onClick={() => setValue('reward_type', 'non_monetary', { shouldDirty: true })}
                className={cn('flex-1 flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
                  rewardType === 'non_monetary' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted/50')}>
                <Award className={cn('h-5 w-5 shrink-0', rewardType === 'non_monetary' ? 'text-primary' : 'text-muted-foreground')} />
                <div>
                  <p className="text-sm font-medium text-foreground">Non-Monetary Recognition</p>
                  <p className="text-xs text-muted-foreground">Publication credit, partnership, etc.</p>
                </div>
              </button>
            </div>

            {rewardType === 'monetary' ? (
              <div className="flex items-end gap-3">
                <div className="max-w-[140px] space-y-1">
                  <Label className="text-xs text-muted-foreground">Currency</Label>
                  <Controller name="currency_code" control={control}
                    render={({ field }) => (
                      <Select value={field.value ?? 'USD'} onValueChange={field.onChange}>
                        <SelectTrigger className="text-base"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CURRENCY_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Award Amount <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currencySymbol}</span>
                    <Input type="number" min={0} placeholder="0" className="text-base pl-8" {...register('platinum_award', { valueAsNumber: true })} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Describe the recognition <span className="text-destructive">*</span></Label>
                <Textarea placeholder="e.g., Publication credit, partnership opportunity..." className="resize-none text-base" rows={3} {...register('reward_description')} />
              </div>
            )}
          </>
        ) : (
          /* ─── Enterprise: 3-tier ─── */
          <>
            <p className="text-xs text-muted-foreground">Define tiered awards. Amounts must be in descending order.</p>
            <div className="max-w-[180px]">
              <Label className="text-xs text-muted-foreground">Currency</Label>
              <Controller name="currency_code" control={control}
                render={({ field }) => (
                  <Select value={field.value ?? 'USD'} onValueChange={field.onChange}>
                    <SelectTrigger className="text-base"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-3">
              {/* Platinum */}
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 text-white text-xs font-bold shrink-0">P</div>
                <div className="flex-1 space-y-1">
                  <Label className="text-sm font-medium">Platinum Award <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currencySymbol}</span>
                    <Input type="number" min={0} placeholder="0" className="text-base pl-8" {...register('platinum_award', { valueAsNumber: true })} />
                  </div>
                </div>
              </div>
              {/* Gold */}
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-white text-xs font-bold shrink-0">G</div>
                <div className="flex-1 space-y-1">
                  <Label className="text-sm font-medium">Gold Award <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currencySymbol}</span>
                    <Input type="number" min={0} placeholder="0" className="text-base pl-8" {...register('gold_award', { valueAsNumber: true })} />
                  </div>
                </div>
              </div>
              {/* Silver */}
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 text-white text-xs font-bold shrink-0">S</div>
                <div className="flex-1 space-y-1">
                  <Label className="text-sm font-medium">Silver Award <span className="text-xs text-muted-foreground ml-1">(optional)</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currencySymbol}</span>
                    <Input type="number" min={0} placeholder="0" className="text-base pl-8" {...register('silver_award', { valueAsNumber: true })} />
                  </div>
                </div>
              </div>
            </div>

            {hasRewardValues && !rewardOrderValid && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Awards must be in descending order: Platinum &gt; Gold &gt; Silver
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Rejection Fee (Enterprise only) ── */}
      {!isLightweight && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Rejection Fee</Label>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-xs">
                  The rejection fee is the percentage of the award released to shortlisted
                  solvers if all submitted solutions are ultimately rejected.
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
            <Controller name="rejection_fee_pct" control={control}
              render={({ field }) => (
                <Slider min={5} max={20} step={1} value={[field.value ?? 10]} onValueChange={([val]) => field.onChange(val)} className="w-full" />
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
