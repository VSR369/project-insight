/**
 * CogniSidebarNav — Role-aware navigation for the CogniBlend sidebar.
 * Uses CogniRoleContext to highlight items relevant to the active workspace role.
 * Non-relevant items stay visible but dimmed (opacity-50).
 */

import { useLocation, useNavigate } from 'react-router-dom';
import {
  FilePlus, Folder, CheckSquare, ShieldCheck,
  FileText, FileCheck, Eye, BarChart2, Award, Lock, CreditCard,
  Search, Lightbulb, User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCogniRoleContext } from '@/contexts/CogniRoleContext';
import { ROLE_NAV_RELEVANCE, SOLVER_PATHS } from '@/types/cogniRoles';
import { useCogniPermissions, type CogniPermissions } from '@/hooks/cogniblend/useCogniPermissions';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  isVisible: (perms: CogniPermissions) => boolean;
  badgeKey?: 'activeChallenges' | 'curationQueue';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/* ------------------------------------------------------------------ */
/*  Navigation definition                                              */
/* ------------------------------------------------------------------ */

/** Seeking-org role codes — users with ONLY these roles should not see solver items */
const SEEKING_ORG_ROLES = new Set(['AM', 'CR', 'CA', 'RQ', 'CU', 'ID', 'ER', 'LC', 'FC']);

const SECTIONS: NavSection[] = [
  {
    title: 'CHALLENGES',
    items: [
      { label: 'New Challenge', path: '/cogni/challenges/create', icon: FilePlus, isVisible: (p) => p.canSeeChallengePage || p.canSeeRequests },
      { label: 'My Challenges', path: '/cogni/my-challenges', icon: Folder, isVisible: (p) => p.canSeeChallengePage, badgeKey: 'activeChallenges' },
      { label: 'Curation Queue', path: '/cogni/curation', icon: CheckSquare, isVisible: (p) => p.canSeeCurationQueue, badgeKey: 'curationQueue' },
      { label: 'Approval Queue', path: '/cogni/approval', icon: ShieldCheck, isVisible: (p) => p.canSeeApprovalQueue, badgeKey: 'approvalQueue' },
      { label: 'Legal Workspace', path: '/cogni/lc-queue', icon: FileText, isVisible: (p) => p.canSeeLegalWorkspace },
      { label: 'Legal Review', path: '/cogni/legal-review', icon: FileCheck, isVisible: (p) => p.canSeeLegalWorkspace },
    ],
  },
  {
    title: 'SOLUTIONS',
    items: [
      { label: 'Review Queue', path: '/cogni/review', icon: Eye, isVisible: (p) => p.canSeeEvaluation },
      { label: 'Evaluation Panel', path: '/cogni/evaluation', icon: BarChart2, isVisible: (p) => p.canSeeEvaluation || p.canSeeApprovalQueue },
      { label: 'Selection & IP', path: '/cogni/selection', icon: Award, isVisible: (p) => p.canSeeApprovalQueue },
      { label: 'Escrow Management', path: '/cogni/escrow', icon: Lock, isVisible: (p) => p.canSeeEscrow },
      { label: 'Payment Processing', path: '/cogni/payments', icon: CreditCard, isVisible: (p) => p.canSeeEscrow },
    ],
  },
  {
    title: 'SOLVER',
    items: [
      { label: 'Browse Challenges', path: '/cogni/browse', icon: Search, isVisible: () => true },
      { label: 'My Solutions', path: '/cogni/my-solutions', icon: Lightbulb, isVisible: () => true },
      { label: 'My Portfolio', path: '/cogni/portfolio', icon: User, isVisible: () => true },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Badge component                                                    */
/* ------------------------------------------------------------------ */

function NavBadge({ count, collapsed }: { count: number; collapsed?: boolean }) {
  if (count <= 0) return null;
  if (collapsed) {
    return (
      <span
        className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"
      />
    );
  }
  return (
    <span
      className="ml-auto inline-flex items-center justify-center rounded-full font-semibold"
      style={{
        fontSize: 11,
        minWidth: 20,
        height: 20,
        padding: '0 6px',
        backgroundColor: 'hsl(212 68% 94%)',
        color: 'hsl(212 70% 37%)',
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface CogniSidebarNavProps {
  onNavigate?: () => void;
  collapsed?: boolean;
}

export function CogniSidebarNav({ onNavigate, collapsed = false }: CogniSidebarNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    activeRole,
    availableRoles,
    roleChallengeCount,
  } = useCogniRoleContext();
  const permissions = useCogniPermissions();

  // Check if user holds only seeking-org roles (no solver role)
  const isSeekingOrgOnly = availableRoles.length > 0 && availableRoles.every((r) => SEEKING_ORG_ROLES.has(r));

  // Badge counts from roleChallengeCount (approximate)
  const badgeCounts: Record<string, number> = {
    activeChallenges: (roleChallengeCount['CR'] ?? 0) + (roleChallengeCount['CA'] ?? 0),
    curationQueue: roleChallengeCount['CU'] ?? 0,
    approvalQueue: roleChallengeCount['ID'] ?? 0,
  };

  const checkVisible = (item: NavItem): boolean => item.isVisible(permissions);

  /** Check if a nav path is relevant to the active workspace role */
  const isRelevant = (path: string): boolean => {
    if (!activeRole) return true;
    if (SOLVER_PATHS.includes(path)) return true;
    const relevantPaths = ROLE_NAV_RELEVANCE[activeRole] ?? [];
    return relevantPaths.some((rp) => path === rp || path.startsWith(rp + '/'));
  };

  /** Hide entire SOLVER section for seeking-org-only users */
  const isSectionVisible = (sectionTitle: string): boolean => {
    if (sectionTitle === 'SOLVER' && isSeekingOrgOnly) return false;
    return true;
  };

  const handleNav = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <nav className="px-3 py-3 space-y-5">
      {SECTIONS.map((section) => {
        if (!isSectionVisible(section.title)) return null;
        const visibleItems = section.items.filter(checkVisible);
        if (visibleItems.length === 0) return null;

        return (
          <div key={section.title}>
            {/* Section header */}
            <div
              className={`
                px-3 pb-2 font-semibold select-none whitespace-nowrap transition-opacity duration-200
                ${collapsed ? 'md:opacity-0 md:h-0 md:pb-0 md:overflow-hidden' : ''}
                lg:opacity-100 lg:h-auto lg:pb-2 lg:overflow-visible
              `}
              style={{
                fontSize: 10,
                color: 'hsl(var(--muted-foreground))',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {section.title}
            </div>

            {/* Items */}
            <div className="space-y-0.5">
              {visibleItems.map((item) => {
                const active =
                  location.pathname === item.path ||
                  location.pathname.startsWith(item.path + '/');
                const relevant = isRelevant(item.path);

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    title={collapsed ? item.label : undefined}
                    className={`
                      relative w-full flex items-center gap-3 rounded-lg text-left
                      transition-all text-sm font-medium overflow-hidden
                      px-3 py-2
                      ${collapsed ? 'md:justify-center md:px-0' : ''}
                      lg:justify-start lg:px-3
                      ${!active && !relevant ? 'opacity-50' : 'opacity-100'}
                    `}
                    style={{
                      borderLeft: active
                        ? '3px solid hsl(var(--primary))'
                        : relevant && !active
                          ? '3px solid hsl(var(--primary) / 0.2)'
                          : '3px solid transparent',
                      backgroundColor: active ? 'hsl(212 68% 97%)' : 'transparent',
                      color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'hsl(var(--accent))';
                        (e.currentTarget as HTMLElement).style.opacity = '1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLElement).style.opacity = relevant ? '1' : '0.5';
                      }
                    }}
                  >
                    <item.icon className="shrink-0" style={{ width: 18, height: 18 }} />
                    <span className={`
                      truncate whitespace-nowrap transition-opacity duration-200
                      ${collapsed ? 'md:hidden' : ''}
                      lg:inline
                    `}>
                      {item.label}
                    </span>
                    {item.badgeKey && (
                      <NavBadge
                        count={badgeCounts[item.badgeKey] ?? 0}
                        collapsed={collapsed}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
