/**
 * DuplicateMatchesPanel — Shows similar existing challenges
 * found by the duplicate detection engine.
 * BR-SR-005: Informational only, does not block submission.
 */

import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DuplicateMatch } from '@/hooks/queries/useDuplicateDetection';

interface DuplicateMatchesPanelProps {
  matches: DuplicateMatch[];
  isSearching: boolean;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-700' },
};

export const DuplicateMatchesPanel = forwardRef<HTMLDivElement, DuplicateMatchesPanelProps>(
  function DuplicateMatchesPanel({ matches, isSearching }, ref) {
    if (matches.length === 0 && !isSearching) return null;

    return (
      <div ref={ref} className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-foreground">
            Similar Existing Challenges
          </h3>
          {isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>

        {matches.length === 0 && isSearching && (
          <p className="text-xs text-muted-foreground">Searching for similar challenges...</p>
        )}

        <div className="space-y-2">
          {matches.map(match => {
            const status = STATUS_BADGE[match.masterStatus] ?? STATUS_BADGE.DRAFT;

            return (
              <Card key={match.id} className="border shadow-none">
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/org/challenges/${match.id}`}
                      className="text-[13px] font-bold text-primary hover:underline leading-tight flex items-center gap-1"
                    >
                      {match.title}
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                    </Link>
                    <Badge
                      variant="secondary"
                      className={cn('text-[10px] px-1.5 py-0 shrink-0', status.className)}
                    >
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠ Possible match ({match.keywordHits} keyword{match.keywordHits !== 1 ? 's' : ''})
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }
);

// ============================================================================
// Duplicate Warning Banner (above submit button)
// ============================================================================

interface DuplicateWarningBannerProps {
  onViewMatches: () => void;
  onDismiss: () => void;
}

export function DuplicateWarningBanner({ onViewMatches, onDismiss }: DuplicateWarningBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <p className="text-sm text-amber-800 font-medium">
          A similar challenge may already exist. Please review before submitting.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onViewMatches}
            className="text-xs text-amber-700 underline hover:text-amber-900"
          >
            View Matches
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
