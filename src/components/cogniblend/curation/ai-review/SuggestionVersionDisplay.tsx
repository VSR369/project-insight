/**
 * SuggestionVersionDisplay — Renders the format-aware AI suggested version block.
 *
 * Extracted from AIReviewResultPanel.tsx (Batch 2).
 * Handles: master data, reward structure, solver expertise, deliverables,
 * schedule tables, line items, tables, dates, rich text, and fallback.
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Sparkles, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { AiContentRenderer } from "@/components/ui/AiContentRenderer";
import { cn } from "@/lib/utils";
import { detectAndParseLineItems } from "@/utils/detectAndParseLineItems";
import { TableLineItemRenderer } from "@/components/cogniblend/curation/renderers/TableLineItemRenderer";
import { DeliverableCardRenderer } from "@/components/cogniblend/curation/renderers/DeliverableCardRenderer";
import {
  EditableRichText,
  EditableLineItems,
  EditableTableRows,
  EditableScheduleRows,
} from "./SuggestionEditors";
import type { DeliverableItem } from "@/utils/parseDeliverableItem";

interface ResolvedCode {
  code: string;
  label: string;
  description?: string;
  isValid: boolean;
}

interface RewardSuggestionData {
  type?: string;
  monetary?: { tiers?: Record<string, number>; currency?: string; justification?: string };
  nonMonetary?: { items?: string[] };
}

interface SolverExpertiseSuggestionData {
  expertise_levels?: { id: string; name: string }[];
  proficiency_areas?: { id: string; name: string }[];
  sub_domains?: { id: string; name: string }[];
  specialities?: { id: string; name: string }[];
}

export interface SuggestionVersionDisplayProps {
  suggestedFormat: string | null;
  suggestedVersion?: string;
  isMasterData: boolean;
  isStructured: boolean;

  // Master data
  resolvedCodes: ResolvedCode[] | null;
  selectedItems: Set<number>;
  onToggleItem: (index: number) => void;
  onSelectAllItems: () => void;
  onClearItems: () => void;

  // Reward
  rewardData: RewardSuggestionData | null;

  // Solver expertise
  solverExpertiseData: SolverExpertiseSuggestionData | null;

  // Deliverables
  hasDeliverableCards: boolean;
  deliverableItems?: DeliverableItem[];
  badgePrefix: string;

  // Schedule table
  scheduleRows: Record<string, unknown>[] | null;
  editedScheduleRows: Record<string, unknown>[] | null;
  onScheduleRowsChange: (rows: Record<string, unknown>[]) => void;

  // Structured line items
  structuredItems: string[] | null;
  editedLineItems: string[] | null;
  onLineItemsChange: (items: string[]) => void;

  // Table
  tableRows: Record<string, unknown>[] | null;
  editedTableRows: Record<string, unknown>[] | null;
  onTableRowsChange: (rows: Record<string, unknown>[]) => void;
  sectionKey: string;

  // Date
  parsedDate: string | null;
  editedDate: string | null;
  onDateChange: (val: string) => void;

  // Rich text
  editedRichText: string | null;
  onRichTextChange: (val: string) => void;
}

export function SuggestionVersionDisplay(props: SuggestionVersionDisplayProps) {
  const {
    suggestedFormat, suggestedVersion, isMasterData, isStructured,
    resolvedCodes, selectedItems, onToggleItem, onSelectAllItems, onClearItems,
    rewardData, solverExpertiseData,
    hasDeliverableCards, deliverableItems, badgePrefix,
    scheduleRows, editedScheduleRows, onScheduleRowsChange,
    structuredItems, editedLineItems, onLineItemsChange,
    tableRows, editedTableRows, onTableRowsChange, sectionKey,
    parsedDate, editedDate, onDateChange,
    editedRichText, onRichTextChange,
  } = props;

  return (
    <div className="space-y-3 border-l-4 border-l-indigo-400 rounded-r-lg">
      <div className="flex items-center gap-2 px-4 pt-3">
        <Sparkles className="h-4 w-4 text-indigo-600" />
        <span className="text-sm font-semibold text-foreground">AI Suggested {isMasterData ? "Selection" : "Version"}</span>
        <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 text-[11px] px-2 py-0.5">Editable</Badge>
      </div>

      {isMasterData && resolvedCodes && resolvedCodes.length > 0 ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-muted-foreground">{selectedItems.size}/{resolvedCodes.length} selected</span>
            <div className="flex gap-1.5">
              <button type="button" className="text-[11px] underline text-muted-foreground hover:text-foreground" onClick={onSelectAllItems}>Select all</button>
              <button type="button" className="text-[11px] underline text-muted-foreground hover:text-foreground" onClick={onClearItems}>Clear</button>
            </div>
          </div>
          {resolvedCodes.map((item, i) => (
            <label key={item.code} className={cn(
              "flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer transition-colors",
              selectedItems.has(i) ? "bg-indigo-100/50 border-indigo-300" : "bg-card border-border opacity-60",
              !item.isValid && "border-destructive/40 bg-destructive/5"
            )}>
              <Checkbox checked={selectedItems.has(i)} onCheckedChange={() => onToggleItem(i)} className="mt-0.5 h-3.5 w-3.5" />
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground font-mono">{item.code}</Badge>
                  {!item.isValid && <Badge variant="destructive" className="text-[10px] px-1 py-0">Invalid</Badge>}
                </div>
                {item.description && <p className="text-[11px] text-muted-foreground leading-relaxed">{item.description}</p>}
              </div>
            </label>
          ))}
        </div>
      ) : rewardData ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 mx-4 mb-3 p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300 text-xs px-2 py-0.5">
              {rewardData.type === 'both' ? 'Monetary + Non-Monetary' : rewardData.type === 'non_monetary' ? 'Non-Monetary' : 'Monetary'}
            </Badge>
          </div>
          {rewardData.monetary?.tiers && Object.keys(rewardData.monetary.tiers).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prize Tiers</p>
              {Object.entries(rewardData.monetary.tiers).map(([tier, amount]) => (
                <div key={tier} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                  <span className="text-sm font-medium text-foreground capitalize">{tier}</span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">{rewardData.monetary?.currency ?? 'USD'} {Number(amount).toLocaleString()}</span>
                </div>
              ))}
              {rewardData.monetary.justification && <p className="text-xs text-muted-foreground italic">{rewardData.monetary.justification}</p>}
            </div>
          )}
          {rewardData.nonMonetary?.items && rewardData.nonMonetary.items.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Non-Monetary Rewards</p>
              <ul className="space-y-1.5">
                {rewardData.nonMonetary.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : solverExpertiseData ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 mx-4 mb-3 p-4 shadow-sm space-y-3">
          {(['expertise_levels', 'proficiency_areas', 'sub_domains', 'specialities'] as const).map(field => (
            <div key={field}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                {field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {solverExpertiseData[field] && solverExpertiseData[field]!.length > 0
                  ? solverExpertiseData[field]!.map((el) => <Badge key={el.id} variant="outline" className="text-xs">{el.name}</Badge>)
                  : <Badge variant="secondary" className="text-xs">All {field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Badge>}
              </div>
            </div>
          ))}
        </div>
      ) : hasDeliverableCards ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 mx-4 mb-3 p-4 shadow-sm max-h-[500px] overflow-y-auto">
          <DeliverableCardRenderer items={deliverableItems!} badgePrefix={badgePrefix} hideAcceptanceCriteria={badgePrefix === "O" || badgePrefix === "S"} />
        </div>
      ) : scheduleRows ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm overflow-y-auto">
          <EditableScheduleRows rows={editedScheduleRows ?? scheduleRows.map(r => ({ ...r }))} onChange={onScheduleRowsChange} />
        </div>
      ) : isStructured && structuredItems && structuredItems.length > 0 ? (
        (() => {
          const detection = detectAndParseLineItems(editedLineItems ?? [...structuredItems]);
          if (detection.type === 'table') {
            return (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm max-h-96 overflow-y-auto">
                <TableLineItemRenderer rows={detection.rows} schema={detection.schema} onChange={(updatedRows) => {
                  const serialized = updatedRows.map((r) => JSON.stringify(r));
                  onLineItemsChange(serialized);
                }} />
              </div>
            );
          }
          return (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm max-h-72 overflow-y-auto space-y-1">
              <EditableLineItems items={editedLineItems ?? [...structuredItems]} onChange={onLineItemsChange} />
            </div>
          );
        })()
      ) : tableRows ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm max-h-72 overflow-y-auto">
          <EditableTableRows sectionKey={sectionKey} rows={editedTableRows ?? tableRows.map(r => ({ ...r }))} onChange={onTableRowsChange} />
        </div>
      ) : parsedDate ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <CalendarIcon className="h-5 w-5 text-indigo-500 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Suggested Deadline</p>
              <p className="text-lg font-semibold text-foreground">{format(new Date(editedDate ?? parsedDate), "MMMM d, yyyy")}</p>
            </div>
            <Input type="date" value={editedDate ?? parsedDate} onChange={(e) => onDateChange(e.target.value)} className="w-[180px] h-9 text-sm" />
          </div>
        </div>
      ) : suggestedFormat === "table_fallback" && suggestedVersion ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/40 mx-4 mb-3 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
              AI returned unstructured text instead of table data. Click "Re-review" to regenerate in the correct format.
            </p>
          </div>
          <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto rounded border border-border/50 bg-background/50 p-2">
            <AiContentRenderer content={suggestedVersion} compact />
          </div>
        </div>
      ) : suggestedVersion ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm text-sm leading-relaxed min-h-[160px]">
          <EditableRichText value={editedRichText ?? suggestedVersion} onChange={onRichTextChange} />
        </div>
      ) : null}
    </div>
  );
}
