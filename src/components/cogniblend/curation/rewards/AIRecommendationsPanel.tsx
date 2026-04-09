/**
 * AIRecommendationsPanel — Inline AI recommendations card for monetary/non-monetary tabs.
 * Flow A: Compact structured suggestions with Apply/Accept controls.
 */

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AIRecommendationsPanelProps {
  type: 'monetary' | 'non_monetary';
  onAcceptAll?: () => void;
  onApplyTiers?: () => void;
  onApplyAmounts?: () => void;
  rationale?: string;
}

export default function AIRecommendationsPanel({
  type,
  onAcceptAll,
  onApplyTiers,
  onApplyAmounts,
  rationale,
}: AIRecommendationsPanelProps) {
  return (
    <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <span className="text-[13px] font-semibold text-foreground">
            AI recommendations — {type === 'monetary' ? 'monetary' : 'non-monetary'}
          </span>
        </div>
        {onAcceptAll && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAcceptAll}
            className="h-7 text-[11px] text-blue-600 border-blue-200 hover:bg-blue-100"
          >
            Accept all
          </Button>
        )}
      </div>

      {/* Monetary-specific actions */}
      {type === 'monetary' && (
        <div className="space-y-2">
          {onApplyTiers && (
            <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border border-border">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Structure
                </span>
                <span className="text-[12px] text-muted-foreground">
                  3-tier structure recommended
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={onApplyTiers}
                className="h-6 text-[10px] text-blue-600"
              >
                Apply tiers
              </Button>
            </div>
          )}
          {onApplyAmounts && (
            <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border border-border">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Amounts
                </span>
                <span className="text-[12px] text-muted-foreground">
                  Suggested amounts per tier
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={onApplyAmounts}
                className="h-6 text-[10px] text-blue-600"
              >
                Apply amounts
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Rationale */}
      {rationale && (
        <p className="text-[11px] text-muted-foreground italic">
          {rationale}
        </p>
      )}
    </div>
  );
}
