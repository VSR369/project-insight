/**
 * OrgPolicyEditors — Date, Select, and Radio field editors for org-policy sections.
 *
 * Extracted from CurationSectionEditor.tsx.
 */

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
