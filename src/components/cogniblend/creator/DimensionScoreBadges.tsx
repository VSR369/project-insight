/**
 * DimensionScoreBadges — Compact row of 5 dimension scores for AI Review drawer.
 */

import { cn } from '@/lib/utils';
import type { DimensionScores } from '@/hooks/cogniblend/useCreatorAIReview';

interface DimensionScoreBadgesProps {
  dimensions: DimensionScores;
}

const DIMENSION_LABELS: { key: keyof DimensionScores; label: string }[] = [
  { key: 'completeness', label: 'Complete' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'solverReadiness', label: 'Solver Ready' },
  { key: 'legalCompliance', label: 'Legal' },
  { key: 'governanceAlignment', label: 'Governance' },
];

function badgeColor(score: number): string {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (score >= 60) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

export function DimensionScoreBadges({ dimensions }: DimensionScoreBadgesProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DIMENSION_LABELS.map(({ key, label }) => {
        const score = dimensions[key];
        return (
          <span
            key={key}
            className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap',
              badgeColor(score)
            )}
            title={`${label}: ${score}/100`}
          >
            {label} {score}
          </span>
        );
      })}
    </div>
  );
}
