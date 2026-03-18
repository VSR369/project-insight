/**
 * Step 4 — Timeline & Phase Schedule
 *
 * Sections:
 *   1. Overall Timeline (start date, deadline, total duration)
 *   2. Phase Schedule Configuration (table with auto-calculated dates)
 *   3. Visual Timeline (Gantt View)
 *   4. Complexity Assessment
 */

import { useState, useMemo, useEffect } from 'react';
import { useComplexityParams } from '@/hooks/queries/useComplexityParams';
import { UseFormReturn } from 'react-hook-form';
import { format, addDays, differenceInDays } from 'date-fns';
import { CalendarIcon, Info, Plus, X, Globe, Lock, ChevronRight, Eye, UserPlus, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { AccessModelSummary } from '@/components/cogniblend/AccessModelSummary';
import { TargetingFiltersSection, EMPTY_TARGETING_FILTERS } from '@/components/cogniblend/publication/TargetingFiltersSection';
import type { TargetingFilters } from '@/components/cogniblend/publication/TargetingFiltersSection';

/* ─── Types ──────────────────────────────────────────────── */

interface StepTimelineProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isLightweight: boolean;
}

interface PhaseConfig {
  key: string;
  letter: string;
  label: string;
  defaultDays: number;
  lightweightVisible: boolean;
  color: string;
}

/* ─── Constants ──────────────────────────────────────────── */

const PHASES: PhaseConfig[] = [
  { key: 'curation_period',        letter: 'a', label: 'Curation Period',                  defaultDays: 7,  lightweightVisible: false, color: 'bg-blue-800' },
  { key: 'id_review',              letter: 'b', label: 'Innovation Director Review',       defaultDays: 5,  lightweightVisible: false, color: 'bg-blue-600' },
  { key: 'modification_period',    letter: 'c', label: 'Modification Period (if returned)', defaultDays: 5,  lightweightVisible: false, color: 'bg-red-400' },
  { key: 'qa_period',              letter: 'd', label: 'Q&A Period',                       defaultDays: 14, lightweightVisible: true,  color: 'bg-orange-500' },
  { key: 'abstract_submission',    letter: 'e', label: 'Abstract Submission Deadline',     defaultDays: 21, lightweightVisible: true,  color: 'bg-indigo-500' },
  { key: 'screening_shortlisting', letter: 'f', label: 'Screening / Shortlisting',        defaultDays: 10, lightweightVisible: true,  color: 'bg-teal-500' },
  { key: 'full_solution_upload',   letter: 'g', label: 'Full Solution Upload',             defaultDays: 30, lightweightVisible: true,  color: 'bg-purple-600' },
  { key: 'expert_evaluation',      letter: 'h', label: 'Expert Evaluation',                defaultDays: 21, lightweightVisible: true,  color: 'bg-red-600' },
  { key: 'final_selection',        letter: 'i', label: 'Final Selection Decision',         defaultDays: 7,  lightweightVisible: true,  color: 'bg-emerald-500' },
];

/* ─── Complexity helpers ─────────────────────────────────── */

const FALLBACK_COMPLEXITY_PARAMS = [
  { param_key: 'technical_novelty', name: 'Technical Novelty', weight: 0.20 },
  { param_key: 'solution_maturity', name: 'Solution Maturity', weight: 0.15 },
  { param_key: 'domain_breadth', name: 'Domain Breadth', weight: 0.15 },
  { param_key: 'evaluation_complexity', name: 'Evaluation Complexity', weight: 0.15 },
  { param_key: 'ip_sensitivity', name: 'IP Sensitivity', weight: 0.15 },
  { param_key: 'timeline_urgency', name: 'Timeline Urgency', weight: 0.10 },
  { param_key: 'budget_scale', name: 'Budget Scale', weight: 0.10 },
];

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

/* ─── Lightweight Visibility Toggle ──────────────────────── */

function LightweightVisibilityToggle({ form }: { form: UseFormReturn<ChallengeFormValues> }) {
  const { setValue, watch } = form;
  const visibility = watch('visibility') || 'public';
  const isPublic = visibility === 'public';

  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');

  const handleToggle = (checked: boolean) => {
    if (checked) {
      setValue('visibility', 'public', { shouldDirty: true });
      setValue('eligibility', 'anyone', { shouldDirty: true });
    } else {
      setValue('visibility', 'invite_only', { shouldDirty: true });
      setValue('eligibility', 'invited_only', { shouldDirty: true });
    }
  };

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || inviteEmails.includes(email)) return;
    setInviteEmails((prev) => [...prev, email]);
    setEmailInput('');
  };

  const removeEmail = (email: string) => {
    setInviteEmails((prev) => prev.filter((e) => e !== email));
  };

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-foreground">
          Challenge Visibility <span className="text-destructive">*</span>
        </h3>
        <p className="text-xs text-muted-foreground">
          Control who can discover and submit solutions to this challenge.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isPublic ? <Globe className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
            <div>
              <p className="text-sm font-bold text-foreground">{isPublic ? 'Public' : 'Private — Invite Only'}</p>
              <p className="text-xs text-muted-foreground">{isPublic ? 'Anyone can see and submit solutions' : 'Only invited solvers can view and submit'}</p>
            </div>
          </div>
          <Switch checked={isPublic} onCheckedChange={handleToggle} />
        </div>
      </div>

      {!isPublic && (
        <div className="space-y-3 rounded-lg border border-border bg-background p-4">
          <Label className="text-[13px] font-semibold">Invite Solvers</Label>
          <p className="text-xs text-muted-foreground">Add email addresses of solvers who should be invited.</p>
          <div className="flex gap-2">
            <Input type="email" placeholder="solver@example.com" value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
              className="text-base flex-1" />
            <Button type="button" size="sm" onClick={addEmail} disabled={!emailInput.trim()} className="shrink-0">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          {inviteEmails.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {inviteEmails.map((email) => (
                <Badge key={email} variant="secondary" className="flex items-center gap-1 text-xs py-1 px-2">
                  {email}
                  <button type="button" onClick={() => removeEmail(email)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-muted-foreground">No solvers invited yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Enterprise 3-Tier Publication Config ───────────────── */

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Visible to everyone on the platform and search engines' },
  { value: 'registered_users', label: 'Registered Users', description: 'Visible only to authenticated platform users' },
  { value: 'platform_members', label: 'Platform Members', description: 'Visible only to users with active memberships' },
  { value: 'curated_experts', label: 'Curated Experts', description: 'Visible only to experts curated by the platform' },
  { value: 'invited_only', label: 'Invited Only', description: 'Visible only to specifically invited participants' },
] as const;

const ENROLLMENT_OPTIONS = [
  { value: 'open_auto', label: 'Open Enrollment (auto-approved)', description: 'Anyone eligible can enroll without approval' },
  { value: 'curator_approved', label: 'Curator-Approved Enrollment', description: 'Curator reviews and approves enrollment requests' },
  { value: 'direct_nda', label: 'Direct Registration (NDA required)', description: 'Enrollment requires signing an NDA first' },
  { value: 'org_curated', label: 'Organization-Curated', description: 'The seeking organization selects who can enroll' },
  { value: 'invitation_only', label: 'Invitation Only', description: 'Only specifically invited solvers can enroll' },
] as const;

const SUBMISSION_OPTIONS = [
  { value: 'all_enrolled', label: 'All Enrolled', description: 'Any enrolled participant can submit solutions' },
  { value: 'shortlisted_only', label: 'Shortlisted Only', description: 'Only shortlisted participants can submit' },
  { value: 'invited_solvers', label: 'Invited Solvers Only', description: 'Only specifically invited solvers can submit' },
] as const;

const VALID_ENROLLMENTS: Record<string, string[]> = {
  public: ['open_auto', 'curator_approved', 'direct_nda', 'org_curated', 'invitation_only'],
  registered_users: ['open_auto', 'curator_approved', 'direct_nda', 'org_curated', 'invitation_only'],
  platform_members: ['curator_approved', 'direct_nda', 'org_curated', 'invitation_only'],
  curated_experts: ['curator_approved', 'org_curated', 'invitation_only'],
  invited_only: ['invitation_only'],
};

const VALID_SUBMISSIONS: Record<string, string[]> = {
  open_auto: ['all_enrolled', 'shortlisted_only', 'invited_solvers'],
  curator_approved: ['all_enrolled', 'shortlisted_only', 'invited_solvers'],
  direct_nda: ['all_enrolled', 'shortlisted_only', 'invited_solvers'],
  org_curated: ['all_enrolled', 'shortlisted_only', 'invited_solvers'],
  invitation_only: ['invited_solvers'],
};

const ELIGIBILITY_MODELS = [
  { code: 'OPEN', label: 'Open', description: 'Anyone registered can participate', visibility: 'public', enrollment: 'open_auto', submission: 'all_enrolled' },
  { code: 'DR', label: 'Direct Registration', description: 'Open with NDA requirement', visibility: 'registered_users', enrollment: 'direct_nda', submission: 'all_enrolled' },
  { code: 'OC', label: 'Organization-Curated', description: 'Org-level pre-approved pool', visibility: 'platform_members', enrollment: 'org_curated', submission: 'all_enrolled' },
  { code: 'CE', label: 'Curated Expert', description: 'Platform-verified experts only', visibility: 'curated_experts', enrollment: 'curator_approved', submission: 'shortlisted_only' },
  { code: 'IO', label: 'Invitation Only', description: 'Seeker invites specific solvers', visibility: 'invited_only', enrollment: 'invitation_only', submission: 'invited_solvers' },
] as const;

function EnterprisePublicationConfig({ form }: { form: UseFormReturn<ChallengeFormValues> }) {
  const { setValue, watch } = form;
  const vis = watch('challenge_visibility') || 'public';
  const enr = watch('challenge_enrollment') || 'open_auto';
  const sub = watch('challenge_submission') || 'all_enrolled';

  const validEnrollments = VALID_ENROLLMENTS[vis] ?? ENROLLMENT_OPTIONS.map((o) => o.value);
  const validSubmissions = VALID_SUBMISSIONS[enr] ?? SUBMISSION_OPTIONS.map((o) => o.value);

  const isEnrollmentDisabled = (value: string) => !validEnrollments.includes(value);
  const isSubmissionDisabled = (value: string) => !validSubmissions.includes(value);

  useEffect(() => {
    if (!validEnrollments.includes(enr)) {
      setValue('challenge_enrollment', validEnrollments[0], { shouldDirty: true });
    }
  }, [vis]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!validSubmissions.includes(sub)) {
      setValue('challenge_submission', validSubmissions[0], { shouldDirty: true });
    }
  }, [enr]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreset = (model: typeof ELIGIBILITY_MODELS[number]) => {
    setValue('challenge_visibility', model.visibility, { shouldDirty: true });
    setValue('challenge_enrollment', model.enrollment, { shouldDirty: true });
    setValue('challenge_submission', model.submission, { shouldDirty: true });
  };

  const activePreset = ELIGIBILITY_MODELS.find(
    (m) => m.visibility === vis && m.enrollment === enr && m.submission === sub
  );

  const tierCards = [
    { title: 'Tier 1 — Visibility', subtitle: 'Who can SEE the challenge', icon: Eye, value: vis, onChange: (v: string) => setValue('challenge_visibility', v, { shouldDirty: true }), options: VISIBILITY_OPTIONS, isDisabled: () => false },
    { title: 'Tier 2 — Enrollment', subtitle: 'Who can REQUEST to participate', icon: UserPlus, value: enr, onChange: (v: string) => setValue('challenge_enrollment', v, { shouldDirty: true }), options: ENROLLMENT_OPTIONS, isDisabled: isEnrollmentDisabled },
    { title: 'Tier 3 — Submission', subtitle: 'Who can SUBMIT solutions', icon: FileText, value: sub, onChange: (v: string) => setValue('challenge_submission', v, { shouldDirty: true }), options: SUBMISSION_OPTIONS, isDisabled: isSubmissionDisabled },
  ];

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-foreground">
          Publication Configuration <span className="text-destructive">*</span>
        </h3>
        <p className="text-xs text-muted-foreground">
          Select an eligibility model or manually configure tiers. Funnel: Visibility ≥ Enrollment ≥ Submission.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-[13px] font-semibold">Solver Eligibility Model</Label>
        <div className="flex flex-wrap gap-2">
          {ELIGIBILITY_MODELS.map((model) => (
            <button key={model.code} type="button" onClick={() => applyPreset(model)}
              className={cn('rounded-lg border px-3 py-2 text-left transition-colors text-xs',
                activePreset?.code === model.code ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/50')}>
              <span className="font-bold">{model.code}</span>
              <span className="ml-1.5">{model.label}</span>
            </button>
          ))}
        </div>
        {activePreset ? (
          <p className="text-xs text-muted-foreground italic">{activePreset.description}</p>
        ) : (
          <p className="text-xs text-muted-foreground italic">Custom configuration — no preset matches.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        {tierCards.map((tier, idx) => {
          const Icon = tier.icon;
          const selectedOpt = tier.options.find((o) => o.value === tier.value);
          return (
            <div key={tier.title} className="relative flex">
              {idx > 0 && (
                <div className="hidden lg:flex absolute -left-[14px] top-1/2 -translate-y-1/2 z-10">
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <Card className="flex-1 flex flex-col">
                <CardHeader className="pb-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">{tier.title}</CardTitle>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{tier.subtitle}</p>
                </CardHeader>
                <CardContent className="flex-1 pt-0 space-y-2">
                  <Select value={tier.value} onValueChange={tier.onChange}>
                    <SelectTrigger className="text-base w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tier.options.map((opt) => {
                        const disabled = tier.isDisabled(opt.value);
                        return (
                          <SelectItem key={opt.value} value={opt.value} disabled={disabled}>
                            <span className={cn(disabled && 'opacity-50')}>{opt.label}</span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedOpt && <p className="text-[11px] text-muted-foreground leading-tight">{selectedOpt.description}</p>}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <AccessModelSummary visibility={vis} enrollment={enr} submission={sub} />
    </div>
  );
}

/* ─── Gantt View ─────────────────────────────────────────── */

interface GanttViewProps {
  phases: PhaseConfig[];
  phaseDurations: Record<string, number>;
  startDate: Date;
  totalDays: number;
}

function GanttView({ phases, phaseDurations, startDate, totalDays }: GanttViewProps) {
  const endDate = addDays(startDate, totalDays);

  // Calculate each phase's position
  const phasePositions = useMemo(() => {
    let dayOffset = 0;
    return phases.map((phase) => {
      const duration = phaseDurations[phase.key] ?? phase.defaultDays;
      const start = dayOffset;
      dayOffset += duration;
      return { ...phase, startDay: start, duration, pct: (duration / totalDays) * 100 };
    });
  }, [phases, phaseDurations, totalDays]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-foreground">Visual Timeline (Gantt View)</h3>
      </div>

      {/* Total timeline bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total Timeline</span>
          <span className="text-xs font-medium text-muted-foreground">{totalDays} days</span>
        </div>
        <div className="rounded-md bg-primary h-7 flex items-center px-3 text-[11px] font-semibold text-primary-foreground">
          {format(startDate, 'yyyy-MM-dd')} → {format(endDate, 'yyyy-MM-dd')}
        </div>
      </div>

      {/* Individual phase bars */}
      <div className="space-y-3 mt-2">
        {phasePositions.map((phase) => (
          <div key={phase.key} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground font-medium">
                {phase.letter}. {phase.label}
              </span>
              <span className="text-xs text-muted-foreground">{phase.duration} days</span>
            </div>
            <div className="relative w-full h-5 rounded bg-muted/30">
              <div
                className={cn('absolute top-0 h-full rounded text-[10px] font-semibold text-white flex items-center px-1.5 min-w-[24px]', phase.color)}
                style={{
                  left: `${(phase.startDay / totalDays) * 100}%`,
                  width: `${Math.max(phase.pct, 2)}%`,
                }}
              >
                {phase.duration > 5 ? `${phase.duration}d` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Phase Color Legend */}
      <div className="pt-3 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground mb-2">Phase Color Legend:</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {phases.map((phase) => (
            <div key={phase.key} className="flex items-center gap-1.5">
              <div className={cn('h-3 w-3 rounded-sm', phase.color)} />
              <span className="text-[11px] text-muted-foreground">{phase.letter}. {phase.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */

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

  const [overallDeadline, setOverallDeadline] = useState<Date | undefined>(undefined);

  // Fetch complexity params from master data
  const { data: dbComplexityParams } = useComplexityParams();
  const complexityParams = useMemo(() => {
    if (dbComplexityParams && dbComplexityParams.length > 0) return dbComplexityParams;
    return FALLBACK_COMPLEXITY_PARAMS;
  }, [dbComplexityParams]);

  // Complexity sliders state
  const existingParams = watch('complexity_params') ?? {};
  const [paramValues, setParamValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    FALLBACK_COMPLEXITY_PARAMS.forEach((p) => {
      initial[p.param_key] = (existingParams as any)?.[p.param_key] ?? 5;
    });
    return initial;
  });

  useEffect(() => {
    if (dbComplexityParams && dbComplexityParams.length > 0) {
      setParamValues((prev) => {
        const next: Record<string, number> = {};
        dbComplexityParams.forEach((p) => {
          next[p.param_key] = prev[p.param_key] ?? (existingParams as any)?.[p.param_key] ?? 5;
        });
        return next;
      });
    }
  }, [dbComplexityParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const [lwComplexity, setLwComplexity] = useState<string>(() => {
    const notes = watch('complexity_notes') ?? '';
    if (notes === 'high') return 'high';
    if (notes === 'medium') return 'medium';
    return 'low';
  });

  // Visible phases
  const visiblePhases = isLightweight ? PHASES.filter((p) => p.lightweightVisible) : PHASES;

  // Total duration
  const totalDays = useMemo(() => {
    return visiblePhases.reduce((sum, p) => sum + (phaseDurations[p.key] ?? p.defaultDays), 0);
  }, [phaseDurations, visiblePhases]);

  // Phase start/end dates calculated sequentially
  const phaseScheduleData = useMemo(() => {
    const data: Record<string, { start: Date; end: Date }> = {};
    let cursor = startDate ?? new Date();
    visiblePhases.forEach((p) => {
      const dur = phaseDurations[p.key] ?? p.defaultDays;
      const end = addDays(cursor, dur);
      data[p.key] = { start: cursor, end };
      cursor = end;
    });
    return data;
  }, [startDate, phaseDurations, visiblePhases]);

  // Auto-calculate overall deadline from phases
  const calculatedDeadline = useMemo(() => {
    return addDays(startDate ?? new Date(), totalDays);
  }, [startDate, totalDays]);

  // Set overall deadline from calculated if not manually set
  useEffect(() => {
    if (!overallDeadline) {
      setOverallDeadline(calculatedDeadline);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Total duration display (between start and deadline)
  const displayTotalDays = useMemo(() => {
    if (startDate && overallDeadline) {
      return differenceInDays(overallDeadline, startDate);
    }
    return totalDays;
  }, [startDate, overallDeadline, totalDays]);

  // Complexity score
  const complexityScore = useMemo(() => {
    return complexityParams.reduce((sum, p) => sum + (paramValues[p.param_key] ?? 5) * p.weight, 0);
  }, [paramValues, complexityParams]);

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
      {/* ═══ SECTION 1: Overall Timeline ═══ */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground italic">Overall Timeline</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
          {/* Challenge Start Date */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold">
              Challenge Start Date <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline"
                  className={cn('w-full justify-start text-left text-base font-normal', !startDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'dd-MM-yyyy') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate}
                  disabled={(d) => d < new Date()} initialFocus className={cn('p-3 pointer-events-auto')} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Overall Deadline */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold">
              Overall Deadline <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline"
                  className={cn('w-full justify-start text-left text-base font-normal', !overallDeadline && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {overallDeadline ? format(overallDeadline, 'dd-MM-yyyy') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={overallDeadline} onSelect={setOverallDeadline}
                  disabled={(d) => startDate ? d <= startDate : d < new Date()} initialFocus className={cn('p-3 pointer-events-auto')} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Total Duration */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold">Total Duration</Label>
            <div className="flex items-center h-10 rounded-md border border-input bg-muted/30 px-4">
              <span className="text-base font-bold text-primary">{displayTotalDays} days</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 2: Phase Schedule Configuration ═══ */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground italic">Phase Schedule Configuration</h3>
          <p className="text-xs text-muted-foreground">
            Configure duration for each downstream phase. Default values from System Master Data shown as placeholders.
          </p>
        </div>

        <div className="relative w-full overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Phase</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Duration (Days) *</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Default</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Start Date (auto)</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">End Date (auto)</th>
              </tr>
            </thead>
            <tbody>
              {visiblePhases.map((phase, idx) => {
                const schedule = phaseScheduleData[phase.key];
                return (
                  <tr key={phase.key} className={cn('border-b border-border last:border-b-0', idx % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-medium text-foreground">{phase.letter}. {phase.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <Input type="number" min={1} max={365}
                          value={phaseDurations[phase.key]}
                          onChange={(e) => handleDurationChange(phase.key, parseInt(e.target.value) || 1)}
                          className="w-[68px] text-base text-center" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-muted-foreground">({phase.defaultDays})</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-muted-foreground">
                        {schedule ? format(schedule.start, 'MMM d') : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-muted-foreground">
                        {schedule ? format(schedule.end, 'MMM d') : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Info banner */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-3 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Default values are from System Master Data. You can customise per challenge. Phase dates auto-calculate based on durations.
          </p>
        </div>
      </div>

      {/* ═══ SECTION 3: Gantt View ═══ */}
      {startDate && (
        <GanttView
          phases={visiblePhases}
          phaseDurations={phaseDurations}
          startDate={startDate}
          totalDays={totalDays}
        />
      )}

      {/* ═══ SECTION 4: Complexity Assessment ═══ */}
      <div className="space-y-4 border-t border-border pt-6">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">Complexity Assessment</h3>
          <p className="text-xs text-muted-foreground">
            {isLightweight ? 'Select the overall complexity level for this challenge.' : 'Rate each parameter to calculate the complexity score.'}
          </p>
        </div>

        {isLightweight ? (
          <div className="space-y-3 max-w-md">
            <Label className="text-[13px] font-semibold">Challenge Complexity</Label>
            <Select value={lwComplexity} onValueChange={setLwComplexity}>
              <SelectTrigger className="text-base"><SelectValue placeholder="Select complexity" /></SelectTrigger>
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

            {(() => {
              const selected = LW_COMPLEXITY_OPTIONS.find((o) => o.value === lwComplexity);
              if (!selected) return null;
              return (
                <div className="rounded-lg border border-border bg-muted/30 px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">Selected Complexity</p>
                    <p className="text-xs text-muted-foreground">{selected.description}</p>
                  </div>
                  <Badge variant="outline" className={cn('text-sm px-3 py-1 font-semibold', selected.badgeClass)}>
                    {selected.level} — {selected.label}
                  </Badge>
                </div>
              );
            })()}
          </div>
        ) : (
          <TooltipProvider>
            <div className="space-y-5">
              {complexityParams.map((param) => (
                <div key={param.param_key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-foreground">{param.name}</span>
                      <Badge variant="secondary" className="text-[11px] px-1.5 py-0 font-normal">
                        {(param.weight * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold text-primary tabular-nums w-6 text-right">
                      {paramValues[param.param_key]}
                    </span>
                  </div>
                  <Slider
                    value={[paramValues[param.param_key] ?? 5]}
                    onValueChange={(v) => handleParamChange(param.param_key, v)}
                    min={0} max={10} step={1} className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0</span><span>5</span><span>10</span>
                  </div>
                </div>
              ))}

              <div className="rounded-lg border border-border bg-muted/30 px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[18px] font-bold text-foreground">Complexity Score: {complexityScore.toFixed(1)}</p>
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
