/**
 * CogniSidebarNav — Role-aware navigation for the CogniBlend sidebar.
 * Three sections: CHALLENGES, SOLUTIONS, SOLVER.
 * Items hidden entirely when user lacks the required role code.
 * Supports collapsed (icon-only) mode for tablet breakpoint.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  FileInput,
  FilePlus,
  Folder,
  CheckSquare,
  ShieldCheck,
  FileText,
  Eye,
  BarChart2,
  Award,
  Lock,
  CreditCard,
  Search,
  Lightbulb,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCogniUserRoles } from '@/hooks/cogniblend/useCogniUserRoles';

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
      { label: 'Submit Request', path: '/cogni/submit-request', icon: PlusCircle, requiredRoles: ['AM', 'RQ'] },
      { label: 'My Requests', path: '/cogni/my-requests', icon: FileInput, requiredRoles: ['AM', 'RQ'] },
      { label: 'Create Challenge', path: '/cogni/create-challenge', icon: FilePlus, requiredRoles: ['CR'] },
      { label: 'My Challenges', path: '/cogni/my-challenges', icon: Folder, requiredRoles: ['CR'], badgeKey: 'activeChallenges' },
      { label: 'Curation Queue', path: '/cogni/curation', icon: CheckSquare, requiredRoles: ['CU'], badgeKey: 'curationQueue' },
      { label: 'Approval Queue', path: '/cogni/approval', icon: ShieldCheck, requiredRoles: ['ID'], badgeKey: 'approvalQueue' },
      { label: 'Legal Documents', path: '/cogni/legal', icon: FileText, requiredRoles: ['LC'] },
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
    // Tiny dot indicator in collapsed mode
    return (
      <span
        className="absolute top-1 right-1 h-2 w-2 rounded-full"
        style={{ backgroundColor: '#378ADD' }}
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
        backgroundColor: '#E6F1FB',
        color: '#185FA5',
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
  /** When true, show icons only (tablet collapsed mode). Hidden at lg via CSS. */
  collapsed?: boolean;
}

export function CogniSidebarNav({ onNavigate, collapsed = false }: CogniSidebarNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { allRoleCodes, activeChallengeCount, curationQueueCount, approvalQueueCount } = useCogniUserRoles();

  const badgeCounts: Record<string, number> = {
    activeChallenges: activeChallengeCount,
    curationQueue: curationQueueCount,
    approvalQueue: approvalQueueCount,
  };

  const isVisible = (requiredRoles: string[]): boolean => {
    if (requiredRoles.length === 0) return true;
    return requiredRoles.some((r) => allRoleCodes.has(r));
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
            {/* Section header — hidden in collapsed tablet, visible on mobile & desktop */}
            <div
              className={`
                px-3 pb-2 font-semibold select-none whitespace-nowrap transition-opacity duration-200
                ${collapsed ? 'md:opacity-0 md:h-0 md:pb-0 md:overflow-hidden' : ''}
                lg:opacity-100 lg:h-auto lg:pb-2 lg:overflow-visible
              `}
              style={{
                fontSize: 10,
                color: '#9CA3AF',
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

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    title={collapsed ? item.label : undefined}
                    className={`
                      relative w-full flex items-center gap-3 rounded-lg text-left
                      transition-colors text-sm font-medium overflow-hidden
                      px-3 py-2
                      ${collapsed ? 'md:justify-center md:px-0' : ''}
                      lg:justify-start lg:px-3
                    `}
                    style={{
                      borderLeft: active ? '3px solid #378ADD' : '3px solid transparent',
                      backgroundColor: active ? '#F0F7FF' : 'transparent',
                      color: active ? '#378ADD' : '#666',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#F9FAFB';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
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
