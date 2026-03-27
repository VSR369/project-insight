/**
 * NonMonetaryRewardEditor — Editable list of non-monetary reward items.
 * Supports add, edit, delete with 5 default suggestions.
 */

import { useState } from 'react';
import { Sparkles, Loader2, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ValidationError } from '@/lib/rewardValidation';
import NonMonetaryItemCard, { type NonMonetaryItemData } from './NonMonetaryItemCard';

interface NonMonetaryRewardEditorProps {
  items: NonMonetaryItemData[];
  errors: ValidationError[];
  disabled?: boolean;
  onAddItem: (title: string) => void;
  onUpdateItem: (id: string, title: string) => void;
  onDeleteItem: (id: string) => void;
  onAcceptAISuggestion?: (id: string) => void;
  onAcceptAllAI?: () => void;
  onReviewWithAI?: () => void;
  aiLoading?: boolean;
  hasBeenReviewed?: boolean;
}

export default function NonMonetaryRewardEditor({
  items,
  errors,
  disabled = false,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onAcceptAISuggestion,
  onAcceptAllAI,
  onReviewWithAI,
  aiLoading = false,
}: NonMonetaryRewardEditorProps) {
  const [newItemTitle, setNewItemTitle] = useState('');
  const hasAIRecommendations = items.some((item) => item.aiRecommended);

  const handleAddItem = () => {
    const trimmed = newItemTitle.trim();
    if (trimmed) {
      onAddItem(trimmed);
      setNewItemTitle('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <p className="text-[13px] font-medium text-foreground">
        Non-monetary rewards for this challenge
      </p>

      {/* Items list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {items.map((item) => (
          <NonMonetaryItemCard
            key={item.id}
            item={item}
            disabled={disabled}
            onUpdate={onUpdateItem}
            onDelete={onDeleteItem}
            onAcceptAI={onAcceptAISuggestion ? () => onAcceptAISuggestion(item.id) : undefined}
          />
        ))}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-border rounded-xl">
          <p className="text-[13px] text-muted-foreground">No items added yet</p>
          <p className="text-[11px] text-muted-foreground mt-1">Add non-monetary rewards below</p>
        </div>
      )}

      {/* Add new item */}
      {!disabled && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add new reward item..."
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            className="h-9 text-[13px] flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddItem();
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            disabled={!newItemTitle.trim()}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      )}

      {/* Accept all AI suggestions */}
      {hasAIRecommendations && onAcceptAllAI && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onAcceptAllAI}
            className="gap-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Sparkles className="h-3 w-3" />
            Accept all AI suggestions
          </Button>
        </div>
      )}

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {errors.map((e, i) => (
            <p key={i} className="text-[11px] text-destructive">{e.message}</p>
          ))}
        </div>
      )}

      {/* Review with AI button */}
      {onReviewWithAI && !disabled && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onReviewWithAI}
            disabled={aiLoading}
            className="gap-1.5 text-xs"
          >
            {aiLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Review with AI
          </Button>
        </div>
      )}
    </div>
  );
}
