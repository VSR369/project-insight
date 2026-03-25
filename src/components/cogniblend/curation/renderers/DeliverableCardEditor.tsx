/**
 * DeliverableCardEditor — Structured editor for rich deliverable objects.
 * Each deliverable has Name, Description, and Acceptance Criteria fields.
 */

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, X, GripVertical } from "lucide-react";
import type { DeliverableObject } from "./DeliverableCardRenderer";

interface DeliverableCardEditorProps {
  items: DeliverableObject[];
  onSave: (items: DeliverableObject[]) => void;
  onCancel: () => void;
  saving?: boolean;
}

const BADGE_COLORS = [
  "bg-primary/10 text-primary border-primary/20",
  "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-400",
  "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400",
  "bg-teal-500/10 text-teal-700 border-teal-500/20 dark:text-teal-400",
];

export function DeliverableCardEditor({
  items,
  onSave,
  onCancel,
  saving,
}: DeliverableCardEditorProps) {
  const [drafts, setDrafts] = useState<DeliverableObject[]>(
    items.length > 0 ? items.map((d) => ({ ...d })) : [{ name: "", description: "", acceptance_criteria: "" }]
  );

  const updateField = useCallback(
    (index: number, field: keyof DeliverableObject, value: string) => {
      setDrafts((prev) =>
        prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
      );
    },
    []
  );

  const addItem = useCallback(() => {
    setDrafts((prev) => [...prev, { name: "", description: "", acceptance_criteria: "" }]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = () => {
    const cleaned = drafts.filter((d) => d.name.trim().length > 0);
    if (cleaned.length === 0) return;
    onSave(cleaned);
  };

  const hasValidItems = drafts.some((d) => d.name.trim().length > 0);

  return (
    <div className="space-y-4">
      {drafts.map((draft, i) => {
        const colorClass = BADGE_COLORS[i % BADGE_COLORS.length];
        return (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                <Badge
                  variant="outline"
                  className={`font-bold text-xs px-2 py-0.5 ${colorClass}`}
                >
                  D{i + 1}
                </Badge>
              </div>
              {drafts.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeItem(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input
                value={draft.name}
                onChange={(e) => updateField(i, "name", e.target.value)}
                placeholder="e.g. Working prototype demonstrating core algorithm"
                className="text-sm"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                value={draft.description ?? ""}
                onChange={(e) => updateField(i, "description", e.target.value)}
                placeholder="Detailed description of this deliverable..."
                className="text-sm min-h-[60px]"
                rows={2}
              />
            </div>

            {/* Acceptance Criteria */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Acceptance Criteria</Label>
              <Textarea
                value={draft.acceptance_criteria ?? ""}
                onChange={(e) => updateField(i, "acceptance_criteria", e.target.value)}
                placeholder="Criteria that must be met for this deliverable to be accepted..."
                className="text-sm min-h-[60px]"
                rows={2}
              />
            </div>
          </div>
        );
      })}

      {/* Add + Save/Cancel */}
      <div className="flex items-center justify-between pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={addItem}
          className="text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Deliverable
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasValidItems}
          >
            <Save className="h-3 w-3 mr-1" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
