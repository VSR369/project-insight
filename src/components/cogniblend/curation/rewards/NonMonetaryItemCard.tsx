/**
 * NonMonetaryItemCard — Checkbox card for a fixed non-monetary reward item.
 */

import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import SourceBadge from './SourceBadge';
import type { NonMonetarySelection, NonMonetaryKey } from '@/hooks/useRewardStructureState';
import { NM_LABELS, NM_ICONS } from '@/hooks/useRewardStructureState';

interface NonMonetaryItemCardProps {
  itemKey: NonMonetaryKey;
  selection: NonMonetarySelection;
  disabled?: boolean;
  onToggle: (selected: boolean) => void;
  onAcceptAI?: () => void;
}

export default function NonMonetaryItemCard({
  itemKey,
  selection,
  disabled = false,
  onToggle,
  onAcceptAI,
}: NonMonetaryItemCardProps) {
  const label = NM_LABELS[itemKey];
  const icon = NM_ICONS[itemKey];

  return (
    <div
      className={cn(
        'border rounded-xl px-4 py-3 flex items-center gap-3 transition-all cursor-pointer',
        selection.selected
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-background hover:border-muted-foreground/30',
        disabled && 'opacity-60 cursor-default',
      )}
      onClick={() => !disabled && onToggle(!selection.selected)}
    >
      <Checkbox
        checked={selection.selected}
        onCheckedChange={(checked) => !disabled && onToggle(!!checked)}
        disabled={disabled}
        className="shrink-0"
      />
      <span className="text-lg shrink-0">{icon}</span>
      <span className="text-[13px] font-medium text-foreground flex-1">{label}</span>
      {selection.selected && <SourceBadge source={selection.src} />}
      {selection.aiRecommended && !selection.selected && (
        <div className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-blue-500" />
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onAcceptAI?.();
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
