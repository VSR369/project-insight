/**
 * MyChallengesSection — "My Challenges" widget with dynamic role filter tabs
 * driven by availableRoles from CogniRoleContext.
 * Auto-selects the tab matching activeRole on mount/change.
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { cn } from '@/lib/utils';
import { ROLE_DISPLAY } from '@/types/cogniRoles';
import type { MyChallengeItem } from '@/hooks/cogniblend/useMyChallenges';

/* ── Role codes that have meaningful "My Challenges" tabs ─── */

const TAB_ELIGIBLE_ROLES = ['CR', 'CU', 'ER', 'LC', 'FC'] as const;

const TAB_LABELS: Record<string, string> = {
  CR: 'As Creator',
  CU: 'As Curator',
  ER: 'As Reviewer',
  LC: 'As Legal',
  FC: 'As Finance',
};

/* ── Master-status group ordering ────────────────────────── */

const MASTER_STATUS_GROUPS = [
  { key: 'ACTIVE', label: 'Active', order: 0 },
  { key: 'IN_PREPARATION', label: 'In Preparation', order: 1 },
  { key: 'COMPLETED', label: 'Completed', order: 2 },
  { key: 'CANCELLED', label: 'Cancelled', order: 3 },
  { key: 'TERMINATED', label: 'Terminated', order: 4 },
] as const;

const STATUS_GROUP_ORDER: Record<string, number> = Object.fromEntries(
  MASTER_STATUS_GROUPS.map((g) => [g.key, g.order]),
);

const STATUS_GROUP_LABEL: Record<string, string> = Object.fromEntries(
  MASTER_STATUS_GROUPS.map((g) => [g.key, g.label]),
);

/* ── Phase label helper ──────────────────────────────────── */

const PHASE_LABELS: Record<number, string> = {
  1: 'Phase 1', 2: 'Phase 2', 3: 'Phase 3',
  4: 'Phase 4', 5: 'Phase 5', 6: 'Phase 6',
};

/* ── Status badge styling ────────────────────────────────── */

const STATUS_STYLE: Record<string, string> = {
  IN_PREPARATION: 'bg-muted text-muted-foreground',
  DRAFT: 'bg-muted text-muted-foreground',
  ACTIVE: 'bg-[hsl(155,40%,93%)] text-[hsl(155,68%,30%)]',
  COMPLETED: 'bg-[hsl(210,60%,95%)] text-[hsl(210,60%,40%)]',
  CANCELLED: 'bg-[hsl(1,50%,93%)] text-[hsl(1,60%,45%)]',
  TERMINATED: 'bg-[hsl(1,50%,93%)] text-[hsl(1,60%,45%)]',
  LEGAL_VERIFICATION_PENDING: 'bg-[hsl(38,80%,93%)] text-[hsl(38,68%,35%)]',
  ON_HOLD: 'bg-[hsl(38,80%,93%)] text-[hsl(38,68%,35%)]',
  COMPLETED_BYPASSED: 'bg-muted text-muted-foreground italic',
};

const STATUS_LABEL: Record<string, string> = {
  IN_PREPARATION: 'In Preparation',
  DRAFT: 'In Preparation',
  CANCELLED: 'Cancelled',
  TERMINATED: 'Terminated',
  LEGAL_VERIFICATION_PENDING: 'Awaiting Legal',
  ON_HOLD: 'On Hold',
  COMPLETED_BYPASSED: 'Bypassed',
};

/* ── Role badge styling ──────────────────────────────────── */

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  CR: { bg: '#E1F5EE', color: '#0F6E56' },
  CA: { bg: '#E6F1FB', color: '#185FA5' },
  CU: { bg: '#EDE9FE', color: '#7C3AED' },
  ID: { bg: '#E6F1FB', color: '#185FA5' },
  ER: { bg: '#FCE7F3', color: '#BE185D' },
};

/* ── Group header styling ────────────────────────────────── */

const GROUP_HEADER_STYLE: Record<string, string> = {
  ACTIVE: 'text-[hsl(155,68%,30%)] border-l-[hsl(155,68%,50%)]',
  IN_PREPARATION: 'text-muted-foreground border-l-muted-foreground',
  COMPLETED: 'text-[hsl(210,60%,40%)] border-l-[hsl(210,60%,50%)]',
  CANCELLED: 'text-[hsl(1,60%,45%)] border-l-[hsl(1,60%,55%)]',
  TERMINATED: 'text-[hsl(1,60%,45%)] border-l-[hsl(1,60%,55%)]',
};

/* ── Props ────────────────────────────────────────────────── */

interface MyChallengesSectionProps {
  items: MyChallengeItem[];
  roleCounts: Record<string, number>;
  isLoading: boolean;
  activeRole?: string;
  availableRoles?: string[];
}

export function MyChallengesSection({
  items,
  roleCounts,
  isLoading,
  activeRole,
  availableRoles,
}: MyChallengesSectionProps) {
  /* Build dynamic tabs: "All" + tabs for roles user actually holds */
  const roleTabs = useMemo(() => {
    const tabs: { key: string; label: string; roleCode: string | null }[] = [
      { key: 'ALL', label: 'All', roleCode: null },
    ];
    const userRoles = availableRoles ?? [];
    for (const role of TAB_ELIGIBLE_ROLES) {
      if (userRoles.includes(role)) {
        tabs.push({ key: role, label: TAB_LABELS[role] ?? `As ${role}`, roleCode: role });
      }
    }
    return tabs;
  }, [availableRoles]);

  const [activeTab, setActiveTab] = useState<string>('ALL');
  const navigate = useNavigate();

  /* Auto-select tab matching activeRole when workspace changes */
  useEffect(() => {
    if (!activeRole) return;
    const matchingTab = roleTabs.find((t) => t.key === activeRole);
    if (matchingTab) {
      setActiveTab(activeRole);
    }
  }, [activeRole, roleTabs]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'ALL') return items;
    return items.filter((item) => item.role_codes.includes(activeTab));
  }, [items, activeTab]);

  /** Group filtered items by master_status, sorted by group order */
  const groupedItems = useMemo(() => {
    const groups = new Map<string, MyChallengeItem[]>();
    for (const item of filteredItems) {
      const status = item.master_status || 'IN_PREPARATION';
      if (!groups.has(status)) groups.set(status, []);
      groups.get(status)!.push(item);
    }
    return [...groups.entries()].sort(
      ([a], [b]) => (STATUS_GROUP_ORDER[a] ?? 99) - (STATUS_GROUP_ORDER[b] ?? 99),
    );
  }, [filteredItems]);

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

      {/* ── Filter Tabs (dynamic from availableRoles) ──── */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {roleTabs.map((tab) => {
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

      {/* ── Challenge List (grouped by master_status) ──── */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6">
          <Briefcase className="h-7 w-7 text-muted-foreground mb-2" />
          <p className="text-xs lg:text-sm text-muted-foreground text-center">
            {activeTab === 'ALL'
              ? 'You have no challenge assignments yet.'
              : `No challenges for your ${ROLE_DISPLAY[activeTab] ?? activeTab} role.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedItems.map(([status, groupItems]) => (
            <div key={status}>
              {/* Group Header */}
              <div
                className={cn(
                  'border-l-2 pl-2.5 mb-2 flex items-center gap-2',
                  GROUP_HEADER_STYLE[status] ?? 'text-muted-foreground border-l-muted-foreground',
                )}
              >
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {STATUS_GROUP_LABEL[status] ?? status}
                </span>
                <span className="text-[10px] font-medium opacity-60">
                  ({groupItems.length})
                </span>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {groupItems.map((item) => {
                  const statusStyle = STATUS_STYLE[item.master_status] ?? STATUS_STYLE.DRAFT;

                  return (
                    <div
                      key={item.challenge_id}
                      className="rounded-xl border border-border bg-card p-3 lg:p-4 flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] lg:text-[15px] font-bold text-[hsl(218,52%,25%)] line-clamp-1">
                          {item.title}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="rounded-full bg-[hsl(247,67%,96%)] px-2 py-0.5 text-[10px] text-[hsl(248,35%,50%)]">
                            {PHASE_LABELS[item.current_phase] ?? `Phase ${item.current_phase}`}
                          </span>
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', statusStyle)}>
                            {STATUS_LABEL[item.master_status] ?? item.master_status}
                          </span>
                          {item.phase_status === 'LEGAL_VERIFICATION_PENDING' && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-[hsl(38,80%,93%)] text-[hsl(38,68%,35%)]">
                              Awaiting Legal
                            </span>
                          )}
                          {item.operating_model === 'AGG' && item.current_phase >= 2 && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-normal italic bg-muted text-muted-foreground">
                              Phase 1: Bypassed
                            </span>
                          )}
                          {roleStyle && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{ backgroundColor: roleStyle.bg, color: roleStyle.color }}
                            >
                              {item.role_code}
                            </span>
                          )}
                          <GovernanceProfileBadge profile={item.governance_profile} compact />
                        </div>
                      </div>
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
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
