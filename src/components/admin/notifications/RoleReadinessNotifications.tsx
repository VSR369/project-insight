/**
 * SCR-12: NOT_READY In-App Notification Drawer
 * Filtered view showing only role-readiness-related notifications.
 * BRD Ref: MOD-06, BR-AGG-005
 */

import { useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldAlert,
  Inbox,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  useAdminNotifications,
  useMarkNotificationRead,
  type AdminNotification,
} from "@/hooks/queries/useAdminNotifications";

const READINESS_TYPES = ["ROLE_NOT_READY", "ROLE_READY"] as const;
const PAGE_SIZE = 20;

interface RoleReadinessNotificationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoleReadinessNotifications({
  open,
  onOpenChange,
}: RoleReadinessNotificationsProps) {
  const [tab, setTab] = useState<"all" | "not_ready" | "ready">("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data: allNotifications = [], isLoading } = useAdminNotifications(limit);
  const markRead = useMarkNotificationRead();
  const navigate = useNavigate();

  const readinessNotifications = allNotifications.filter((n) =>
    READINESS_TYPES.includes(n.type as any)
  );

  const filtered =
    tab === "all"
      ? readinessNotifications
      : tab === "not_ready"
      ? readinessNotifications.filter((n) => n.type === "ROLE_NOT_READY")
      : readinessNotifications.filter((n) => n.type === "ROLE_READY");

  const unreadCount = readinessNotifications.filter((n) => !n.is_read).length;
  const hasMore = allNotifications.length === limit;

  const handleClick = useCallback(
    (notification: AdminNotification) => {
      if (!notification.is_read) markRead.mutate(notification.id);
      if (notification.deep_link) navigate(notification.deep_link);
    },
    [markRead, navigate]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-md flex flex-col overflow-hidden p-0">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-2 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Role Readiness Alerts
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5">
                {unreadCount}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="shrink-0 px-4 pt-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1 text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="not_ready" className="flex-1 text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                NOT_READY
              </TabsTrigger>
              <TabsTrigger value="ready" className="flex-1 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                READY
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Inbox className="h-10 w-10 mb-3" />
              <p className="text-sm font-medium">No readiness alerts</p>
              <p className="text-xs mt-1">All organizations are up-to-date</p>
            </div>
          ) : (
            <>
              <div className="divide-y">
                {filtered.map((notification) => {
                  const meta = (notification.metadata ?? {}) as Record<string, unknown>;
                  const orgName = meta.org_name as string | undefined;
                  const missingRoles = meta.missing_roles as string[] | undefined;
                  const model = meta.engagement_model as string | undefined;
                  const isNotReady = notification.type === "ROLE_NOT_READY";

                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleClick(notification)}
                      className={cn(
                        "w-full text-left p-3 border-l-4 transition-colors",
                        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isNotReady ? "border-l-destructive" : "border-l-green-500",
                        !notification.is_read && "bg-muted/30"
                      )}
                    >
                      <div className="flex gap-3">
                        {isNotReady ? (
                          <XCircle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-green-600" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm",
                              !notification.is_read && "font-semibold"
                            )}
                          >
                            {notification.title}
                          </p>
                          {orgName && (
                            <p className="text-sm font-medium mt-0.5">
                              {orgName}
                            </p>
                          )}
                          {model && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 mt-1"
                            >
                              {model}
                            </Badge>
                          )}
                          {isNotReady && missingRoles && missingRoles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {missingRoles.map((role) => (
                                <Badge
                                  key={role}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive"
                                >
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.body}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                          {notification.deep_link && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 mt-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClick(notification);
                              }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Details
                            </Button>
                          )}
                        </div>
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {hasMore && (
                <div className="p-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLimit((p) => p + PAGE_SIZE)}
                    className="w-full"
                  >
                    <Loader2 className="h-4 w-4 mr-1" />
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
