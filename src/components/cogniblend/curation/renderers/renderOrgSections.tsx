/**
 * renderOrgSections — Org-context section renderers.
 * Handles: problem_statement, scope, hook, domain_tags, solver_expertise, context_and_background
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RichTextSectionRenderer,
  TagInputSectionRenderer,
} from "@/components/cogniblend/curation/renderers";
import SolverExpertiseSection from "@/components/cogniblend/curation/SolverExpertiseSection";
import {
  parseExtendedBrief,
  getSubsectionValue,
} from "@/components/cogniblend/curation/ExtendedBriefDisplay";
import { EXTENDED_BRIEF_FIELD_MAP } from "@/lib/cogniblend/curationSectionFormats";
import { parseJson, getFieldValue, resolveIndustrySegmentId } from "@/lib/cogniblend/curationHelpers";
import type { RenderSectionContentArgs } from "@/components/cogniblend/curation/renderSectionContent";

const ORG_KEYS = new Set([
  "problem_statement", "scope", "hook", "domain_tags",
  "solver_expertise", "context_and_background",
]);

export function renderOrgSection(args: RenderSectionContentArgs, editButton: React.ReactNode): React.ReactNode | null {
  const {
    section, challenge, isReadOnly, isEditing, isLocked, savingSection,
    setSavingSection, cancelEdit, setEditingSection,
    handleSaveText, handleSaveExtendedBrief,
    handleAddDomainTag, handleRemoveDomainTag, handleIndustrySegmentChange,
    saveSectionMutation, industrySegments, optimisticIndustrySegId, currentTags,
  } = args;

  if (!ORG_KEYS.has(section.key)) return null;

  switch (section.key) {
    case "problem_statement": {
      const resolvedSegId = optimisticIndustrySegId ?? resolveIndustrySegmentId(challenge);
      const tf = parseJson<Record<string, unknown>>(challenge.targeting_filters);
      const industries = tf?.industries;
      const segmentFromIntake = !!(Array.isArray(industries) && industries.length > 0) && !tf?.industry_segment_id;
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
            sectionDbField={section.dbField}
            saveSectionMutation={saveSectionMutation}
          />
        </>
      );
    }

    case "scope":
    case "hook":
      return (
        <RichTextSectionRenderer
          value={getFieldValue(challenge, section.key)}
          readOnly={isReadOnly || isLocked}
          editing={isEditing}
          onSave={(val) => handleSaveText(section.key, section.dbField!, val)}
          onCancel={cancelEdit}
          onEdit={() => setEditingSection(section.key)}
          saving={savingSection}
          sectionDbField={section.dbField}
          saveSectionMutation={saveSectionMutation}
        />
      );

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
        <SolverExpertiseSection
          data={challenge.solver_expertise_requirements}
          industrySegmentId={industrySegId}
          readOnly={isReadOnly}
          editing={isEditing}
          onSave={(expertiseData) => {
            saveSectionMutation.mutate({ field: "solver_expertise_requirements", value: expertiseData });
          }}
          saving={savingSection}
          onCancel={cancelEdit}
        />
      );
    }

    case "context_and_background": {
      const eb = parseExtendedBrief(challenge.extended_brief);
      const textVal = typeof getSubsectionValue(eb, "context_and_background") === "string"
        ? getSubsectionValue(eb, "context_and_background") as string : "";
      return (
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
          sectionDbField={undefined}
          saveSectionMutation={undefined}
        />
      );
    }

    default:
      return null;
  }
}
