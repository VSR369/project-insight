/**
 * minimumModeService — DEF-0144 / BR-CHL-M06 "Minimum mode".
 *
 * The rule itself is enforced on the server at Submit and Complete Curation
 * (trigger trg_challenges_bu_minimum_mode). This module only reads/writes
 * the Creator/Curator flags and turns the server refusal into a UI message.
 */
import { supabase } from '@/integrations/supabase/client';

export interface MinimumModeFlags {
  isRegulated: boolean;
  isIpSensitive: boolean;
}

const MINIMUM_MODE_PATTERN = /This challenge requires at least (Express|Structured|High-Rigor) governance\./;

/** Extracts the server's minimum-mode refusal message, or null if unrelated. */
export function extractMinimumModeMessage(error: unknown): string | null {
  const text = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const match = MINIMUM_MODE_PATTERN.exec(text);
  return match ? match[0] : null;
}

export async function fetchMinimumModeFlags(challengeId: string): Promise<MinimumModeFlags> {
  const { data, error } = await supabase
    .from('challenges')
    .select('is_regulated, is_ip_sensitive')
    .eq('id', challengeId)
    .single();
  if (error) throw new Error(error.message);
  const row = data as { is_regulated: boolean; is_ip_sensitive: boolean };
  return { isRegulated: row.is_regulated, isIpSensitive: row.is_ip_sensitive };
}

export async function updateMinimumModeFlags(challengeId: string, flags: MinimumModeFlags): Promise<void> {
  const { error } = await supabase
    .from('challenges')
    .update({ is_regulated: flags.isRegulated, is_ip_sensitive: flags.isIpSensitive })
    .eq('id', challengeId);
  if (error) throw new Error(error.message);
}
