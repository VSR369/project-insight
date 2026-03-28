/**
 * ExtendedBriefDisplay — Nested panel architecture for 7 Extended Brief subsections.
 *
 * Each subsection is a CuratorSectionPanel with its own expand/collapse, status,
 * fullscreen modal, and AI review. Format-native rendering:
 *   context_and_background, preferred_approach → RichTextSectionRenderer
 *   root_causes, current_deficiencies, expected_outcomes, approaches_not_of_interest → LineItemsSectionRenderer
 *   affected_stakeholders → 4-column table
 */

import React, { useState, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Plus, Trash2, Sparkles } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AiContentRenderer } from "@/components/ui/AiContentRenderer";
import { TextSectionEditor, DeliverablesEditor } from "@/components/cogniblend/curation/CurationSectionEditor";
import {
  RichTextSectionRenderer,
  LineItemsSectionRenderer,
} from "@/components/cogniblend/curation/renderers";
import { CuratorSectionPanel, type SectionStatus } from "@/components/cogniblend/curation/CuratorSectionPanel";
import { CurationAIReviewInline, type SectionReview } from "@/components/cogniblend/curation/CurationAIReviewPanel";
import {
  EXTENDED_BRIEF_SUBSECTION_KEYS,
  EXTENDED_BRIEF_FIELD_MAP,
  SECTION_FORMAT_CONFIG,
} from "@/lib/cogniblend/curationSectionFormats";
import type { Json } from "@/integrations/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StakeholderRow {
  stakeholder_name: string;
  role: string;
  impact_description: string;
  adoption_challenge: string;
}

interface ExtendedBriefData {
  context_background?: string;
  root_causes?: string[];
  affected_stakeholders?: StakeholderRow[];
  current_deficiencies?: string[];
  // expected_outcomes removed — now a standalone column
  preferred_approach?: string;
  approaches_not_of_interest?: string[];
  // Legacy fields preserved
  scoring_rubrics?: unknown;
  
  reward_description?: string;
  phase_notes?: string;
  complexity_notes?: string;
  [key: string]: unknown;
}

interface ExtendedBriefDisplayProps {
  data: Json | null;
  onSave: (updatedBrief: Record<string, unknown>) => void;
  saving?: boolean;
  readOnly?: boolean;
  challengeId: string;
  aiSectionReviews: SectionReview[];
  onAcceptRefinement: (sectionKey: string, newContent: string) => void;
  onSingleSectionReview: (sectionKey: string, freshReview: SectionReview) => void;
  onMarkAddressed: (sectionKey: string) => void;
  challengeContext?: { title?: string; maturity_level?: string | null; domain_tags?: string[] };
  expandVersion?: number;
}

// ---------------------------------------------------------------------------
// Subsection metadata
// ---------------------------------------------------------------------------

const SUBSECTION_META: Record<string, { label: string; attribution?: string }> = {
  context_and_background: { label: "Context & Background", attribution: "from Intake" },
  root_causes: { label: "Root Causes", attribution: "AI Inferred" },
  affected_stakeholders: { label: "Affected Stakeholders", attribution: "AI Inferred" },
  current_deficiencies: { label: "Current Deficiencies", attribution: "AI Inferred" },
  preferred_approach: { label: "Preferred Approach", attribution: "Human Input" },
  approaches_not_of_interest: { label: "Approaches NOT of Interest", attribution: "Human Input" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseExtendedBrief(val: Json | null): ExtendedBriefData {
  if (!val) return {};
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return {}; }
  }
  return val as unknown as ExtendedBriefData;
}

function getSubsectionValue(brief: ExtendedBriefData, subsectionKey: string): unknown {
  const jsonbField = EXTENDED_BRIEF_FIELD_MAP[subsectionKey];
  return jsonbField ? brief[jsonbField] : undefined;
}

function ensureStringArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((v) => (typeof v === "string" ? v : String(v)));
  // Handle { items: [...] } wrapper from AI acceptance
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items.map((v) => (typeof v === "string" ? v : String(v)));
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map((v: unknown) => (typeof v === "string" ? v : String(v)));
      // Handle stringified { items: [...] }
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
        return parsed.items.map((v: unknown) => (typeof v === "string" ? v : String(v)));
      }
    } catch {}
    return val.trim() ? [val] : [];
  }
  return [];
}

function ensureStakeholderArray(val: unknown): StakeholderRow[] {
  let arr: unknown[] | null = null;
  if (Array.isArray(val)) arr = val;
  else if (val && typeof val === "object" && Array.isArray((val as any).items)) arr = (val as any).items;
  if (!arr) return [];

  const seen = new Set<string>();
  return arr
    .map((item: any) => ({
      stakeholder_name: item?.stakeholder_name ?? item?.name ?? item?.stakeholder ?? "",
      role: item?.role ?? item?.type ?? "",
      impact_description: item?.impact_description ?? item?.impact ?? item?.description ?? "",
      adoption_challenge: item?.adoption_challenge ?? item?.challenge ?? item?.barrier ?? "",
    }))
    .filter((row) => {
      const key = row.stakeholder_name.toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// ---------------------------------------------------------------------------
// Stakeholder table editor
// ---------------------------------------------------------------------------

function StakeholderTableEditor({
  rows,
  onSave,
  onCancel,
  saving,
}: {
  rows: StakeholderRow[];
  onSave: (rows: StakeholderRow[]) => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const [editRows, setEditRows] = useState<StakeholderRow[]>(
    rows.length > 0 ? [...rows] : [{ stakeholder_name: "", role: "", impact_description: "", adoption_challenge: "" }]
  );

  const updateRow = (idx: number, field: keyof StakeholderRow, value: string) => {
    setEditRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    setEditRows((prev) => [...prev, { stakeholder_name: "", role: "", impact_description: "", adoption_challenge: "" }]);
  };

  const removeRow = (idx: number) => {
    setEditRows((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Stakeholder</TableHead>
              <TableHead className="min-w-[100px]">Role</TableHead>
              <TableHead className="min-w-[150px]">Impact</TableHead>
              <TableHead className="min-w-[150px]">Adoption Challenge</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editRows.map((row, i) => (
              <TableRow key={i}>
                <TableCell><Input value={row.stakeholder_name} onChange={(e) => updateRow(i, "stakeholder_name", e.target.value)} className="text-sm h-8" /></TableCell>
                <TableCell><Input value={row.role} onChange={(e) => updateRow(i, "role", e.target.value)} className="text-sm h-8" /></TableCell>
                <TableCell><Input value={row.impact_description} onChange={(e) => updateRow(i, "impact_description", e.target.value.slice(0, 100))} className="text-sm h-8" maxLength={100} /></TableCell>
                <TableCell><Input value={row.adoption_challenge} onChange={(e) => updateRow(i, "adoption_challenge", e.target.value.slice(0, 100))} className="text-sm h-8" maxLength={100} /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRow(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button variant="outline" size="sm" className="text-xs" onClick={addRow}>
        <Plus className="h-3 w-3 mr-1" />Add Row
      </Button>
      <div className="flex gap-2">
        <Button size="sm" disabled={saving} onClick={() => onSave(editRows.filter((r) => r.stakeholder_name.trim()))}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stakeholder table read-only view
// ---------------------------------------------------------------------------

function StakeholderTableView({ rows }: { rows: StakeholderRow[] }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No stakeholders defined.</p>;
  }
  return (
    <div className="relative w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stakeholder</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Impact</TableHead>
            <TableHead>Adoption Challenge</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm font-medium">{row.stakeholder_name || "—"}</TableCell>
              <TableCell className="text-sm">{row.role || "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{row.impact_description || "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{row.adoption_challenge || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExtendedBriefDisplay({
  data,
  onSave,
  saving,
  readOnly = false,
  challengeId,
  aiSectionReviews,
  onAcceptRefinement,
  onSingleSectionReview,
  onMarkAddressed,
  challengeContext,
  expandVersion,
}: ExtendedBriefDisplayProps) {
  const brief = parseExtendedBrief(data);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  // ── Save a subsection into the extended_brief JSONB ──
  const handleSubsectionSave = useCallback(
    (subsectionKey: string, value: unknown) => {
      const jsonbField = EXTENDED_BRIEF_FIELD_MAP[subsectionKey];
      if (!jsonbField) return;
      const updated = { ...brief, [jsonbField]: value };
      onSave(updated);
      setEditingKey(null);
    },
    [brief, onSave],
  );

  // ── Compute aggregate worst status across all subsections ──
  const aggregateStatus = useMemo((): SectionStatus => {
    const statuses = EXTENDED_BRIEF_SUBSECTION_KEYS.map((key) => {
      const review = aiSectionReviews.find((r) => r.section_key === key);
      return review?.status ?? null;
    });
    if (statuses.includes("needs_revision")) return "needs_revision";
    if (statuses.includes("warning")) return "warning";
    if (statuses.every((s) => s === "pass")) return "pass";
    return "not_reviewed";
  }, [aiSectionReviews]);

  // ── Check if any subsection has content ──
  const hasAnyContent = EXTENDED_BRIEF_SUBSECTION_KEYS.some((key) => {
    const val = getSubsectionValue(brief, key);
    if (Array.isArray(val)) return val.length > 0;
    return typeof val === "string" && val.trim().length > 0;
  });

  if (!hasAnyContent && readOnly) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground italic py-2">
        <Sparkles className="h-4 w-4" />
        Extended brief not yet generated by AI.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {EXTENDED_BRIEF_SUBSECTION_KEYS.map((subsectionKey) => {
        const meta = SUBSECTION_META[subsectionKey];
        const formatConfig = SECTION_FORMAT_CONFIG[subsectionKey];
        const rawVal = getSubsectionValue(brief, subsectionKey);
        const aiReview = aiSectionReviews.find((r) => r.section_key === subsectionKey);
        const isEditing = editingKey === subsectionKey;
        const cancelEdit = () => setEditingKey(null);

        // Determine fill status
        const filled = Array.isArray(rawVal)
          ? rawVal.length > 0
          : typeof rawVal === "string" && rawVal.trim().length > 0;

        // Compute panel status from AI review
        let panelStatus: SectionStatus = "not_reviewed";
        if (aiReview) {
          if (aiReview.addressed) panelStatus = "pass";
          else if (aiReview.status === "pass") panelStatus = "pass";
          else if (aiReview.status === "warning") panelStatus = "warning";
          else if (aiReview.status === "needs_revision") panelStatus = "needs_revision";
        }

        // Get section content for AI context
        const currentContent = (() => {
          if (Array.isArray(rawVal)) return JSON.stringify(rawVal);
          if (typeof rawVal === "string") return rawVal;
          if (rawVal != null) return JSON.stringify(rawVal);
          return null;
        })();

        // ── Render content based on format ──
        const sectionContent = (() => {
          switch (subsectionKey) {
            // ── Rich text sections ──
            case "context_and_background":
            case "preferred_approach": {
              const textVal = typeof rawVal === "string" ? rawVal : "";
              const emptyPlaceholder = subsectionKey === "preferred_approach"
                ? "Preferred approaches have not been specified — solvers have full freedom to propose any approach."
                : undefined;
              return (
                <>
                  <RichTextSectionRenderer
                    value={textVal}
                    readOnly={readOnly}
                    editing={isEditing}
                    onSave={(val) => handleSubsectionSave(subsectionKey, val)}
                    onCancel={cancelEdit}
                    onEdit={() => setEditingKey(subsectionKey)}
                    saving={saving}
                  />
                  {!textVal && emptyPlaceholder && !isEditing && (
                    <p className="text-sm text-muted-foreground italic">{emptyPlaceholder}</p>
                  )}
                  {!readOnly && !isEditing && (
                    <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setEditingKey(subsectionKey)}>
                      <Pencil className="h-3 w-3 mr-1" />Edit
                    </Button>
                  )}
                </>
              );
            }

            // ── Line items sections ──
            case "root_causes":
            case "current_deficiencies": {
              const items = ensureStringArray(rawVal);
              return (
                <>
                  <LineItemsSectionRenderer
                    items={items}
                    readOnly={readOnly}
                    editing={isEditing}
                    onSave={(newItems) => handleSubsectionSave(subsectionKey, newItems)}
                    onCancel={cancelEdit}
                    saving={saving}
                    itemLabel={subsectionKey === "root_causes" ? "Root Cause" : "Deficiency"}
                  />
                  {!readOnly && !isEditing && (
                    <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setEditingKey(subsectionKey)}>
                      <Pencil className="h-3 w-3 mr-1" />Edit
                    </Button>
                  )}
                </>
              );
            }

            // ── Approaches NOT of interest (line items, aiCanDraft: false) ──
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
                    onSave={(newItems) => handleSubsectionSave(subsectionKey, newItems)}
                    onCancel={cancelEdit}
                    saving={saving}
                    itemLabel="Approach"
                  />
                  {!readOnly && !isEditing && (
                    <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setEditingKey(subsectionKey)}>
                      <Pencil className="h-3 w-3 mr-1" />Edit
                    </Button>
                  )}
                </>
              );
            }

            // ── Affected stakeholders (4-column table) ──
            case "affected_stakeholders": {
              const rows = ensureStakeholderArray(rawVal);
              if (isEditing && !readOnly) {
                return (
                  <StakeholderTableEditor
                    rows={rows}
                    onSave={(newRows) => handleSubsectionSave(subsectionKey, newRows)}
                    onCancel={cancelEdit}
                    saving={saving}
                  />
                );
              }
              return (
                <>
                  <StakeholderTableView rows={rows} />
                  {!readOnly && (
                    <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setEditingKey(subsectionKey)}>
                      <Pencil className="h-3 w-3 mr-1" />Edit
                    </Button>
                  )}
                </>
              );
            }

            default:
              return <p className="text-sm text-muted-foreground">Unknown subsection format.</p>;
          }
        })();

        // ── AI review inline slot ──
        const aiReviewContent = (
          <CurationAIReviewInline
            sectionKey={subsectionKey}
            review={aiReview}
            currentContent={currentContent}
            challengeId={challengeId}
            challengeContext={challengeContext}
            onAcceptRefinement={onAcceptRefinement}
            onSingleSectionReview={onSingleSectionReview}
            onMarkAddressed={onMarkAddressed}
            defaultOpen={!aiReview?.addressed && (aiReview?.status === "warning" || aiReview?.status === "needs_revision")}
          />
        );

        return (
          <CuratorSectionPanel
            key={subsectionKey}
            sectionKey={subsectionKey}
            label={meta.label}
            attribution={meta.attribution}
            filled={filled}
            status={panelStatus}
            isLocked={false}
            isReadOnly={readOnly}
            isApproved={false}
            onToggleApproval={() => {}}
            challengeId={challengeId}
            defaultExpanded={!!(aiReview && !aiReview.addressed && (aiReview.status === "warning" || aiReview.status === "needs_revision"))}
            aiReviewSlot={aiReviewContent}
            expandVersion={expandVersion}
          >
            {sectionContent}
          </CuratorSectionPanel>
        );
      })}
    </div>
  );
}
