/**
 * renderSectionContent — Format-aware section content renderer.
 *
 * Extracted from CurationSectionList.tsx (Batch 1).
 * Pure render function: no hooks, no state — just a switch on section.key.
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
import { Pencil } from "lucide-react";
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
import {
  parseExtendedBrief,
  ensureStringArray,
  ensureStakeholderArray,
  getSubsectionValue,
  StakeholderTableEditor,
  StakeholderTableView,
} from "@/components/cogniblend/curation/ExtendedBriefDisplay";

import { EXTENDED_BRIEF_FIELD_MAP } from "@/lib/cogniblend/curationSectionFormats";
import { parseJson, getFieldValue, getDeliverableItems, getDeliverableObjects, getExpectedOutcomeObjects, getSubmissionGuidelineObjects, getEvalCriteria, resolveIndustrySegmentId } from "@/lib/cogniblend/curationHelpers";
import type { ChallengeData, LegalDocSummary, LegalDocDetail, EscrowRecord, SectionDef } from "@/lib/cogniblend/curationTypes";
import type { DeliverableItem } from "@/utils/parseDeliverableItem";
import type { SectionStatus } from "@/components/cogniblend/curation/CuratorSectionPanel";

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
}

/* ── Renderer ── */

export function renderSectionContent(args: RenderSectionContentArgs): React.ReactNode {
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
