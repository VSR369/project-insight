/**
 * NotificationCard — Type-specific card with colored left border.
 * Per MOD-02 SCR-02-01 spec. GAP-9: Rich metadata rendering.
 */

import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  ArrowLeftRight,
  ArrowRightLeft,
  Megaphone,
  Mail,
  CalendarClock,
  MessageSquare,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AdminNotification, NotificationType } from '@/hooks/queries/useAdminNotifications';

const TYPE_CONFIG: Record<NotificationType, {
  borderClass: string;
  icon: React.ElementType;
  iconClass: string;
}> = {
  ASSIGNMENT: {
    borderClass: 'border-l-blue-500',
    icon: ClipboardList,
    iconClass: 'text-blue-500',
  },
  TIER1_WARNING: {
    borderClass: 'border-l-amber-500',
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
  },
  TIER2_BREACH: {
    borderClass: 'border-l-red-500',
    icon: AlertCircle,
    iconClass: 'text-red-500',
  },
  TIER3_CRITICAL: {
    borderClass: 'border-l-red-800',
    icon: ShieldAlert,
    iconClass: 'text-red-800',
  },
  REASSIGNMENT_IN: {
    borderClass: 'border-l-purple-500',
    icon: ArrowLeftRight,
    iconClass: 'text-purple-500',
  },
  REASSIGNMENT_OUT: {
    borderClass: 'border-l-muted-foreground',
    icon: ArrowRightLeft,
    iconClass: 'text-muted-foreground',
  },
  QUEUE_ESCALATION: {
    borderClass: 'border-l-orange-500',
    icon: Megaphone,
    iconClass: 'text-orange-500',
  },
  EMAIL_FAIL: {
    borderClass: 'border-l-red-400',
    icon: Mail,
    iconClass: 'text-red-400',
  },
};

interface NotificationCardProps {
  notification: AdminNotification;
  onMarkRead: (id: string) => void;
}

export function NotificationCard({ notification, onMarkRead }: NotificationCardProps) {
  const navigate = useNavigate();
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.ASSIGNMENT;
  const Icon = config.icon;
  const meta = (notification.metadata ?? {}) as Record<string, unknown>;

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
    if (notification.deep_link) {
      navigate(notification.deep_link);
    }
  };

  const orgName = meta.org_name as string | undefined;
  const industries = meta.industry_segments as string[] | undefined;
  const hqCountry = meta.hq_country as string | undefined;
  const orgType = meta.org_type as string | undefined;
  const slaDeadline = meta.sla_deadline as string | undefined;
  const domainScore = meta.domain_score as number | undefined;

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full text-left p-3 border-l-4 rounded-r-md transition-colors',
        'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        config.borderClass,
        !notification.is_read && 'bg-muted/30'
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', config.iconClass)} />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm', !notification.is_read && 'font-semibold')}>
            {notification.title}
          </p>

          {/* Rich metadata for ASSIGNMENT type (GAP-9) */}
          {orgName && (
            <p className="text-sm font-medium mt-0.5">{orgName}</p>
          )}

          {industries && industries.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {industries.slice(0, 3).map((ind) => (
                <Badge key={ind} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {ind}
                </Badge>
              ))}
              {industries.length > 3 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{industries.length - 3}
                </Badge>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-1">
            {hqCountry && (
              <span className="text-xs text-muted-foreground">{hqCountry}</span>
            )}
            {orgType && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{orgType}</Badge>
            )}
            {typeof domainScore === 'number' && (
              <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary hover:bg-primary/10">
                Score: {domainScore}
              </Badge>
            )}
          </div>

          {slaDeadline && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                SLA: {format(new Date(slaDeadline), 'MMM d, HH:mm')}
              </span>
            </div>
          )}

          {!orgName && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {notification.body}
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>

          {notification.deep_link && notification.type === 'ASSIGNMENT' && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 mt-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Verification
            </Button>
          )}
        </div>
        {!notification.is_read && (
          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
        )}
      </div>
    </button>
  );
}
