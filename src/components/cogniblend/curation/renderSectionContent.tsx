/**
 * renderSectionContent — Format-aware section content renderer.
 *
 * Thin dispatcher that delegates to group-specific renderers.
 * Pure render function: no hooks, no state — just delegation by section key.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

import { renderOrgSection } from "@/components/cogniblend/curation/renderers/renderOrgSections";
import { renderProblemSection } from "@/components/cogniblend/curation/renderers/renderProblemSections";
import { renderCommercialSection } from "@/components/cogniblend/curation/renderers/renderCommercialSections";
import { renderOpsSection } from "@/components/cogniblend/curation/renderers/renderOpsSections";

import { LOCKED_SECTIONS } from "@/lib/cogniblend/curationSectionDefs";

import type { AutoSaveStatus } from "@/hooks/cogniblend/useAutoSaveSection";
import type { ChallengeData, LegalDocSummary, LegalDocDetail, EscrowRecord, SectionDef } from "@/lib/cogniblend/curationTypes";
import type { DeliverableItem } from "@/utils/parseDeliverableItem";
import type { SectionStatus } from "@/components/cogniblend/curation/CuratorSectionPanel";
import type { RewardStructureDisplayHandle } from "@/components/cogniblend/curation/RewardStructureDisplay";
import type { ComplexityModuleHandle } from "@/components/cogniblend/curation/ComplexityAssessmentModule";

/* ── Args interface ── */

export interface RenderSectionContentArgs {
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
  autoSaveStatus?: AutoSaveStatus;
}

/* ── Dispatcher ── */

/** Sections that keep an explicit Edit button (locked or custom workflow) */
const EDIT_BUTTON_SECTIONS = new Set([
  ...LOCKED_SECTIONS,
  "affected_stakeholders", // table needs explicit edit/view toggle
]);

export function renderSectionContent(args: RenderSectionContentArgs): React.ReactNode {
  const { section, canEdit, isEditing, setEditingSection } = args;

  // Only show Edit button for locked/special sections — standard sections autosave
  const editButton = canEdit && !isEditing && EDIT_BUTTON_SECTIONS.has(section.key) ? (
    <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
      <Pencil className="h-3 w-3 mr-1" />Edit
    </Button>
  ) : null;

  // Try each group renderer in order
  const orgResult = renderOrgSection(args, editButton);
  if (orgResult !== null) return orgResult;

  const problemResult = renderProblemSection(args, editButton);
  if (problemResult !== null) return problemResult;

  const commercialResult = renderCommercialSection(args, editButton);
  if (commercialResult !== null) return commercialResult;

  const opsResult = renderOpsSection(args, editButton);
  if (opsResult !== null) return opsResult;

  // Default fallback
  return (
    <>
      {section.render(args.challenge, args.legalDocs, args.legalDetails, args.escrowRecord)}
      {editButton}
    </>
  );
}
