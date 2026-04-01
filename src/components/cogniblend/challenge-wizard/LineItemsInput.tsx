/**
 * LineItemsInput — Reusable numbered list input with drag-to-reorder.
 * Used for: expected_outcomes, root_causes, current_deficiencies,
 *           preferred_approach, approaches_not_of_interest, submission_guidelines.
 *
 * Matches curator line_items format: string[]
 */

import { useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface LineItemsInputProps {
  value: string[];
  onChange: (items: string[]) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  minItems?: number;
  maxItems?: number;
  addLabel?: string;
  error?: string;
}

export function LineItemsInput({
  value,
  onChange,
  label,
  placeholder = 'Enter an item...',
  required = false,
  minItems = 1,
  maxItems = 20,
  addLabel = 'Add Item',
  error,
}: LineItemsInputProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const items = value.length > 0 ? value : [''];

  const addItem = () => {
    if (items.length >= maxItems) return;
    onChange([...items, '']);
  };

  const removeItem = (index: number) => {
    if (items.length <= minItems) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, val: string) => {
    const updated = [...items];
    updated[index] = val;
    onChange(updated);
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragEnd = () => setDragIndex(null);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...items];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    onChange(reordered);
    setDragIndex(index);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label} {required ? <span className="text-destructive">*</span> : <span className="text-xs text-muted-foreground ml-1">(optional)</span>}
      </Label>
      <p className="text-xs text-muted-foreground">
        List items individually. Drag to reorder.
      </p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            className={cn(
              'flex items-center gap-2 rounded-lg border border-border bg-background p-1 transition-shadow',
              dragIndex === index && 'shadow-md ring-2 ring-primary/30',
            )}
          >
            <button
              type="button"
              className="cursor-grab shrink-0 p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
              tabIndex={-1}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground font-mono shrink-0 w-5">
              {index + 1}.
            </span>
            <Input
              placeholder={placeholder}
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 text-base"
            />
            {items.length > minItems && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(index)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {items.length < maxItems && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addItem}
          className="text-primary hover:text-primary/80"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> {addLabel}
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
