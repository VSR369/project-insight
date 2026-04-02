/**
 * useCurationAcceptRefinement — AI content acceptance + normalization callbacks.
 * Extracted from useCurationSectionActions (Phase D6.3).
 *
 * Handles the complex parsing/normalization when a curator accepts
 * an AI-suggested refinement for any section type.
 */

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SECTION_FORMAT_CONFIG, EXTENDED_BRIEF_FIELD_MAP } from '@/lib/cogniblend/curationSectionFormats';
import { SECTION_MAP } from '@/lib/cogniblend/curationSectionDefs';
import { parseJson } from '@/lib/cogniblend/curationHelpers';
import { derivePrimaryGroup, getSelectedGroups } from '@/hooks/queries/useSolutionTypeMap';
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
import type { SectionKey, SectionStoreEntry } from '@/types/sections';
import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';
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

  // ── Accept refinement for top-level sections ──
  const handleAcceptRefinement = useCallback(async (sectionKey: string, newContent: string) => {
    const section = SECTION_MAP.get(sectionKey);
    const dbField = section?.dbField;

    if (sectionKey === 'complexity') {
      complexityModuleRef.current?.saveAiDraft();
      return;
    }

    if (sectionKey === 'solver_expertise') {
      return acceptSolverExpertise(newContent, sectionKey);
    }

    if (sectionKey === 'eligibility') {
      if (acceptCodeArray(newContent, sectionKey, 'solver_eligibility_types', masterData.eligibilityOptions)) return;
    }
    if (sectionKey === 'visibility') {
      if (acceptCodeArray(newContent, sectionKey, 'solver_visibility_types', masterData.visibilityOptions)) return;
    }

    if (sectionKey === 'submission_guidelines') {
      return acceptSubmissionGuidelines(newContent, sectionKey);
    }

    if (sectionKey === 'solution_type') {
      return acceptSolutionType(newContent);
    }

    // Single-code fields (ip_model, maturity_level, complexity)
    const SINGLE_CODE_MAP: Record<string, { field: string; options: typeof masterData.ipModelOptions }> = {
      ip_model: { field: 'ip_model', options: masterData.ipModelOptions },
      maturity_level: { field: 'maturity_level', options: masterData.maturityOptions },
      complexity: { field: 'complexity_level', options: masterData.complexityOptions },
    };
    const singleCodeCfg = SINGLE_CODE_MAP[sectionKey];
    if (singleCodeCfg) {
      return acceptSingleCode(newContent, sectionKey, singleCodeCfg);
    }

    if (!dbField) {
      toast.error('Cannot save refinement for this section type.');
      return;
    }

    let valueToSave: any = newContent;

    // JSON fields
    const JSON_FIELDS = ['deliverables', 'expected_outcomes', 'evaluation_criteria', 'phase_schedule', 'reward_structure', 'submission_guidelines', 'domain_tags', 'success_metrics_kpis', 'data_resources_provided'];
    if (JSON_FIELDS.includes(dbField)) {
      const cleaned = extractJson(stripCodeFences(newContent));
      const parsed = parseJsonSafe(cleaned);
      if (parsed === null) {
        toast.error(`AI returned invalid structured data for ${dbField}. Please re-review this section.`);
        return;
      }
      valueToSave = parsed;
    }

    // Normalize specific structured shapes
    valueToSave = normalizeRewardStructure(dbField, valueToSave, rewardStructureRef);
    if (valueToSave === null) return; // handled by reward ref
    valueToSave = normalizeEvalCriteria(dbField, valueToSave);
    valueToSave = normalizeSuccessMetrics(dbField, valueToSave);
    valueToSave = normalizeDataResources(dbField, valueToSave);
    valueToSave = normalizeDomainTags(dbField, valueToSave);
    if (valueToSave === null) return; // empty tags

    // Rich text normalization
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

  // ── Accept extended brief subsection refinement ──
  const handleAcceptExtendedBriefRefinement = useCallback(async (subsectionKey: string, newContent: string) => {
    const jsonbField = EXTENDED_BRIEF_FIELD_MAP[subsectionKey];
    if (!jsonbField) {
      handleAcceptRefinement(subsectionKey, newContent);
      return;
    }

    const currentBrief = parseJson<Record<string, unknown>>(challenge?.extended_brief ?? null) ?? {};
    let valueToSave: unknown = newContent;

    const config = SECTION_FORMAT_CONFIG[subsectionKey];
    if (config && (config.format === 'line_items' || config.format === 'table')) {
      const cleaned = stripCodeFences(newContent);
      try {
        valueToSave = JSON.parse(cleaned);
      } catch {
        const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
        if (jsonMatch) {
          try {
            valueToSave = JSON.parse(jsonMatch[1]);
          } catch {
            toast.error(`AI returned invalid JSON for ${subsectionKey}. Please try again.`);
            return;
          }
        }
      }
      // Unwrap items/rows wrapper
      if (valueToSave && typeof valueToSave === 'object' && !Array.isArray(valueToSave)) {
        if (Array.isArray((valueToSave as any).items)) valueToSave = (valueToSave as any).items;
        else if (Array.isArray((valueToSave as any).rows)) valueToSave = (valueToSave as any).rows;
      }
      // Normalize stakeholder rows
      if (subsectionKey === 'affected_stakeholders' && Array.isArray(valueToSave)) {
        valueToSave = (valueToSave as any[]).map((row: any) => ({
          stakeholder_name: row.stakeholder_name ?? row.stakeholder ?? row.name ?? row.Stakeholder ?? '',
          role: row.role ?? row.Role ?? '',
          impact_description: row.impact_description ?? row.impact ?? row.Impact ?? '',
          adoption_challenge: row.adoption_challenge ?? row.challenge ?? row.Challenge ?? '',
        }));
      }
      // Fallback: split lines for line_items
      if (config.format === 'line_items' && typeof valueToSave === 'string') {
        const lines = valueToSave.split('\n')
          .map((l: string) => l.replace(/^(?:\d+[\.\)]\s*|[-*•]\s*)/, '').trim())
          .filter((l: string) => l.length > 0);
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

  // ── Internal helpers ──

  function acceptSolverExpertise(newContent: string, sectionKey: string) {
    try {
      const cleaned = stripCodeFences(newContent);
      let parsed: any;
      try { parsed = JSON.parse(cleaned); } catch {
        const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[1]);
      }
      if (!parsed) throw new Error('No valid JSON found');
      if (Array.isArray(parsed)) {
        parsed = {
          expertise_areas: parsed.map((item: any) =>
            typeof item === 'string' ? { area: item, level: 'required' } : item
          ),
        };
      }
      setSavingSection(true);
      syncSectionToStore(sectionKey as SectionKey, parsed);
      saveSectionMutation.mutate({ field: 'solver_expertise_requirements', value: parsed });
    } catch {
      toast.error('AI returned invalid expertise data. Please try re-reviewing.');
    }
  }

  function acceptCodeArray(
    newContent: string, sectionKey: string, dbField: string,
    options: Array<{ value: string; label: string }>,
  ): boolean {
    try {
      const codes = JSON.parse(newContent);
      if (Array.isArray(codes)) {
        const typed = codes.map((c: string) => ({
          code: c,
          label: options.find(o => o.value === c)?.label ?? c,
        }));
        setSavingSection(true);
        syncSectionToStore(sectionKey as SectionKey, typed as unknown as SectionStoreEntry['data']);
        saveSectionMutation.mutate({ field: dbField, value: typed });
        return true;
      }
    } catch { /* not JSON array */ }
    return false;
  }

  function acceptSubmissionGuidelines(newContent: string, sectionKey: string) {
    let items: any[];
    try {
      const cleaned = stripCodeFences(newContent);
      const parsed = JSON.parse(cleaned);
      items = Array.isArray(parsed) ? parsed : (parsed?.items ?? [parsed]);
    } catch {
      items = newContent.split('\n')
        .map(l => l.replace(/^[\d.)\-*•]\s*/, '').trim())
        .filter(l => l.length > 0);
    }
    const structured = items.map((item: any) => {
      if (typeof item === 'string') return { name: item, description: '' };
      return { name: item.name ?? item.title ?? String(item), description: item.description ?? '' };
    });
    setSavingSection(true);
    const value = { items: structured };
    syncSectionToStore(sectionKey as SectionKey, value);
    saveSectionMutation.mutate({ field: 'submission_guidelines', value });
  }

  function acceptSolutionType(newContent: string) {
    let codes: string[] = [];
    try {
      const parsed = JSON.parse(newContent);
      codes = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
    } catch {
      codes = newContent.split(',').map(s => s.trim()).filter(Boolean);
    }
    const validCodes = new Set(solutionTypesData.map(t => t.code));
    const matched = codes.filter(c => validCodes.has(c));
    if (matched.length === 0) {
      toast.error(`No valid solution type codes found. Valid: ${Array.from(validCodes).join(', ')}`);
      return;
    }
    handleSaveSolutionTypes(matched);
  }

  function acceptSingleCode(
    newContent: string, sectionKey: string,
    cfg: { field: string; options: Array<{ value: string; label: string }> },
  ) {
    let code = newContent.trim().replace(/^["']|["']$/g, '');
    try {
      const parsed = JSON.parse(code);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        code = String(parsed.selected_id ?? parsed.code ?? parsed.value ?? code);
      }
    } catch { /* not JSON */ }
    const matched = cfg.options.find(o => o.value.toLowerCase() === code.toLowerCase());
    if (matched) {
      setSavingSection(true);
      syncSectionToStore(sectionKey as SectionKey, matched.value);
      saveSectionMutation.mutate({ field: cfg.field, value: matched.value });
      return;
    }
    const validCodes = new Set(cfg.options.map(o => o.value));
    if (!validCodes.has(code)) {
      toast.error(`Invalid ${sectionKey}: "${code}" is not a valid option. Valid: ${Array.from(validCodes).join(', ')}`);
      return;
    }
    setSavingSection(true);
    syncSectionToStore(sectionKey as SectionKey, code);
    saveSectionMutation.mutate({ field: cfg.field, value: code });
  }

  return { handleAcceptRefinement, handleAcceptExtendedBriefRefinement };
}

// ── Pure normalizer functions moved to src/lib/cogniblend/normalizeAIContent.ts ──
