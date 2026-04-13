/**
 * BlockersList — Renders hard or soft blocker cards for enrollment deletion.
 */

import {
  Ban,
  AlertTriangle,
  ShieldAlert,
  GraduationCap,
  User,
  Calendar,
  Layers,
} from 'lucide-react';
import type { DeletionBlocker } from '@/services/enrollmentDeletionService';
import { cn } from '@/lib/utils';

interface BlockersListProps {
  blockers: DeletionBlocker[];
  variant: 'hard' | 'soft';
}

const BLOCKER_ICONS: Record<string, typeof Ban> = {
  ERR_PRIMARY: Ban,
  ERR_ONLY: Layers,
  ERR_CERTIFIED: ShieldAlert,
  WARN_ASSESSMENT: GraduationCap,
  WARN_APPROVAL: User,
  WARN_INTERVIEW: Calendar,
};

export function BlockersList({ blockers, variant }: BlockersListProps) {
  const isHard = variant === 'hard';
  const borderColor = isHard ? 'border-destructive/30' : 'border-amber-500/30';
  const bgColor = isHard ? 'bg-destructive/5' : 'bg-amber-500/5';
  const titleColor = isHard ? 'text-destructive' : 'text-amber-700';

  return (
    <div className="space-y-2">
      {!isHard && (
        <h4 className="text-sm font-medium text-foreground">Active Dependencies</h4>
      )}
      {blockers.map((blocker, index) => {
        const Icon = BLOCKER_ICONS[blocker.code] ?? AlertTriangle;
        return (
          <div key={index} className={cn('rounded-lg border p-3', borderColor, bgColor)}>
            <div className={cn('flex items-center gap-2 font-medium text-sm mb-1', titleColor)}>
              <Icon className="h-4 w-4" />
              {blocker.title}
            </div>
            <p className="text-sm text-muted-foreground">{blocker.message}</p>
            <p className={cn('text-xs mt-1', isHard ? 'text-muted-foreground mt-2 italic' : titleColor)}>
              {isHard ? `💡 ${blocker.resolution}` : blocker.resolution}
            </p>
          </div>
        );
      })}
    </div>
  );
}
