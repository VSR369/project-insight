/**
 * MatchScoreBadge — Displays a match percentage on challenge cards
 * for logged-in providers with 65%+ profile strength.
 */

import { useQuery } from '@tanstack/react-query';
import { computeMatchScore } from '@/services/enrollment/matchScoreService';
import { cn } from '@/lib/utils';

interface MatchScoreBadgeProps {
  providerId: string;
  challengeId: string;
  profileStrength: number;
  className?: string;
}

export function MatchScoreBadge({
  providerId,
  challengeId,
  profileStrength,
  className,
}: MatchScoreBadgeProps) {
  const enabled = profileStrength >= 65 && !!providerId && !!challengeId;

  const { data: result } = useQuery({
    queryKey: ['match-score', providerId, challengeId],
    queryFn: () => computeMatchScore(providerId, challengeId),
    enabled,
    staleTime: 15 * 60_000,
  });

  if (!enabled || !result) return null;

  const score = result.score;
  const colorClass =
    score >= 80 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
    score >= 60 ? 'bg-amber-100 text-amber-800 border-amber-300' :
    'bg-muted text-muted-foreground border-border';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border',
        colorClass,
        className
      )}
      title={`Expertise: ${result.breakdown.expertiseMatch}% · Geography: ${result.breakdown.geographyMatch}% · Solution Type: ${result.breakdown.solutionTypeMatch}%`}
    >
      {score}% match
    </span>
  );
}
