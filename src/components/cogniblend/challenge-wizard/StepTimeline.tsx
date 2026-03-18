/**
 * Step 4 — Timeline & Schedule + Complexity Assessment
 * Section 1: Phase Schedule with date pickers and duration inputs
 * Section 2: Complexity Assessment with weighted sliders (Enterprise) or dropdown (Lightweight)
 */

import { useState, useMemo, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { format, addDays } from 'date-fns';
import { CalendarIcon, Info, Check, Plus, X, Globe, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ChallengeFormValues } from './challengeFormSchema';

/* ─── Types ──────────────────────────────────────────────── */

interface StepTimelineProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isLightweight: boolean;
}

interface PhaseConfig {
  key: string;
  label: string;
  phaseNumber: number;
  defaultDays: number;
  lightweightVisible: boolean;
}

interface ComplexityParam {
  key: string;
  label: string;
  weight: number;
}

/* ─── Constants ──────────────────────────────────────────── */

const PHASES: PhaseConfig[] = [
  { key: 'phase_3', label: 'Phase 3 — Curation', phaseNumber: 3, defaultDays: 5, lightweightVisible: false },
  { key: 'phase_4', label: 'Phase 4 — ID Review', phaseNumber: 4, defaultDays: 5, lightweightVisible: false },
  { key: 'phase_5', label: 'Phase 5 — Publication', phaseNumber: 5, defaultDays: 3, lightweightVisible: false },
  { key: 'phase_8', label: 'Phase 8 — Screening', phaseNumber: 8, defaultDays: 10, lightweightVisible: true },
  { key: 'phase_9', label: 'Phase 9 — Payment', phaseNumber: 9, defaultDays: 5, lightweightVisible: false },
  { key: 'phase_10', label: 'Phase 10 — Evaluation', phaseNumber: 10, defaultDays: 30, lightweightVisible: true },
  { key: 'phase_11', label: 'Phase 11 — Selection', phaseNumber: 11, defaultDays: 5, lightweightVisible: true },
  { key: 'phase_12', label: 'Phase 12 — Payment', phaseNumber: 12, defaultDays: 5, lightweightVisible: false },
  { key: 'phase_13', label: 'Phase 13 — Closure', phaseNumber: 13, defaultDays: 14, lightweightVisible: false },
];

const COMPLEXITY_PARAMS: ComplexityParam[] = [
  { key: 'technical_novelty', label: 'Technical Novelty', weight: 0.20 },
  { key: 'solution_maturity', label: 'Solution Maturity', weight: 0.15 },
  { key: 'domain_breadth', label: 'Domain Breadth', weight: 0.15 },
  { key: 'evaluation_complexity', label: 'Evaluation Complexity', weight: 0.15 },
  { key: 'ip_sensitivity', label: 'IP Sensitivity', weight: 0.15 },
  { key: 'timeline_urgency', label: 'Timeline Urgency', weight: 0.10 },
  { key: 'budget_scale', label: 'Budget Scale', weight: 0.10 },
];

/** Lightweight complexity options with fixed scores */
const LW_COMPLEXITY_OPTIONS = [
  { value: 'low', label: 'Low', description: 'Routine problem, well-understood domain', level: 'L1', score: 2.0, badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'medium', label: 'Medium', description: 'Moderate novelty, some cross-domain', level: 'L3', score: 5.0, badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'high', label: 'High', description: 'Significant innovation, new territory', level: 'L5', score: 9.0, badgeClass: 'bg-red-100 text-red-800 border-red-300' },
] as const;

function getComplexityLevel(score: number): { label: string; level: string; colorClass: string } {
  if (score < 2.0) return { label: 'L1', level: 'Low', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  if (score < 4.0) return { label: 'L2', level: 'Low-Medium', colorClass: 'bg-blue-100 text-blue-800 border-blue-300' };
  if (score < 6.0) return { label: 'L3', level: 'Medium', colorClass: 'bg-amber-100 text-amber-800 border-amber-300' };
  if (score < 8.0) return { label: 'L4', level: 'High', colorClass: 'bg-orange-100 text-orange-800 border-orange-300' };
  return { label: 'L5', level: 'Very High', colorClass: 'bg-red-100 text-red-800 border-red-300' };
}

/* ─── Component ──────────────────────────────────────────── */

export function StepTimeline({ form, mandatoryFields, isLightweight }: StepTimelineProps) {
  const { setValue, watch } = form;

  // Phase durations state
  const existingSchedule = watch('phase_durations') ?? {};
  const [phaseDurations, setPhaseDurations] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    PHASES.forEach((p) => {
      initial[p.key] = (existingSchedule as any)?.[p.key] ?? p.defaultDays;
    });
    return initial;
  });

  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const sd = watch('submission_deadline');
    return sd ? new Date(sd) : new Date();
  });

  // Complexity sliders state
  const existingParams = watch('complexity_params') ?? {};
  const [paramValues, setParamValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    COMPLEXITY_PARAMS.forEach((p) => {
      initial[p.key] = (existingParams as any)?.[p.key] ?? 5;
    });
    return initial;
  });

  // Lightweight complexity dropdown
  const [lwComplexity, setLwComplexity] = useState<string>(() => {
    const notes = watch('complexity_notes') ?? '';
    if (notes === 'high') return 'high';
    if (notes === 'medium') return 'medium';
    return 'low';
  });

  // Visible phases
  const visiblePhases = isLightweight
    ? PHASES.filter((p) => p.lightweightVisible)
    : PHASES;

  // Phase start dates calculated sequentially
  const phaseStartDates = useMemo(() => {
    const dates: Record<string, Date> = {};
    let cursor = startDate ?? new Date();
    visiblePhases.forEach((p) => {
      dates[p.key] = cursor;
      cursor = addDays(cursor, phaseDurations[p.key] ?? p.defaultDays);
    });
    return dates;
  }, [startDate, phaseDurations, visiblePhases]);

  // Total duration
  const totalDays = useMemo(() => {
    return visiblePhases.reduce((sum, p) => sum + (phaseDurations[p.key] ?? p.defaultDays), 0);
  }, [phaseDurations, visiblePhases]);

  const totalMonths = (totalDays / 30).toFixed(1);

  // Complexity score
  const complexityScore = useMemo(() => {
    return COMPLEXITY_PARAMS.reduce((sum, p) => sum + (paramValues[p.key] ?? 5) * p.weight, 0);
  }, [paramValues]);

  const complexityInfo = getComplexityLevel(complexityScore);

  // Sync to form
  useEffect(() => {
    setValue('phase_durations', phaseDurations as any, { shouldDirty: true });
  }, [phaseDurations, setValue]);

  useEffect(() => {
    if (startDate) {
      setValue('submission_deadline', startDate.toISOString().substring(0, 16), { shouldDirty: true });
    }
  }, [startDate, setValue]);

  useEffect(() => {
    if (!isLightweight) {
      setValue('complexity_params', paramValues as any, { shouldDirty: true });
      setValue('complexity_notes', complexityScore.toFixed(1), { shouldDirty: true });
    } else {
      setValue('complexity_notes', lwComplexity, { shouldDirty: true });
    }
  }, [paramValues, complexityScore, lwComplexity, isLightweight, setValue]);

  const handleDurationChange = (key: string, val: number) => {
    setPhaseDurations((prev) => ({ ...prev, [key]: Math.max(1, val) }));
  };

  const handleParamChange = (key: string, val: number[]) => {
    setParamValues((prev) => ({ ...prev, [key]: val[0] }));
  };

  const isRequired = (field: string) => mandatoryFields.includes(field);

  return (
    <div className="space-y-8">
      {/* ═══ SECTION 1: Phase Schedule ═══ */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">
            Phase Schedule {isRequired('phase_schedule') && <span className="text-destructive">*</span>}
          </h3>
          <p className="text-xs text-muted-foreground">
            Set start date and duration for each phase. Subsequent phase dates auto-calculate.
          </p>
        </div>

        {/* Start date picker */}
        <div className="space-y-1.5">
          <Label className="text-[13px] font-semibold">Challenge Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full max-w-xs justify-start text-left text-base font-normal',
                  !startDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                disabled={(d) => d < new Date()}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Phase rows */}
        <div className="space-y-2">
          {visiblePhases.map((phase) => (
            <div
              key={phase.key}
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-foreground truncate">{phase.label}</p>
                <p className="text-xs text-muted-foreground">
                  Starts: {phaseStartDates[phase.key] ? format(phaseStartDates[phase.key], 'MMM d, yyyy') : '—'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={phaseDurations[phase.key]}
                  onChange={(e) => handleDurationChange(phase.key, parseInt(e.target.value) || 1)}
                  className="w-[72px] text-base text-center"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">days</span>
              </div>
            </div>
          ))}
        </div>

        {/* Total timeline */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm font-bold text-foreground">
            Estimated total duration:{' '}
            <span className="text-primary">{totalDays} days</span>
            <span className="text-muted-foreground font-normal"> ({totalMonths} months)</span>
          </p>
        </div>
      </div>

      {/* ═══ SECTION 2: Publication Settings (Lightweight Only) ═══ */}
      {isLightweight && (
        <div className="space-y-4 border-t border-border pt-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              Publication Settings <span className="text-destructive">*</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure who can see and submit solutions to this challenge.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visibility */}
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">
                Who can see this challenge? <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch('visibility') || 'public'}
                onValueChange={(v) => {
                  setValue('visibility', v, { shouldDirty: true });
                  // Reset eligibility if it becomes invalid
                  const elig = watch('eligibility') || '';
                  if (v === 'invite_only' && elig !== 'invited_only') {
                    setValue('eligibility', 'invited_only', { shouldDirty: true });
                  }
                }}
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div>
                      <span className="font-medium">Public</span>
                      <p className="text-xs text-muted-foreground">Anyone on the internet can see this challenge</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="invite_only">
                    <div>
                      <span className="font-medium">Invite Only</span>
                      <p className="text-xs text-muted-foreground">Only specific invitees can view</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Eligibility */}
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">
                Who can submit solutions? <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch('eligibility') || 'anyone'}
                onValueChange={(v) => setValue('eligibility', v, { shouldDirty: true })}
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select eligibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="anyone"
                    disabled={watch('visibility') === 'invite_only'}
                  >
                    <div>
                      <span className="font-medium">Anyone</span>
                      <p className="text-xs text-muted-foreground">Open to all solvers</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="invited_only">
                    <div>
                      <span className="font-medium">Invited Only</span>
                      <p className="text-xs text-muted-foreground">Only invited experts can submit</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {watch('visibility') === 'invite_only' && watch('eligibility') !== 'invited_only' && (
                <p className="text-xs text-destructive mt-1">
                  Eligibility cannot be broader than visibility. Solvers must be able to see the challenge to submit.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ SECTION 3: Complexity Assessment ═══ */}
      <div className="space-y-4 border-t border-border pt-6">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">Complexity Assessment</h3>
          <p className="text-xs text-muted-foreground">
            {isLightweight
              ? 'Select the overall complexity level for this challenge.'
              : 'Rate each parameter to calculate the complexity score.'}
          </p>
        </div>

        {isLightweight ? (
          /* ─── Lightweight: simple dropdown with badge ─── */
          <div className="space-y-3 max-w-md">
            <Label className="text-[13px] font-semibold">Challenge Complexity</Label>
            <Select value={lwComplexity} onValueChange={setLwComplexity}>
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select complexity" />
              </SelectTrigger>
              <SelectContent>
                {LW_COMPLEXITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{opt.label} — {opt.description}</span>
                      <span className="text-xs text-muted-foreground">Maps to {opt.level} (score {opt.score})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Selected complexity badge */}
            {(() => {
              const selected = LW_COMPLEXITY_OPTIONS.find((o) => o.value === lwComplexity);
              if (!selected) return null;
              return (
                <div className="rounded-lg border border-border bg-muted/30 px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">Selected Complexity</p>
                    <p className="text-xs text-muted-foreground">{selected.description}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('text-sm px-3 py-1 font-semibold', selected.badgeClass)}
                  >
                    {selected.level} — {selected.label}
                  </Badge>
                </div>
              );
            })()}
          </div>
        ) : (
          /* ─── Enterprise: parameter sliders ─── */
          <TooltipProvider>
            <div className="space-y-5">
              {COMPLEXITY_PARAMS.map((param) => (
                <div key={param.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-foreground">{param.label}</span>
                      <Badge variant="secondary" className="text-[11px] px-1.5 py-0 font-normal">
                        {(param.weight * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold text-primary tabular-nums w-6 text-right">
                      {paramValues[param.key]}
                    </span>
                  </div>
                  <Slider
                    value={[paramValues[param.key]]}
                    onValueChange={(v) => handleParamChange(param.key, v)}
                    min={0}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>
              ))}

              {/* Score display */}
              <div className="rounded-lg border border-border bg-muted/30 px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[18px] font-bold text-foreground">
                    Complexity Score: {complexityScore.toFixed(1)}
                  </p>
                </div>
                <Badge className={cn('text-sm px-3 py-1 border font-semibold', complexityInfo.colorClass)}>
                  {complexityInfo.label} — {complexityInfo.level}
                </Badge>
              </div>
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
