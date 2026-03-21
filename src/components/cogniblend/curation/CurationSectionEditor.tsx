/**
 * CurationSectionEditor — Inline editing for curation review sections.
 * Renders RichTextEditor for text fields and structured editors for JSON fields.
 * Also provides DateFieldEditor, SelectFieldEditor, and RadioFieldEditor for org-policy fields.
 */

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Trash2, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { normalizeAiContentForEditor } from "@/lib/aiContentFormatter";
import { cn } from "@/lib/utils";

// ── Text field editor (problem_statement, scope, description, eligibility, etc.) ──

interface TextEditorProps {
  value: string;
  onSave: (val: string) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function TextSectionEditor({ value, onSave, onCancel, saving }: TextEditorProps) {
  const [draft, setDraft] = useState(() => normalizeAiContentForEditor(value));

  useEffect(() => {
    setDraft(normalizeAiContentForEditor(value));
  }, [value]);

  return (
    <div className="space-y-3">
      <RichTextEditor value={draft} onChange={setDraft} placeholder="Enter content..." storagePath="curation-edits" />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5 mr-1" />Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(draft)} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ── Deliverables editor ──

interface DeliverablesEditorProps {
  items: string[];
  onSave: (items: string[]) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function DeliverablesEditor({ items: initial, onSave, onCancel, saving }: DeliverablesEditorProps) {
  const [items, setItems] = useState<string[]>(initial.length ? initial : [""]);

  const update = (i: number, v: string) => {
    const next = [...items];
    next[i] = v;
    setItems(next);
  };
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const add = () => setItems([...items, ""]);

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Deliverable ${i + 1}`}
            className="flex-1"
          />
          {items.length > 1 && (
            <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => remove(i)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5 mr-1" />Add Deliverable
      </Button>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5 mr-1" />Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(items.filter((s) => s.trim()))} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ── Evaluation Criteria editor ──

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
}

export function EvalCriteriaEditor({ criteria: initial, onSave, onCancel, saving }: EvalCriteriaEditorProps) {
  const [rows, setRows] = useState<CriterionDraft[]>(initial.length ? initial : [{ name: "", weight: 0 }]);

  const totalWeight = rows.reduce((s, r) => s + (r.weight || 0), 0);

  const update = (i: number, field: keyof CriterionDraft, v: string | number) => {
    const next = [...rows];
    (next[i] as any)[field] = v;
    setRows(next);
  };
  const remove = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
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
        <span className={`text-xs font-medium ${totalWeight === 100 ? "text-green-600" : "text-destructive"}`}>
          Total: {totalWeight}% {totalWeight !== 100 && "(must be 100%)"}
        </span>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5 mr-1" />Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(rows.filter((r) => r.name.trim()))} disabled={saving || totalWeight !== 100}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ── Date Field Editor ──

interface DateFieldEditorProps {
  value: string | null;
  onSave: (val: string) => void;
  onCancel: () => void;
  saving?: boolean;
  label?: string;
}

export function DateFieldEditor({ value, onSave, onCancel, saving, label }: DateFieldEditorProps) {
  const [date, setDate] = useState<Date | undefined>(value ? new Date(value) : undefined);

  return (
    <div className="space-y-3">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full max-w-xs justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            {date ? format(date, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
            disabled={(d) => d < new Date()}
          />
        </PopoverContent>
      </Popover>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5 mr-1" />Cancel
        </Button>
        <Button size="sm" onClick={() => date && onSave(date.toISOString())} disabled={saving || !date}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ── Select Field Editor ──

interface SelectFieldEditorProps {
  value: string;
  options: Array<{ value: string; label: string; description?: string }>;
  onSave: (val: string) => void;
  onCancel: () => void;
  saving?: boolean;
  label?: string;
}

export function SelectFieldEditor({ value, options, onSave, onCancel, saving, label }: SelectFieldEditorProps) {
  const [draft, setDraft] = useState(value);

  return (
    <div className="space-y-3">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <Select value={draft} onValueChange={setDraft}>
        <SelectTrigger className="w-full max-w-xs">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <div>
                <span className="font-medium">{opt.label}</span>
                {opt.description && (
                  <span className="text-xs text-muted-foreground ml-2">— {opt.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5 mr-1" />Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(draft)} disabled={saving || !draft}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ── Radio Field Editor ──

interface RadioFieldEditorProps {
  value: string;
  options: Array<{ value: string; label: string; description?: string }>;
  onSave: (val: string) => void;
  onCancel: () => void;
  saving?: boolean;
  label?: string;
}

export function RadioFieldEditor({ value, options, onSave, onCancel, saving, label }: RadioFieldEditorProps) {
  const [draft, setDraft] = useState(value);

  return (
    <div className="space-y-3">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <RadioGroup value={draft} onValueChange={setDraft} className="space-y-2">
        {options.map((opt) => (
          <div key={opt.value} className="flex items-start gap-2">
            <RadioGroupItem value={opt.value} id={`radio-${opt.value}`} className="mt-0.5" />
            <Label htmlFor={`radio-${opt.value}`} className="cursor-pointer">
              <span className="text-sm font-medium">{opt.label}</span>
              {opt.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
              )}
            </Label>
          </div>
        ))}
      </RadioGroup>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5 mr-1" />Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(draft)} disabled={saving || !draft}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
