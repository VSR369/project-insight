/**
 * CreatorPhaseTimeline — Duration selector + optional phase-wise schedule toggle.
 * STRUCTURED and CONTROLLED governance modes only.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, differenceInCalendarDays, addDays } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface PhaseEntry {
  phase_number: number;
  label: string;
  target_date: string;
  duration_days: number;
}

interface CreatorPhaseTimelineProps {
  governanceMode: 'STRUCTURED' | 'CONTROLLED';
  value: { expected_timeline?: string; phase_durations?: PhaseEntry[] };
  onChange: (val: { expected_timeline: string; phase_durations?: PhaseEntry[] }) => void;
}

const TIMELINE_OPTIONS = [
  { value: '4w', label: '4 weeks', days: 28 },
  { value: '8w', label: '8 weeks', days: 56 },
  { value: '16w', label: '16 weeks', days: 112 },
  { value: '32w', label: '32 weeks', days: 224 },
] as const;

const CREATOR_PHASES = [
  { phase_number: 5, label: 'Solver Submission Period', description: 'How long solvers have to submit solutions' },
  { phase_number: 6, label: 'Abstract/Proposal Review', description: 'Evaluation of submitted abstracts' },
  { phase_number: 8, label: 'Full Solution Review', description: 'Detailed evaluation of complete solutions' },
  { phase_number: 9, label: 'Award Decision', description: 'Winner selection and announcement' },
  { phase_number: 10, label: 'Payment & Delivery', description: 'Prize disbursement and IP transfer' },
] as const;

function timelineToDays(tl: string): number {
  return TIMELINE_OPTIONS.find((o) => o.value === tl)?.days ?? 56;
}

export function CreatorPhaseTimeline({ governanceMode, value, onChange }: CreatorPhaseTimelineProps) {
  const timeline = value.expected_timeline || '8w';
  const [showPhases, setShowPhases] = useState(() => (value.phase_durations?.length ?? 0) > 0);
  const isRequired = governanceMode === 'CONTROLLED';

  const [phases, setPhases] = useState<PhaseEntry[]>(() => {
    if (value.phase_durations?.length) return value.phase_durations;
    return CREATOR_PHASES.map((p) => ({ phase_number: p.phase_number, label: p.label, target_date: '', duration_days: 0 }));
  });

  // Sync internal state when external value changes (e.g., Fill Test Data / form.reset)
  useEffect(() => {
    const incoming = value.phase_durations;
    if (incoming?.length) {
      const hasNewData = incoming.length !== phases.length ||
        incoming.some((p, i) => p.target_date !== phases[i]?.target_date || p.label !== phases[i]?.label);
      if (hasNewData) {
        setPhases(incoming);
        setShowPhases(true);
      }
    } else if (phases.some((p) => p.target_date !== '')) {
      setShowPhases(false);
      setPhases(CREATOR_PHASES.map((p) => ({ phase_number: p.phase_number, label: p.label, target_date: '', duration_days: 0 })));
    }
  }, [value.phase_durations]);

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const calcDuration = useCallback((phases: PhaseEntry[], idx: number): number => {
    const cur = phases[idx].target_date;
    if (!cur) return 0;
    const prev = idx > 0 ? phases[idx - 1].target_date : today;
    if (!prev) return 0;
    return Math.max(0, differenceInCalendarDays(new Date(cur), new Date(prev)));
  }, [today]);

  const updatePhaseDate = useCallback((idx: number, date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const updated = phases.map((p, i) => i === idx ? { ...p, target_date: dateStr } : p);
    updated.forEach((p, i) => { p.duration_days = calcDuration(updated, i); });
    setPhases(updated);
    onChange({ expected_timeline: timeline, phase_durations: updated });
  }, [phases, timeline, onChange, calcDuration]);

  const handleTimelineChange = useCallback((val: string) => {
    if (showPhases) {
      onChange({ expected_timeline: val, phase_durations: phases });
    } else {
      onChange({ expected_timeline: val });
    }
  }, [showPhases, phases, onChange]);

  const handleToggle = useCallback((on: boolean) => {
    setShowPhases(on);
    if (on) {
      onChange({ expected_timeline: timeline, phase_durations: phases });
    } else {
      onChange({ expected_timeline: timeline });
    }
  }, [timeline, phases, onChange]);

  const validationErrors = useMemo(() => {
    if (!showPhases) return [];
    const errs: string[] = [];
    for (let i = 1; i < phases.length; i++) {
      if (phases[i].target_date && phases[i - 1].target_date && phases[i].target_date < phases[i - 1].target_date) {
        errs.push(`${phases[i].label} must be after ${phases[i - 1].label}`);
      }
    }
    return errs;
  }, [showPhases, phases]);

  const totalDays = useMemo(() => {
    if (!showPhases) return 0;
    const last = phases[phases.length - 1].target_date;
    if (!last) return 0;
    return differenceInCalendarDays(new Date(last), new Date(today));
  }, [showPhases, phases, today]);

  const selectedDays = timelineToDays(timeline);
  const daysDiff = totalDays - selectedDays;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Target Timeline {isRequired && <span className="text-destructive">*</span>}</Label>
        <Select value={timeline} onValueChange={handleTimelineChange}>
          <SelectTrigger className="w-full max-w-xs text-base"><SelectValue placeholder="Select timeline" /></SelectTrigger>
          <SelectContent>{TIMELINE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={showPhases} onCheckedChange={handleToggle} id="phase-toggle" />
        <Label htmlFor="phase-toggle" className="text-sm cursor-pointer">Define phase-wise schedule</Label>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        {showPhases
          ? 'Set target dates for each solver-facing phase. The Curator may adjust if needed.'
          : 'The Curator will distribute your total timeline across challenge phases.'}
      </p>

      {showPhases && (
        <div className="space-y-3">
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phase</TableHead>
                  <TableHead>Target Date</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phases.map((p, idx) => {
                  const meta = CREATOR_PHASES.find((c) => c.phase_number === p.phase_number);
                  const minDate = idx > 0 && phases[idx - 1].target_date ? addDays(new Date(phases[idx - 1].target_date), 1) : addDays(new Date(), 1);
                  return (
                    <TableRow key={p.phase_number}>
                      <TableCell>
                        <p className="text-sm font-medium">{p.label}</p>
                        {meta && <p className="text-xs text-muted-foreground">{meta.description}</p>}
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn('w-[160px] justify-start text-left font-normal', !p.target_date && 'text-muted-foreground')}>
                              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                              {p.target_date ? format(new Date(p.target_date), 'MMM d, yyyy') : 'Pick date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={p.target_date ? new Date(p.target_date) : undefined} onSelect={(d) => updatePhaseDate(idx, d)} disabled={(d) => d < minDate} initialFocus className="p-3 pointer-events-auto" />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="text-right">
                        {p.duration_days > 0 ? <Badge variant="secondary">{p.duration_days} days</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {validationErrors.map((err) => <p key={err} className="text-xs text-destructive">{err}</p>)}

          {totalDays > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">Total: {totalDays} days</Badge>
              {Math.abs(daysDiff) > 7 && (
                <Badge variant="outline" className={cn(daysDiff > 0 ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-primary/40 bg-primary/10 text-primary')}>
                  {daysDiff > 0 ? `${daysDiff} days over` : `${Math.abs(daysDiff)} days under`} selected timeline
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
