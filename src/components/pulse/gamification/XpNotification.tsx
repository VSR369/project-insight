/**
 * XP Notification Toast Component
 * Animated XP gain notification with visual feedback
 */

import { useEffect, useState } from 'react';
import { Zap, TrendingUp, Flame, Coins, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

interface XpNotificationProps {
  xpAmount: number;
  reason: string;
  type?: 'fire' | 'gold' | 'save' | 'content' | 'standup';
  onComplete?: () => void;
}

export function XpNotification({ xpAmount, reason, type = 'content', onComplete }: XpNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setIsVisible(true));

    // Start exit after delay
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2500);

    // Complete after exit animation
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, 3000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const getIcon = () => {
    switch (type) {
      case 'fire':
        return <Flame className="h-5 w-5 text-orange-500" />;
      case 'gold':
        return <Coins className="h-5 w-5 text-yellow-500" />;
      case 'save':
        return <Bookmark className="h-5 w-5 text-blue-500" />;
      case 'standup':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      default:
        return <Zap className="h-5 w-5 text-primary" />;
    }
  };

  const getGradient = () => {
    switch (type) {
      case 'fire':
        return 'from-orange-500/20 to-red-500/20 border-orange-500/30';
      case 'gold':
        return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
      case 'save':
        return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
      case 'standup':
        return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
      default:
        return 'from-primary/20 to-purple-500/20 border-primary/30';
    }
  };

  return (
    <div
      className={cn(
        "fixed top-20 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg",
        "bg-gradient-to-r border shadow-lg backdrop-blur-sm",
        "transition-all duration-300 ease-out",
        getGradient(),
        isVisible && !isExiting
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0"
      )}
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex flex-col">
        <span className="font-bold text-lg text-primary">
          +{xpAmount} XP
        </span>
        <span className="text-xs text-muted-foreground">
          {reason}
        </span>
      </div>

      {/* Animated sparkles */}
      <div className="absolute -top-1 -right-1">
        <span className="animate-ping absolute h-3 w-3 rounded-full bg-primary/50" />
        <span className="relative flex h-3 w-3 rounded-full bg-primary" />
      </div>
    </div>
  );
}

// Hook to manage XP notifications
import { useCallback, useRef } from 'react';

interface XpNotificationData {
  id: string;
  xpAmount: number;
  reason: string;
  type: 'fire' | 'gold' | 'save' | 'content' | 'standup';
}

export function useXpNotifications() {
  const [notifications, setNotifications] = useState<XpNotificationData[]>([]);
  const idCounter = useRef(0);

  const showXpGain = useCallback((
    xpAmount: number, 
    reason: string, 
    type: XpNotificationData['type'] = 'content'
  ) => {
    const id = `xp-${++idCounter.current}`;
    setNotifications(prev => [...prev, { id, xpAmount, reason, type }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    showXpGain,
    removeNotification,
  };
}

// Container component to render all notifications
export function XpNotificationsContainer({ 
  notifications, 
  onRemove 
}: { 
  notifications: XpNotificationData[]; 
  onRemove: (id: string) => void;
}) {
  return (
    <>
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{ top: `${80 + index * 70}px` }}
          className="fixed right-4 z-50"
        >
          <XpNotification
            xpAmount={notification.xpAmount}
            reason={notification.reason}
            type={notification.type}
            onComplete={() => onRemove(notification.id)}
          />
        </div>
      ))}
    </>
  );
}
