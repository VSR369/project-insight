/**
 * useCurationAcceptRefinement — AI content acceptance + normalization callbacks.
 * Internal helpers delegated to acceptRefinementHelpers.ts.
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import { SECTION_FORMAT_CONFIG, EXTENDED_BRIEF_FIELD_MAP } from '@/lib/cogniblend/curationSectionFormats';
import { SECTION_MAP } from '@/lib/cogniblend/curationSectionDefs';
import { parseJson } from '@/lib/cogniblend/curationHelpers';
import {
  stripCodeFences,
  parseJsonSafe,
  extractJson,
  normalizeRewardStructure,
  normalizeEvalCriteria,
  normalizeSuccessMetrics,
  normalizeDataResources,
  normalizeDomainTags,
} from '@/lib/cogniblend/normalizeAIContent';
import {
  acceptSolverExpertise,
  acceptCodeArray,
  acceptSubmissionGuidelines,
  acceptSolutionType,
  acceptSingleCode,
} from '@/lib/cogniblend/acceptRefinementHelpers';
import type { SectionKey } from '@/types/sections';
import type { RewardStructureDisplayHandle } from '@/components/cogniblend/curation/RewardStructureDisplay';
import type { ComplexityModuleHandle } from '@/components/cogniblend/curation/ComplexityAssessmentModule';
import type { UseMutationResult } from '@tanstack/react-query';

interface MasterDataOptions {
  ipModelOptions: Array<{ value: string; label: string }>;
  maturityOptions: Array<{ value: string; label: string }>;
  complexityOptions: Array<{ value: string; label: string }>;
  eligibilityOptions: Array<{ value: string; label: string }>;
  visibilityOptions: Array<{ value: string; label: string }>;
}

interface UseCurationAcceptRefinementOptions {
  challenge: Record<string, any> | null;
  saveSectionMutation: UseMutationResult<void, Error, { field: string; value: any }>;
  syncSectionToStore: (key: SectionKey, data: any) => void;
  setSavingSection: (v: boolean) => void;
  masterData: MasterDataOptions;
  solutionTypesData: any[];
  solutionTypeMap: Array<{ solution_type_code: string; proficiency_area_name: string }>;
  rewardStructureRef: React.RefObject<RewardStructureDisplayHandle | null>;
  complexityModuleRef: React.RefObject<ComplexityModuleHandle | null>;
  handleSaveSolutionTypes: (codes: string[]) => Promise<void>;
}

export function useCurationAcceptRefinement({
  challenge,
  saveSectionMutation,
  syncSectionToStore,
  setSavingSection,
  masterData,
  solutionTypesData,
  solutionTypeMap,
  rewardStructureRef,
  complexityModuleRef,
  handleSaveSolutionTypes,
}: UseCurationAcceptRefinementOptions) {

  const saveCtx = { setSavingSection, syncSectionToStore, saveSectionMutation };

  const handleAcceptRefinement = useCallback(async (sectionKey: string, newContent: string) => {
    const section = SECTION_MAP.get(sectionKey);
    const dbField = section?.dbField;

    if (sectionKey === 'complexity') { complexityModuleRef.current?.saveAiDraft(); return; }
    if (sectionKey === 'solver_expertise') { acceptSolverExpertise(newContent, sectionKey, saveCtx); return; }
    if (sectionKey === 'eligibility') {
      if (acceptCodeArray(newContent, sectionKey, 'solver_eligibility_types', masterData.eligibilityOptions, saveCtx)) return;
    }
    if (sectionKey === 'visibility') {
      if (acceptCodeArray(newContent, sectionKey, 'solver_visibility_types', masterData.visibilityOptions, saveCtx)) return;
    }
    if (sectionKey === 'submission_guidelines') { acceptSubmissionGuidelines(newContent, sectionKey, saveCtx); return; }
    if (sectionKey === 'solution_type') { acceptSolutionType(newContent, solutionTypesData, handleSaveSolutionTypes); return; }

    const SINGLE_CODE_MAP: Record<string, { field: string; options: typeof masterData.ipModelOptions }> = {
      ip_model: { field: 'ip_model', options: masterData.ipModelOptions },
      maturity_level: { field: 'maturity_level', options: masterData.maturityOptions },
      complexity: { field: 'complexity_level', options: masterData.complexityOptions },
    };
    const singleCodeCfg = SINGLE_CODE_MAP[sectionKey];
    if (singleCodeCfg) { acceptSingleCode(newContent, sectionKey, singleCodeCfg, saveCtx); return; }

    if (!dbField) { toast.error('Cannot save refinement for this section type.'); return; }

    let valueToSave: any = newContent;
    const JSON_FIELDS = ['deliverables', 'expected_outcomes', 'evaluation_criteria', 'phase_schedule', 'reward_structure', 'submission_guidelines', 'domain_tags', 'success_metrics_kpis', 'data_resources_provided'];
    if (JSON_FIELDS.includes(dbField)) {
      const cleaned = extractJson(stripCodeFences(newContent));
      const parsed = parseJsonSafe(cleaned);
      if (parsed === null) { toast.error(`AI returned invalid structured data for ${dbField}. Please re-review this section.`); return; }
      valueToSave = parsed;
    }

    valueToSave = normalizeRewardStructure(dbField, valueToSave, rewardStructureRef);
    if (valueToSave === null) return;
    valueToSave = normalizeEvalCriteria(dbField, valueToSave);
    valueToSave = normalizeSuccessMetrics(dbField, valueToSave);
    valueToSave = normalizeDataResources(dbField, valueToSave);
    valueToSave = normalizeDomainTags(dbField, valueToSave);
    if (valueToSave === null) return;

    const HTML_TEXT_FIELDS = Object.entries(SECTION_FORMAT_CONFIG)
      .filter(([, cfg]) => cfg.format === 'rich_text')
      .map(([key]) => key);
    if (HTML_TEXT_FIELDS.includes(dbField) && typeof valueToSave === 'string') {
      const { normalizeAiContentForEditor } = await import('@/lib/aiContentFormatter');
      valueToSave = normalizeAiContentForEditor(valueToSave);
    }

    setSavingSection(true);
    syncSectionToStore(sectionKey as SectionKey, valueToSave);
    saveSectionMutation.mutate({ field: dbField, value: valueToSave });
  }, [saveSectionMutation, masterData, complexityModuleRef, rewardStructureRef, syncSectionToStore, solutionTypesData, solutionTypeMap, handleSaveSolutionTypes, setSavingSection]);

  const handleAcceptExtendedBriefRefinement = useCallback(async (subsectionKey: string, newContent: string) => {
    const jsonbField = EXTENDED_BRIEF_FIELD_MAP[subsectionKey];
    if (!jsonbField) { handleAcceptRefinement(subsectionKey, newContent); return; }

    const currentBrief = parseJson<Record<string, unknown>>(challenge?.extended_brief ?? null) ?? {};
    let valueToSave: unknown = newContent;

    const config = SECTION_FORMAT_CONFIG[subsectionKey];
    if (config && (config.format === 'line_items' || config.format === 'table')) {
      const cleaned = stripCodeFences(newContent);
      try { valueToSave = JSON.parse(cleaned); } catch {
        const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
        if (jsonMatch) { try { valueToSave = JSON.parse(jsonMatch[1]); } catch { toast.error(`AI returned invalid JSON for ${subsectionKey}. Please try again.`); return; } }
      }
      if (valueToSave && typeof valueToSave === 'object' && !Array.isArray(valueToSave)) {
        if (Array.isArray((valueToSave as any).items)) valueToSave = (valueToSave as any).items;
        else if (Array.isArray((valueToSave as any).rows)) valueToSave = (valueToSave as any).rows;
      }
      if (subsectionKey === 'affected_stakeholders' && Array.isArray(valueToSave)) {
        valueToSave = (valueToSave as any[]).map((row: any) => ({
          stakeholder_name: row.stakeholder_name ?? row.stakeholder ?? row.name ?? row.Stakeholder ?? '',
          role: row.role ?? row.Role ?? '',
          impact_description: row.impact_description ?? row.impact ?? row.Impact ?? '',
          adoption_challenge: row.adoption_challenge ?? row.challenge ?? row.Challenge ?? '',
        }));
      }
      if (config.format === 'line_items' && typeof valueToSave === 'string') {
        const lines = valueToSave.split('\n').map((l: string) => l.replace(/^(?:\d+[\.\)]\s*|[-*•]\s*)/, '').trim()).filter((l: string) => l.length > 0);
        valueToSave = lines.length > 1 ? lines : [valueToSave.trim()].filter(Boolean);
      }
    } else if (config?.format === 'rich_text' && typeof newContent === 'string') {
      const { normalizeAiContentForEditor } = await import('@/lib/aiContentFormatter');
      valueToSave = normalizeAiContentForEditor(newContent);
    }

    const updated = { ...currentBrief, [jsonbField]: valueToSave };
    syncSectionToStore('extended_brief' as SectionKey, updated);
    setSavingSection(true);
    saveSectionMutation.mutate({ field: 'extended_brief', value: updated });
  }, [challenge?.extended_brief, saveSectionMutation, handleAcceptRefinement, syncSectionToStore, setSavingSection]);

  return { handleAcceptRefinement, handleAcceptExtendedBriefRefinement };
}
