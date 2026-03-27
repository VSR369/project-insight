/**
 * NonMonetaryItemCard — Editable card for a non-monetary reward item.
 * Supports inline editing, deletion, and source badge display.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Pencil, Trash2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import SourceBadge from './SourceBadge';
import type { FieldSource } from './SourceBadge';

export interface NonMonetaryItemData {
  id: string;
  title: string;
  src: FieldSource;
  isDefault?: boolean;
  aiRecommended?: boolean;
}

interface NonMonetaryItemCardProps {
  item: NonMonetaryItemData;
  disabled?: boolean;
  onUpdate: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onAcceptAI?: () => void;
}

export default function NonMonetaryItemCard({
  item,
  disabled = false,
  onUpdate,
  onDelete,
  onAcceptAI,
}: NonMonetaryItemCardProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.title);

  const handleSaveEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onUpdate(item.id, trimmed);
    }
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(item.title);
    setEditing(false);
  };

  if (editing && !disabled) {
    return (
      <div className="border rounded-xl px-4 py-3 flex items-center gap-2 border-primary/30 bg-primary/5">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="h-8 text-[13px] flex-1"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveEdit();
            if (e.key === 'Escape') handleCancelEdit();
          }}
        />
        <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-7 w-7 p-0">
          <Check className="h-3.5 w-3.5 text-primary" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-7 w-7 p-0">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border rounded-xl px-4 py-3 flex items-center gap-3 transition-all',
        'border-primary/30 bg-primary/5',
        disabled && 'opacity-60 cursor-default',
      )}
    >
      <span className="text-[13px] font-medium text-foreground flex-1">{item.title}</span>
      <SourceBadge source={item.src} />

      {!disabled && (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditValue(item.title);
              setEditing(true);
            }}
            className="h-6 w-6 p-0"
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(item.id)}
            className="h-6 w-6 p-0"
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      )}

      {item.aiRecommended && onAcceptAI && (
        <div className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-blue-500" />
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onAcceptAI();
            }}
            className="h-6 px-2 text-[10px] text-blue-600 hover:bg-blue-100"
          >
            Accept
          </Button>
        </div>
      )}
    </div>
  );
}
