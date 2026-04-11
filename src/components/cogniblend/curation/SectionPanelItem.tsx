/**
 * SectionPanelItem — Renders a single section panel within the curation section list.
 *
 * Extracted from CurationSectionList.tsx to keep files under 200 lines.
 */

import React, { useState, useCallback } from "react";
import { useAutoSaveSection } from "@/hooks/cogniblend/useAutoSaveSection";
import { cn } from "@/lib/utils";
import { useSectionNavigationListener } from "@/lib/cogniblend/sectionNavigation";

import { CurationAIReviewInline, type SectionReview } from "@/components/cogniblend/curation/CurationAIReviewPanel";
import { CuratorSectionPanel, type SectionStatus } from "@/components/cogniblend/curation/CuratorSectionPanel";
import { SectionReferencePanel } from "@/components/cogniblend/curation/SectionReferencePanel";
import { renderSectionContent } from "@/components/cogniblend/curation/renderSectionContent";

import { LOCKED_SECTIONS } from "@/lib/cogniblend/curationSectionDefs";
import { EXTENDED_BRIEF_FIELD_MAP } from "@/lib/cogniblend/curationSectionFormats";
import { parseJson, getSectionContent } from "@/lib/cogniblend/curationHelpers";
import type { ChallengeData, LegalDocSummary, LegalDocDetail, EscrowRecord, SectionDef } from "@/lib/cogniblend/curationTypes";
import type { DeliverableItem } from "@/utils/parseDeliverableItem";
import type { SectionKey } from "@/types/sections";
import type { RewardStructureDisplayHandle } from "@/components/cogniblend/curation/RewardStructureDisplay";
import type { ComplexityModuleHandle } from "@/components/cogniblend/curation/ComplexityAssessmentModule";

export interface SectionPanelItemProps {
  section: SectionDef;
  challenge: ChallengeData;
  challengeId: string;
  isReadOnly: boolean;
  editingSection: string | null;
  setEditingSection: (key: string | null) => void;
  savingSection: boolean;
  setSavingSection: (v: boolean) => void;
  aiReview: SectionReview | undefined;
  approvedSections: Record<string, boolean>;
  toggleSectionApproval: (key: string) => void;
  sectionAIFlags: Record<string, string[]>;
  highlightWarnings: boolean;
  aiSuggestedComplexity: any;
  staleKeySet: Set<string>;
  reviewSessionActive?: boolean;

  masterData: {
    ipModelOptions: Array<{ value: string; label: string; description?: string }>;
    maturityOptions: Array<{ value: string; label: string; description?: string }>;
    eligibilityOptions: Array<{ value: string; label: string }>;
    visibilityOptions: Array<{ value: string; label: string }>;
    complexityOptions: Array<{ value: string; label: string }>;
  };
  complexityParams: any[];
  industrySegments: Array<{ id: string; name: string }> | undefined;
  solutionTypeGroups: any[];
  solutionTypesData: any[];
  solutionTypeMap: any[];

  handleSaveText: (key: string, field: string, val: string) => void;
  handleSyncText: (key: string, val: string) => void;
  handleSaveDeliverables: (items: string[]) => void;
  handleSaveStructuredDeliverables: (items: DeliverableItem[]) => void;
  handleSaveEvalCriteria: (criteria: { name: string; weight: number }[]) => void;
  handleSaveOrgPolicyField: (field: string, val: unknown) => void;
  handleSaveMaturityLevel: (val: string) => void;
  handleSaveSolutionTypes: (codes: string[]) => void;
  handleSaveExtendedBrief: (brief: Record<string, unknown>) => void;
  handleSaveComplexity: (...args: any[]) => void;
  handleLockComplexity: () => void;
  handleUnlockComplexity: () => void;
  handleAcceptRefinement: (key: string, content: string) => void;
  handleAcceptExtendedBriefRefinement: (key: string, content: string) => void;
  handleSingleSectionReview: (key: string, review: SectionReview) => void;
  handleMarkAddressed: (key: string) => void;
  handleComplexityReReview: (key: string) => Promise<void>;
  handleApproveLockedSection: (key: string) => void;
  handleUndoApproval: (key: string) => void;
  handleAddDomainTag: (tag: string) => void;
  handleRemoveDomainTag: (tag: string) => void;
  handleIndustrySegmentChange: (segId: string) => void;
  handleAcceptAllLegalDefaults: () => void;
  saveSectionMutation: { mutate: (args: { field: string; value: any }) => void };

  challengeCtx: Record<string, unknown>;
  optimisticIndustrySegId: string | null;
  escrowEnabled: boolean;
  setEscrowEnabled: (v: boolean) => void;
  isAcceptingAllLegal: boolean;

  legalDocs: LegalDocSummary[];
  legalDetails: LegalDocDetail[];
  escrowRecord: EscrowRecord | null;

  rewardStructureRef: React.RefObject<RewardStructureDisplayHandle | null>;
  complexityModuleRef: React.RefObject<ComplexityModuleHandle | null>;

  curationStore: any;
  staleSections: Array<{ key: string; staleBecauseOf: string[]; staleAt: string | null }>;
  sectionReadiness: Record<string, { ready: boolean; missing: string[] }>;

  getSectionActions: (key: string) => any[];
  setLockedSendState: React.Dispatch<React.SetStateAction<any>>;
  setContextLibraryOpen: (v: boolean) => void;
  expandVersion: number;
}

export function SectionPanelItem({ section, challenge, challengeId, isReadOnly, editingSection, setEditingSection, savingSection, setSavingSection, aiReview, approvedSections, toggleSectionApproval, sectionAIFlags, highlightWarnings, aiSuggestedComplexity, staleKeySet, reviewSessionActive, masterData, complexityParams, industrySegments, solutionTypeGroups, solutionTypesData, solutionTypeMap, handleSaveText, handleSyncText, handleSaveDeliverables, handleSaveStructuredDeliverables, handleSaveEvalCriteria, handleSaveOrgPolicyField, handleSaveMaturityLevel, handleSaveSolutionTypes, handleSaveExtendedBrief, handleSaveComplexity, handleLockComplexity, handleUnlockComplexity, handleAcceptRefinement, handleAcceptExtendedBriefRefinement, handleSingleSectionReview, handleMarkAddressed, handleComplexityReReview, handleApproveLockedSection, handleUndoApproval, handleAddDomainTag, handleRemoveDomainTag, handleIndustrySegmentChange, handleAcceptAllLegalDefaults, saveSectionMutation, challengeCtx, optimisticIndustrySegId, escrowEnabled, setEscrowEnabled, isAcceptingAllLegal, legalDocs, legalDetails, escrowRecord, rewardStructureRef, complexityModuleRef, curationStore, staleSections, sectionReadiness, getSectionActions, setLockedSendState, setContextLibraryOpen, expandVersion }: SectionPanelItemProps) {
  const [navHighlight, setNavHighlight] = useState(false);
  const [forceExpandTick, setForceExpandTick] = useState(0);

  useSectionNavigationListener(useCallback((key: string) => {
    if (key !== section.key) return;
    setForceExpandTick((t) => t + 1);
    setNavHighlight(true);
    setTimeout(() => setNavHighlight(false), 3000);
  }, [section.key]));

  const filled = section.isFilled(challenge, legalDocs, legalDetails, escrowRecord);
  const isLocked = LOCKED_SECTIONS.has(section.key);
  // Standard (non-locked) sections are always in edit mode for autosave
  const isEditing = isLocked ? editingSection === section.key : !isReadOnly;
  const canEdit = !isReadOnly && !isLocked && (!!section.dbField || section.key === "complexity");
  const isApproved = approvedSections[section.key] ?? false;
  const inlineFlags = sectionAIFlags[section.key];

  let panelStatus: SectionStatus = "not_reviewed";
  if (isLocked) panelStatus = "view_only";
  else if (aiReview && reviewSessionActive) {
    if (aiReview.addressed) panelStatus = "pass";
    else if (aiReview.status === "pass") panelStatus = "pass";
    else if (aiReview.status === "warning") panelStatus = "warning";
    else if (aiReview.status === "needs_revision") panelStatus = "needs_revision";
  }
  if (staleKeySet.has(section.key)) panelStatus = "stale";

  const currentTags = section.key === "domain_tags"
    ? (() => { const t = parseJson<string[]>(challenge.domain_tags); return Array.isArray(t) ? t : []; })()
    : [];

  const cancelEdit = () => setEditingSection(null);

  // Autosave: debounced DB writer for this section panel
  const dbField = section.dbField ?? section.key;
  const { save: autoSave, status: autoSaveStatus } = useAutoSaveSection(saveSectionMutation, {
    field: dbField,
    debounceMs: 700,
    disabled: isReadOnly || LOCKED_SECTIONS.has(section.key),
  });

  // Wrap handleSaveText to sync store immediately + debounce DB write
  const debouncedHandleSaveText = useCallback((key: string, _field: string, val: string) => {
    handleSyncText(key, val);
    autoSave(val);
  }, [handleSyncText, autoSave]);

  const sectionContent = renderSectionContent({
    section, challenge, challengeId, isReadOnly, isEditing, isLocked, canEdit,
    savingSection, setSavingSection, cancelEdit, setEditingSection, panelStatus,
    handleSaveText: debouncedHandleSaveText, handleSaveDeliverables, handleSaveStructuredDeliverables,
    handleSaveEvalCriteria, handleSaveOrgPolicyField, handleSaveMaturityLevel,
    handleSaveSolutionTypes, handleSaveExtendedBrief, handleSaveComplexity,
    handleLockComplexity, handleUnlockComplexity, handleAcceptAllLegalDefaults,
    handleAddDomainTag, handleRemoveDomainTag, handleIndustrySegmentChange,
    saveSectionMutation,
    masterData, complexityParams, industrySegments,
    solutionTypeGroups, solutionTypesData,
    optimisticIndustrySegId, escrowEnabled, setEscrowEnabled,
    isAcceptingAllLegal, currentTags,
    legalDocs, legalDetails, escrowRecord,
    rewardStructureRef, complexityModuleRef, aiSuggestedComplexity,
    autoSaveStatus,
  });

  const sectionMasterDataOptions = (() => {
    switch (section.key) {
      case "eligibility": return masterData.eligibilityOptions;
      case "visibility": return masterData.visibilityOptions;
      case "ip_model": return masterData.ipModelOptions;
      case "maturity_level": return masterData.maturityOptions;
      case "complexity": return masterData.complexityOptions;
      case "solution_type": return solutionTypeMap.map((m: any) => ({ value: m.solution_type_code, label: m.proficiency_area_name }));
      default: return undefined;
    }
  })();

  const coordinatorRole = section.key === "legal_docs" ? "LC" as const : section.key === "escrow_funding" ? "FC" as const : undefined;
  const hasSentBefore = getSectionActions(section.key).some((a: any) => a.action_type === "modification_request");
  const secReadiness = sectionReadiness[section.key];

  const aiReviewContent = (
    <CurationAIReviewInline
      sectionKey={section.key}
      review={aiReview}
      currentContent={getSectionContent(challenge, section.key)}
      challengeId={challengeId}
      challengeContext={challengeCtx}
      onAcceptRefinement={EXTENDED_BRIEF_FIELD_MAP[section.key] ? handleAcceptExtendedBriefRefinement : handleAcceptRefinement}
      onSingleSectionReview={handleSingleSectionReview}
      onMarkAddressed={handleMarkAddressed}
      defaultOpen={!aiReview?.addressed && (aiReview?.status === "warning" || aiReview?.status === "needs_revision")}
      masterDataOptions={sectionMasterDataOptions}
      isLockedSection={isLocked}
      coordinatorRole={coordinatorRole}
      hasSentBefore={hasSentBefore}
      onReReview={section.key === "complexity" ? handleComplexityReReview : undefined}
      complexityRatings={section.key === "complexity" ? (aiSuggestedComplexity ?? undefined) : undefined}
      prerequisitesReady={secReadiness?.ready ?? true}
      missingPrerequisites={secReadiness?.missing}
      onSendToCoordinator={isLocked ? (editedComments: string) => {
        const originalAiComments = (aiReview?.comments ?? []).map((c: any) => typeof c === "string" ? c : c?.text ?? JSON.stringify(c)).join("\n\n");
        setLockedSendState({
          open: true,
          sectionKey: section.key,
          sectionLabel: section.label,
          initialComment: editedComments,
          aiOriginalComments: originalAiComments,
        });
      } : undefined}
    />
  );

  const isWarningHighlighted = highlightWarnings && aiReview && (aiReview.status === "warning" || aiReview.status === "needs_revision") && !aiReview.addressed;

  return (
    <div
      data-section-key={section.key}
      className={cn(
        "transition-all duration-500",
        isWarningHighlighted && "ring-2 ring-amber-400 ring-offset-2 rounded-xl animate-pulse",
        navHighlight && !isWarningHighlighted && "ring-2 ring-primary ring-offset-2 rounded-xl",
      )}
    >
      <CuratorSectionPanel
        sectionKey={section.key}
        label={section.label}
        attribution={section.attribution}
        filled={filled}
        status={panelStatus}
        isLocked={isLocked}
        isReadOnly={isReadOnly}
        isApproved={isApproved}
        onToggleApproval={() => toggleSectionApproval(section.key)}
        onApproveSection={isLocked ? () => handleApproveLockedSection(section.key) : undefined}
        onUndoApproval={isLocked ? () => handleUndoApproval(section.key) : undefined}
        challengeId={challengeId}
        inlineFlags={inlineFlags}
        defaultExpanded={!!(aiReview && !aiReview.addressed && (aiReview.status === "warning" || aiReview.status === "needs_revision"))}
        aiReviewSlot={aiReviewContent}
        sectionActions={getSectionActions(section.key)}
        promptSource={aiReview?.prompt_source ?? null}
        expandVersion={expandVersion}
        forceExpandTick={forceExpandTick}
        staleBecauseOf={staleSections.find((s) => s.key === section.key)?.staleBecauseOf}
        staleAt={staleSections.find((s) => s.key === section.key)?.staleAt ?? null}
        aiAction={curationStore?.getState().getSectionEntry(section.key as SectionKey)?.aiAction ?? null}
      >
        {sectionContent}
        <SectionReferencePanel
          challengeId={challengeId}
          sectionKey={section.key}
          disabled={isReadOnly}
          onOpenLibrary={() => setContextLibraryOpen(true)}
        />
      </CuratorSectionPanel>
    </div>
  );
}
