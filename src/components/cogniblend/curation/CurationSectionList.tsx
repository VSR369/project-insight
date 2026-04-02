/**
 * CurationSectionList — Renders the section panels for the active group.
 *
 * Extracted from CurationReviewPage.tsx (Phase D3.2).
 * Contains: organization panel, prerequisite banner, section iteration,
 * section content switch, and stale empty state.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMaturityLabel } from "@/lib/maturityLabels";
import { resolveGovernanceMode, isControlledMode } from "@/lib/governanceMode";

import {
  RichTextSectionRenderer,
  LineItemsSectionRenderer,
  CheckboxSingleSectionRenderer,
  CheckboxMultiSectionRenderer,
  ScheduleTableSectionRenderer,
  TagInputSectionRenderer,
  StructuredFieldsSectionRenderer,
  LegalDocsSectionRenderer,
  EvaluationCriteriaSection,
} from "@/components/cogniblend/curation/renderers";
import { TableSectionEditor } from "@/components/cogniblend/curation/renderers/TableSectionEditor";
import RewardStructureDisplay, { type RewardStructureDisplayHandle } from "@/components/cogniblend/curation/RewardStructureDisplay";
import { ComplexityAssessmentModule, type ComplexityModuleHandle } from "@/components/cogniblend/curation/ComplexityAssessmentModule";
import { SolutionTypesEditor } from "@/components/cogniblend/curation/renderers/SolutionTypesEditor";
import SolverExpertiseSection from "@/components/cogniblend/curation/SolverExpertiseSection";
import ExtendedBriefDisplay, {
  parseExtendedBrief,
  ensureStringArray,
  ensureStakeholderArray,
  getSubsectionValue,
  StakeholderTableEditor,
  StakeholderTableView,
} from "@/components/cogniblend/curation/ExtendedBriefDisplay";
import { CurationAIReviewInline, type SectionReview } from "@/components/cogniblend/curation/CurationAIReviewPanel";
import { CuratorSectionPanel, type SectionStatus } from "@/components/cogniblend/curation/CuratorSectionPanel";
import { SectionReferencePanel } from "@/components/cogniblend/curation/SectionReferencePanel";
import { OrgContextPanel } from "@/components/cogniblend/curation/OrgContextPanel";

import { SECTION_MAP, GROUPS, LOCKED_SECTIONS } from "@/lib/cogniblend/curationSectionDefs";
import { SECTION_FORMAT_CONFIG, EXTENDED_BRIEF_FIELD_MAP } from "@/lib/cogniblend/curationSectionFormats";
import { parseJson, getFieldValue, getDeliverableItems, getDeliverableObjects, getExpectedOutcomeObjects, getSubmissionGuidelineObjects, getEvalCriteria, getSectionContent, resolveIndustrySegmentId } from "@/lib/cogniblend/curationHelpers";
import type { ChallengeData, LegalDocSummary, LegalDocDetail, EscrowRecord, SectionDef, GroupDef } from "@/lib/cogniblend/curationTypes";
import type { DeliverableItem } from "@/utils/parseDeliverableItem";
import type { SectionKey, SectionStoreEntry } from "@/types/sections";

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
      {groupReadiness[activeGroupDef.id] && !groupReadiness[activeGroupDef.id].ready && !dismissedPrereqBanner.has(activeGroupDef.id) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              Complete prerequisite sections first for best AI results
            </p>
            <p className="text-xs text-amber-600 mt-1">
              The sections in <strong>{groupReadiness[activeGroupDef.id]?.missingPrereqs.join(", ")}</strong> should be completed before this tab.
              AI review and suggestions will be more accurate when prerequisite content exists.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {groupReadiness[activeGroupDef.id]?.missingPrereqSections.slice(0, 4).map((sk) => {
                const sec = SECTION_MAP.get(sk);
                if (!sec) return null;
                return (
                  <Button
                    key={sk}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => {
                      const targetGroup = GROUPS.find((g) => g.sectionKeys.includes(sk));
                      if (targetGroup) setActiveGroup(targetGroup.id);
                    }}
                  >
                    → Complete {sec.label}
                  </Button>
                );
              })}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-amber-600 shrink-0"
            onClick={() => setDismissedPrereqBanner((prev) => new Set([...prev, activeGroupDef.id]))}
          >
            Continue anyway
          </Button>
        </div>
      )}

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

/* ── Section Content Renderer ── */

interface RenderSectionContentArgs {
  section: SectionDef;
  challenge: ChallengeData;
  challengeId: string;
  isReadOnly: boolean;
  isEditing: boolean;
  isLocked: boolean;
  canEdit: boolean;
  savingSection: boolean;
  setSavingSection: (v: boolean) => void;
  cancelEdit: () => void;
  setEditingSection: (key: string | null) => void;
  panelStatus: SectionStatus;
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
  handleAcceptAllLegalDefaults: () => void;
  handleAddDomainTag: (tag: string) => void;
  handleRemoveDomainTag: (tag: string) => void;
  handleIndustrySegmentChange: (segId: string) => void;
  saveSectionMutation: { mutate: (args: { field: string; value: any }) => void };
  masterData: CurationSectionListProps['masterData'];
  complexityParams: any[];
  industrySegments: Array<{ id: string; name: string }> | undefined;
  solutionTypeGroups: any[];
  solutionTypesData: any[];
  optimisticIndustrySegId: string | null;
  escrowEnabled: boolean;
  setEscrowEnabled: (v: boolean) => void;
  isAcceptingAllLegal: boolean;
  currentTags: string[];
  legalDocs: LegalDocSummary[];
  legalDetails: LegalDocDetail[];
  escrowRecord: EscrowRecord | null;
  rewardStructureRef: React.RefObject<RewardStructureDisplayHandle | null>;
  complexityModuleRef: React.RefObject<ComplexityModuleHandle | null>;
  aiSuggestedComplexity: any;
}

function renderSectionContent(args: RenderSectionContentArgs): React.ReactNode {
  const {
    section, challenge, challengeId, isReadOnly, isEditing, isLocked, canEdit,
    savingSection, setSavingSection, cancelEdit, setEditingSection, panelStatus,
    handleSaveText, handleSaveDeliverables, handleSaveStructuredDeliverables,
    handleSaveEvalCriteria, handleSaveOrgPolicyField, handleSaveMaturityLevel,
    handleSaveSolutionTypes, handleSaveExtendedBrief, handleSaveComplexity,
    handleLockComplexity, handleUnlockComplexity, handleAcceptAllLegalDefaults,
    handleAddDomainTag, handleRemoveDomainTag, handleIndustrySegmentChange,
    saveSectionMutation,
    masterData, complexityParams, industrySegments, solutionTypeGroups, solutionTypesData,
    optimisticIndustrySegId, escrowEnabled, setEscrowEnabled,
    isAcceptingAllLegal, currentTags,
    legalDocs, legalDetails, escrowRecord,
    rewardStructureRef, complexityModuleRef, aiSuggestedComplexity,
  } = args;

  const editButton = canEdit && !isEditing ? (
    <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
      <Pencil className="h-3 w-3 mr-1" />Edit
    </Button>
  ) : null;

  switch (section.key) {
    case "problem_statement": {
      const resolvedSegId = optimisticIndustrySegId ?? resolveIndustrySegmentId(challenge);
      const tf = parseJson<any>(challenge.targeting_filters);
      const segmentFromIntake = !!(tf?.industries?.length > 0) && !tf?.industry_segment_id;
      return (
        <>
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1.5 mb-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industry Segment</p>
              {segmentFromIntake && resolvedSegId && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground">from Intake</Badge>
              )}
              {!resolvedSegId && !isReadOnly && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-normal">Required</Badge>
              )}
            </div>
            {resolvedSegId && (segmentFromIntake || isReadOnly) && (
              <Badge variant="secondary" className="text-xs">
                {industrySegments?.find((s) => s.id === resolvedSegId)?.name ?? "Loading…"}
              </Badge>
            )}
            {resolvedSegId && !segmentFromIntake && !isReadOnly && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {industrySegments?.find((s) => s.id === resolvedSegId)?.name ?? "Loading…"}
                </Badge>
                <Select value={resolvedSegId} onValueChange={handleIndustrySegmentChange}>
                  <SelectTrigger className="w-auto max-w-[220px] h-7 text-xs border-dashed">
                    <span className="text-muted-foreground">Change</span>
                  </SelectTrigger>
                  <SelectContent>
                    {(industrySegments ?? []).map((seg) => (
                      <SelectItem key={seg.id} value={seg.id}>{seg.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!resolvedSegId && !isReadOnly && (
              <Select onValueChange={handleIndustrySegmentChange}>
                <SelectTrigger className="w-full max-w-sm h-8 text-sm border-destructive/50">
                  <SelectValue placeholder="Select industry segment…" />
                </SelectTrigger>
                <SelectContent>
                  {(industrySegments ?? []).map((seg) => (
                    <SelectItem key={seg.id} value={seg.id}>{seg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!resolvedSegId && isReadOnly && (
              <p className="text-sm text-destructive italic">No industry segment specified — required before review.</p>
            )}
          </div>
          <RichTextSectionRenderer
            value={getFieldValue(challenge, section.key)}
            readOnly={isReadOnly || isLocked}
            editing={isEditing}
            onSave={(val) => handleSaveText(section.key, section.dbField!, val)}
            onCancel={cancelEdit}
            onEdit={() => setEditingSection(section.key)}
            saving={savingSection}
          />
          {editButton}
        </>
      );
    }

    case "scope":
    case "hook":
      return (
        <>
          <RichTextSectionRenderer
            value={getFieldValue(challenge, section.key)}
            readOnly={isReadOnly || isLocked}
            editing={isEditing}
            onSave={(val) => handleSaveText(section.key, section.dbField!, val)}
            onCancel={cancelEdit}
            onEdit={() => setEditingSection(section.key)}
            saving={savingSection}
          />
          {editButton}
        </>
      );

    case "deliverables":
      return (
        <>
          <LineItemsSectionRenderer
            items={getDeliverableItems(challenge)}
            readOnly={isReadOnly}
            editing={isEditing}
            onSave={handleSaveDeliverables}
            onCancel={cancelEdit}
            saving={savingSection}
            itemLabel="Deliverable"
            structuredItems={getDeliverableObjects(challenge)}
            onSaveStructured={handleSaveStructuredDeliverables}
            badgePrefix="D"
          />
          {editButton}
        </>
      );

    case "submission_guidelines": {
      const raw = parseJson<any>((challenge as any).submission_guidelines);
      const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
      const lineItems = items.map((item: any) => typeof item === "string" ? item : item?.name ?? "");
      const finalItems = lineItems.length > 0 ? lineItems : ((challenge as any).submission_guidelines ? [] : (challenge.description?.trim() ? [challenge.description] : []));
      const structuredGuidelines = getSubmissionGuidelineObjects(challenge);
      return (
        <>
          <LineItemsSectionRenderer
            items={finalItems}
            readOnly={isReadOnly}
            editing={isEditing}
            onSave={(newItems) => {
              setSavingSection(true);
              saveSectionMutation.mutate({ field: "submission_guidelines", value: { items: newItems } });
            }}
            onCancel={cancelEdit}
            saving={savingSection}
            itemLabel="Guideline"
            structuredItems={structuredGuidelines}
            onSaveStructured={(items) => {
              setSavingSection(true);
              saveSectionMutation.mutate({ field: "submission_guidelines", value: { items: items.map(({ name, description }) => ({ name, description })) } });
            }}
            badgePrefix="S"
            hideAcceptanceCriteria
          />
          {editButton}
        </>
      );
    }

    case "expected_outcomes": {
      const eo = parseJson<any>(challenge.expected_outcomes);
      const outcomes = Array.isArray(eo) ? eo : (eo?.items ?? []);
      const outcomeItems = outcomes.map((item: any) => typeof item === "string" ? item : item?.name ?? "");
      const structuredOutcomes = getExpectedOutcomeObjects(challenge);
      return (
        <>
          <LineItemsSectionRenderer
            items={outcomeItems}
            readOnly={isReadOnly}
            editing={isEditing}
            onSave={(newItems) => {
              setSavingSection(true);
              saveSectionMutation.mutate({ field: "expected_outcomes", value: { items: newItems } });
            }}
            onCancel={cancelEdit}
            saving={savingSection}
            itemLabel="Outcome"
            structuredItems={structuredOutcomes}
            onSaveStructured={(items) => {
              setSavingSection(true);
              saveSectionMutation.mutate({ field: "expected_outcomes", value: { items: items.map(({ name, description }) => ({ name, description })) } });
            }}
            badgePrefix="O"
            hideAcceptanceCriteria
          />
          {editButton}
        </>
      );
    }

    case "ip_model":
      return (
        <>
          <CheckboxSingleSectionRenderer
            value={challenge.ip_model}
            options={masterData.ipModelOptions}
            readOnly={isReadOnly}
            editing={isEditing}
            onSave={(val) => handleSaveOrgPolicyField("ip_model", val)}
            onCancel={cancelEdit}
            saving={savingSection}
            getLabel={(v) => masterData.ipModelOptions.find((o) => o.value === v)?.label ?? v}
            getDescription={(v) => masterData.ipModelOptions.find((o) => o.value === v)?.description}
          />
          {editButton}
        </>
      );

    case "eligibility": {
      const solverElig = parseJson<any>(challenge.solver_eligibility_types);
      const eligValues = Array.isArray(solverElig)
        ? solverElig.map((t: any) => typeof t === "string" ? t : t?.code ?? "")
        : [];
      return (
        <>
          <CheckboxMultiSectionRenderer
            selectedValues={eligValues}
            options={masterData.eligibilityOptions}
            readOnly={isReadOnly}
            editing={isEditing}
            onSave={(values) => {
              setSavingSection(true);
              saveSectionMutation.mutate({ field: "solver_eligibility_types", value: values.map((v) => ({ code: v, label: masterData.eligibilityOptions.find((o) => o.value === v)?.label ?? v })) });
            }}
            onCancel={cancelEdit}
            saving={savingSection}
          />
          {editButton}
        </>
      );
    }

    case "visibility": {
      const solverVis = parseJson<any>(challenge.solver_visibility_types);
      const visValues = Array.isArray(solverVis)
        ? solverVis.map((t: any) => typeof t === "string" ? t : t?.code ?? "")
        : [];
      return (
        <>
          <CheckboxMultiSectionRenderer
            selectedValues={visValues}
            options={masterData.visibilityOptions}
            readOnly={isReadOnly}
            editing={isEditing}
            onSave={(values) => {
              setSavingSection(true);
              saveSectionMutation.mutate({ field: "solver_visibility_types", value: values.map((v) => ({ code: v, label: masterData.visibilityOptions.find((o) => o.value === v)?.label ?? v })) });
            }}
            onCancel={cancelEdit}
            saving={savingSection}
          />
          {editButton}
        </>
      );
    }

    case "evaluation_criteria":
      return (
        <>
          <EvaluationCriteriaSection
            criteria={getEvalCriteria(challenge)}
            readOnly={isReadOnly}
            editing={isEditing}
            onSave={handleSaveEvalCriteria}
            onCancel={cancelEdit}
            saving={savingSection}
            aiStatus={panelStatus}
          />
          {editButton}
        </>
      );

    case "reward_structure":
      return (
        <RewardStructureDisplay
          ref={rewardStructureRef}
          rewardStructure={challenge.reward_structure}
          currencyCode={challenge.currency_code ?? undefined}
          challengeId={challenge.id}
          problemStatement={challenge.problem_statement}
          operatingModel={challenge.operating_model}
          challengeTitle={challenge.title}
          maturityLevel={challenge.maturity_level}
          complexityLevel={challenge.complexity_level}
        />
      );

    case "complexity":
      return (
        <ComplexityAssessmentModule
          ref={complexityModuleRef}
          challengeId={challengeId}
          currentScore={challenge.complexity_score ?? null}
          currentLevel={challenge.complexity_level ?? null}
          currentParams={parseJson<any[]>(challenge.complexity_parameters) ?? null}
          complexityParams={complexityParams}
          solutionType={challenge.solution_type as any}
          onSave={handleSaveComplexity}
          onLock={handleLockComplexity}
          onUnlock={handleUnlockComplexity}
          isLocked={(challenge as any).complexity_locked === true}
          saving={savingSection}
          aiSuggestedRatings={aiSuggestedComplexity}
        />
      );

    case "solution_type": {
      const currentSolutionTypes: string[] = Array.isArray(challenge.solution_types) ? (challenge.solution_types as string[]) : [];
      return (
        <>
          {isEditing && !isReadOnly ? (
            <SolutionTypesEditor
              groups={solutionTypeGroups}
              selectedCodes={currentSolutionTypes}
              onSave={(codes) => {
                handleSaveSolutionTypes(codes);
                setEditingSection(null);
              }}
              onCancel={cancelEdit}
              saving={savingSection}
            />
          ) : (
            <>
              {currentSolutionTypes.length > 0 ? (
                <div className="space-y-2">
                  {solutionTypeGroups.filter((g: any) => g.types.some((t: any) => currentSolutionTypes.includes(t.code))).map((g: any) => (
                    <div key={g.groupCode}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{g.groupLabel}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.types.filter((t: any) => currentSolutionTypes.includes(t.code)).map((t: any) => (
                          <Badge key={t.code} variant="secondary" className="text-xs">{t.label}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not set — select solution types to drive deliverables and complexity</p>
              )}
              {editButton}
            </>
          )}
        </>
      );
    }

    case "maturity_level":
      return (
        <>
          <CheckboxSingleSectionRenderer
            value={challenge.maturity_level}
            options={masterData.maturityOptions}
            readOnly={isReadOnly}
            editing={isEditing}
            onSave={(val) => handleSaveMaturityLevel(val)}
            onCancel={cancelEdit}
            saving={savingSection}
            getLabel={getMaturityLabel}
            getDescription={(val) => masterData.maturityOptions.find((o) => o.value.toLowerCase() === val.toLowerCase())?.description}
          />
          {editButton}
        </>
      );

    case "phase_schedule":
      return (
        <>
          <ScheduleTableSectionRenderer
            data={parseJson<any>(challenge.phase_schedule)}
            readOnly={isReadOnly}
            editing={isEditing}
            onSave={(rows) => {
              setSavingSection(true);
              saveSectionMutation.mutate({ field: "phase_schedule", value: rows });
              if (Array.isArray(rows) && rows.length > 0) {
                const endDates = rows
                  .map((r: any) => r.end_date)
                  .filter(Boolean)
                  .map((d: string) => new Date(d).getTime())
                  .filter((t: number) => !isNaN(t));
                if (endDates.length > 0) {
                  const maxEnd = new Date(Math.max(...endDates)).toISOString().split("T")[0];
                  saveSectionMutation.mutate({ field: "submission_deadline", value: maxEnd });
                }
              }
            }}
            onCancel={() => setEditingSection(null)}
            saving={savingSection}
          />
          {editButton}
        </>
      );

    case "legal_docs":
      return (
        <LegalDocsSectionRenderer
          documents={legalDetails}
          governanceMode={resolveGovernanceMode(challenge.governance_profile)}
          onAcceptAllDefaults={handleAcceptAllLegalDefaults}
          isAcceptingAll={isAcceptingAllLegal}
        />
      );

    case "escrow_funding": {
      const gMode = resolveGovernanceMode(challenge.governance_profile);
      return (
        <StructuredFieldsSectionRenderer
          escrow={escrowRecord}
          isControlledMode={isControlledMode(gMode)}
          governanceMode={gMode}
          escrowEnabled={escrowEnabled}
          onEscrowToggle={setEscrowEnabled}
        />
      );
    }

    case "domain_tags":
      return (
        <TagInputSectionRenderer
          tags={currentTags}
          readOnly={isReadOnly}
          onAdd={handleAddDomainTag}
          onRemove={handleRemoveDomainTag}
        />
      );

    case "solver_expertise": {
      const industrySegId = optimisticIndustrySegId ?? resolveIndustrySegmentId(challenge);
      return (
        <>
          <SolverExpertiseSection
            data={challenge.solver_expertise_requirements}
            industrySegmentId={industrySegId}
            readOnly={isReadOnly}
            editing={isEditing}
            onSave={(expertiseData) => {
              setSavingSection(true);
              saveSectionMutation.mutate({ field: "solver_expertise_requirements", value: expertiseData });
              setEditingSection(null);
            }}
            saving={savingSection}
            onCancel={cancelEdit}
          />
          {editButton}
        </>
      );
    }

    case "context_and_background": {
      const eb = parseExtendedBrief(challenge.extended_brief);
      const textVal = typeof getSubsectionValue(eb, "context_and_background") === "string"
        ? getSubsectionValue(eb, "context_and_background") as string : "";
      return (
        <>
          <RichTextSectionRenderer
            value={textVal}
            readOnly={isReadOnly}
            editing={isEditing}
            onSave={(val) => {
              const updated = { ...eb, [EXTENDED_BRIEF_FIELD_MAP["context_and_background"]]: val };
              handleSaveExtendedBrief(updated);
            }}
            onCancel={cancelEdit}
            onEdit={() => setEditingSection(section.key)}
            saving={savingSection}
          />
          {editButton}
        </>
      );
    }

    case "root_causes":
    case "current_deficiencies":
    case "preferred_approach":
    case "approaches_not_of_interest": {
      const eb = parseExtendedBrief(challenge.extended_brief);
      const items = ensureStringArray(getSubsectionValue(eb, section.key));
      const itemLabel = section.key === "root_causes" ? "Root Cause"
        : section.key === "preferred_approach" ? "Approach"
        : section.key === "current_deficiencies" ? "Deficiency" : "Approach";
      return (
        <>
          {section.key === "approaches_not_of_interest" && items.length === 0 && !isEditing && (
            <p className="text-sm text-muted-foreground italic border border-dashed border-border rounded-md px-3 py-2">
              Add approaches you want solvers to avoid — e.g. specific technologies, vendor dependencies, or previously tried methods.
            </p>
          )}
          <LineItemsSectionRenderer
            items={items}
            readOnly={isReadOnly}
            editing={isEditing}
            onSave={(newItems) => {
              const updated = { ...eb, [EXTENDED_BRIEF_FIELD_MAP[section.key]]: newItems };
              handleSaveExtendedBrief(updated);
            }}
            onCancel={cancelEdit}
            saving={savingSection}
            itemLabel={itemLabel}
          />
          {editButton}
        </>
      );
    }

    case "affected_stakeholders": {
      const eb = parseExtendedBrief(challenge.extended_brief);
      const rows = ensureStakeholderArray(getSubsectionValue(eb, "affected_stakeholders"));
      if (isEditing && !isReadOnly) {
        return (
          <StakeholderTableEditor
            rows={rows}
            onSave={(newRows) => {
              const updated = { ...eb, [EXTENDED_BRIEF_FIELD_MAP["affected_stakeholders"]]: newRows };
              handleSaveExtendedBrief(updated);
            }}
            onCancel={cancelEdit}
            saving={savingSection}
          />
        );
      }
      return (
        <>
          <StakeholderTableView rows={rows} />
          {editButton}
        </>
      );
    }

    case "data_resources_provided": {
      const raw = parseJson<Record<string, string>[]>((challenge as any).data_resources_provided) ?? [];
      if (isEditing && !isReadOnly) {
        return (
          <TableSectionEditor
            columns={[
              { key: "resource", label: "Resource" },
              { key: "type", label: "Type" },
              { key: "format", label: "Format" },
              { key: "size", label: "Size" },
              { key: "access_method", label: "Access Method" },
              { key: "restrictions", label: "Restrictions" },
            ]}
            initialRows={raw}
            onSave={(rows) => saveSectionMutation.mutate({ field: "data_resources_provided", value: rows })}
            onCancel={cancelEdit}
            saving={savingSection}
          />
        );
      }
      return (
        <>
          {section.render(challenge, legalDocs, legalDetails, escrowRecord)}
          {editButton}
        </>
      );
    }

    case "success_metrics_kpis": {
      const raw = parseJson<Record<string, string>[]>((challenge as any).success_metrics_kpis) ?? [];
      if (isEditing && !isReadOnly) {
        return (
          <TableSectionEditor
            columns={[
              { key: "kpi", label: "KPI" },
              { key: "baseline", label: "Baseline" },
              { key: "target", label: "Target" },
              { key: "measurement_method", label: "Measurement Method" },
              { key: "timeframe", label: "Timeframe" },
            ]}
            initialRows={raw}
            onSave={(rows) => saveSectionMutation.mutate({ field: "success_metrics_kpis", value: rows })}
            onCancel={cancelEdit}
            saving={savingSection}
          />
        );
      }
      return (
        <>
          {section.render(challenge, legalDocs, legalDetails, escrowRecord)}
          {editButton}
        </>
      );
    }

    default:
      return (
        <>
          {section.render(challenge, legalDocs, legalDetails, escrowRecord)}
          {editButton}
        </>
      );
  }
}
