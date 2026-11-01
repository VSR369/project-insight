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
