/**
 * CogniSidebarNav — Role-aware navigation for the CogniBlend sidebar.
 * Three sections: CHALLENGES, SOLUTIONS, SOLVER.
 * Items hidden entirely when user lacks the required role code.
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
  /** Role codes – item visible if user has ANY of these. Empty = always visible. */
  requiredRoles: string[];
  /** Badge key for dynamic counts */
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

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
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
}

export function CogniSidebarNav({ onNavigate }: CogniSidebarNavProps) {
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
            {/* Section header */}
            <div
              className="px-3 pb-2 font-semibold select-none"
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
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm font-medium"
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
                    <span className="truncate">{item.label}</span>
                    {item.badgeKey && <NavBadge count={badgeCounts[item.badgeKey] ?? 0} />}
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
