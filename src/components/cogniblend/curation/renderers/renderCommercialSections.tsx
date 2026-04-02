/**
 * renderCommercialSections — Commercial/policy section renderers.
 * Handles: reward_structure, complexity, evaluation_criteria,
 *          ip_model, eligibility, visibility, maturity_level, solution_type
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  CheckboxSingleSectionRenderer,
  CheckboxMultiSectionRenderer,
  EvaluationCriteriaSection,
} from "@/components/cogniblend/curation/renderers";
import RewardStructureDisplay from "@/components/cogniblend/curation/RewardStructureDisplay";
import { ComplexityAssessmentModule } from "@/components/cogniblend/curation/ComplexityAssessmentModule";
import { SolutionTypesEditor } from "@/components/cogniblend/curation/renderers/SolutionTypesEditor";
import { getMaturityLabel } from "@/lib/maturityLabels";
import { parseJson, getEvalCriteria } from "@/lib/cogniblend/curationHelpers";
import type { RenderSectionContentArgs } from "@/components/cogniblend/curation/renderSectionContent";

const COMMERCIAL_KEYS = new Set([
  "reward_structure", "complexity", "evaluation_criteria",
  "ip_model", "eligibility", "visibility", "maturity_level", "solution_type",
]);

export function renderCommercialSection(args: RenderSectionContentArgs, editButton: React.ReactNode): React.ReactNode | null {
  const {
    section, challenge, challengeId, isReadOnly, isEditing,
    savingSection, setSavingSection, cancelEdit, setEditingSection, panelStatus,
    handleSaveOrgPolicyField, handleSaveMaturityLevel, handleSaveSolutionTypes,
    handleSaveEvalCriteria, handleSaveComplexity, handleLockComplexity, handleUnlockComplexity,
    saveSectionMutation, masterData, complexityParams, solutionTypeGroups,
    rewardStructureRef, complexityModuleRef, aiSuggestedComplexity,
  } = args;

  if (!COMMERCIAL_KEYS.has(section.key)) return null;

  switch (section.key) {
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

    default:
      return null;
  }
}
