/**
 * NonMonetaryRewardEditor — Non-monetary reward editing experience.
 *
 * Features:
 *  - Type-categorized item cards with badge colors
 *  - Inline editing (title + description)
 *  - AI suggestion panel
 *  - Add item flow (type selector pills → inline form)
 */

import { useState, useCallback } from 'react';
import { Sparkles, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  NonMonetaryReward,
  NonMonetaryItem,
  NonMonetaryType,
} from '@/services/rewardStructureResolver';
import type { ValidationError } from '@/lib/rewardValidation';
import NonMonetaryItemCard from './NonMonetaryItemCard';

const TYPE_OPTIONS: { type: NonMonetaryType; label: string; emoji: string }[] = [
  { type: 'recognition', label: 'Recognition', emoji: '🏆' },
  { type: 'opportunity', label: 'Opportunity', emoji: '🚀' },
  { type: 'resource', label: 'Resource', emoji: '📦' },
  { type: 'publication', label: 'Publication', emoji: '📄' },
  { type: 'access', label: 'Access', emoji: '🔑' },
  { type: 'other', label: 'Other', emoji: '💡' },
];

interface NonMonetaryRewardEditorProps {
  nonMonetary?: NonMonetaryReward;
  errors: ValidationError[];
  onUpdate: (nonMonetary: NonMonetaryReward) => void;
  onAISuggest?: () => Promise<NonMonetaryItem[] | null>;
  aiLoading?: boolean;
}

export default function NonMonetaryRewardEditor({
  nonMonetary,
  errors,
  onUpdate,
  onAISuggest,
  aiLoading = false,
}: NonMonetaryRewardEditorProps) {
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const items = nonMonetary?.items ?? [];
  const hasItems = items.length > 0;

  const updateItem = useCallback(
    (id: string, patch: Partial<NonMonetaryItem>) => {
      onUpdate({
        items: items.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      });
    },
    [items, onUpdate],
  );

  const deleteItem = useCallback(
    (id: string) => {
      onUpdate({ items: items.filter((item) => item.id !== id) });
    },
    [items, onUpdate],
  );

  const addItem = useCallback(
    (type: NonMonetaryType) => {
      const newItem: NonMonetaryItem = {
        id: crypto.randomUUID(),
        type,
        title: '',
        description: '',
      };
      onUpdate({ items: [...items, newItem] });
      setShowTypeSelector(false);
    },
    [items, onUpdate],
  );

  const handleAISuggest = useCallback(async () => {
    if (!onAISuggest) return;
    const suggestions = await onAISuggest();
    if (suggestions && suggestions.length > 0) {
      onUpdate({
        items: [
          ...items,
          ...suggestions.map((s) => ({ ...s, isAISuggested: true })),
        ],
      });
    }
  }, [onAISuggest, items, onUpdate]);

  return (
    <div className="space-y-4">
      {/* AI Generate prompt (prominent when empty) */}
      {!hasItems && (
        <div className="bg-accent/30 border border-accent rounded-2xl p-6 text-center">
          <Sparkles className="h-6 w-6 text-purple-500 mx-auto mb-2" />
          <p className="text-[15px] font-semibold text-foreground">
            Generate reward suggestions
          </p>
          <p className="text-[12px] text-muted-foreground mt-1 mb-4">
            AI will suggest rewards tailored to your challenge domain
          </p>
          <Button
            onClick={handleAISuggest}
            disabled={aiLoading || !onAISuggest}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-semibold text-[13px]"
          >
            {aiLoading ? (
              <Loader2 className="h-[13px] w-[13px] animate-spin" />
            ) : (
              <Sparkles className="h-[13px] w-[13px]" />
            )}
            Generate with AI
          </Button>

          <div className="flex items-center gap-3 justify-center mt-4 text-[12px] text-muted-foreground">
            <span>— or add manually —</span>
          </div>

          {/* Type selector pills for manual add */}
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                type="button"
                onClick={() => addItem(opt.type)}
                className="text-[11px] px-3 py-1.5 rounded-full border border-border bg-background hover:bg-accent hover:border-accent-foreground/20 transition-colors"
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Item cards */}
      {hasItems && (
        <>
          {/* AI Suggest button when items exist */}
          {onAISuggest && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAISuggest}
                disabled={aiLoading}
                className="gap-1.5 text-xs"
              >
                {aiLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                AI Suggest More
              </Button>
            </div>
          )}

          {items.map((item) => (
            <NonMonetaryItemCard
              key={item.id}
              item={item}
              editing
              onUpdate={(patch) => updateItem(item.id, patch)}
              onDelete={() => deleteItem(item.id)}
            />
          ))}

          {/* Add item button */}
          {showTypeSelector ? (
            <div className="border border-dashed border-border rounded-xl px-4 py-3">
              <p className="text-[11px] text-muted-foreground mb-2">Select reward type:</p>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => addItem(opt.type)}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-border bg-background hover:bg-accent transition-colors"
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowTypeSelector(true)}
              className={cn(
                'flex items-center gap-2 px-3 py-[9px] w-full',
                'border border-dashed border-border rounded-xl',
                'cursor-pointer text-primary',
                'hover:border-primary/50 hover:bg-primary/5 transition-colors',
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="text-[12px]">Add reward item</span>
            </button>
          )}
        </>
      )}

      {/* Validation errors */}
      {errors.filter((e) => e.field.startsWith('items')).length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {errors
            .filter((e) => e.field.startsWith('items'))
            .map((e, i) => (
              <p key={i} className="text-[11px] text-destructive">{e.message}</p>
            ))}
        </div>
      )}
    </div>
  );
}
