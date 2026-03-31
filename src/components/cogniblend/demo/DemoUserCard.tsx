/**
 * DemoUserCard — Clickable role card for demo login.
 */

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { DemoUser } from '@/pages/cogniblend/DemoLoginPage';

interface DemoUserCardProps {
  user: DemoUser;
  isLoading: boolean;
  disabled: boolean;
  onLogin: () => void;
  getRoleBadge: (code: string) => ReactNode;
}

export function DemoUserCard({ user, isLoading, disabled, onLogin, getRoleBadge }: DemoUserCardProps) {
  return (
    <Card
      className="cursor-pointer hover:ring-2 hover:ring-primary/40 transition-shadow"
      onClick={() => !disabled && onLogin()}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-foreground">{user.displayName}</span>
          <div className="flex items-center gap-2">
            {user.stepLabel && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {user.stepLabel}
              </Badge>
            )}
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {user.roles.map((r) => getRoleBadge(r))}
        </div>
        <p className="text-xs text-muted-foreground">{user.description}</p>
        <span className="text-[11px] text-muted-foreground/60 font-mono">{user.email}</span>
      </CardContent>
    </Card>
  );
}
