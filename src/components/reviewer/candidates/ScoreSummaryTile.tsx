/**
 * Score Summary Tile
 * 
 * Displays an individual score metric (Proof Points, Assessment, Interview).
 */

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ScoreSummaryTileProps {
  title: string;
  score: number | null;
  maxScore: number;
  percentage?: number | null;
  isPending: boolean;
  icon: React.ReactNode;
}

export function ScoreSummaryTile({
  title,
  score,
  maxScore,
  percentage,
  isPending,
  icon,
}: ScoreSummaryTileProps) {
  // Format score display
  const scoreDisplay = score !== null 
    ? Number.isInteger(score) ? score.toString() : score.toFixed(2)
    : '—';

  // Format percentage display
  const percentageDisplay = percentage !== null
    ? `${Math.round(percentage)}%`
    : isPending ? 'Pending' : '—';

  return (
    <Card className={cn(
      'transition-colors',
      isPending ? 'bg-muted/50' : 'bg-card'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className={cn(
            'p-2 rounded-lg',
            isPending ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
          )}>
            {icon}
          </span>
        </div>

        <h4 className={cn(
          'text-sm font-medium mb-1',
          isPending ? 'text-muted-foreground' : 'text-foreground'
        )}>
          {title}
        </h4>

        <div className="flex items-baseline gap-1">
          <span className={cn(
            'text-2xl font-bold',
            isPending ? 'text-muted-foreground' : 'text-foreground'
          )}>
            {scoreDisplay}
          </span>
          {score !== null && (
            <span className="text-sm text-muted-foreground">
              / {maxScore}
            </span>
          )}
        </div>

        <p className={cn(
          'text-xs mt-1',
          isPending ? 'text-muted-foreground italic' : 'text-muted-foreground'
        )}>
          {percentageDisplay}
        </p>
      </CardContent>
    </Card>
  );
}
