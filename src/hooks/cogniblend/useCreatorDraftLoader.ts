/**
 * useCreatorDraftLoader — Loads a saved draft into the Creator form.
 * Parses challenge record into CreatorFormValues shape.
 */

import { useRef, useEffect } from 'react';
import { type UseFormReturn } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import type { CreatorFormValues } from '@/components/cogniblend/creator/creatorFormSchema';
import { toFormMaturityCode } from '@/components/cogniblend/creator/creatorFormSchema';
import type { GovernanceMode } from '@/lib/governanceMode';

const DRAFT_COLUMNS = 'title, hook, problem_statement, scope, maturity_level, solution_maturity_id, ip_model, domain_tags, currency_code, reward_structure, extended_brief, expected_outcomes, industry_segment_id, phase_schedule, governance_mode_override, operating_model';

interface DraftSyncCallback {
  (gov: GovernanceMode, eng: string): void;
}

function parseLineItems(value: unknown): string[] {
  if (!value) return [''];
  let parsed: unknown = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return [(value as string).trim() || ''].filter(Boolean).length > 0 ? [value as string] : ['']; }
  }
  if (typeof parsed === 'object' && parsed !== null && 'items' in parsed) {
    const items = (parsed as { items?: Array<{ name?: string } | string> }).items;
    if (Array.isArray(items)) {
      const result = items.map((item) => (typeof item === 'string' ? item : item?.name || '')).filter(Boolean);
      return result.length > 0 ? result : [''];
    }
  }
  if (Array.isArray(parsed)) return parsed.length > 0 ? parsed : [''];
  if (typeof value === 'string' && value.trim()) return [value];
  return [''];
}

function parseStakeholders(value: unknown): CreatorFormValues['affected_stakeholders'] {
  if (!value) return [];
  if (Array.isArray(value)) return value as CreatorFormValues['affected_stakeholders'];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as CreatorFormValues['affected_stakeholders']) : [];
    } catch { return []; }
  }
  return [];
}

export function useCreatorDraftLoader(
  draftChallengeId: string | null,
  form: UseFormReturn<CreatorFormValues>,
  governanceMode: GovernanceMode,
  engagementModel: string,
  onDraftModeSync?: DraftSyncCallback,
) {
  const draftLoaded = useRef(false);

  useEffect(() => {
    if (!draftChallengeId || draftLoaded.current) return;
    draftLoaded.current = true;

    (async () => {
      const { data: challenge } = await supabase
        .from('challenges')
        .select(DRAFT_COLUMNS)
        .eq('id', draftChallengeId)
        .maybeSingle();

      if (!challenge) return;

      if (onDraftModeSync) {
        const draftGov = (challenge as Record<string, unknown>).governance_mode_override as string | null;
        const draftEng = (challenge as Record<string, unknown>).operating_model as string | null;
        if (draftGov || draftEng) {
          onDraftModeSync(
            (draftGov as GovernanceMode) ?? governanceMode,
            draftEng ?? engagementModel,
          );
        }
      }

      const rs = challenge.reward_structure as Record<string, unknown> | null;
      const eb = challenge.extended_brief as Record<string, unknown> | null;
      const eo = challenge.expected_outcomes as unknown;
      const ps = challenge.phase_schedule as Record<string, unknown> | null;

      form.reset({
        title: (challenge.title as string) || '',
        hook: (challenge.hook as string) || '',
        problem_statement: (challenge.problem_statement as string) || '',
        scope: (challenge.scope as string) || '',
        maturity_level: toFormMaturityCode(challenge.maturity_level as string | null | undefined),
        solution_maturity_id: (challenge.solution_maturity_id as string) || '',
        industry_segment_id: (challenge.industry_segment_id as string) || '',
        domain_tags: (challenge.domain_tags as string[]) || [],
        currency_code: ((rs?.currency as string) || 'USD') as CreatorFormValues['currency_code'],
        platinum_award: Number(rs?.platinum_award ?? rs?.budget_max ?? 0),
        weighted_criteria: Array.isArray((challenge as Record<string, unknown>).evaluation_criteria) ? (challenge as Record<string, unknown>).evaluation_criteria as CreatorFormValues['weighted_criteria'] : [],
        deliverables_list: parseLineItems((challenge as Record<string, unknown>).deliverables),
        ip_model: (challenge.ip_model as string) || '',
        expected_outcomes: parseLineItems(eo),
        context_background: (eb?.context_background as string) || '',
        preferred_approach: parseLineItems(eb?.preferred_approach),
        approaches_not_of_interest: parseLineItems(eb?.approaches_not_of_interest),
        affected_stakeholders: parseStakeholders(eb?.affected_stakeholders),
        current_deficiencies: parseLineItems(eb?.current_deficiencies),
        root_causes: parseLineItems(eb?.root_causes),
        expected_timeline: (ps?.expected_timeline as string) || '',
      });
    })();
  }, [draftChallengeId, form]);
}
