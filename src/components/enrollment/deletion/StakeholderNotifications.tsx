/**
 * StakeholderNotifications — Lists stakeholders who will be notified on deletion.
 */

import { Mail, GraduationCap, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Stakeholder } from '@/services/enrollmentDeletionService';

interface StakeholderNotificationsProps {
  stakeholders: Stakeholder[];
}

const STAKEHOLDER_ICONS: Record<string, typeof Mail> = {
  reviewer: GraduationCap,
  manager: User,
};

export function StakeholderNotifications({ stakeholders }: StakeholderNotificationsProps) {
  if (stakeholders.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
        <Mail className="h-4 w-4" />
        People to be Notified ({stakeholders.length})
      </h4>
      <ScrollArea className="max-h-32">
        <div className="space-y-2">
          {stakeholders.map((stakeholder, index) => {
            const Icon = STAKEHOLDER_ICONS[stakeholder.type] ?? Mail;
            return (
              <div key={index} className="flex items-start gap-2 text-sm p-2 rounded bg-muted/50">
                <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                  <Icon className="h-3 w-3" />
                  {stakeholder.type}
                </Badge>
                <div className="min-w-0">
                  <p className="font-medium truncate">{stakeholder.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{stakeholder.email}</p>
                  <p className="text-xs text-muted-foreground">{stakeholder.context}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
