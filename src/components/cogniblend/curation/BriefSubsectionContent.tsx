/**
 * BriefSubsectionContent — Format-specific rendering for each Extended Brief subsection.
 * Autosaves on change (debounced by parent hook).
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import {
  RichTextSectionRenderer,
  LineItemsSectionRenderer,
} from "@/components/cogniblend/curation/renderers";
import {
  StakeholderTableEditor,
  StakeholderTableView,
  ensureStakeholderArray,
} from "./ExtendedBriefStakeholderTable";
import { ensureStringArray } from "./ExtendedBriefDisplay";
import { AutoSaveIndicator } from "./AutoSaveIndicator";
import type { AutoSaveStatus } from "@/hooks/cogniblend/useAutoSaveSection";

interface BriefSubsectionContentProps {
  subsectionKey: string;
  rawVal: unknown;
  readOnly: boolean;
  isEditing: boolean;
  saving?: boolean;
  onSave: (subsectionKey: string, value: unknown) => void;
  onEdit: (key: string) => void;
  onCancelEdit: () => void;
  autoSaveStatus?: AutoSaveStatus;
}

export function BriefSubsectionContent({
  subsectionKey,
  rawVal,
  readOnly,
  isEditing,
  saving,
  onSave,
  onEdit,
  onCancelEdit,
  autoSaveStatus,
}: BriefSubsectionContentProps) {
  switch (subsectionKey) {
    // ── Rich text sections ──
    case "context_and_background": {
      const textVal = typeof rawVal === "string" ? rawVal : "";
      return (
        <>
          <RichTextSectionRenderer
            value={textVal}
            readOnly={readOnly}
            editing={isEditing}
            onSave={(val) => onSave(subsectionKey, val)}
            onCancel={onCancelEdit}
            onEdit={() => onEdit(subsectionKey)}
            saving={saving}
          />
          {!readOnly && !isEditing && (
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => onEdit(subsectionKey)}>
              <Pencil className="h-3 w-3 mr-1" />Edit
            </Button>
          )}
          {isEditing && <AutoSaveIndicator status={autoSaveStatus ?? "idle"} className="mt-1" />}
        </>
      );
    }

    // ── Line items sections ──
    case "root_causes":
    case "current_deficiencies":
    case "preferred_approach": {
      const items = ensureStringArray(rawVal);
      return (
        <>
          <LineItemsSectionRenderer
            items={items}
            readOnly={readOnly}
            editing={isEditing}
            onSave={(newItems) => onSave(subsectionKey, newItems)}
            onCancel={onCancelEdit}
            saving={saving}
            itemLabel={subsectionKey === "root_causes" ? "Root Cause" : subsectionKey === "preferred_approach" ? "Approach" : "Deficiency"}
          />
          {!readOnly && !isEditing && (
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => onEdit(subsectionKey)}>
              <Pencil className="h-3 w-3 mr-1" />Edit
            </Button>
          )}
          {isEditing && <AutoSaveIndicator status={autoSaveStatus ?? "idle"} className="mt-1" />}
        </>
      );
    }

    // ── Approaches NOT of interest (line items) ──
    case "approaches_not_of_interest": {
      const items = ensureStringArray(rawVal);
      return (
        <>
          {items.length === 0 && !isEditing && (
            <p className="text-sm text-muted-foreground italic border border-dashed border-border rounded-md px-3 py-2">
              Add approaches you want solvers to avoid — e.g. specific technologies, vendor dependencies, or previously tried methods.
            </p>
          )}
          <LineItemsSectionRenderer
            items={items}
            readOnly={readOnly}
            editing={isEditing}
            onSave={(newItems) => onSave(subsectionKey, newItems)}
            onCancel={onCancelEdit}
            saving={saving}
            itemLabel="Approach"
          />
          {!readOnly && !isEditing && (
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => onEdit(subsectionKey)}>
              <Pencil className="h-3 w-3 mr-1" />Edit
            </Button>
          )}
          {isEditing && <AutoSaveIndicator status={autoSaveStatus ?? "idle"} className="mt-1" />}
        </>
      );
    }

    // ── Affected stakeholders (4-column table) ──
    case "affected_stakeholders": {
      const rows = ensureStakeholderArray(rawVal);
      if (isEditing && !readOnly) {
        return (
          <>
            <StakeholderTableEditor
              rows={rows}
              onSave={(newRows) => onSave(subsectionKey, newRows)}
              onCancel={onCancelEdit}
              saving={saving}
            />
            <AutoSaveIndicator status={autoSaveStatus ?? "idle"} className="mt-1" />
          </>
        );
      }
      return (
        <>
          <StakeholderTableView rows={rows} />
          {!readOnly && (
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => onEdit(subsectionKey)}>
              <Pencil className="h-3 w-3 mr-1" />Edit
            </Button>
          )}
        </>
      );
    }

    default:
      return <p className="text-sm text-muted-foreground">Unknown subsection format.</p>;
  }
}
