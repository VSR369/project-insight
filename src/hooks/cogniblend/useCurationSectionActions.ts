/**
 * useCurationSectionActions — Section save/edit/approval callbacks.
 * Extracted from CurationReviewPage (Phase D4.1).
 */

import { useCallback, useRef } from 'react';
import { useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SECTION_FORMAT_CONFIG, EXTENDED_BRIEF_FIELD_MAP } from '@/lib/cogniblend/curationSectionFormats';
import { SECTION_MAP } from '@/lib/cogniblend/curationSectionDefs';
import { parseJson } from '@/lib/cogniblend/curationHelpers';
import { derivePrimaryGroup, getSelectedGroups } from '@/hooks/queries/useSolutionTypeMap';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';
import type { DeliverableItem } from '@/utils/parseDeliverableItem';
import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';
import { normalizeSectionReview } from '@/lib/cogniblend/normalizeSectionReview';
import type { RewardStructureDisplayHandle } from '@/components/cogniblend/curation/RewardStructureDisplay';
import type { ComplexityModuleHandle } from '@/components/cogniblend/curation/ComplexityAssessmentModule';

interface MasterDataOptions {
  ipModelOptions: Array<{ value: string; label: string }>;
  maturityOptions: Array<{ value: string; label: string }>;
  complexityOptions: Array<{ value: string; label: string }>;
  eligibilityOptions: Array<{ value: string; label: string }>;
  visibilityOptions: Array<{ value: string; label: string }>;
}

interface UseCurationSectionActionsOptions {
  challengeId: string;
  challenge: Record<string, any> | null;
  userId: string | undefined;
  saveSectionMutation: UseMutationResult<void, Error, { field: string; value: any }>;
  syncSectionToStore: (key: SectionKey, data: any) => void;
  notifyStaleness: (sectionKey: string) => void;
  setSavingSection: (v: boolean) => void;
  setEditingSection: (v: string | null) => void;
  setApprovedSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setIsAcceptingAllLegal: (v: boolean) => void;
  setOptimisticIndustrySegId: (v: string | null) => void;
  setAiReviews: React.Dispatch<React.SetStateAction<SectionReview[]>>;
  aiReviews: SectionReview[];
  masterData: MasterDataOptions;
  complexityParams: Array<{ param_key: string; name: string; weight: number; [k: string]: unknown }>;
  solutionTypesData: any[];
  solutionTypeMap: Array<{ solution_type_code: string; proficiency_area_name: string; [k: string]: unknown }>;
  rewardStructureRef: React.RefObject<RewardStructureDisplayHandle | null>;
  complexityModuleRef: React.RefObject<ComplexityModuleHandle | null>;
  aiSuggestedComplexity: any;
}

export function useCurationSectionActions({
  challengeId,
  challenge,
  userId,
  saveSectionMutation,
  syncSectionToStore,
  notifyStaleness,
  setSavingSection,
  setApprovedSections,
  setIsAcceptingAllLegal,
  setOptimisticIndustrySegId,
  setAiReviews,
  aiReviews,
  masterData,
  complexityParams,
  solutionTypesData,
  solutionTypeMap,
  rewardStructureRef,
  complexityModuleRef,
}: UseCurationSectionActionsOptions) {
  const queryClient = useQueryClient();

  // Stable ref for saveSectionMutation
  const saveSectionMutationRef = useRef(saveSectionMutation);
  saveSectionMutationRef.current = saveSectionMutation;

  // ── Simple field saves ──

  const handleSaveText = useCallback((sectionKey: string, dbField: string, value: string) => {
    setSavingSection(true);
    syncSectionToStore(sectionKey as SectionKey, value);
    saveSectionMutation.mutate({ field: dbField, value });
    notifyStaleness(sectionKey);
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness, setSavingSection]);

  const handleSaveDeliverables = useCallback((items: string[]) => {
    setSavingSection(true);
    const data = { items };
    syncSectionToStore('deliverables' as SectionKey, data);
    saveSectionMutation.mutate({ field: "deliverables", value: data });
    notifyStaleness('deliverables');
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness, setSavingSection]);

  const handleSaveStructuredDeliverables = useCallback((items: DeliverableItem[]) => {
    setSavingSection(true);
    const data = { items: items.map(({ name, description, acceptance_criteria }) => ({ name, description, acceptance_criteria })) };
    syncSectionToStore('deliverables' as SectionKey, data);
    saveSectionMutation.mutate({ field: "deliverables", value: data });
    notifyStaleness('deliverables');
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness, setSavingSection]);

  const handleSaveEvalCriteria = useCallback((criteria: { name: string; weight: number }[]) => {
    setSavingSection(true);
    const normalized = criteria.map((c) => ({
      criterion_name: c.name,
      weight_percentage: c.weight,
    }));
    const data = { criteria: normalized };
    syncSectionToStore('evaluation_criteria' as SectionKey, data);
    saveSectionMutation.mutate({ field: "evaluation_criteria", value: data });
    notifyStaleness('evaluation_criteria');
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness, setSavingSection]);

  const handleSaveMaturityLevel = useCallback((value: string) => {
    setSavingSection(true);
    const upper = value.toUpperCase();
    syncSectionToStore('maturity_level' as SectionKey, upper);
    saveSectionMutation.mutate({ field: "maturity_level", value: upper });
    notifyStaleness('maturity_level');
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness, setSavingSection]);

  const handleSaveSolutionTypes = useCallback(async (selectedCodes: string[]) => {
    setSavingSection(true);
    syncSectionToStore('solution_type' as SectionKey, selectedCodes);
    saveSectionMutation.mutate({ field: "solution_types", value: selectedCodes });

    const allSolTypes = solutionTypesData ?? [];
    const primaryGroup = derivePrimaryGroup(selectedCodes, allSolTypes);
    if (primaryGroup && primaryGroup !== challenge?.solution_type) {
      saveSectionMutation.mutate({ field: "solution_type", value: primaryGroup });
    }

    notifyStaleness('solution_type');

    if (challengeId && selectedCodes.length > 0) {
      try {
        const groups = getSelectedGroups(selectedCodes, allSolTypes);
        const groupLabels = groups.map(g => {
          const t = allSolTypes.find(st => st.proficiency_group === g);
          return t?.proficiency_group_label;
        }).filter(Boolean) as string[];

        if (groupLabels.length > 0) {
          const { data: paRows } = await supabase
            .from('proficiency_areas')
            .select('id, name')
            .eq('is_active', true)
            .in('name', groupLabels);

          if (paRows && paRows.length > 0) {
            const paIds = paRows.map((r: any) => r.id);
            const existing = challenge?.solver_expertise_requirements
              ? (typeof challenge.solver_expertise_requirements === 'string'
                ? JSON.parse(challenge.solver_expertise_requirements)
                : challenge.solver_expertise_requirements) as Record<string, any>
              : {};
            const updated = { ...existing, proficiency_areas: paIds };
            syncSectionToStore('solver_expertise' as SectionKey, updated);
            saveSectionMutation.mutate({ field: "solver_expertise_requirements", value: updated });
            toast.success(`Solver Expertise auto-updated for ${groupLabels.length} proficiency area(s)`);
          }
        }
      } catch (err) {
        console.error('[SolutionTypes] Failed to auto-populate solver expertise:', err);
      }
    }
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness, challengeId, challenge?.solver_expertise_requirements, challenge?.solution_type, solutionTypesData, setSavingSection]);

  const handleSaveExtendedBrief = useCallback((updatedBrief: Record<string, unknown>) => {
    setSavingSection(true);
    syncSectionToStore('extended_brief' as SectionKey, updatedBrief);
    saveSectionMutation.mutate({ field: "extended_brief", value: updatedBrief });
  }, [saveSectionMutation, syncSectionToStore, setSavingSection]);

  const handleSaveOrgPolicyField = useCallback((dbField: string, value: unknown) => {
    setSavingSection(true);
    const fieldToSection: Record<string, string> = {
      ip_model: 'ip_model',
      solver_eligibility_types: 'eligibility',
      solver_visibility_types: 'visibility',
      solver_expertise_requirements: 'solver_expertise',
    };
    const sectionKey = fieldToSection[dbField];
    if (sectionKey) {
      syncSectionToStore(sectionKey as SectionKey, value as SectionStoreEntry['data']);
      notifyStaleness(sectionKey);
    }
    saveSectionMutation.mutate({ field: dbField, value });
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness, setSavingSection]);

  const handleSaveComplexity = useCallback((
    paramValues: Record<string, number>,
    score: number,
    level: string,
    assessmentMode?: string,
    resolvedParams?: { param_key: string; name: string; value: number; weight: number }[],
  ) => {
    setSavingSection(true);
    const params: any[] = resolvedParams
      ? resolvedParams.map((p) => ({
          param_key: p.param_key, name: p.name, value: p.value, weight: p.weight,
        }))
      : complexityParams.map((p) => ({
          param_key: p.param_key, name: p.name, value: paramValues[p.param_key] ?? 5, weight: p.weight,
        }));
    if (assessmentMode) {
      params.push({ _meta: { mode: assessmentMode } });
    }
    const updates = {
      complexity_parameters: params,
      complexity_score: score,
      complexity_level: level,
      updated_by: userId ?? null,
    };
    supabase
      .from("challenges")
      .update(updates as any)
      .eq("id", challengeId)
      .then(({ error }) => {
        if (error) {
          toast.error(`Failed to save: ${error.message}`);
        } else {
          queryClient.invalidateQueries({ queryKey: ["curation-review", challengeId] });
          toast.success("Complexity assessment updated");
          notifyStaleness('complexity');
        }
        setSavingSection(false);
      });
  }, [complexityParams, challengeId, userId, queryClient, notifyStaleness, setSavingSection]);

  const handleLockComplexity = useCallback(async () => {
    if (!challengeId || !userId) return;
    setSavingSection(true);
    const { error } = await supabase
      .from("challenges")
      .update({
        complexity_locked: true,
        complexity_locked_at: new Date().toISOString(),
        complexity_locked_by: userId,
        updated_by: userId,
      } as any)
      .eq("id", challengeId);
    if (error) {
      toast.error(`Failed to lock: ${error.message}`);
    } else {
      queryClient.invalidateQueries({ queryKey: ["curation-review", challengeId] });
      toast.success("Complexity assessment locked");
    }
    setSavingSection(false);
  }, [challengeId, userId, queryClient, setSavingSection]);

  const handleUnlockComplexity = useCallback(async () => {
    if (!challengeId || !userId) return;
    setSavingSection(true);
    const { error } = await supabase
      .from("challenges")
      .update({
        complexity_locked: false,
        complexity_locked_at: null,
        complexity_locked_by: null,
        updated_by: userId,
      } as any)
      .eq("id", challengeId);
    if (error) {
      toast.error(`Failed to unlock: ${error.message}`);
    } else {
      queryClient.invalidateQueries({ queryKey: ["curation-review", challengeId] });
      toast.success("Complexity assessment unlocked");
    }
    setSavingSection(false);
  }, [challengeId, userId, queryClient, setSavingSection]);

  // ── Domain tags ──

  const handleAddDomainTag = useCallback((tag: string) => {
    if (!challenge) return;
    const trimmed = tag.trim();
    const existing = parseJson<string[]>(challenge.domain_tags);
    const current = Array.isArray(existing) ? existing : [];
    if (trimmed && !current.includes(trimmed)) {
      const updated = [...current, trimmed];
      saveSectionMutation.mutate({ field: "domain_tags", value: updated });
    }
  }, [challenge, saveSectionMutation]);

  const handleRemoveDomainTag = useCallback((tag: string) => {
    if (!challenge) return;
    const existing = parseJson<string[]>(challenge.domain_tags);
    const current = Array.isArray(existing) ? existing : [];
    const updated = current.filter((t) => t !== tag);
    saveSectionMutation.mutate({ field: "domain_tags", value: updated });
  }, [challenge, saveSectionMutation]);

  // ── Industry segment ──

  const handleIndustrySegmentChange = useCallback(async (segmentId: string) => {
    if (!challengeId || !challenge) return;
    setOptimisticIndustrySegId(segmentId);
    const currentTf = parseJson<any>(challenge.targeting_filters) ?? {};
    currentTf.industry_segment_id = segmentId;
    currentTf.industries = [segmentId];
    const { error } = await supabase.from("challenges").update({ targeting_filters: currentTf }).eq("id", challengeId);
    if (error) {
      toast.error("Failed to save industry segment");
      setOptimisticIndustrySegId(null);
      return;
    }
    toast.success("Industry segment updated");
    await queryClient.invalidateQueries({ queryKey: ["curation-review", challengeId] });
    setOptimisticIndustrySegId(null);
  }, [challengeId, challenge, queryClient, setOptimisticIndustrySegId]);

  // ── Legal defaults ──

  const handleAcceptAllLegalDefaults = useCallback(async () => {
    if (!challengeId) return;
    setIsAcceptingAllLegal(true);
    try {
      const { error } = await supabase
        .from('challenge_legal_docs')
        .update({ status: 'ATTACHED' } as any)
        .eq('challenge_id', challengeId)
        .in('status', ['ai_suggested', 'default_applied']);
      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ['curation-legal-summary', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['curation-legal-details', challengeId] });
      toast.success('All legal defaults accepted');
    } catch (err: any) {
      toast.error(`Failed to accept legal defaults: ${err.message}`);
    } finally {
      setIsAcceptingAllLegal(false);
    }
  }, [challengeId, queryClient, setIsAcceptingAllLegal]);

  // ── Accept AI refinement (massive handler) ──

  const handleAcceptRefinement = useCallback(async (sectionKey: string, newContent: string) => {
    const section = SECTION_MAP.get(sectionKey);
    const dbField = section?.dbField;

    if (sectionKey === "complexity") {
      complexityModuleRef.current?.saveAiDraft();
      return;
    }

    if (sectionKey === "solver_expertise") {
      try {
        const cleaned = newContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
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
            )
          };
        }
        setSavingSection(true);
        syncSectionToStore(sectionKey as SectionKey, parsed);
        saveSectionMutation.mutate({ field: "solver_expertise_requirements", value: parsed });
        return;
      } catch (e) {
        toast.error("AI returned invalid expertise data. Please try re-reviewing.");
        console.error("Solver expertise parse error:", e);
        return;
      }
    }

    if (sectionKey === "eligibility") {
      try {
        const codes = JSON.parse(newContent);
        if (Array.isArray(codes)) {
          const typed = codes.map((c: string) => ({
            code: c,
            label: masterData.eligibilityOptions.find(o => o.value === c)?.label ?? c,
          }));
          setSavingSection(true);
          syncSectionToStore(sectionKey as SectionKey, typed as unknown as SectionStoreEntry['data']);
          saveSectionMutation.mutate({ field: "solver_eligibility_types", value: typed });
          return;
        }
      } catch { /* not JSON array, fall through */ }
    }
    if (sectionKey === "visibility") {
      try {
        const codes = JSON.parse(newContent);
        if (Array.isArray(codes)) {
          const typed = codes.map((c: string) => ({
            code: c,
            label: masterData.visibilityOptions.find(o => o.value === c)?.label ?? c,
          }));
          setSavingSection(true);
          syncSectionToStore(sectionKey as SectionKey, typed as unknown as SectionStoreEntry['data']);
          saveSectionMutation.mutate({ field: "solver_visibility_types", value: typed });
          return;
        }
      } catch { /* not JSON array, fall through */ }
    }

    if (sectionKey === "submission_guidelines") {
      let items: any[];
      try {
        const cleaned = newContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
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
      saveSectionMutation.mutate({ field: "submission_guidelines", value });
      return;
    }

    if (sectionKey === 'solution_type') {
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
        toast.error(`No valid solution type codes found. Valid: ${Array.from(validCodes).join(", ")}`);
        return;
      }
      handleSaveSolutionTypes(matched);
      return;
    }

    const stmOptions = solutionTypeMap.map(m => ({ value: m.solution_type_code, label: m.proficiency_area_name }));
    const SINGLE_CODE_MAP: Record<string, { field: string; options: typeof masterData.ipModelOptions }> = {
      ip_model: { field: "ip_model", options: masterData.ipModelOptions },
      maturity_level: { field: "maturity_level", options: masterData.maturityOptions },
      complexity: { field: "complexity_level", options: masterData.complexityOptions },
    };
    const singleCodeCfg = SINGLE_CODE_MAP[sectionKey];
    if (singleCodeCfg) {
      let code = newContent.trim().replace(/^["']|["']$/g, '');
      try {
        const parsed = JSON.parse(code);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          code = String(parsed.selected_id ?? parsed.code ?? parsed.value ?? code);
        }
      } catch { /* not JSON */ }
      const matched = singleCodeCfg.options.find(o => o.value.toLowerCase() === code.toLowerCase());
      if (matched) {
        setSavingSection(true);
        syncSectionToStore(sectionKey as SectionKey, matched.value);
        saveSectionMutation.mutate({ field: singleCodeCfg.field, value: matched.value });
        return;
      }
      const validCodes = new Set(singleCodeCfg.options.map(o => o.value));
      if (!validCodes.has(code)) {
        toast.error(`Invalid ${sectionKey}: "${code}" is not a valid option. Valid: ${Array.from(validCodes).join(", ")}`);
        return;
      }
      setSavingSection(true);
      syncSectionToStore(sectionKey as SectionKey, code);
      saveSectionMutation.mutate({ field: singleCodeCfg.field, value: code });
      return;
    }

    if (!dbField) {
      toast.error("Cannot save refinement for this section type.");
      return;
    }

    let valueToSave: any = newContent;

    const JSON_FIELDS = ['deliverables', 'expected_outcomes', 'evaluation_criteria', 'phase_schedule', 'reward_structure', 'submission_guidelines', 'domain_tags', 'success_metrics_kpis', 'data_resources_provided'];
    if (JSON_FIELDS.includes(dbField)) {
      let cleaned = newContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const jsonStartIndex = cleaned.search(/[\[{]/);
      if (jsonStartIndex > 0) cleaned = cleaned.substring(jsonStartIndex);
      const jsonEndBracket = cleaned.lastIndexOf(']');
      const jsonEndBrace = cleaned.lastIndexOf('}');
      const jsonEnd = Math.max(jsonEndBracket, jsonEndBrace);
      if (jsonEnd > 0 && jsonEnd < cleaned.length - 1) cleaned = cleaned.substring(0, jsonEnd + 1);
      try {
        valueToSave = JSON.parse(cleaned);
      } catch {
        const repaired = cleaned.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
        try {
          valueToSave = JSON.parse(repaired);
        } catch {
          toast.error(`AI returned invalid structured data for ${dbField}. Please re-review this section.`);
          return;
        }
      }
    }

    if (dbField === 'reward_structure' && valueToSave && typeof valueToSave === 'object') {
      if (Array.isArray(valueToSave)) {
        const tiers: Record<string, number> = {};
        const tierNames = ['platinum', 'gold', 'silver', 'honorable_mention'];
        (valueToSave as any[]).forEach((row: any, i: number) => {
          const key = (row.tier || row.prize_tier || row.tier_name || tierNames[i] || `tier_${i}`)
            .toLowerCase().replace(/\s+/g, '_');
          const rawAmount = row.amount ?? row.prize ?? row.value ?? 0;
          tiers[key] = typeof rawAmount === 'string'
            ? Number(rawAmount.replace(/[$,]/g, ''))
            : Number(rawAmount) || 0;
        });
        const currency = (valueToSave as any[])[0]?.currency || 'USD';
        valueToSave = { type: 'monetary', monetary: { tiers, currency } };
      }
      if (valueToSave?.monetary?.tiers && Array.isArray(valueToSave.monetary.tiers)) {
        const tierRecord: Record<string, number> = {};
        const defaultNames = ['platinum', 'gold', 'silver', 'honorable_mention'];
        (valueToSave.monetary.tiers as any[]).forEach((t: any, i: number) => {
          const name = (t.tier_name || t.name || t.tier || defaultNames[i] || `tier_${i}`)
            .toLowerCase().replace(/\s+/g, '_');
          const amount = typeof t.amount === 'string'
            ? Number(t.amount.replace(/[$,\s]/g, '')) || 0
            : Number(t.amount ?? t.prize ?? t.value ?? 0) || 0;
          tierRecord[name] = amount;
        });
        valueToSave = { ...valueToSave, monetary: { ...valueToSave.monetary, tiers: tierRecord } };
      }
      rewardStructureRef.current?.applyAIReviewResult(valueToSave);
      return;
    }

    if (dbField === 'evaluation_criteria' && valueToSave && typeof valueToSave === 'object') {
      const rawArr = Array.isArray(valueToSave) ? valueToSave : Array.isArray(valueToSave?.criteria) ? valueToSave.criteria : null;
      if (rawArr) {
        valueToSave = {
          criteria: rawArr.map((c: any) => ({
            criterion_name: c.criterion_name ?? c.name ?? c.criterion ?? c.parameter ?? c.title ?? "",
            weight_percentage: Number(c.weight_percentage ?? c.weight ?? c.percentage ?? c.weight_percent ?? 0),
            description: c.description ?? c.details ?? c.scoring_type ?? "",
            scoring_method: c.scoring_method ?? c.scoring_type ?? "",
            evaluator_role: c.evaluator_role ?? c.evaluator ?? "",
          }))
        };
      }
    }

    if (dbField === 'success_metrics_kpis' && valueToSave && typeof valueToSave === 'object') {
      const rawArr = Array.isArray(valueToSave) ? valueToSave : (valueToSave?.items ?? null);
      if (rawArr && Array.isArray(rawArr)) {
        valueToSave = rawArr.map((row: any) => ({
          kpi: row.kpi ?? row.metric ?? row.name ?? row.KPI ?? "",
          baseline: row.baseline ?? row.Baseline ?? "",
          target: row.target ?? row.Target ?? "",
          measurement_method: row.measurement_method ?? row.method ?? row.Method ?? "",
          timeframe: row.timeframe ?? row.Timeframe ?? row.timeline ?? "",
        }));
      }
    }

    if (dbField === 'data_resources_provided' && valueToSave && typeof valueToSave === 'object') {
      const rawArr = Array.isArray(valueToSave) ? valueToSave : (valueToSave?.items ?? null);
      if (rawArr && Array.isArray(rawArr)) {
        valueToSave = rawArr.map((row: any) => ({
          resource: row.resource ?? row.name ?? row.resource_name ?? "",
          type: row.type ?? row.data_type ?? row.resource_type ?? "",
          format: row.format ?? "",
          size: row.size ?? "",
          access_method: row.access_method ?? row.access ?? "",
          restrictions: row.restrictions ?? row.restriction ?? "",
        }));
      }
    }

    if (dbField === 'domain_tags' && Array.isArray(valueToSave)) {
      valueToSave = valueToSave.filter((t: any) => typeof t === 'string' && t.trim().length > 0);
      if (valueToSave.length === 0) {
        toast.error("AI suggested no valid domain tags. Please add tags manually.");
        return;
      }
    }

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
      const cleaned = newContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
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
      if (valueToSave && typeof valueToSave === 'object' && !Array.isArray(valueToSave)) {
        if (Array.isArray((valueToSave as any).items)) {
          valueToSave = (valueToSave as any).items;
        } else if (Array.isArray((valueToSave as any).rows)) {
          valueToSave = (valueToSave as any).rows;
        }
      }
      if (subsectionKey === 'affected_stakeholders' && Array.isArray(valueToSave)) {
        valueToSave = (valueToSave as any[]).map((row: any) => ({
          stakeholder_name: row.stakeholder_name ?? row.stakeholder ?? row.name ?? row.Stakeholder ?? "",
          role: row.role ?? row.Role ?? "",
          impact_description: row.impact_description ?? row.impact ?? row.Impact ?? "",
          adoption_challenge: row.adoption_challenge ?? row.challenge ?? row.Challenge ?? "",
        }));
      }
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
    saveSectionMutation.mutate({ field: "extended_brief", value: updated });
  }, [challenge?.extended_brief, saveSectionMutation, handleAcceptRefinement, syncSectionToStore, setSavingSection]);

  // ── Mark AI review addressed ──

  const handleMarkAddressed = useCallback((sectionKey: string) => {
    setAiReviews((prev) => {
      return prev.map((r) =>
        r.section_key === sectionKey ? { ...r, addressed: true, comments: [] } : r
      );
    });
    const updated = aiReviews.map((r) =>
      r.section_key === sectionKey ? { ...r, addressed: true, comments: [] } : r
    );
    saveSectionMutationRef.current.mutate({ field: "ai_section_reviews", value: updated });
  }, [aiReviews, setAiReviews]);

  // ── Toggle section approval ──

  const toggleSectionApproval = useCallback((key: string) => {
    setApprovedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, [setApprovedSections]);

  return {
    handleSaveText,
    handleSaveDeliverables,
    handleSaveStructuredDeliverables,
    handleSaveEvalCriteria,
    handleSaveMaturityLevel,
    handleSaveSolutionTypes,
    handleSaveExtendedBrief,
    handleSaveOrgPolicyField,
    handleSaveComplexity,
    handleLockComplexity,
    handleUnlockComplexity,
    handleAddDomainTag,
    handleRemoveDomainTag,
    handleIndustrySegmentChange,
    handleAcceptAllLegalDefaults,
    handleAcceptRefinement,
    handleAcceptExtendedBriefRefinement,
    handleMarkAddressed,
    toggleSectionApproval,
    saveSectionMutationRef,
  };
}
