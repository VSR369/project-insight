/**
 * MyChallengesSection — "My Challenges" widget with role filter tabs.
 * Tabs: All | As Creator | As Curator | As Reviewer | As Approver
 * Each tab shows a badge count. Clicking a tab filters the list.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { cn } from '@/lib/utils';
import type { MyChallengeItem } from '@/hooks/cogniblend/useMyChallenges';

/* ── Tab definitions ─────────────────────────────────────── */

const ROLE_TABS = [
  { key: 'ALL', label: 'All', roleCode: null },
  { key: 'CR', label: 'As Creator', roleCode: 'CR' },
  { key: 'CU', label: 'As Curator', roleCode: 'CU' },
  { key: 'ER', label: 'As Reviewer', roleCode: 'ER' },
  { key: 'ID', label: 'As Approver', roleCode: 'ID' },
] as const;

/* ── Phase label helper ──────────────────────────────────── */

const PHASE_LABELS: Record<number, string> = {
  1: 'Phase 1',
  2: 'Phase 2',
  3: 'Phase 3',
  4: 'Phase 4',
  5: 'Phase 5',
  6: 'Phase 6',
};

/* ── Status badge styling ────────────────────────────────── */

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  ACTIVE: 'bg-[hsl(155,40%,93%)] text-[hsl(155,68%,30%)]',
  COMPLETED: 'bg-[hsl(210,60%,95%)] text-[hsl(210,60%,40%)]',
  CANCELLED: 'bg-[hsl(1,50%,93%)] text-[hsl(1,60%,45%)]',
  TERMINATED: 'bg-[hsl(1,50%,93%)] text-[hsl(1,60%,45%)]',
  LEGAL_VERIFICATION_PENDING: 'bg-[hsl(38,80%,93%)] text-[hsl(38,68%,35%)]',
  ON_HOLD: 'bg-[hsl(38,80%,93%)] text-[hsl(38,68%,35%)]',
  COMPLETED_BYPASSED: 'bg-muted text-muted-foreground italic',
};

/** Display label overrides for phase_status */
const STATUS_LABEL: Record<string, string> = {
  LEGAL_VERIFICATION_PENDING: 'Awaiting Legal',
  ON_HOLD: 'On Hold',
  COMPLETED_BYPASSED: 'Bypassed',
};

/* ── Role badge styling ──────────────────────────────────── */

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  CR: { bg: '#E1F5EE', color: '#0F6E56' },
  CU: { bg: '#EDE9FE', color: '#7C3AED' },
  ID: { bg: '#E6F1FB', color: '#185FA5' },
  ER: { bg: '#FCE7F3', color: '#BE185D' },
};

/* ── Props ────────────────────────────────────────────────── */

interface MyChallengesSectionProps {
  items: MyChallengeItem[];
  roleCounts: Record<string, number>;
  isLoading: boolean;
}

export function MyChallengesSection({
  items,
  roleCounts,
  isLoading,
}: MyChallengesSectionProps) {
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const navigate = useNavigate();

  const filteredItems = useMemo(() => {
    if (activeTab === 'ALL') return items;
    return items.filter((item) => item.role_code === activeTab);
  }, [items, activeTab]);

  const totalCount = items.length;

  if (isLoading) {
    return (
      <section className="mt-6 lg:mt-8">
        <h2 className="text-base lg:text-lg font-bold text-[hsl(218,52%,25%)] mb-3 lg:mb-4">
          My Challenges
        </h2>
        <Skeleton className="h-10 w-full rounded-lg mb-3" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 lg:mt-8">
      <h2 className="text-base lg:text-lg font-bold text-[hsl(218,52%,25%)] mb-3 lg:mb-4">
        My Challenges
      </h2>

      {/* ── Filter Tabs ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {ROLE_TABS.map((tab) => {
          const count = tab.roleCode === null ? totalCount : (roleCounts[tab.roleCode] ?? 0);
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-[hsl(210,68%,54%)] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'inline-flex items-center justify-center rounded-full px-1.5 min-w-[20px] text-[10px] font-bold',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-background text-foreground',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Challenge List ───────────────────────────────── */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6">
          <Briefcase className="h-7 w-7 text-muted-foreground mb-2" />
          <p className="text-xs lg:text-sm text-muted-foreground text-center">
            {activeTab === 'ALL'
              ? 'You have no challenge assignments yet.'
              : `No challenges for this role.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const roleStyle = ROLE_STYLE[item.role_code];
            const statusStyle = STATUS_STYLE[item.master_status] ?? STATUS_STYLE.DRAFT;

            return (
              <div
                key={`${item.challenge_id}-${item.role_code}`}
                className="rounded-xl border border-border bg-card p-3 lg:p-4 flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4"
              >
                {/* Title + badges */}
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] lg:text-[15px] font-bold text-[hsl(218,52%,25%)] line-clamp-1">
                    {item.title}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {/* Phase */}
                    <span className="rounded-full bg-[hsl(247,67%,96%)] px-2 py-0.5 text-[10px] text-[hsl(248,35%,50%)]">
                      {PHASE_LABELS[item.current_phase] ?? `Phase ${item.current_phase}`}
                    </span>
                    {/* Status */}
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', statusStyle)}>
                      {STATUS_LABEL[item.master_status] ?? item.master_status}
                    </span>
                    {/* Awaiting Legal badge */}
                    {item.phase_status === 'LEGAL_VERIFICATION_PENDING' && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-[hsl(38,80%,93%)] text-[hsl(38,68%,35%)]">
                        Awaiting Legal
                      </span>
                    )}
                    {/* Phase 1 Bypassed badge (AGG orgs) */}
                    {item.operating_model === 'AGG' && item.current_phase >= 2 && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-normal italic bg-muted text-muted-foreground">
                        Phase 1: Bypassed
                      </span>
                    )}
                    {/* Role */}
                    {roleStyle && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: roleStyle.bg, color: roleStyle.color }}
                      >
                        {item.role_code}
                      </span>
                    )}
                    {/* Governance */}
                    <GovernanceProfileBadge profile={item.governance_profile} compact />
                  </div>
                </div>

                {/* View button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-[13px] border-[hsl(210,68%,54%)] text-[hsl(210,68%,54%)] hover:bg-[hsl(210,68%,54%)]/10 w-full lg:w-auto"
                  onClick={() => navigate(`/cogni/challenges/${item.challenge_id}`)}
                >
                  View
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
