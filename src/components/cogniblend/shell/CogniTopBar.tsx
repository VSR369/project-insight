/**
 * CogniTopBar — Top navigation bar for CogniBlend shell.
 * Responsive left offset: none on mobile, 64px tablet, 256px desktop.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import NotificationBell from '@/components/cogniblend/NotificationBell';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';

interface CogniTopBarProps {
  pageTitle: string;
  onToggleSidebar: () => void;
}

/** Role code → display config */
const ROLE_BADGES: Record<string, { label: string; bg: string; color: string }> = {
  CR: { label: 'CR', bg: '#E1F5EE', color: '#0F6E56' },
  CU: { label: 'CU', bg: '#EDE9FE', color: '#7C3AED' },
  ID: { label: 'ID', bg: '#E6F1FB', color: '#185FA5' },
  ER: { label: 'ER', bg: '#FCE7F3', color: '#BE185D' },
  LC: { label: 'LC', bg: '#FFF7ED', color: '#C2410C' },
  FC: { label: 'FC', bg: '#FFFBEB', color: '#B45309' },
  AM: { label: 'AM', bg: '#CCFBF1', color: '#0F766E' },
  RQ: { label: 'RQ', bg: '#F1F5F9', color: '#64748B' },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function CogniTopBar({ pageTitle, onToggleSidebar }: CogniTopBarProps) {
  // ═══════════════════════════════════════════
  // SECTION 1: useState
  // ═══════════════════════════════════════════
  const [avatarOpen, setAvatarOpen] = useState(false);

  // ═══════════════════════════════════════════
  // SECTION 2: Context and custom hooks
  // ═══════════════════════════════════════════
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ═══════════════════════════════════════════
  // SECTION 5: useEffect
  // ═══════════════════════════════════════════
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ═══════════════════════════════════════════
  // SECTION 7: Handlers
  // ═══════════════════════════════════════════
  const handleSignOut = async () => {
    setAvatarOpen(false);
    await signOut();
    navigate('/cogni/login', { replace: true });
  };

  // TODO: Replace with real org context data
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const orgName = 'Acme Innovation Labs';
  const userRoles = ['CR', 'CU']; // placeholder
  const initials = getInitials(userName);

  // ═══════════════════════════════════════════
  // SECTION 8: Render
  // ═══════════════════════════════════════════
  return (
    <header
      className="fixed top-0 right-0 left-0 md:left-16 lg:left-64 z-20 flex items-center px-3 lg:px-4 gap-2 lg:gap-3 bg-white border-b"
      style={{ height: 56, borderColor: '#E5E7EB' }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onToggleSidebar}
        className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-6 w-6 text-muted-foreground" />
      </button>

      {/* Page title — slightly smaller on mobile */}
      <h1 className="font-bold text-foreground text-sm lg:text-base truncate">
        {pageTitle}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* NotificationBell */}
      <NotificationBell />

      {/* User avatar dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setAvatarOpen((v) => !v)}
          className="flex items-center justify-center rounded-full font-bold transition-colors hover:ring-2 hover:ring-primary/20"
          style={{
            width: 36,
            height: 36,
            backgroundColor: '#E6F1FB',
            color: '#185FA5',
            fontSize: 14,
          }}
          aria-label="User menu"
        >
          {initials}
        </button>

        {avatarOpen && (
          <div
            className="absolute right-0 mt-2 bg-white border shadow-lg overflow-hidden z-50"
            style={{ width: 260, borderRadius: 12, borderColor: '#E5E7EB' }}
          >
            {/* User info */}
            <div className="px-4 py-3 border-b" style={{ borderColor: '#E5E7EB' }}>
              <p className="font-bold text-foreground text-sm truncate">{userName}</p>
              <p className="text-muted-foreground text-xs truncate mt-0.5">{orgName}</p>

              {/* Role badges */}
              {userRoles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {userRoles.map((code) => {
                    const badge = ROLE_BADGES[code];
                    if (!badge) return null;
                    return (
                      <span
                        key={code}
                        className="inline-block font-bold"
                        style={{
                          fontSize: 10,
                          padding: '2px 8px',
                          borderRadius: 8,
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                onClick={() => {
                  setAvatarOpen(false);
                  navigate('/cogni/settings');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Settings
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                style={{ color: '#DC2626' }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
