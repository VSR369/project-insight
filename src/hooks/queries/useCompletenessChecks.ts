/**
 * useCompletenessChecks — fetches check definitions and runs completeness analysis.
 */

import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STANDARD } from '@/config/queryCache';
import type { CompletenessCheckDef, CompletenessResult } from '@/lib/cogniblend/completenessCheck';
import { runCompletenessCheck } from '@/lib/cogniblend/completenessCheck';
import { getCurationFormStore } from '@/store/curationFormStore';
import type { SectionKey } from '@/types/sections';
import { SECTION_KEYS } from '@/types/sections';
import { EXTENDED_BRIEF_FIELD_MAP } from '@/lib/cogniblend/curationSectionFormats';

/** Fetch active completeness check definitions from DB */
export function useCompletenessCheckDefs() {
  return useQuery({
    queryKey: ['completeness-check-defs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('completeness_checks' as any)
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => ({
        id: row.id,
        concept: row.concept,
        question: row.question,
        check_sections: Array.isArray(row.check_sections) ? row.check_sections : JSON.parse(row.check_sections ?? '[]'),
        criticality: row.criticality,
        condition_field: row.condition_field,
        condition_value: row.condition_value,
        remediation_hint: row.remediation_hint,
        display_order: row.display_order,
      })) as CompletenessCheckDef[];
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

interface UseRunCompletenessCheckOptions {
  challengeId: string;
  challengeData: Record<string, any> | null;
}

/** Run completeness check on demand using curation store + challenge data */
export function useRunCompletenessCheck({ challengeId, challengeData }: UseRunCompletenessCheckOptions) {
  const { data: checkDefs } = useCompletenessCheckDefs();
  const [result, setResult] = useState<CompletenessResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback(() => {
    if (!checkDefs || checkDefs.length === 0 || !challengeData) return;

    setIsRunning(true);

    try {
      const store = getCurationFormStore(challengeId);
      const storeState = store.getState();

      // Build section contents map from store + challenge data
      const sectionContents: Record<string, string | null> = {};

      for (const key of SECTION_KEYS) {
        const sk = key as SectionKey;
        const entry = storeState.sections[sk];

        // Try store data first
        if (entry?.data) {
          const d = entry.data;
          sectionContents[sk] = typeof d === 'string' ? d : JSON.stringify(d);
          continue;
        }

        // Fall back to challenge data
        const ebField = EXTENDED_BRIEF_FIELD_MAP[sk];
        if (ebField) {
          const eb = challengeData.extended_brief;
          const parsed = typeof eb === 'string' ? JSON.parse(eb) : eb;
          const val = parsed?.[ebField];
          sectionContents[sk] = val ? (typeof val === 'string' ? val : JSON.stringify(val)) : null;
          continue;
        }

        // Direct fields
        const fieldMap: Record<string, string> = {
          problem_statement: 'problem_statement',
          scope: 'scope',
          hook: 'hook',
          deliverables: 'deliverables',
          evaluation_criteria: 'evaluation_criteria',
          reward_structure: 'reward_structure',
          phase_schedule: 'phase_schedule',
          ip_model: 'ip_model',
          maturity_level: 'maturity_level',
          visibility: 'visibility',
          eligibility: 'eligibility',
          domain_tags: 'domain_tags',
          expected_outcomes: 'expected_outcomes',
          submission_guidelines: 'description',
          solver_expertise: 'solver_expertise_requirements',
          data_resources_provided: 'data_resources_provided',
          success_metrics_kpis: 'success_metrics_kpis',
        };

        const dbField = fieldMap[sk];
        if (dbField) {
          const val = challengeData[dbField];
          sectionContents[sk] = val ? (typeof val === 'string' ? val : JSON.stringify(val)) : null;
        }
      }

      // Build metadata for conditional checks
      const metadata: Record<string, unknown> = {
        solutionType: challengeData.solution_type ?? challengeData.operating_model ?? null,
        governanceProfile: challengeData.governance_profile ?? null,
        maturityLevel: challengeData.maturity_level ?? null,
      };

      const checkResult = runCompletenessCheck(checkDefs, sectionContents, metadata);
      setResult(checkResult);
    } finally {
      setIsRunning(false);
    }
  }, [checkDefs, challengeId, challengeData]);

  return { result, run, isRunning };
}
