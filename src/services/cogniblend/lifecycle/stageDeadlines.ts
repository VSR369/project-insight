/**
 * stageDeadlines — DEF-0157 stages and DEF-0036 deadlines.
 * The server trigger (fn_validate_challenge_stages_deadlines) and the
 * extend_challenge_deadline RPC are authoritative; these pure rules mirror
 * them so the screen can explain problems before saving.
 */
import { supabase } from '@/integrations/supabase/client';
import { MS_PER_DAY } from '@/services/config/configNumber';

export type StageGovernanceMode = 'QUICK' | 'STRUCTURED' | 'CONTROLLED';
export type StageCount = 1 | 2;

export interface ChallengeDeadlines {
  stageCount: StageCount;
  startAt: Date | null;
  abstractDeadline: Date | null;
  solutionDeadline: Date | null;
}

export interface DeadlineRules {
  minOpenDays: number;
  abstractMinOpenDays: number;
}

/** Express single-stage, High-Rigor two-stage, Structured is the Creator's choice. */
export function resolveStageCount(mode: StageGovernanceMode, chosen: StageCount | null): StageCount {
  if (mode === 'QUICK') return 1;
  if (mode === 'CONTROLLED') return 2;
  return chosen ?? 1;
}

export function canChooseStageCount(mode: StageGovernanceMode, isPublished: boolean): boolean {
  return mode === 'STRUCTURED' && !isPublished;
}

const daysBetween = (a: Date, b: Date): number => (b.getTime() - a.getTime()) / MS_PER_DAY;

/** Returns readable problems (empty when valid or incomplete). */
export function validateDeadlines(d: ChallengeDeadlines, rules: DeadlineRules): string[] {
  const problems: string[] = [];
  if (!d.startAt || !d.solutionDeadline) return problems;
  if (daysBetween(d.startAt, d.solutionDeadline) < rules.minOpenDays) {
    problems.push(`The solution deadline must be at least ${rules.minOpenDays} days after the start date.`);
  }
  if (d.stageCount === 2) {
    if (!d.abstractDeadline) {
      problems.push('Two-stage challenges need an abstract deadline.');
    } else if (
      daysBetween(d.startAt, d.abstractDeadline) < rules.abstractMinOpenDays ||
      daysBetween(d.abstractDeadline, d.solutionDeadline) < rules.abstractMinOpenDays
    ) {
      problems.push(
        `The abstract deadline must be at least ${rules.abstractMinOpenDays} days after the start date and ${rules.abstractMinOpenDays} days before the solution deadline.`,
      );
    }
  }
  return problems;
}

/** Extension must be later than the current deadline and within the maximum. */
export function validateExtension(current: Date, proposed: Date, maxExtensionDays: number): string | null {
  if (proposed.getTime() <= current.getTime()) return 'A deadline can only be extended, never shortened.';
  if (daysBetween(current, proposed) > maxExtensionDays) return `An extension can be at most ${maxExtensionDays} days.`;
  return null;
}

/** "12 Dec 2026, 17:00 UTC (22:30 your time)" */
export function formatDeadline(date: Date, timeZone?: string): string {
  const utc = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date);
  const local = new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone }).format(date);
  return `${utc} UTC (${local} your time)`;
}

const EXTENSION_ERRORS: Record<string, string> = {
  extension_requires_curator: 'Only the Curator of this challenge can extend a deadline.',
  extension_only_after_publication: 'Deadlines can be extended only after publication.',
  reason_too_short: 'Please give a longer written reason.',
  deadline_already_passed: 'This deadline has already passed and cannot be extended.',
  deadline_cannot_be_shortened: 'A deadline can only be extended, never shortened.',
  extension_exceeds_maximum: 'The extension is longer than the maximum allowed.',
  abstract_after_solution: 'The abstract deadline must stay before the solution deadline.',
};

export function extensionErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error ?? '');
  const key = Object.keys(EXTENSION_ERRORS).find((k) => text.includes(k));
  return key ? EXTENSION_ERRORS[key] : text;
}

export interface ExtendDeadlineInput {
  challengeId: string;
  which: 'abstract' | 'solution';
  newDeadline: Date;
  reason: string;
}

export async function extendChallengeDeadline(input: ExtendDeadlineInput): Promise<void> {
  const { error } = await supabase.rpc('extend_challenge_deadline' as never, {
    p_challenge_id: input.challengeId,
    p_which: input.which,
    p_new_deadline: input.newDeadline.toISOString(),
    p_reason: input.reason,
  } as never);
  if (error) throw new Error(extensionErrorMessage(error));
}

interface StageDeadlineRow {
  stage_count: number | null;
  start_at: string | null;
  abstract_deadline: string | null;
  solution_deadline: string | null;
  published_at: string | null;
}

export interface StoredStageDeadlines extends ChallengeDeadlines {
  isPublished: boolean;
}

const toDate = (v: string | null): Date | null => (v ? new Date(v) : null);

export async function fetchStageDeadlines(challengeId: string): Promise<StoredStageDeadlines> {
  const { data, error } = await supabase
    .from('challenges')
    .select('stage_count, start_at, abstract_deadline, solution_deadline, published_at' as never)
    .eq('id', challengeId)
    .single();
  if (error) throw new Error(error.message);
  const row = data as unknown as StageDeadlineRow;
  return {
    stageCount: row.stage_count === 2 ? 2 : 1,
    startAt: toDate(row.start_at),
    abstractDeadline: toDate(row.abstract_deadline),
    solutionDeadline: toDate(row.solution_deadline),
    isPublished: row.published_at !== null,
  };
}

export async function saveStageDeadlines(challengeId: string, d: ChallengeDeadlines): Promise<void> {
  const { error } = await supabase
    .from('challenges')
    .update({
      stage_count: d.stageCount,
      start_at: d.startAt?.toISOString() ?? null,
      abstract_deadline: d.stageCount === 2 ? d.abstractDeadline?.toISOString() ?? null : null,
      solution_deadline: d.solutionDeadline?.toISOString() ?? null,
    } as never)
    .eq('id', challengeId);
  if (error) throw new Error(error.message);
}

/** "YYYY-MM-DDTHH:mm" (UTC) <-> Date, for datetime-local inputs labelled UTC. */
export const toUtcInput = (d: Date | null): string => (d ? d.toISOString().slice(0, 16) : '');
export const fromUtcInput = (v: string): Date | null => (v ? new Date(`${v}:00Z`) : null);
