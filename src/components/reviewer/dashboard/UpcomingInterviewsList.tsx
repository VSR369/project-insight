/**
 * Upcoming Interviews List
 * 
 * Shows the reviewer's upcoming scheduled interviews with enrollment context.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import type { UpcomingInterview } from '@/hooks/queries/useReviewerDashboard';
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';

interface UpcomingInterviewsListProps {
  interviews: UpcomingInterview[];
  isLoading: boolean;
  onViewAll?: () => void;
}

function getDateLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

function getTimeRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
}

export function UpcomingInterviewsList({ 
  interviews, 
  isLoading, 
  onViewAll 
}: UpcomingInterviewsListProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Interviews
          </CardTitle>
          <CardDescription>Your scheduled interviews</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Upcoming Interviews
        </CardTitle>
        <CardDescription>Your scheduled interviews</CardDescription>
      </CardHeader>
      <CardContent>
        {interviews.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No upcoming interviews scheduled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {interviews.map((interview) => {
              const startDate = new Date(interview.startAt);
              const isUpcoming = isToday(startDate) || isTomorrow(startDate);

              return (
                <div
                  key={interview.bookingId}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isUpcoming ? 'bg-primary/5 border-primary/30' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{interview.providerName}</p>
                      {isToday(startDate) && (
                        <Badge variant="default" className="shrink-0">
                          Today
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {interview.industryName} • {interview.expertiseLevelName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      <span>{getDateLabel(startDate)}</span>
                      <span>•</span>
                      <span>{getTimeRange(interview.startAt, interview.endAt)}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/reviewer/candidates/${interview.enrollmentId}`)}
                    className="shrink-0 ml-2"
                  >
                    View
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {onViewAll && (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={onViewAll}
          >
            View All Interviews
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
