/**
 * CogniBlend Dashboard — Placeholder
 * Route: /cogni/dashboard
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import NotificationBell from '@/components/cogniblend/NotificationBell';

export default function CogniDashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/cogni/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <h1 className="font-bold text-lg" style={{ color: '#1F3864' }}>
          CogniBlend
        </h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <span className="text-sm text-muted-foreground hidden lg:inline">
            {user?.email}
          </span>
          <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Body */}
      <main className="p-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to CogniBlend. Your challenges and notifications will appear here.
        </p>
      </main>
    </div>
  );
}
