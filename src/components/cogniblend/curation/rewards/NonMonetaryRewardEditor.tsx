/**
 * NonMonetaryRewardEditor — 5 fixed checkbox cards in 2-column grid.
 */

import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NonMonetarySelections, NonMonetaryKey } from '@/hooks/useRewardStructureState';
import { NM_KEYS } from '@/hooks/useRewardStructureState';
import type { ValidationError } from '@/lib/rewardValidation';
import NonMonetaryItemCard from './NonMonetaryItemCard';

interface NonMonetaryRewardEditorProps {
  selections: NonMonetarySelections;
  errors: ValidationError[];
  disabled?: boolean;
  onToggle: (key: NonMonetaryKey, selected: boolean) => void;
  onAcceptAISuggestion: (key: NonMonetaryKey) => void;
  onAcceptAllAI?: () => void;
  onReviewWithAI?: () => void;
  aiLoading?: boolean;
}

export default function NonMonetaryRewardEditor({
  selections,
  errors,
  disabled = false,
  onToggle,
  onAcceptAISuggestion,
  onAcceptAllAI,
  onReviewWithAI,
  aiLoading = false,
}: NonMonetaryRewardEditorProps) {
  const hasAIRecommendations = NM_KEYS.some((k) => selections[k].aiRecommended);

  return (
    <div className="space-y-4">
      {/* Header */}
      <p className="text-[13px] font-medium text-foreground">
        Select non-monetary rewards for this challenge
      </p>

      {/* 2-column checkbox grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {NM_KEYS.map((key) => (
          <NonMonetaryItemCard
            key={key}
            itemKey={key}
            selection={selections[key]}
            disabled={disabled}
            onToggle={(selected) => onToggle(key, selected)}
            onAcceptAI={() => onAcceptAISuggestion(key)}
          />
        ))}
      </div>

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
