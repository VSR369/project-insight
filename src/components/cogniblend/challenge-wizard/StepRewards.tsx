/**
 * Step 3 — Rewards & Payment
 *
 * Sections:
 *   1. Reward Category (monetary / non-monetary)
 *   2. Number of Rewarded Solutions (Top 1/2/3)
 *   3. Reward Tiers (Platinum/Gold/Silver)
 *   4. Total Reward Pool
 *   5. Payment Mode (Escrow / Direct)
 *   6. Payment Schedule (milestone-based)
 *   7. Platform Provider Fee banner
 *   8. Rejection Fee slider (Enterprise only)
 */

import { UseFormReturn, Controller, useFieldArray } from 'react-hook-form';
import {
  AlertTriangle,
  Info,
  DollarSign,
  Award,
  Lock,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ChallengeFormValues } from './challengeFormSchema';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'INR', label: 'INR (₹)', symbol: '₹' },
] as const;

const TRIGGER_OPTIONS = [
  { value: 'on_shortlisting', label: 'On Shortlisting' },
  { value: 'on_full_submission', label: 'On Full Submission' },
  { value: 'on_evaluation_complete', label: 'On Evaluation Complete' },
  { value: 'on_selection', label: 'On Selection' },
  { value: 'on_ip_transfer', label: 'On IP Transfer' },
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
  const silverAward = watch('silver_award') ?? 0;
  const currencyCode = watch('currency_code') ?? 'USD';
  const currencyInfo = CURRENCY_OPTIONS.find((c) => c.value === currencyCode) ?? CURRENCY_OPTIONS[0];
  const rewardType = watch('reward_type') ?? 'monetary';
  const rejectionFeePct = watch('rejection_fee_pct') ?? 10;
  const numRewarded = watch('num_rewarded_solutions') ?? '3';
  const paymentMode = watch('payment_mode') ?? 'escrow';

  const { fields: milestones, append, remove } = useFieldArray({
    control,
    name: 'payment_milestones',
  });

  const milestoneValues = watch('payment_milestones') ?? [];
  const milestoneTotal = milestoneValues.reduce((s, m) => s + (m.pct || 0), 0);

  // Tier visibility
  const showGold = numRewarded === '2' || numRewarded === '3';
  const showSilver = numRewarded === '3';

  // Total pool
  const totalPool = platinumAward + (showGold ? goldAward : 0) + (showSilver ? silverAward : 0);

  // Descending order validation
  const rewardOrderValid =
    (!showGold || platinumAward > goldAward) &&
    (!showSilver || goldAward > silverAward);
  const hasRewardValues = platinumAward > 0;

  const formatAmount = (amount: number) => {
    try {
      const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
      return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(amount);
    } catch {
      return `${currencyInfo.symbol} ${amount.toLocaleString()}`;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground mb-1">Rewards & Payment</h3>
        <p className="text-sm text-muted-foreground">
          Define the reward structure and payment schedule for winning solutions.
        </p>
      </div>

      {/* ═══ 1. Reward Category ═══ */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Reward Category <span className="text-destructive">*</span>
        </Label>

        {isLightweight ? (
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
        ) : (
          <Controller name="reward_type" control={control}
            render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="monetary" id="reward-monetary" />
                  <Label htmlFor="reward-monetary" className="text-sm cursor-pointer">Monetary</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="non_monetary" id="reward-non-monetary" />
                  <Label htmlFor="reward-non-monetary" className="text-sm cursor-pointer">Non-Monetary</Label>
                </div>
              </RadioGroup>
            )}
          />
        )}

        {rewardType === 'non_monetary' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Describe the recognition <span className="text-destructive">*</span></Label>
            <Textarea placeholder="e.g., Publication credit, partnership opportunity..." className="resize-none text-base" rows={3} {...register('reward_description')} />
          </div>
        )}
      </div>

      {/* ═══ 2. Number of Rewarded Solutions (monetary only) ═══ */}
      {rewardType === 'monetary' && (
        <>
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Number of Rewarded Solutions <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">How many top solutions will receive awards?</p>
            <Controller name="num_rewarded_solutions" control={control}
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-3">
                  {['1', '2', '3'].map((n) => (
                    <label key={n} className={cn(
                      'flex-1 flex items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors text-sm font-medium',
                      field.value === n ? 'border-primary bg-primary/5 ring-1 ring-primary text-primary' : 'border-border hover:bg-muted/50 text-foreground'
                    )}>
                      <RadioGroupItem value={n} id={`num-rewarded-${n}`} className="sr-only" />
                      Top {n}
                    </label>
                  ))}
                </RadioGroup>
              )}
            />
          </div>

          {/* ═══ 3. Reward Tiers ═══ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Reward Tiers <span className="text-destructive">*</span></Label>
              <div className="max-w-[160px]">
                <Controller name="currency_code" control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? 'USD'} onValueChange={field.onChange}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className={cn('grid gap-3', showSilver ? 'grid-cols-1 lg:grid-cols-3' : showGold ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-sm')}>
              {/* Platinum */}
              <div className="rounded-lg border border-border bg-background p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 text-white text-[10px] font-bold shrink-0">P</div>
                  <span className="text-sm font-semibold text-foreground">Platinum (1st)</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currencyInfo.symbol}</span>
                  <Input type="number" min={0} placeholder="0" className="text-base pl-8" {...register('platinum_award', { valueAsNumber: true })} />
                </div>
              </div>

              {/* Gold */}
              {showGold && (
                <div className="rounded-lg border border-border bg-background p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-white text-[10px] font-bold shrink-0">G</div>
                    <span className="text-sm font-semibold text-foreground">Gold (2nd)</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currencyInfo.symbol}</span>
                    <Input type="number" min={0} placeholder="0" className="text-base pl-8" {...register('gold_award', { valueAsNumber: true })} />
                  </div>
                </div>
              )}

              {/* Silver */}
              {showSilver && (
                <div className="rounded-lg border border-border bg-background p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 text-white text-[10px] font-bold shrink-0">S</div>
                    <span className="text-sm font-semibold text-foreground">Silver (3rd)</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currencyInfo.symbol}</span>
                    <Input type="number" min={0} placeholder="0" className="text-base pl-8" {...register('silver_award', { valueAsNumber: true })} />
                  </div>
                </div>
              )}
            </div>

            {hasRewardValues && !rewardOrderValid && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Awards must be in descending order: Platinum &gt; Gold &gt; Silver
              </p>
            )}
          </div>

          {/* ═══ 4. Total Reward Pool ═══ */}
          {totalPool > 0 && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Total Reward Pool</span>
              <span className="text-lg font-bold text-primary">{formatAmount(totalPool)}</span>
            </div>
          )}

          {/* ═══ 5. Payment Mode ═══ */}
          {!isLightweight && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Payment Mode</Label>
              <p className="text-xs text-muted-foreground">How award payments are disbursed to winning solvers.</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <button type="button"
                  onClick={() => setValue('payment_mode', 'escrow', { shouldDirty: true })}
                  className={cn('flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                    paymentMode === 'escrow' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted/50')}>
                  <ShieldCheck className={cn('h-5 w-5 shrink-0 mt-0.5', paymentMode === 'escrow' ? 'text-primary' : 'text-muted-foreground')} />
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      Platform Escrow
                      {paymentMode === 'escrow' && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Funds held securely until milestones are met.</p>
                  </div>
                </button>
                <div className={cn('flex items-start gap-3 rounded-lg border p-4 text-left opacity-50 cursor-not-allowed',
                  'border-border bg-muted/30')}>
                  <Lock className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Direct Pay</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Not available. Contact support for enterprise direct payment.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ 6. Payment Schedule ═══ */}
          {!isLightweight && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Payment Schedule (Milestone-based)</Label>
              <p className="text-xs text-muted-foreground">Define when portions of the award are released to solvers.</p>

              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Milestone</TableHead>
                      <TableHead className="w-28">% of Award</TableHead>
                      <TableHead className="w-48">Trigger Event</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {milestones.map((field, idx) => (
                      <TableRow key={field.id}>
                        <TableCell className="text-xs text-muted-foreground font-medium">{idx + 1}</TableCell>
                        <TableCell>
                          <Input
                            placeholder="Milestone name"
                            className="text-sm h-8"
                            {...register(`payment_milestones.${idx}.name`)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="0"
                            className="text-sm h-8 w-20"
                            {...register(`payment_milestones.${idx}.pct`, { valueAsNumber: true })}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`payment_milestones.${idx}.trigger`}
                            control={control}
                            render={({ field: triggerField }) => (
                              <Select value={triggerField.value ?? ''} onValueChange={triggerField.onChange}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select trigger" />
                                </SelectTrigger>
                                <SelectContent>
                                  {TRIGGER_OPTIONS.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          {milestones.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(idx)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Running Total footer */}
                    <TableRow className="bg-muted/30">
                      <TableCell />
                      <TableCell className="text-sm font-medium text-foreground">Running Total</TableCell>
                      <TableCell>
                        <span className={cn(
                          'text-sm font-semibold',
                          milestoneTotal === 100 ? 'text-green-600' : 'text-destructive'
                        )}>
                          {milestoneTotal}%{' '}
                          {milestoneTotal === 100 ? <CheckCircle2 className="h-3.5 w-3.5 inline" /> : <AlertTriangle className="h-3.5 w-3.5 inline" />}
                        </span>
                      </TableCell>
                      <TableCell />
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: '', pct: 0, trigger: '' })}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Add Milestone
              </Button>

              {milestoneTotal !== 100 && milestoneTotal > 0 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Milestone percentages must sum to 100% (currently {milestoneTotal}%)
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ 7. Platform Provider Fee banner ═══ */}
      {!isLightweight && rewardType === 'monetary' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Platform Provider Fee</p>
            <p className="text-xs text-muted-foreground mt-1">
              A platform fee is applied based on your organization's engagement model. This includes a consulting fee,
              management fee, and success fee. The exact fee structure is determined by your tier and complexity level.
              Fees are calculated at the time of challenge publication.
            </p>
          </div>
        </div>
      )}

      {/* ═══ 8. Rejection Fee (Enterprise only) ═══ */}
      {!isLightweight && rewardType === 'monetary' && (
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
