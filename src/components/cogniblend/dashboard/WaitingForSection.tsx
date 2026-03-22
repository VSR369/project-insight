/**
 * WaitingForSection — "Waiting for Others" widget for CogniBlend Dashboard.
 * Filters by activeRole when provided — shows only challenges where the user's
 * next action phase matches the active workspace role.
 * Hidden entirely when no items. Shows role names, never person names.
 */

import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { EnrichedWaitingChallenge } from '@/hooks/cogniblend/useCogniWaitingFor';
import type { SlaStatus } from '@/hooks/cogniblend/useCogniDashboard';
import { SlaCountdown } from './SlaCountdown';
import { PhaseProgressBar } from './PhaseProgressBar';

/* ── Phase → role code mapping (mirrors NeedsActionSection) ── */

const PHASE_ROLE_MAP: Record<number, string[]> = {
  1: ['AM'], 2: ['CR', 'CA'], 3: ['CU'], 4: ['ID'], 5: ['ID'], 6: ['ID'],
  7: ['ER'], 8: ['ER'], 9: ['ID'], 10: ['FC'], 11: ['LC'], 12: ['FC'], 13: ['CR', 'CA'],
};

/* ── Phase badge mapping ───────────────────────────────────── */

const PHASE_LABELS: Record<number, string> = {
  1: 'Phase 1: Setup',
  2: 'Phase 2: Submission',
  3: 'Phase 3: Curation',
  4: 'Phase 4: Approval',
  5: 'Phase 5: Evaluation',
  6: 'Phase 6: Award',
  7: 'Phase 7: Closure',
};

/* ── SLA indicator ─────────────────────────────────────────── */

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
  activeRole?: string;
}

export function WaitingForSection({ items, isLoading, activeRole }: WaitingForSectionProps) {
  /* Filter: show only items where user's next action phase matches activeRole */
  const filteredItems = useMemo(() => {
    if (!activeRole) return items;
    return items.filter((item) => {
      if (item.next_user_phase != null && (PHASE_ROLE_MAP[item.next_user_phase] ?? []).includes(activeRole)) {
        return true;
      }
      if ((PHASE_ROLE_MAP[item.current_phase] ?? []).includes(activeRole)) {
        return true;
      }
      return false;
    });
  }, [items, activeRole]);

  if (isLoading) {
    return (
      <section className="mt-6 lg:mt-8">
        <h2 className="text-base lg:text-lg font-bold text-[hsl(218,52%,25%)] mb-3 lg:mb-4">
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

  if (filteredItems.length === 0) return null;

  return (
    <section className="mt-6 lg:mt-8">
      <h2 className="text-base lg:text-lg font-bold text-[hsl(218,52%,25%)] mb-3 lg:mb-4">
        Waiting for Others
      </h2>
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.challenge_id}
            className="rounded-xl border border-border bg-card p-3 lg:p-4"
          >
            {/* Row 1 */}
            <div className="flex items-start justify-between gap-2 lg:gap-3 mb-2">
              <span className="text-[13px] lg:text-[15px] font-bold text-[hsl(218,52%,25%)] line-clamp-1">
                {item.title}
              </span>
              <span className="shrink-0 rounded-full bg-[hsl(247,67%,96%)] px-2 lg:px-2.5 py-0.5 text-[10px] lg:text-xs text-[hsl(248,35%,50%)]">
                {PHASE_LABELS[item.current_phase] ?? item.phase_label}
              </span>
            </div>

            {/* Phase progress bar */}
            <div className="mb-2">
              <PhaseProgressBar currentPhase={item.current_phase} />
            </div>

            {/* Row 2 */}
            <p className="text-xs lg:text-[13px] text-muted-foreground mb-1">
              <span className="italic">Waiting for: </span>
              <span className="font-bold">{item.waiting_for_role_name}</span>
            </p>

            {/* Row 3 */}
            {item.next_user_phase != null && item.next_user_role_name && (
              <p className="text-[11px] lg:text-xs text-muted-foreground/70 mb-2">
                Your next action:{' '}
                You will review this in Phase {item.next_user_phase}
                {item.next_user_phase_label ? ` (${item.next_user_phase_label})` : ''}.
              </p>
            )}

            {/* Row 4: SLA countdown + indicator */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-1.5 lg:gap-4">
              <SlaCountdown deadlineAt={item.sla_deadline_at} />
              <SlaIndicator sla={item.sla} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
