/**
 * ConfidenceBadge — Displays AI confidence score as a colored badge.
 * Shared across SuggestionCard, SourceList, and SourceDetail.
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConfidenceBadgeProps {
  score: number | null;
}

export function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const color =
    pct >= 85
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : pct >= 70
        ? 'text-amber-600 bg-amber-50 border-amber-200'
        : 'text-muted-foreground bg-muted border-border';
  return (
    <Badge variant="outline" className={cn('text-[10px] px-1 h-4 font-medium', color)}>
      {pct}%
    </Badge>
  );
}
