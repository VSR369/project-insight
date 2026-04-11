/**
 * CurationSectionList — Renders the section panels for the active group.
 *
 * Extracted from CurationReviewPage.tsx (Phase D3.2).
 * Delegates individual sections to SectionPanelItem.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

import { type SectionReview } from "@/components/cogniblend/curation/CurationAIReviewPanel";
import { OrgContextPanel } from "@/components/cogniblend/curation/OrgContextPanel";
import { PrerequisiteBanner } from "@/components/cogniblend/curation/PrerequisiteBanner";
import { SectionPanelItem } from "@/components/cogniblend/curation/SectionPanelItem";

import { SECTION_MAP } from "@/lib/cogniblend/curationSectionDefs";
import type { ChallengeData, LegalDocSummary, LegalDocDetail, EscrowRecord, GroupDef } from "@/lib/cogniblend/curationTypes";
import type { DeliverableItem } from "@/utils/parseDeliverableItem";
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
  reviewSessionActive?: boolean;

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
    challenge, activeGroupDef, activeGroup,
    showOnlyStale, staleKeySet, staleCountByGroup, setShowOnlyStale,
    setActiveGroup, isReadOnly, aiReviews,
    dismissedPrereqBanner, setDismissedPrereqBanner, groupReadiness,
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
            const aiReview = aiReviews.find((r) => r.section_key === sectionKey);

            return (
              <SectionPanelItem
                key={sectionKey}
                section={section}
                aiReview={aiReview}
                {...props}
              />
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
