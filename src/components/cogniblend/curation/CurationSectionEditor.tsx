/**
 * CurationSectionEditor — Inline editing for curation review sections.
 * All editors autosave on change (debounced by parent hook).
 *
 * Org-policy editors (Date, Select, Radio) extracted to OrgPolicyEditors.tsx.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { normalizeAiContentForEditor } from "@/lib/aiContentFormatter";
import { AutoSaveIndicator } from "@/components/cogniblend/curation/AutoSaveIndicator";
import type { AutoSaveStatus } from "@/hooks/cogniblend/useAutoSaveSection";

// Re-export org-policy editors for backward compatibility
export { DateFieldEditor, SelectFieldEditor, RadioFieldEditor } from "@/components/cogniblend/curation/OrgPolicyEditors";

// ── Text field editor (autosave) ──

interface TextEditorProps {
  value: string;
  onSave: (val: string) => void;
  onCancel: () => void;
  saving?: boolean;
  autoSaveStatus?: AutoSaveStatus;
}

export function TextSectionEditor({ value, onSave, onCancel, saving, autoSaveStatus }: TextEditorProps) {
  const [draft, setDraft] = useState(() => normalizeAiContentForEditor(value));
  const isInitialRef = useRef(true);

  useEffect(() => {
    setDraft(normalizeAiContentForEditor(value));
    isInitialRef.current = true;
  }, [value]);

  const handleChange = useCallback((val: string) => {
    setDraft(val);
    if (isInitialRef.current) {
      isInitialRef.current = false;
      return;
    }
    onSave(val);
  }, [onSave]);

  return (
    <div className="space-y-2">
      <RichTextEditor value={draft} onChange={handleChange} placeholder="Enter content..." storagePath="curation-edits" />
      <div className="flex justify-end">
        <AutoSaveIndicator status={autoSaveStatus ?? (saving ? "saving" : "idle")} />
      </div>
    </div>
  );
}

// ── Deliverables editor (autosave) ──

interface DeliverablesEditorProps {
  items: string[];
  onSave: (items: string[]) => void;
  onCancel: () => void;
  saving?: boolean;
  itemLabel?: string;
  autoSaveStatus?: AutoSaveStatus;
}

export function DeliverablesEditor({ items: initial, onSave, onCancel, saving, itemLabel = "Item", autoSaveStatus }: DeliverablesEditorProps) {
  const [items, setItems] = useState<string[]>(initial.length ? initial : [""]);

  const triggerSave = useCallback((newItems: string[]) => {
    onSave(newItems.filter((s) => s.trim()));
  }, [onSave]);

  const update = (i: number, v: string) => {
    const next = [...items];
    next[i] = v;
    setItems(next);
    triggerSave(next);
  };
  const remove = (i: number) => {
    const next = items.filter((_, idx) => idx !== i);
    setItems(next);
    triggerSave(next);
  };
  const add = () => setItems([...items, ""]);

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`${itemLabel} ${i + 1}`}
            className="flex-1"
          />
          {items.length > 1 && (
            <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => remove(i)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5 mr-1" />Add {itemLabel}
        </Button>
        <AutoSaveIndicator status={autoSaveStatus ?? (saving ? "saving" : "idle")} />
      </div>
    </div>
  );
}

// ── Evaluation Criteria editor (autosave) ──

interface CriterionDraft {
  name: string;
  weight: number;
  description?: string;
}

interface EvalCriteriaEditorProps {
  criteria: CriterionDraft[];
  onSave: (criteria: CriterionDraft[]) => void;
  onCancel: () => void;
  saving?: boolean;
  autoSaveStatus?: AutoSaveStatus;
}

export function EvalCriteriaEditor({ criteria: initial, onSave, onCancel, saving, autoSaveStatus }: EvalCriteriaEditorProps) {
  const [rows, setRows] = useState<CriterionDraft[]>(initial.length ? initial : [{ name: "", weight: 0 }]);

  const totalWeight = rows.reduce((s, r) => s + (r.weight || 0), 0);

  const triggerSave = useCallback((newRows: CriterionDraft[]) => {
    onSave(newRows.filter((r) => r.name.trim()));
  }, [onSave]);

  const update = (i: number, field: keyof CriterionDraft, v: string | number) => {
    const next = [...rows];
    (next[i] as Record<string, unknown>)[field] = v;
    setRows(next);
    triggerSave(next);
  };
  const remove = (i: number) => {
    const next = rows.filter((_, idx) => idx !== i);
    setRows(next);
    triggerSave(next);
  };
  const add = () => setRows([...rows, { name: "", weight: 0 }]);

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Criterion</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground w-24">Weight %</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40">
                <td className="py-1.5 pr-2">
                  <Input value={r.name} onChange={(e) => update(i, "name", e.target.value)} placeholder="Criterion name" className="h-8 text-sm" />
                </td>
                <td className="py-1.5 px-2">
                  <Input type="number" value={r.weight} onChange={(e) => update(i, "weight", Number(e.target.value))} className="h-8 text-sm text-right w-20" min={0} max={100} />
                </td>
                <td className="py-1.5">
                  {rows.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(i)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5 mr-1" />Add Criterion
        </Button>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${totalWeight === 100 ? "text-emerald-600" : "text-destructive"}`}>
            Total: {totalWeight}% {totalWeight !== 100 && "(must be 100%)"}
          </span>
          <AutoSaveIndicator status={autoSaveStatus ?? (saving ? "saving" : "idle")} />
        </div>
      </div>
    </div>
  );
}
