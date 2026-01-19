/**
 * New Submissions Widget
 * 
 * Shows enrollments with bookings created in the last 7 days.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Inbox, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import type { NewEnrollmentSubmission } from '@/hooks/queries/useReviewerDashboard';
import { formatDistanceToNow } from 'date-fns';

interface NewSubmissionsWidgetProps {
  items: NewEnrollmentSubmission[];
  isLoading: boolean;
}

export function NewSubmissionsWidget({ items, isLoading }: NewSubmissionsWidgetProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">New Submissions</CardTitle>
          </div>
          <CardDescription>Bookings from the last 7 days</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">New Submissions</CardTitle>
          </div>
          <CardDescription>Bookings from the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No new submissions in the last 7 days</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">New Submissions</CardTitle>
          <Badge variant="secondary" className="ml-auto">
            {items.length} new
          </Badge>
        </div>
        <CardDescription>Bookings from the last 7 days</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.bookingId}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{item.providerName}</p>
                <Badge variant="outline" className="text-xs shrink-0">
                  New
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {item.industryName} • {item.expertiseLevelName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/reviewer/enrollment/${item.enrollmentId}`)}
              className="shrink-0 ml-2"
            >
              Review
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
