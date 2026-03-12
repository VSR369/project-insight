/**
 * Slot Details Card
 * 
 * Displays the provider's booked interview slot details
 * with dual timezone display.
 */

import { Calendar, Clock, Globe, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatInTimezone, getUserTimezone } from "@/components/interview/TimeZoneSelector";
import { addMinutes } from "date-fns";

interface SlotDetailsCardProps {
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  reviewerTimezone: string;
  providerTimezone: string | null;
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    scheduled: { label: 'Awaiting Your Response', variant: 'secondary' },
    confirmed: { label: 'Accepted', variant: 'default' },
    declined_poor_credentials: { label: 'Declined', variant: 'destructive' },
    cancelled: { label: 'Cancelled', variant: 'outline' },
  };
  
  const config = statusConfig[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function SlotDetailsCard({
  scheduledAt,
  durationMinutes,
  status,
  reviewerTimezone,
  providerTimezone,
}: SlotDetailsCardProps) {
  const startDate = new Date(scheduledAt);
  const endDate = addMinutes(startDate, durationMinutes);
  
  // Use browser-detected timezone as fallback for provider
  const effectiveProviderTimezone = providerTimezone || getUserTimezone();
  
  // Format for reviewer timezone
  const reviewerDate = formatInTimezone(startDate, reviewerTimezone, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  
  const reviewerStartTime = formatInTimezone(startDate, reviewerTimezone, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const reviewerEndTime = formatInTimezone(endDate, reviewerTimezone, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  // Get short timezone name for reviewer
  const reviewerTzShort = formatInTimezone(startDate, reviewerTimezone, {
    timeZoneName: 'short',
  }).split(', ').pop() || reviewerTimezone;
  
  // Format for provider timezone
  const providerStartTime = formatInTimezone(startDate, effectiveProviderTimezone, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const providerEndTime = formatInTimezone(endDate, effectiveProviderTimezone, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  // Get short timezone name for provider
  const providerTzShort = formatInTimezone(startDate, effectiveProviderTimezone, {
    timeZoneName: 'short',
  }).split(', ').pop() || effectiveProviderTimezone;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Provider Selected Slot
          </CardTitle>
          {getStatusBadge(status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Times shown in {reviewerTzShort} (your timezone)
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/30">
          {/* Date */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Date
            </div>
            <p className="font-medium">{reviewerDate}</p>
          </div>
          
          {/* Time (Reviewer TZ) */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Time (Your Timezone)
            </div>
            <p className="font-medium">
              {reviewerStartTime}-{reviewerEndTime} {reviewerTzShort}
            </p>
          </div>
          
          {/* Provider's Local Time */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              Provider's Local Time
            </div>
            <p className="font-medium text-muted-foreground">
              {providerStartTime}-{providerEndTime} ({providerTzShort})
            </p>
          </div>
          
          {/* Duration */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Video className="h-3 w-3" />
              Duration
            </div>
            <p className="font-medium">{durationMinutes} mins</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
