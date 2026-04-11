/**
 * useCurationSectionActions — Section save/edit callbacks.
 * Complexity, domain, industry, legal, and approval callbacks extracted to useCurationApprovalActions.
 */

import { useCallback, useRef } from 'react';
import { type UseMutationResult } from '@tanstack/react-query';
import { EXTENDED_BRIEF_FIELD_MAP } from '@/lib/cogniblend/curationSectionFormats';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';
import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';
import type { RewardStructureDisplayHandle } from '@/components/cogniblend/curation/RewardStructureDisplay';
import type { ComplexityModuleHandle } from '@/components/cogniblend/curation/ComplexityAssessmentModule';
import { useCurationAcceptRefinement } from './useCurationAcceptRefinement';
import { useCurationApprovalActions } from './useCurationApprovalActions';

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
  complexityParams: Array<{ param_key: string; name: string; weight: number }>;
  solutionTypesData: any[];
  solutionTypeMap: Array<{ solution_type_code: string; proficiency_area_name: string }>;
  rewardStructureRef: React.RefObject<RewardStructureDisplayHandle | null>;
  complexityModuleRef: React.RefObject<ComplexityModuleHandle | null>;
  aiSuggestedComplexity: any;
}

export function useCurationSectionActions({
  challengeId, challenge, userId, saveSectionMutation, syncSectionToStore,
  notifyStaleness, setSavingSection, setApprovedSections, setIsAcceptingAllLegal,
  setOptimisticIndustrySegId, setAiReviews, aiReviews, masterData,
  complexityParams, solutionTypesData, solutionTypeMap,
  rewardStructureRef, complexityModuleRef,
}: UseCurationSectionActionsOptions) {
  const saveSectionMutationRef = useRef(saveSectionMutation);
  saveSectionMutationRef.current = saveSectionMutation;

  // ── Simple field saves ──

  /** Store sync + staleness only — no DB write. Used by autosave wrapper. */
  const handleSyncText = useCallback((sectionKey: string, value: string) => {
    syncSectionToStore(sectionKey as SectionKey, value);
    notifyStaleness(sectionKey);
  }, [syncSectionToStore, notifyStaleness]);

  const handleSaveText = useCallback((sectionKey: string, dbField: string, value: string) => {
    syncSectionToStore(sectionKey as SectionKey, value);
    saveSectionMutation.mutate({ field: dbField, value });
    notifyStaleness(sectionKey);
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness]);

  const handleSaveDeliverables = useCallback((items: string[]) => {
    const data = { items };
    syncSectionToStore('deliverables' as SectionKey, data);
    saveSectionMutation.mutate({ field: 'deliverables', value: data });
    notifyStaleness('deliverables');
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness]);

  const handleSaveStructuredDeliverables = useCallback((items: Array<{ name: string; description?: string; acceptance_criteria?: string }>) => {
    const data = { items: items.map(({ name, description, acceptance_criteria }) => ({ name, description, acceptance_criteria })) };
    syncSectionToStore('deliverables' as SectionKey, data);
    saveSectionMutation.mutate({ field: 'deliverables', value: data });
    notifyStaleness('deliverables');
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness]);

  const handleSaveEvalCriteria = useCallback((criteria: { name: string; weight: number }[]) => {
    const normalized = criteria.map((c) => ({ criterion_name: c.name, weight_percentage: c.weight }));
    const data = { criteria: normalized };
    syncSectionToStore('evaluation_criteria' as SectionKey, data);
    saveSectionMutation.mutate({ field: 'evaluation_criteria', value: data });
    notifyStaleness('evaluation_criteria');
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness]);

  const handleSaveMaturityLevel = useCallback((value: string) => {
    const upper = value.toUpperCase();
    syncSectionToStore('maturity_level' as SectionKey, upper);
    saveSectionMutation.mutate({ field: 'maturity_level', value: upper });
    notifyStaleness('maturity_level');
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness]);

  const handleSaveExtendedBrief = useCallback((updatedBrief: Record<string, unknown>) => {
    syncSectionToStore('extended_brief' as SectionKey, updatedBrief);
    saveSectionMutation.mutate({ field: 'extended_brief', value: updatedBrief });
  }, [saveSectionMutation, syncSectionToStore]);

  const handleSaveOrgPolicyField = useCallback((dbField: string, value: unknown) => {
    const fieldToSection: Record<string, string> = {
      ip_model: 'ip_model', solver_eligibility_types: 'eligibility',
      solver_visibility_types: 'visibility', solver_expertise_requirements: 'solver_expertise',
    };
    const sectionKey = fieldToSection[dbField];
    if (sectionKey) {
      syncSectionToStore(sectionKey as SectionKey, value as SectionStoreEntry['data']);
      notifyStaleness(sectionKey);
    }
    saveSectionMutation.mutate({ field: dbField, value });
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness]);

  // ── Delegated: complexity, domain, industry, legal, approval ──

  const approval = useCurationApprovalActions({
    challengeId, challenge, userId, saveSectionMutation, syncSectionToStore,
    notifyStaleness, setSavingSection, setApprovedSections, setIsAcceptingAllLegal,
    setOptimisticIndustrySegId, setAiReviews, aiReviews, saveSectionMutationRef,
    complexityParams, solutionTypesData, solutionTypeMap,
  });

  // ── AI refinement acceptance (delegated) ──

  const { handleAcceptRefinement, handleAcceptExtendedBriefRefinement } = useCurationAcceptRefinement({
    challenge, saveSectionMutation, syncSectionToStore, setSavingSection,
    masterData, solutionTypesData, solutionTypeMap,
    rewardStructureRef, complexityModuleRef,
    handleSaveSolutionTypes: approval.handleSaveSolutionTypes,
  });

  return {
    handleSaveText, handleSyncText, handleSaveDeliverables, handleSaveStructuredDeliverables,
    handleSaveEvalCriteria, handleSaveMaturityLevel,
    handleSaveExtendedBrief, handleSaveOrgPolicyField,
    handleAcceptRefinement, handleAcceptExtendedBriefRefinement,
    saveSectionMutationRef,
    ...approval,
  };
}
