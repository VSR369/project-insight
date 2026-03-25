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
import type { DeliverableItem } from "@/utils/parseDeliverableItem";

interface DeliverableCardEditorProps {
  items: DeliverableItem[];
  onSave: (items: DeliverableItem[]) => void;
  onCancel: () => void;
  saving?: boolean;
  badgePrefix?: string;
  hideAcceptanceCriteria?: boolean;
}

export function DeliverableCardEditor({
  items,
  onSave,
  onCancel,
  saving,
  badgePrefix = "D",
}: DeliverableCardEditorProps) {
  const [drafts, setDrafts] = useState<DeliverableItem[]>(
    items.length > 0
      ? items.map((d, i) => ({ ...d, id: d.id || `${badgePrefix}${i + 1}` }))
      : [{ id: `${badgePrefix}1`, name: "", description: "", acceptance_criteria: "" }]
  );

  const updateField = useCallback(
    (index: number, field: keyof DeliverableItem, value: string) => {
      setDrafts((prev) =>
        prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
      );
    },
    []
  );

  const addItem = useCallback(() => {
    setDrafts((prev) => [
      ...prev,
      { id: `${badgePrefix}${prev.length + 1}`, name: "", description: "", acceptance_criteria: "" },
    ]);
  }, [badgePrefix]);

  const removeItem = useCallback((index: number) => {
    setDrafts((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // Re-index IDs
      return updated.map((d, i) => ({ ...d, id: `${badgePrefix}${i + 1}` }));
    });
  }, [badgePrefix]);

  const handleSave = () => {
    const cleaned = drafts.filter((d) => d.name.trim().length > 0);
    if (cleaned.length === 0) return;
    onSave(cleaned);
  };

  const hasValidItems = drafts.some((d) => d.name.trim().length > 0);

  return (
    <div className="space-y-3">
      {drafts.map((draft, i) => (
        <div
          key={i}
          className="rounded-xl border border-border overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-muted/50 border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground/40" />
              <Badge
                variant="outline"
                className="font-semibold text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
              >
                {draft.id}
              </Badge>
            </div>
            {drafts.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground/40 hover:text-destructive"
                onClick={() => removeItem(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="p-4 space-y-3">
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
                value={draft.description}
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
                value={draft.acceptance_criteria}
                onChange={(e) => updateField(i, "acceptance_criteria", e.target.value)}
                placeholder="Criteria that must be met for this deliverable to be accepted..."
                className="text-sm min-h-[60px]"
                rows={2}
              />
            </div>
          </div>
        </div>
      ))}

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
