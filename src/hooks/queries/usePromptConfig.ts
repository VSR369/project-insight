/**
 * usePromptConfig — React Query hooks for fetching extended section configs
 * and phase templates from the unified ai_review_section_config table.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ExtendedSectionConfig } from '@/lib/cogniblend/assemblePrompt';

/* ── Extended section configs ── */

export function useExtendedSectionConfigs(roleContext = 'curation') {
  return useQuery({
    queryKey: ['extended-section-configs', roleContext],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_review_section_config')
        .select('*')
        .eq('role_context', roleContext)
        .eq('is_active', true)
        .order('section_key');
      if (error) throw new Error(error.message);
      // Map DB rows to ExtendedSectionConfig shape
      return (data ?? []).map((row: any) => ({
        role_context: row.role_context,
        section_key: row.section_key,
        section_label: row.section_label,
        importance_level: row.importance_level,
        section_description: row.section_description,
        review_instructions: row.review_instructions,
        dos: row.dos,
        donts: row.donts,
        tone: row.tone,
        min_words: row.min_words,
        max_words: row.max_words,
        required_elements: row.required_elements ?? [],
        example_good: row.example_good,
        example_poor: row.example_poor,
        platform_preamble: row.platform_preamble,
        quality_criteria: row.quality_criteria ?? [],
        master_data_constraints: row.master_data_constraints ?? [],
        computation_rules: row.computation_rules ?? [],
        content_templates: row.content_templates ?? {},
        web_search_queries: row.web_search_queries ?? [],
        industry_frameworks: row.industry_frameworks ?? [],
        analyst_sources: row.analyst_sources ?? [],
        supervisor_examples: row.supervisor_examples ?? [],
        cross_references: row.cross_references ?? [],
        wave_number: row.wave_number,
        tab_group: row.tab_group,
        is_active: row.is_active,
        updated_at: row.updated_at,
        version: row.version ?? 1,
      })) as (ExtendedSectionConfig & { is_active: boolean; updated_at: string; version: number })[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/* ── Phase templates ── */

export interface PhaseTemplate {
  id: string;
  solution_type: string;
  maturity_level: string;
  phases: { name: string; minDays: number; maxDays: number }[];
  total_range_min_weeks: number;
  total_range_max_weeks: number;
  is_active: boolean;
}

export function usePhaseTemplates(solutionType?: string | null, maturityLevel?: string | null) {
  return useQuery({
    queryKey: ['phase-templates', solutionType, maturityLevel],
    queryFn: async () => {
      let query = supabase
        .from('phase_templates')
        .select('*')
        .eq('is_active', true);
      if (solutionType) query = query.eq('solution_type', solutionType);
      if (maturityLevel) query = query.eq('maturity_level', maturityLevel);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as PhaseTemplate[];
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: !!(solutionType || maturityLevel) || true,
  });
}

export function useAllPhaseTemplates() {
  return useQuery({
    queryKey: ['phase-templates', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phase_templates')
        .select('*')
        .eq('is_active', true)
        .order('solution_type')
        .order('maturity_level');
      if (error) throw new Error(error.message);
      return (data ?? []) as PhaseTemplate[];
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
