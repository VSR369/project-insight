/**
 * CurationSectionList — Renders the section panels for the active group.
 *
 * Extracted from CurationReviewPage.tsx (Phase D3.2).
 * Delegates content rendering to renderSectionContent and banner to PrerequisiteBanner.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { CurationAIReviewInline, type SectionReview } from "@/components/cogniblend/curation/CurationAIReviewPanel";
import { CuratorSectionPanel, type SectionStatus } from "@/components/cogniblend/curation/CuratorSectionPanel";
import { SectionReferencePanel } from "@/components/cogniblend/curation/SectionReferencePanel";
import { OrgContextPanel } from "@/components/cogniblend/curation/OrgContextPanel";
import { PrerequisiteBanner } from "@/components/cogniblend/curation/PrerequisiteBanner";
import { renderSectionContent } from "@/components/cogniblend/curation/renderSectionContent";

import { SECTION_MAP, LOCKED_SECTIONS } from "@/lib/cogniblend/curationSectionDefs";
import { EXTENDED_BRIEF_FIELD_MAP } from "@/lib/cogniblend/curationSectionFormats";
import { parseJson, getSectionContent } from "@/lib/cogniblend/curationHelpers";
import type { ChallengeData, LegalDocSummary, LegalDocDetail, EscrowRecord, SectionDef, GroupDef } from "@/lib/cogniblend/curationTypes";
import type { DeliverableItem } from "@/utils/parseDeliverableItem";
import type { SectionKey } from "@/types/sections";
import type { RewardStructureDisplayHandle } from "@/components/cogniblend/curation/RewardStructureDisplay";
import type { ComplexityModuleHandle } from "@/components/cogniblend/curation/ComplexityAssessmentModule";

/* ── Props ── */

export interface CurationSectionListProps {
  challenge: ChallengeData;
  challengeId: string;
  activeGroupDef: GroupDef;
  activeGroup: string;
  showOnlyStale: boolean;
  staleKeySet: Set<string>;
  staleCountByGroup: Record<string, number>;
  setShowOnlyStale: (v: boolean) => void;
  setActiveGroup: (id: string) => void;

  editingSection: string | null;
  setEditingSection: (key: string | null) => void;
  savingSection: boolean;
  setSavingSection: (v: boolean) => void;
  isReadOnly: boolean;

  aiReviews: SectionReview[];
  approvedSections: Record<string, boolean>;
  toggleSectionApproval: (key: string) => void;
  sectionAIFlags: Record<string, string[]>;
  highlightWarnings: boolean;
  aiSuggestedComplexity: any;

  groupReadiness: Record<string, { ready: boolean; missingPrereqs: string[]; missingPrereqSections: string[]; completionPct: number }>;
  sectionReadiness: Record<string, { ready: boolean; missing: string[] }>;
  dismissedPrereqBanner: Set<string>;
  setDismissedPrereqBanner: React.Dispatch<React.SetStateAction<Set<string>>>;

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

  getSectionActions: (key: string) => any[];
  setLockedSendState: React.Dispatch<React.SetStateAction<any>>;
  setContextLibraryOpen: (v: boolean) => void;
  expandVersion: number;
}

/* ── Component ── */

export function CurationSectionList(props: CurationSectionListProps) {
  const {
    challenge, challengeId, activeGroupDef, activeGroup,
    showOnlyStale, staleKeySet, staleCountByGroup, setShowOnlyStale,
    setActiveGroup, editingSection, setEditingSection, savingSection,
    setSavingSection, isReadOnly, aiReviews, approvedSections,
    toggleSectionApproval, sectionAIFlags, highlightWarnings,
    aiSuggestedComplexity, groupReadiness, sectionReadiness,
    dismissedPrereqBanner, setDismissedPrereqBanner,
    masterData, complexityParams, industrySegments,
    solutionTypeGroups, solutionTypesData, solutionTypeMap,
    handleSaveText, handleSaveDeliverables, handleSaveStructuredDeliverables,
    handleSaveEvalCriteria, handleSaveOrgPolicyField, handleSaveMaturityLevel,
    handleSaveSolutionTypes, handleSaveExtendedBrief, handleSaveComplexity,
    handleLockComplexity, handleUnlockComplexity,
    handleAcceptRefinement, handleAcceptExtendedBriefRefinement,
    handleSingleSectionReview, handleMarkAddressed, handleComplexityReReview,
    handleApproveLockedSection, handleUndoApproval,
    handleAddDomainTag, handleRemoveDomainTag,
    handleIndustrySegmentChange, handleAcceptAllLegalDefaults,
    saveSectionMutation, challengeCtx, optimisticIndustrySegId,
    escrowEnabled, setEscrowEnabled, isAcceptingAllLegal,
    legalDocs, legalDetails, escrowRecord,
    rewardStructureRef, complexityModuleRef,
    curationStore, staleSections, getSectionActions,
    setLockedSendState, setContextLibraryOpen, expandVersion,
  } = props;

  /* ── Organization tab ── */
  if (activeGroup === "organization" && challenge.organization_id) {
    return (
      <OrgContextPanel
        challengeId={challenge.id}
        organizationId={challenge.organization_id}
        isReadOnly={isReadOnly}
      />
    );
  }
  if (activeGroup === "organization") {
    return <p className="text-sm text-muted-foreground italic py-4">No organization linked to this challenge.</p>;
  }

  return (
    <>
      {/* Prerequisite banner */}
      <PrerequisiteBanner
        groupId={activeGroupDef.id}
        groupReadiness={groupReadiness[activeGroupDef.id] ?? { ready: true, missingPrereqs: [], missingPrereqSections: [], completionPct: 100 }}
        dismissed={dismissedPrereqBanner.has(activeGroupDef.id)}
        onDismiss={() => setDismissedPrereqBanner((prev) => new Set([...prev, activeGroupDef.id]))}
        onNavigateToGroup={setActiveGroup}
      />

      {/* Section panels */}
      <div className="space-y-3">
        {activeGroupDef.sectionKeys
          .filter((sectionKey) => !showOnlyStale || staleKeySet.has(sectionKey))
          .map((sectionKey) => {
            const section = SECTION_MAP.get(sectionKey);
            if (!section) return null;

            const filled = section.isFilled(challenge, legalDocs, legalDetails, escrowRecord);
            const isLocked = LOCKED_SECTIONS.has(section.key);
            const isEditing = editingSection === section.key;
            const canEdit = !isReadOnly && !isLocked && (!!section.dbField || section.key === "complexity");
            const aiReview = aiReviews.find((r) => r.section_key === section.key);
            const isApproved = approvedSections[section.key] ?? false;
            const inlineFlags = sectionAIFlags[section.key];

            // Panel status from AI review
            let panelStatus: SectionStatus = "not_reviewed";
            if (isLocked) panelStatus = "view_only";
            else if (aiReview) {
              if (aiReview.addressed) panelStatus = "pass";
              else if (aiReview.status === "pass") panelStatus = "pass";
              else if (aiReview.status === "warning") panelStatus = "warning";
              else if (aiReview.status === "needs_revision") panelStatus = "needs_revision";
            }
            if (staleKeySet.has(section.key)) panelStatus = "stale";

            // Domain tags
            const currentTags = section.key === "domain_tags"
              ? (() => { const t = parseJson<string[]>(challenge.domain_tags); return Array.isArray(t) ? t : []; })()
              : [];

            const cancelEdit = () => setEditingSection(null);

            // Section content (format-native renderers)
            const sectionContent = renderSectionContent({
              section, challenge, challengeId, isReadOnly, isEditing, isLocked, canEdit,
              savingSection, setSavingSection, cancelEdit, setEditingSection, panelStatus,
              handleSaveText, handleSaveDeliverables, handleSaveStructuredDeliverables,
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
              rewardStructureRef, complexityModuleRef,
              aiSuggestedComplexity,
            });

            // Master data options for AI review panel
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

            // Coordinator props
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
                key={section.key}
                data-section-key={section.key}
                className={cn(
                  isWarningHighlighted && "ring-2 ring-amber-400 ring-offset-2 rounded-xl animate-pulse"
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
          })}

        {/* Stale empty state */}
        {showOnlyStale && staleCountByGroup[activeGroupDef.id] === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">No stale sections in this tab</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-xs"
              onClick={() => setShowOnlyStale(false)}
            >
              Show All Sections
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
