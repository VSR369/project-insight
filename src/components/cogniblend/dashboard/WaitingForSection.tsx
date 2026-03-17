/**
 * WaitingForSection — "Waiting for Others" widget for CogniBlend Dashboard.
 * Hidden entirely when no items. Shows role names, never person names.
 */

import { Skeleton } from '@/components/ui/skeleton';
import type { EnrichedWaitingChallenge } from '@/hooks/cogniblend/useCogniWaitingFor';
import type { SlaStatus } from '@/hooks/cogniblend/useCogniDashboard';

/* ── Phase badge mapping (shared with NeedsActionSection) ── */

const PHASE_LABELS: Record<number, string> = {
  1: 'Phase 1: Setup',
  2: 'Phase 2: Submission',
  3: 'Phase 3: Curation',
  4: 'Phase 4: Approval',
  5: 'Phase 5: Evaluation',
  6: 'Phase 6: Award',
  7: 'Phase 7: Closure',
};

/* ── SLA indicator (read-only variant) ─────────────────── */

function SlaIndicator({ sla }: { sla: SlaStatus | null }) {
  if (!sla) return null;

  const config: Record<string, { dot: string; text: string }> = {
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
    },
  };

  const c = config[sla.status] ?? config.ON_TRACK;

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-2 w-2 rounded-full ${c.dot}`} />
      <span
        className={`text-xs ${
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

/* ── Props ────────────────────────────────────────────────── */

interface WaitingForSectionProps {
  items: EnrichedWaitingChallenge[];
  isLoading: boolean;
}

export function WaitingForSection({ items, isLoading }: WaitingForSectionProps) {
  /* Loading skeleton */
  if (isLoading) {
    return (
      <section className="mt-8">
        <h2 className="text-lg font-bold text-[hsl(218,52%,25%)] mb-4">
          Waiting for Others
        </h2>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  /* Hide entirely when empty */
  if (items.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-[hsl(218,52%,25%)] mb-4">
        Waiting for Others
      </h2>
      <div className="space-y-3">
        {items.map((item) => (
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

            {/* Row 2: Waiting for role */}
            <p className="text-[13px] text-muted-foreground mb-1">
              <span className="italic">Waiting for: </span>
              <span className="font-bold">{item.waiting_for_role_name}</span>
            </p>

            {/* Row 3: Your next action */}
            {item.next_user_phase != null && item.next_user_role_name && (
              <p className="text-xs text-muted-foreground/70 mb-2">
                Your next action:{' '}
                You will review this in Phase {item.next_user_phase}
                {item.next_user_phase_label ? ` (${item.next_user_phase_label})` : ''}.
              </p>
            )}

            {/* Row 4: SLA for waiting phase */}
            <SlaIndicator sla={item.sla} />
          </div>
        ))}
      </div>
    </section>
  );
}
