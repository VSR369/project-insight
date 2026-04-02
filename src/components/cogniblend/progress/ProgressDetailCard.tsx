/**
 * ProgressDetailCard — Detailed status message + timing for curation progress.
 */

import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Info } from 'lucide-react';
import type { CurationProgress } from '@/hooks/cogniblend/useCurationProgress';

interface ProgressDetailCardProps {
  progress: CurationProgress | null;
}

function getStatusMessage(p: CurationProgress): string {
  switch (p.status) {
    case 'waiting':
      return 'Submitted — waiting for Curator to begin review.';
    case 'context_research':
      return `Curator is researching context (${p.context_sources_count} sources found).`;
    case 'ai_review':
      return `AI is reviewing your challenge (wave ${p.current_wave ?? '?'}/6, ${p.sections_reviewed}/${p.sections_total} sections done).`;
    case 'curator_editing':
      return `Curator is refining the specification (${p.sections_reviewed}/${p.sections_total} sections reviewed).`;
    case 'sent_for_approval':
      return 'Curation complete — awaiting your approval.';
    case 'completed':
      return 'Curation complete — challenge is ready for publication.';
    default:
      return 'Processing your challenge…';
  }
}

function getLastActivity(p: CurationProgress): string | null {
  const ts = p.last_section_saved_at || p.updated_at;
  if (!ts) return null;
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true });
  } catch {
    return null;
  }
}

export function ProgressDetailCard({ progress }: ProgressDetailCardProps) {
  if (!progress) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 px-5">
          <p className="text-sm text-muted-foreground">
            Submitted — waiting for Curator to begin.
          </p>
        </CardContent>
      </Card>
    );
  }

  const lastActivity = getLastActivity(progress);

  return (
    <Card>
      <CardContent className="py-4 px-5 space-y-3">
        <p className="text-sm font-medium">{getStatusMessage(progress)}</p>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {lastActivity && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Last activity: {lastActivity}
            </span>
          )}
          {progress.estimated_minutes_remaining != null && progress.estimated_minutes_remaining > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Est. ~{progress.estimated_minutes_remaining} min remaining
            </span>
          )}
        </div>

        {progress.status !== 'sent_for_approval' && progress.status !== 'completed' && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              While you wait: Your problem statement is being expanded into a complete
              {' '}{progress.sections_total}-section challenge specification by AI + a human Curator.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
