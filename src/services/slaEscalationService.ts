/**
 * SLA Escalation Service
 *
 * Provides:
 *  - parsePhaseScheduleThresholds: extract configurable breach thresholds from phase_schedule JSON
 *  - computeAutoHold: determine if a phase has auto_hold enabled
 *  - useSLAEscalationStatus: hook to display escalation tier info in UI
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PhaseThresholdConfig {
  duration_days: number;
  warn_at_percent: number;
  breach_at_percent: number;
  auto_hold: boolean;
}

export interface SLATimerWithEscalation {
  timer_id: string;
  challenge_id: string;
  phase: number;
  role_code: string;
  status: string;
  deadline_at: string;
  breached_at: string | null;
  escalation_tier: number;
  auto_hold_on_breach: boolean;
  last_escalated_at: string | null;
  started_at: string;
  warning_sent_at: string | null;
  phase_duration_days: number | null;
}

/**
 * Compute percentage elapsed for an SLA timer.
 * Returns a value between 0 and 1+ (>1 means breached).
 */
export function computeSlaElapsedPercent(
  startedAt: string,
  deadlineAt: string,
): number {
  const startMs = new Date(startedAt).getTime();
  const deadlineMs = new Date(deadlineAt).getTime();
  const totalDuration = deadlineMs - startMs;
  if (totalDuration <= 0) return 1;
  const elapsed = Date.now() - startMs;
  return elapsed / totalDuration;
}

const TIER_LABELS: Record<number, string> = {
  0: 'No Escalation',
  1: 'Tier 1 — Assigned User Notified',
  2: 'Tier 2 — Manager Escalation',
  3: 'Tier 3 — Platform Admin Escalation',
};

const TIER_COLORS: Record<number, string> = {
  0: 'text-muted-foreground',
  1: 'text-amber-600',
  2: 'text-orange-600',
  3: 'text-destructive',
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Parse phase_schedule JSON to extract threshold config for a specific phase.
 * Expects phase_schedule to be an array of objects with a `phase` key.
 */
export function parsePhaseScheduleThresholds(
  phaseSchedule: unknown,
  phase: number,
): PhaseThresholdConfig | null {
  if (!phaseSchedule || !Array.isArray(phaseSchedule)) return null;

  const entry = phaseSchedule.find(
    (e: any) => e.phase === phase || e.phase_number === phase,
  );
  if (!entry) return null;

  return {
    duration_days: entry.duration_days ?? entry.duration ?? 7,
    warn_at_percent: entry.warn_at_percent ?? 75,
    breach_at_percent: entry.breach_at_percent ?? 100,
    auto_hold: entry.auto_hold ?? false,
  };
}

/**
 * Compute whether auto-hold should be enabled for a timer,
 * based on phase_schedule config.
 */
export function computeAutoHold(
  phaseSchedule: unknown,
  phase: number,
): boolean {
  const config = parsePhaseScheduleThresholds(phaseSchedule, phase);
  return config?.auto_hold ?? false;
}

/**
 * Get human-readable escalation tier label.
 */
export function getEscalationTierLabel(tier: number): string {
  return TIER_LABELS[tier] ?? `Tier ${tier}`;
}

/**
 * Get color class for escalation tier.
 */
export function getEscalationTierColor(tier: number): string {
  return TIER_COLORS[tier] ?? 'text-destructive';
}

// ---------------------------------------------------------------------------
// Hook: Query SLA timers with escalation data for a challenge
// ---------------------------------------------------------------------------

export function useSLAEscalationStatus(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['sla-escalation', challengeId],
    queryFn: async () => {
      if (!challengeId) return [];
      const { data, error } = await supabase
        .from('sla_timers')
        .select('timer_id, challenge_id, phase, role_code, status, deadline_at, breached_at, escalation_tier, auto_hold_on_breach, last_escalated_at, started_at')
        .eq('challenge_id', challengeId)
        .order('phase');
      if (error) throw new Error(error.message);
      return (data ?? []) as SLATimerWithEscalation[];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });
}

/**
 * Get only breached timers with active escalation for a challenge.
 */
export function useActiveEscalations(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['sla-escalation', 'active', challengeId],
    queryFn: async () => {
      if (!challengeId) return [];
      const { data, error } = await supabase
        .from('sla_timers')
        .select('timer_id, challenge_id, phase, role_code, status, deadline_at, breached_at, escalation_tier, auto_hold_on_breach, last_escalated_at, started_at')
        .eq('challenge_id', challengeId)
        .eq('status', 'BREACHED')
        .gt('escalation_tier', 0)
        .order('escalation_tier', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as SLATimerWithEscalation[];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });
}
