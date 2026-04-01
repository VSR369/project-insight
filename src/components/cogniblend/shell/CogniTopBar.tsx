/**
 * CogniTopBar — Top navigation bar for CogniBlend shell.
 * Responsive left offset: none on mobile, 64px tablet, 256px desktop.
 * Includes RoleSwitcher for workspace mode.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import NotificationBell from '@/components/cogniblend/NotificationBell';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { RoleSwitcher } from './RoleSwitcher';
import { DevRoleSwitcher } from './DevRoleSwitcher';

interface CogniTopBarProps {
  pageTitle: string;
  onToggleSidebar: () => void;
}

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
  const { data: currentOrg } = useCurrentOrg();
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

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const orgName = currentOrg?.orgName ?? 'Acme Innovation Labs';
  const governanceProfile = currentOrg?.governanceProfile ?? null;
  const initials = getInitials(userName);

  // ═══════════════════════════════════════════
  // SECTION 8: Render
  // ═══════════════════════════════════════════
  return (
    <header
      className="fixed top-0 right-0 left-0 md:left-16 lg:left-64 z-20 flex items-center px-3 lg:px-4 gap-2 lg:gap-3 bg-white border-b border-border"
      style={{ height: 56 }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onToggleSidebar}
        className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-6 w-6 text-muted-foreground" />
      </button>

      {/* Page title */}
      <h1 className="font-bold text-foreground text-sm lg:text-base truncate">
        {pageTitle}
      </h1>

      {/* Governance Profile Badge */}
      {governanceProfile && (
        <GovernanceProfileBadge profile={governanceProfile} />
      )}

      {/* Role Switcher — visible on all breakpoints */}
      <RoleSwitcher />

      {/* Dev-only quick user switch */}
      <DevRoleSwitcher />

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
            backgroundColor: 'hsl(212 68% 94%)',
            color: 'hsl(212 70% 37%)',
            fontSize: 14,
          }}
          aria-label="User menu"
        >
          {initials}
        </button>

        {avatarOpen && (
          <div
            className="absolute right-0 mt-2 bg-white border border-border shadow-lg overflow-hidden z-50"
            style={{ width: 260, borderRadius: 12 }}
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-border">
              <p className="font-bold text-foreground text-sm truncate">{userName}</p>
              <p className="text-muted-foreground text-xs truncate mt-0.5">{orgName}</p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                onClick={() => {
                  setAvatarOpen(false);
                  navigate('/cogni/settings');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent/50 transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Settings
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-accent/50 transition-colors"
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
