/**
 * NotificationCard — Type-specific card with colored left border.
 * Per MOD-02 SCR-02-01 spec.
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
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

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
    if (notification.deep_link) {
      navigate(notification.deep_link);
    }
  };

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
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.body}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
        {!notification.is_read && (
          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
        )}
      </div>
    </button>
  );
}
