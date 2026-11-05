/**
 * Award decision steps (DEF-0008 / DEF-0145). All rules run on the server;
 * this only forwards the request.
 */
import { supabase } from '@/integrations/supabase/client';

export type AwardOutcome = 'WINNER' | 'NO_AWARD';

export interface AwardLineInput {
  submission_id?: string;
  prize_tier_id?: string;
  amount: number;
}

export async function recommendAward(params: {
  challengeId: string; outcome: AwardOutcome; lines?: AwardLineInput[]; note?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('recommend_award', {
    p_challenge_id: params.challengeId,
    p_outcome: params.outcome,
    p_lines: (params.lines ?? []) as unknown as never,
    p_note: params.note ?? null,
  } as never);
  if (error) throw new Error(error.message);
  return data as unknown as string;
}

export interface AwardDecisionRow {
  id: string;
  outcome: string;
  decision_status: string;
  recommended_by: string;
  confirmed_by: string | null;
  recommendation_note: string | null;
  return_reason: string | null;
  created_at: string;
}

export interface AwardChallengeRow { id: string; title: string; status: string }

export async function fetchAwardChallenges(): Promise<AwardChallengeRow[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('id, title, status')
    .in('status', ['EVALUATION', 'AWARDED'])
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as AwardChallengeRow[];
}

export async function fetchLatestAwardDecision(challengeId: string): Promise<AwardDecisionRow | null> {
  const { data, error } = await supabase
    .from('challenge_award_decisions')
    .select('id, outcome, decision_status, recommended_by, confirmed_by, recommendation_note, return_reason, created_at')
    .eq('challenge_id', challengeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as AwardDecisionRow | null) ?? null;
}

export async function confirmAward(decisionId: string): Promise<unknown> {
  const { data, error } = await supabase.rpc('confirm_award', { p_decision_id: decisionId });
  if (error) throw new Error(error.message);
  return data;
}

export async function returnAward(decisionId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('return_award', { p_decision_id: decisionId, p_reason: reason });
  if (error) throw new Error(error.message);
}

export async function countersignAward(decisionId: string): Promise<unknown> {
  const { data, error } = await supabase.rpc('countersign_award', { p_decision_id: decisionId });
  if (error) throw new Error(error.message);
  return data;
}
