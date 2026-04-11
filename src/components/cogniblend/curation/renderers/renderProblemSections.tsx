/**
 * renderProblemSections — Problem/brief section renderers.
 * Handles: deliverables, submission_guidelines, expected_outcomes,
 *          root_causes, current_deficiencies, preferred_approach,
 *          approaches_not_of_interest, affected_stakeholders
 */

import React from "react";
import { LineItemsSectionRenderer } from "@/components/cogniblend/curation/renderers";
import {
  parseExtendedBrief,
  ensureStringArray,
  ensureStakeholderArray,
  getSubsectionValue,
  StakeholderTableEditor,
  StakeholderTableView,
} from "@/components/cogniblend/curation/ExtendedBriefDisplay";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { EXTENDED_BRIEF_FIELD_MAP } from "@/lib/cogniblend/curationSectionFormats";
import { parseJson, getDeliverableItems, getDeliverableObjects, getExpectedOutcomeObjects, getSubmissionGuidelineObjects } from "@/lib/cogniblend/curationHelpers";
import type { RenderSectionContentArgs } from "@/components/cogniblend/curation/renderSectionContent";

const PROBLEM_KEYS = new Set([
  "deliverables", "submission_guidelines", "expected_outcomes",
  "root_causes", "current_deficiencies", "preferred_approach",
  "approaches_not_of_interest", "affected_stakeholders",
]);

export function renderProblemSection(args: RenderSectionContentArgs, editButton: React.ReactNode): React.ReactNode | null {
  const {
    section, challenge, isReadOnly, isEditing, savingSection,
    setSavingSection, cancelEdit, handleSaveDeliverables,
    handleSaveStructuredDeliverables, handleSaveExtendedBrief,
    saveSectionMutation,
  } = args;

  if (!PROBLEM_KEYS.has(section.key)) return null;

  switch (section.key) {
    case "deliverables":
      return (
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
      );

    case "submission_guidelines": {
      const raw = parseJson<Record<string, unknown>>((challenge as Record<string, unknown>).submission_guidelines);
      const items = Array.isArray(raw) ? raw : Array.isArray((raw as Record<string, unknown>)?.items) ? (raw as Record<string, unknown>).items as unknown[] : [];
      const lineItems = (items as unknown[]).map((item: unknown) => typeof item === "string" ? item : (item as Record<string, string>)?.name ?? "");
      const finalItems = lineItems.length > 0 ? lineItems : ((challenge as Record<string, unknown>).submission_guidelines ? [] : (challenge.description?.trim() ? [challenge.description] : []));
      const structuredGuidelines = getSubmissionGuidelineObjects(challenge);
      return (
        <LineItemsSectionRenderer
          items={finalItems}
          readOnly={isReadOnly}
          editing={isEditing}
          onSave={(newItems) => {
            saveSectionMutation.mutate({ field: "submission_guidelines", value: { items: newItems } });
          }}
          onCancel={cancelEdit}
          saving={savingSection}
          itemLabel="Guideline"
          structuredItems={structuredGuidelines}
          onSaveStructured={(items) => {
            saveSectionMutation.mutate({ field: "submission_guidelines", value: { items: items.map(({ name, description }) => ({ name, description })) } });
          }}
          badgePrefix="S"
          hideAcceptanceCriteria
        />
      );
    }

    case "expected_outcomes": {
      const eo = parseJson<Record<string, unknown>>(challenge.expected_outcomes);
      const outcomes = Array.isArray(eo) ? eo : ((eo as Record<string, unknown>)?.items ?? []);
      const outcomeItems = (outcomes as unknown[]).map((item: unknown) => typeof item === "string" ? item : (item as Record<string, string>)?.name ?? "");
      const structuredOutcomes = getExpectedOutcomeObjects(challenge);
      return (
        <LineItemsSectionRenderer
          items={outcomeItems}
          readOnly={isReadOnly}
          editing={isEditing}
          onSave={(newItems) => {
            saveSectionMutation.mutate({ field: "expected_outcomes", value: { items: newItems } });
          }}
          onCancel={cancelEdit}
          saving={savingSection}
          itemLabel="Outcome"
          structuredItems={structuredOutcomes}
          onSaveStructured={(items) => {
            saveSectionMutation.mutate({ field: "expected_outcomes", value: { items: items.map(({ name, description }) => ({ name, description })) } });
          }}
          badgePrefix="O"
          hideAcceptanceCriteria
        />
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

    default:
      return null;
  }
}
