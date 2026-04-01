/**
 * DevRoleSwitcher — Dev-only quick user switch dropdown.
 * Only renders on localhost / lovableproject.com.
 */

import { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_COLORS } from '@/types/cogniRoles';
import { DEMO_USERS, DEMO_TEST_PASSWORD } from '@/pages/cogniblend/DemoLoginPage';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const IS_DEV =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname.includes('lovableproject.com') ||
    window.location.hostname.includes('lovable.app'));

export function DevRoleSwitcher() {
  const [switching, setSwitching] = useState<string | null>(null);

  if (!IS_DEV) return null;

  const handleSwitch = async (email: string, primaryRole: string) => {
    setSwitching(email);
    try {
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: DEMO_TEST_PASSWORD,
      });
      if (error) throw error;
      sessionStorage.setItem('cogni_active_role', primaryRole);
      window.location.reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      console.error('[DevRoleSwitcher]', message);
      setSwitching(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors border border-amber-300"
          aria-label="Dev quick-switch user"
        >
          <RefreshCw className="h-3 w-3" />
          DEV
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Quick Switch (Dev Only)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {DEMO_USERS.map((u) => (
          <DropdownMenuItem
            key={u.email}
            disabled={switching !== null}
            onClick={() => handleSwitch(u.email, u.roles[0])}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{u.displayName}</span>
                {switching === u.email && (
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                )}
              </div>
              <div className="flex gap-1 mt-0.5">
                {u.roles.map((r) => {
                  const c = ROLE_COLORS[r];
                  return (
                    <span
                      key={r}
                      className="inline-block rounded px-1 text-[10px] font-bold"
                      style={{ backgroundColor: c?.bg, color: c?.color }}
                    >
                      {r}
                    </span>
                  );
                })}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
