/**
 * CogniSidebarNav — Role-aware navigation for the CogniBlend sidebar.
 * Uses CogniRoleContext to highlight items relevant to the active workspace role.
 * Non-relevant items stay visible but dimmed (opacity-50).
 */

import { useLocation, useNavigate } from 'react-router-dom';
import {
  PlusCircle, FileInput, FilePlus, Folder, CheckSquare, ShieldCheck,
  FileText, FileCheck, Eye, BarChart2, Award, Lock, CreditCard,
  Search, Lightbulb, User, Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCogniRoleContext } from '@/contexts/CogniRoleContext';
import { ROLE_NAV_RELEVANCE, SOLVER_PATHS } from '@/types/cogniRoles';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  requiredRoles: string[];
  badgeKey?: 'activeChallenges' | 'curationQueue' | 'approvalQueue';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/* ------------------------------------------------------------------ */
/*  Navigation definition                                              */
/* ------------------------------------------------------------------ */

const SECTIONS: NavSection[] = [
  {
    title: 'CHALLENGES',
    items: [
      { label: 'New Challenge', path: '/cogni/challenges/create', icon: FilePlus, requiredRoles: ['CR', 'CA', 'AM', 'RQ'] },
      { label: 'My Requests', path: '/cogni/my-requests', icon: FileInput, requiredRoles: ['AM', 'RQ'] },
      { label: 'My Challenges', path: '/cogni/my-challenges', icon: Folder, requiredRoles: ['CR'], badgeKey: 'activeChallenges' },
      { label: 'Curation Queue', path: '/cogni/curation', icon: CheckSquare, requiredRoles: ['CU'], badgeKey: 'curationQueue' },
      { label: 'Approval Queue', path: '/cogni/approval', icon: ShieldCheck, requiredRoles: ['ID'], badgeKey: 'approvalQueue' },
      { label: 'Legal Documents', path: '/cogni/legal', icon: FileText, requiredRoles: ['LC'] },
      { label: 'Legal Review', path: '/cogni/legal-review', icon: FileCheck, requiredRoles: ['LC'] },
    ],
  },
  {
    title: 'SOLUTIONS',
    items: [
      { label: 'Review Queue', path: '/cogni/review', icon: Eye, requiredRoles: ['ER'] },
      { label: 'Evaluation Panel', path: '/cogni/evaluation', icon: BarChart2, requiredRoles: ['ER', 'ID'] },
      { label: 'Selection & IP', path: '/cogni/selection', icon: Award, requiredRoles: ['ID'] },
      { label: 'Escrow Management', path: '/cogni/escrow', icon: Lock, requiredRoles: ['FC'] },
      { label: 'Payment Processing', path: '/cogni/payments', icon: CreditCard, requiredRoles: ['FC'] },
    ],
  },
  {
    title: 'SOLVER',
    items: [
      { label: 'Browse Challenges', path: '/cogni/browse', icon: Search, requiredRoles: [] },
      { label: 'My Solutions', path: '/cogni/my-solutions', icon: Lightbulb, requiredRoles: [] },
      { label: 'My Portfolio', path: '/cogni/portfolio', icon: User, requiredRoles: [] },
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

  // Derive allRoleCodes from availableRoles for visibility check
  const allRoleCodes = new Set(availableRoles);

  // Badge counts from roleChallengeCount (approximate)
  const badgeCounts: Record<string, number> = {
    activeChallenges: roleChallengeCount['CR'] ?? 0,
    curationQueue: roleChallengeCount['CU'] ?? 0,
    approvalQueue: roleChallengeCount['ID'] ?? 0,
  };

  const isVisible = (requiredRoles: string[]): boolean => {
    if (requiredRoles.length === 0) return true;
    return requiredRoles.some((r) => allRoleCodes.has(r));
  };

  /** Check if a nav path is relevant to the active workspace role */
  const isRelevant = (path: string): boolean => {
    if (!activeRole) return true;
    // Solver paths are always relevant
    if (SOLVER_PATHS.includes(path)) return true;
    const relevantPaths = ROLE_NAV_RELEVANCE[activeRole] ?? [];
    return relevantPaths.some((rp) => path === rp || path.startsWith(rp + '/'));
  };

  const handleNav = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <nav className="px-3 py-3 space-y-5">
      {SECTIONS.map((section) => {
        const visibleItems = section.items.filter((item) => isVisible(item.requiredRoles));
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
