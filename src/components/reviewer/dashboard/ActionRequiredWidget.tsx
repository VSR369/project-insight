/**
 * Action Required Widget
 * 
 * Shows enrollments that need reviewer attention:
 * - Flagged for clarification
 * - Have reviewer notes
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import type { ActionRequiredEnrollment } from '@/hooks/queries/useReviewerDashboard';
import { format } from 'date-fns';

interface ActionRequiredWidgetProps {
  items: ActionRequiredEnrollment[];
  isLoading: boolean;
}

export function ActionRequiredWidget({ items, isLoading }: ActionRequiredWidgetProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="border-warning/50 bg-warning/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <CardTitle className="text-lg">Action Required</CardTitle>
          </div>
          <CardDescription>Enrollments needing your attention</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return null; // Hide widget when no action required
  }

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <CardTitle className="text-lg">Action Required</CardTitle>
          <Badge variant="destructive" className="ml-auto">
            {items.length}
          </Badge>
        </div>
        <CardDescription>Enrollments needing your attention</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.bookingId}
            className="flex items-center justify-between p-3 bg-background rounded-lg border"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{item.providerName}</p>
                {item.flagForClarification && (
                  <Badge variant="outline" className="text-warning border-warning shrink-0">
                    Clarification
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {item.industryName} • {item.expertiseLevelName}
              </p>
              <p className="text-xs text-muted-foreground">
                Scheduled: {format(new Date(item.scheduledAt), 'MMM d, yyyy')}
              </p>
            </div>
            <Button
              size="sm"
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
