/**
 * LearningCorpusStats — Summary stat cards for the curator learning corpus.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, CheckCircle, Edit3, XCircle, Clock, Percent } from 'lucide-react';
import type { CorpusStats } from '@/hooks/queries/useCuratorCorrections';

interface LearningCorpusStatsProps {
  stats: CorpusStats;
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  accepted_unchanged: { label: 'Accepted', icon: CheckCircle, color: 'text-emerald-600' },
  accepted_with_edits: { label: 'Edited', icon: Edit3, color: 'text-blue-600' },
  rejected_rewritten: { label: 'Rewritten', icon: XCircle, color: 'text-amber-600' },
  skipped: { label: 'Skipped', icon: Clock, color: 'text-muted-foreground' },
};

export function LearningCorpusStats({ stats }: LearningCorpusStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Brain className="h-4 w-4" />
            Total Corrections
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
          <div className="flex gap-1 mt-2 flex-wrap">
            {Object.entries(stats.byAction).map(([action, count]) => {
              const cfg = ACTION_CONFIG[action];
              return (
                <Badge key={action} variant="secondary" className="text-xs">
                  {cfg?.label ?? action}: {count}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Percent className="h-4 w-4" />
            Avg Edit Distance
          </div>
          <p className="text-2xl font-bold">{stats.avgEditDistance}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            Avg time: {stats.avgTimeSpent}s per section
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Brain className="h-4 w-4" />
            Embeddings
          </div>
          <p className="text-2xl font-bold">
            {stats.embedded} <span className="text-sm font-normal text-muted-foreground">/ {stats.total}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.total > 0 ? Math.round((stats.embedded / stats.total) * 100) : 0}% coverage
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <CheckCircle className="h-4 w-4" />
            Patterns Extracted
          </div>
          <p className="text-2xl font-bold">{stats.patternsExtracted}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Learning rules harvested from rewrites
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
