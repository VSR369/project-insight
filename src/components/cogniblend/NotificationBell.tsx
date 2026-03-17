import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface CogniNotification {
  id: string;
  user_id: string;
  challenge_id: string | null;
  notification_type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  SLA_BREACH: '#E24B4A',
  SLA_WARNING: '#BA7517',
  PHASE_COMPLETE: '#3B82F6',
  WAITING_FOR_YOU: '#3B82F6',
  ROLE_ASSIGNED: '#1D9E75',
  ROLE_REASSIGNED: '#1D9E75',
  AMENDMENT_NOTICE: '#8B5CF6',
  sla_breach: '#E24B4A',
  sla_breach_admin: '#E24B4A',
};

function getBorderColor(type: string): string {
  return TYPE_COLORS[type] || '#94A3B8';
}

export default function NotificationBell() {
  // ══════════════════════════════════════
  // SECTION 1: useState
  // ══════════════════════════════════════
  const [isOpen, setIsOpen] = useState(false);

  // ══════════════════════════════════════
  // SECTION 2: Context and refs
  // ══════════════════════════════════════
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ══════════════════════════════════════
  // SECTION 3: Query hooks
  // ══════════════════════════════════════
  const { data: notifications = [] } = useQuery<CogniNotification[]>({
    queryKey: ['cogni-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('cogni_notifications')
        .select('id, user_id, challenge_id, notification_type, title, message, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as CogniNotification[];
    },
    enabled: !!user?.id,
    staleTime: 10_000,
  });

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ['cogni-unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await supabase.rpc('get_unread_count', {
        p_user_id: user.id,
      });
      if (error) throw new Error(error.message);
      return (data as number) ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 10_000,
  });

  // ══════════════════════════════════════
  // SECTION 4: useEffect
  // ══════════════════════════════════════

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`cogni_notifs_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cogni_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as CogniNotification;

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['cogni-notifications', user.id] });
          queryClient.invalidateQueries({ queryKey: ['cogni-unread-count', user.id] });

          // Show toast
          toast(newNotif.title, {
            description: newNotif.message?.slice(0, 80) || undefined,
            action: newNotif.challenge_id
              ? {
                  label: 'View',
                  onClick: () => navigate(`/org/challenges/${newNotif.challenge_id}`),
                }
              : undefined,
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, navigate]);

  // ══════════════════════════════════════
  // SECTION 5: Handlers
  // ══════════════════════════════════════
  const handleMarkRead = useCallback(
    async (notifId: string, challengeId: string | null) => {
      await supabase.rpc('mark_notification_read', { p_notification_id: notifId });
      queryClient.invalidateQueries({ queryKey: ['cogni-notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['cogni-unread-count', user?.id] });
      if (challengeId) {
        setIsOpen(false);
        navigate(`/org/challenges/${challengeId}`);
      }
    },
    [user?.id, queryClient, navigate]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!user?.id) return;
    await supabase.rpc('mark_all_read', { p_user_id: user.id });
    queryClient.invalidateQueries({ queryKey: ['cogni-notifications', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['cogni-unread-count', user?.id] });
  }, [user?.id, queryClient]);

  // ══════════════════════════════════════
  // SECTION 6: Render
  // ══════════════════════════════════════
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-lg transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={20} className="text-muted-foreground" />
        {unreadCount > 0 && (
          <span
            className="absolute flex items-center justify-center rounded-full text-white font-bold"
            style={{
              top: 4,
              right: 4,
              width: 14,
              height: 14,
              fontSize: 10,
              lineHeight: 1,
              backgroundColor: '#E24B4A',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 bg-card border border-border shadow-lg animate-scale-in z-50 overflow-hidden"
          style={{ width: 360, maxHeight: 400, borderRadius: 12 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-bold text-foreground" style={{ fontSize: 16 }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-primary hover:underline font-medium"
                style={{ fontSize: 12 }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: 350 }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell size={32} className="text-muted-foreground/40" />
                <span className="text-muted-foreground" style={{ fontSize: 14 }}>
                  No notifications
                </span>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleMarkRead(notif.id, notif.challenge_id)}
                  className="w-full text-left px-4 py-3 border-b border-border/50 transition-colors hover:bg-muted/50 cursor-pointer"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftStyle: 'solid',
                    borderLeftColor: getBorderColor(notif.notification_type),
                    backgroundColor: notif.is_read ? undefined : '#F0F7FF',
                  }}
                >
                  <div className="font-semibold text-foreground" style={{ fontSize: 13 }}>
                    {notif.title}
                  </div>
                  {notif.message && (
                    <div className="text-muted-foreground mt-0.5 line-clamp-2" style={{ fontSize: 12 }}>
                      {notif.message}
                    </div>
                  )}
                  <div className="text-muted-foreground/60 mt-1" style={{ fontSize: 11 }}>
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
