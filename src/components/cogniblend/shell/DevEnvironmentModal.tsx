/**
 * DevEnvironmentModal — Dev-only quick-login modal with role buttons,
 * demo provider dropdown, and screen navigator.
 * Feature-flagged behind VITE_SHOW_DEV_ENV=true.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Bug, Users, Navigation } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USERS, DEMO_TEST_PASSWORD } from '@/pages/cogniblend/DemoLoginPage';
import { ROLE_COLORS } from '@/types/cogniRoles';

const IS_DEV =
  import.meta.env.VITE_SHOW_DEV_ENV === 'true' ||
  (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname.includes('lovableproject.com') ||
      window.location.hostname.includes('lovable.app')));

const DEV_SCREENS = [
  { path: '/provider', label: 'Provider Dashboard' },
  { path: '/enroll/registration', label: 'Enrollment Wizard' },
  { path: '/admin', label: 'Admin Dashboard' },
  { path: '/cogni', label: 'CogniBlend Dashboard' },
  { path: '/pulse', label: 'Pulse Feed' },
  { path: '/browse-challenges', label: 'Browse Challenges' },
];

export function DevEnvironmentModal() {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  if (!IS_DEV) return null;

  const handleQuickLogin = async (email: string, primaryRole: string) => {
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
      console.error('[DevEnvModal]', message);
      setSwitching(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="fixed bottom-4 right-4 z-50 gap-1.5 bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
        >
          <Bug className="h-4 w-4" />
          <span className="hidden lg:inline">Dev Tools</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-amber-600" />
            Dev Environment
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="users" className="flex-1 min-h-0">
          <TabsList className="w-full">
            <TabsTrigger value="users" className="flex-1 gap-1">
              <Users className="h-3 w-3" /> Users
            </TabsTrigger>
            <TabsTrigger value="navigate" className="flex-1 gap-1">
              <Navigation className="h-3 w-3" /> Navigate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="flex-1 min-h-0 overflow-y-auto space-y-2 mt-3">
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                disabled={switching !== null}
                onClick={() => handleQuickLogin(u.email, u.roles[0])}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <div className="flex gap-1 mt-1">
                    {u.roles.map((r) => {
                      const c = ROLE_COLORS[r];
                      return (
                        <span
                          key={r}
                          className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
                          style={{ backgroundColor: c?.bg, color: c?.color }}
                        >
                          {r}
                        </span>
                      );
                    })}
                  </div>
                </div>
                {switching === u.email && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </button>
            ))}
          </TabsContent>

          <TabsContent value="navigate" className="space-y-2 mt-3">
            {DEV_SCREENS.map((s) => (
              <Button
                key={s.path}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  window.location.href = s.path;
                  setOpen(false);
                }}
              >
                <Navigation className="h-3 w-3 mr-2" />
                {s.label}
                <span className="ml-auto text-xs text-muted-foreground">{s.path}</span>
              </Button>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
