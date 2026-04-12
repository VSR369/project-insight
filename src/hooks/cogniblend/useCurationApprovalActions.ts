/**
 * useCurationApprovalActions — Complexity, domain, industry, and legal callbacks.
 * Extracted from useCurationSectionActions for ≤200 line compliance.
 */

import { useCallback } from 'react';
import { useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parseJson } from '@/lib/cogniblend/curationHelpers';
import { derivePrimaryGroup, getSelectedGroups } from '@/hooks/queries/useSolutionTypeMap';
import { getCurationFormStore } from '@/store/curationFormStore';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';
import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';

interface UseCurationApprovalActionsOptions {
  challengeId: string;
  challenge: Record<string, any> | null;
  userId: string | undefined;
  saveSectionMutation: UseMutationResult<void, Error, { field: string; value: any }>;
  syncSectionToStore: (key: SectionKey, data: any) => void;
  notifyStaleness: (sectionKey: string) => void;
  setSavingSection: (v: boolean) => void;
  setApprovedSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setIsAcceptingAllLegal: (v: boolean) => void;
  setOptimisticIndustrySegId: (v: string | null) => void;
  setAiReviews: React.Dispatch<React.SetStateAction<SectionReview[]>>;
  aiReviews: SectionReview[];
  saveSectionMutationRef: React.RefObject<UseMutationResult<void, Error, { field: string; value: any }>>;
  complexityParams: Array<{ param_key: string; name: string; weight: number }>;
  solutionTypesData: any[];
  solutionTypeMap: Array<{ solution_type_code: string; proficiency_area_name: string }>;
}

export function useCurationApprovalActions({
  challengeId, challenge, userId, saveSectionMutation, syncSectionToStore,
  notifyStaleness, setSavingSection, setApprovedSections, setIsAcceptingAllLegal,
  setOptimisticIndustrySegId, setAiReviews, aiReviews, saveSectionMutationRef,
  complexityParams, solutionTypesData,
}: UseCurationApprovalActionsOptions) {
  const queryClient = useQueryClient();

  const handleSaveComplexity = useCallback((
    paramValues: Record<string, number>, score: number, level: string,
    assessmentMode?: string,
    resolvedParams?: { param_key: string; name: string; value: number; weight: number }[],
  ) => {
    setSavingSection(true);
    const params: any[] = resolvedParams
      ? resolvedParams.map((p) => ({ param_key: p.param_key, name: p.name, value: p.value, weight: p.weight }))
      : complexityParams.map((p) => ({ param_key: p.param_key, name: p.name, value: paramValues[p.param_key] ?? 5, weight: p.weight }));
    if (assessmentMode) params.push({ _meta: { mode: assessmentMode } });
    supabase.from('challenges')
      .update({ complexity_parameters: params, complexity_score: score, complexity_level: level, updated_by: userId ?? null } as any)
      .eq('id', challengeId)
      .then(({ error }) => {
        if (error) toast.error(`Failed to save: ${error.message}`);
        else {
          queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
          toast.success('Complexity assessment updated');
          notifyStaleness('complexity');
        }
        setSavingSection(false);
      });
  }, [complexityParams, challengeId, userId, queryClient, notifyStaleness, setSavingSection]);

  const handleLockComplexity = useCallback(async () => {
    if (!challengeId || !userId) return;
    setSavingSection(true);
    const { error } = await supabase.from('challenges')
      .update({ complexity_locked: true, complexity_locked_at: new Date().toISOString(), complexity_locked_by: userId, updated_by: userId } as any)
      .eq('id', challengeId);
    if (error) toast.error(`Failed to lock: ${error.message}`);
    else { queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] }); toast.success('Complexity assessment locked'); }
    setSavingSection(false);
  }, [challengeId, userId, queryClient, setSavingSection]);

  const handleUnlockComplexity = useCallback(async () => {
    if (!challengeId || !userId) return;
    setSavingSection(true);
    const { error } = await supabase.from('challenges')
      .update({ complexity_locked: false, complexity_locked_at: null, complexity_locked_by: null, updated_by: userId } as any)
      .eq('id', challengeId);
    if (error) toast.error(`Failed to unlock: ${error.message}`);
    else { queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] }); toast.success('Complexity assessment unlocked'); }
    setSavingSection(false);
  }, [challengeId, userId, queryClient, setSavingSection]);

  const handleAddDomainTag = useCallback((tag: string) => {
    if (!challenge) return;
    const existing = parseJson<string[]>(challenge.domain_tags);
    const current = Array.isArray(existing) ? existing : [];
    const trimmed = tag.trim();
    if (trimmed && !current.includes(trimmed)) {
      saveSectionMutation.mutate({ field: 'domain_tags', value: [...current, trimmed] });
    }
  }, [challenge, saveSectionMutation]);

  const handleRemoveDomainTag = useCallback((tag: string) => {
    if (!challenge) return;
    const existing = parseJson<string[]>(challenge.domain_tags);
    const current = Array.isArray(existing) ? existing : [];
    saveSectionMutation.mutate({ field: 'domain_tags', value: current.filter((t) => t !== tag) });
  }, [challenge, saveSectionMutation]);

  const handleIndustrySegmentChange = useCallback(async (segmentId: string) => {
    if (!challengeId || !challenge) return;
    setOptimisticIndustrySegId(segmentId);
    const currentTf = parseJson<any>(challenge.targeting_filters) ?? {};
    currentTf.industry_segment_id = segmentId;
    currentTf.industries = [segmentId];
    const { error } = await supabase.from('challenges').update({ targeting_filters: currentTf }).eq('id', challengeId);
    if (error) { toast.error('Failed to save industry segment'); setOptimisticIndustrySegId(null); return; }
    toast.success('Industry segment updated');
    await queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
    setOptimisticIndustrySegId(null);
  }, [challengeId, challenge, queryClient, setOptimisticIndustrySegId]);

  const handleAcceptAllLegalDefaults = useCallback(async () => {
    if (!challengeId) return;
    setIsAcceptingAllLegal(true);
    try {
      const { error } = await supabase.from('challenge_legal_docs')
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

  const handleMarkAddressed = useCallback((sectionKey: string) => {
    // Update React state for immediate UI feedback
    setAiReviews((prev) => prev.map((r) =>
      r.section_key === sectionKey ? { ...r, addressed: true } : r
    ));
    // Persist via Zustand store → useCurationStoreSync → DB (preserves comments)
    const store = getCurationFormStore(challengeId);
    store.getState().setAddressedOnly(sectionKey as SectionKey);
  }, [setAiReviews, challengeId]);

  const toggleSectionApproval = useCallback((key: string) => {
    setApprovedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, [setApprovedSections]);

  const handleSaveSolutionTypes = useCallback(async (selectedCodes: string[]) => {
    setSavingSection(true);
    syncSectionToStore('solution_type' as SectionKey, selectedCodes);
    saveSectionMutation.mutate({ field: 'solution_types', value: selectedCodes });

    const allSolTypes = solutionTypesData ?? [];
    const primaryGroup = derivePrimaryGroup(selectedCodes, allSolTypes);
    if (primaryGroup && primaryGroup !== challenge?.solution_type) {
      saveSectionMutation.mutate({ field: 'solution_type', value: primaryGroup });
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
            .from('proficiency_areas').select('id, name').eq('is_active', true).in('name', groupLabels);
          if (paRows && paRows.length > 0) {
            const paIds = paRows.map((r: any) => r.id);
            const existing = challenge?.solver_expertise_requirements
              ? (typeof challenge.solver_expertise_requirements === 'string'
                ? JSON.parse(challenge.solver_expertise_requirements)
                : challenge.solver_expertise_requirements) as Record<string, any>
              : {};
            const updated = { ...existing, proficiency_areas: paIds };
            syncSectionToStore('solver_expertise' as SectionKey, updated);
            saveSectionMutation.mutate({ field: 'solver_expertise_requirements', value: updated });
            toast.success(`Solver Expertise auto-updated for ${groupLabels.length} proficiency area(s)`);
          }
        }
      } catch (err) {
        console.error('[SolutionTypes] Failed to auto-populate solver expertise:', err);
      }
    }
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness, challengeId, challenge?.solver_expertise_requirements, challenge?.solution_type, solutionTypesData, setSavingSection]);

  return {
    handleSaveComplexity, handleLockComplexity, handleUnlockComplexity,
    handleAddDomainTag, handleRemoveDomainTag, handleIndustrySegmentChange,
    handleAcceptAllLegalDefaults, handleMarkAddressed, toggleSectionApproval,
    handleSaveSolutionTypes,
  };
}
