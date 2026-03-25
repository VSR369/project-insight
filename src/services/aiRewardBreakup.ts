/**
 * aiRewardBreakup.ts — AI services for reward tier breakdown and non-monetary suggestions.
 */

import { supabase } from '@/integrations/supabase/client';
import type { PrizeTier, NonMonetaryItem } from '@/services/rewardStructureResolver';

/**
 * Request AI to break down a lump sum into prize tiers.
 */
export async function requestAITierBreakup(
  amount: number,
  currency: string,
  challengeContext?: { title?: string; domain?: string; type?: string },
): Promise<PrizeTier[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-field-assist', {
      body: {
        field_name: 'reward_tier_breakup',
        context: {
          total_amount: amount,
          currency,
          title: challengeContext?.title ?? '',
          domain: challengeContext?.domain ?? 'General',
          type: challengeContext?.type ?? 'Open Innovation',
        },
      },
    });

    if (error) throw new Error(error.message);

    const content = data?.data?.content;
    if (!content) return null;

    // Parse AI response — could be JSON string or object
    let parsed: any;
    if (typeof content === 'string') {
      // Strip markdown code fences if present
      const cleaned = content.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return null;
      }
    } else {
      parsed = content;
    }

    // Convert to PrizeTier array
    const tiers: PrizeTier[] = [];
    for (const rank of ['platinum', 'gold', 'silver', 'honorable_mention'] as const) {
      if (parsed[rank]) {
        tiers.push({
          rank,
          amount: Number(parsed[rank].amount) || 0,
          count: Number(parsed[rank].count) || 1,
          label: parsed[rank].label ?? rank,
        });
      }
    }

    return tiers.length > 0 ? tiers : null;
  } catch (err) {
    console.error('AI tier breakup failed:', err);
    return null;
  }
}

/**
 * Request AI to suggest non-monetary reward items.
 */
export async function requestAINonMonetarySuggestions(
  challengeContext?: { title?: string; domain?: string; type?: string },
): Promise<NonMonetaryItem[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-field-assist', {
      body: {
        field_name: 'non_monetary_suggestions',
        context: {
          title: challengeContext?.title ?? '',
          domain: challengeContext?.domain ?? 'General',
          type: challengeContext?.type ?? 'Open Innovation',
        },
      },
    });

    if (error) throw new Error(error.message);

    const content = data?.data?.content;
    if (!content) return null;

    let parsed: any;
    if (typeof content === 'string') {
      const cleaned = content.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return null;
      }
    } else {
      parsed = content;
    }

    const arr = Array.isArray(parsed) ? parsed : parsed?.items ?? parsed?.suggestions;
    if (!Array.isArray(arr)) return null;

    return arr.map((item: any) => ({
      id: crypto.randomUUID(),
      type: item.type ?? 'other',
      title: item.title ?? '',
      description: item.description ?? '',
      isAISuggested: true,
    }));
  } catch (err) {
    console.error('AI non-monetary suggestions failed:', err);
    return null;
  }
}
