/**
 * NeedsActionSection — "Needs Your Action" widget for CogniBlend Dashboard.
 * Shows challenge cards with SLA status & transition buttons, or an empty state.
 * Complete Phase buttons show spinner + 'Completing…' while in flight.
 */

import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { EnrichedChallenge, SlaStatus, ValidTransition } from '@/hooks/cogniblend/useCogniDashboard';

/* ── Phase badge mapping ──────────────────────────────────── */

const PHASE_LABELS: Record<number, string> = {
  1: 'Phase 1: Setup',
  2: 'Phase 2: Submission',
  3: 'Phase 3: Curation',
  4: 'Phase 4: Approval',
  5: 'Phase 5: Evaluation',
  6: 'Phase 6: Award',
  7: 'Phase 7: Closure',
};

/* ── SLA dot colours ──────────────────────────────────────── */

function SlaIndicator({ sla }: { sla: SlaStatus | null }) {
  if (!sla) return null;

  const config: Record<string, { dot: string; text: string; bold?: boolean }> = {
    ON_TRACK: {
      dot: 'bg-[hsl(155,68%,37%)]',
      text: `On Track — ${sla.days_remaining ?? 0} day${(sla.days_remaining ?? 0) === 1 ? '' : 's'} left`,
    },
    APPROACHING: {
      dot: 'bg-[hsl(38,68%,41%)]',
      text: `Approaching — ${sla.days_remaining ?? 0} day${(sla.days_remaining ?? 0) === 1 ? '' : 's'} left`,
    },
    BREACHED: {
      dot: 'bg-[hsl(1,71%,59%)]',
      text: `BREACHED — ${sla.days_overdue ?? 0} day${(sla.days_overdue ?? 0) === 1 ? '' : 's'} overdue`,
      bold: true,
    },
  };

  const c = config[sla.status] ?? config.ON_TRACK;

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-2 w-2 rounded-full ${c.dot}`} />
      <span
        className={`text-[13px] ${
          sla.status === 'BREACHED'
            ? 'font-bold text-[hsl(1,71%,59%)]'
            : 'text-muted-foreground'
        }`}
      >
        {c.text}
      </span>
    </div>
  );
}

/* ── Transition button styling ────────────────────────────── */

function transitionVariant(t: ValidTransition) {
  const label = t.label.toLowerCase();
  if (label.includes('complete') || t.style === 'primary')
    return { variant: 'default' as const, className: 'bg-[hsl(210,68%,54%)] hover:bg-[hsl(210,68%,48%)] text-white' };
  if (label.includes('cancel') || t.style === 'destructive')
    return { variant: 'outline' as const, className: 'border-destructive text-destructive hover:bg-destructive/10' };
  return { variant: 'outline' as const, className: '' };
}

/* ── Props ────────────────────────────────────────────────── */

interface NeedsActionSectionProps {
  items: EnrichedChallenge[];
  isLoading: boolean;
  completingChallengeId?: string | null;
  onTransition?: (challengeId: string, action: string) => void;
}

export function NeedsActionSection({
  items,
  isLoading,
  completingChallengeId,
  onTransition,
}: NeedsActionSectionProps) {
  /* Loading skeleton */
  if (isLoading) {
    return (
      <section>
        <h2 className="text-lg font-bold text-[hsl(218,52%,25%)] mb-4">
          Needs Your Action
        </h2>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  /* Empty state */
  if (items.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-bold text-[hsl(218,52%,25%)] mb-4">
          Needs Your Action
        </h2>
        <div className="flex flex-col items-center rounded-xl bg-[hsl(150,40%,93%)] p-5 animate-fade-in">
          <CheckCircle className="h-8 w-8 text-[hsl(155,68%,37%)] mb-2" />
          <p className="text-base font-bold text-[hsl(155,68%,37%)]">All caught up!</p>
          <p className="text-[13px] text-muted-foreground">
            No challenges need your action right now.
          </p>
        </div>
      </section>
    );
  }

  /* Challenge cards */
  return (
    <section>
      <h2 className="text-lg font-bold text-[hsl(218,52%,25%)] mb-4">
        Needs Your Action
      </h2>
      <div className="space-y-3">
        {items.map((item) => {
          const isCompleting = completingChallengeId === item.challenge_id;

          return (
            <div
              key={item.challenge_id}
              className="rounded-xl border border-border bg-card p-4"
            >
              {/* Row 1: title + phase badge */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-[15px] font-bold text-[hsl(218,52%,25%)] line-clamp-1">
                  {item.title}
                </span>
                <span className="shrink-0 rounded-full bg-[hsl(247,67%,96%)] px-2.5 py-0.5 text-xs text-[hsl(248,35%,50%)]">
                  {PHASE_LABELS[item.current_phase] ?? item.phase_label}
                </span>
              </div>

              {/* Row 2: SLA */}
              <div className="mb-3">
                <SlaIndicator sla={item.sla} />
              </div>

              {/* Row 3: transition buttons */}
              {item.transitions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {item.transitions.map((t) => {
                    const { variant, className } = transitionVariant(t);
                    const isCompleteBtn = t.label.toLowerCase().includes('complete') || t.style === 'primary';

                    return (
                      <Button
                        key={t.action}
                        variant={variant}
                        size="sm"
                        disabled={isCompleting}
                        className={`text-[13px] px-4 py-1.5 h-auto rounded-md ${className}`}
                        onClick={() => onTransition?.(item.challenge_id, t.action)}
                      >
                        {isCompleting && isCompleteBtn ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            Completing…
                          </>
                        ) : (
                          t.label
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
