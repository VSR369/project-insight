import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, List, Clock, User, Building2, Filter } from 'lucide-react';
import { ReviewerLayout } from '@/components/reviewer/ReviewerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useReviewerUpcomingInterviews } from '@/hooks/queries/useReviewerDashboard';
import { useReviewerByUserId } from '@/hooks/queries/usePanelReviewers';
import { useAuth } from '@/hooks/useAuth';

type StatusFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';

export default function ReviewerInterviews() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: reviewer } = useReviewerByUserId(user?.id);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  const { data: interviews, isLoading } = useReviewerUpcomingInterviews(reviewer?.id, 50);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Scheduled</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInterviews = interviews?.filter(interview => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'upcoming') return interview.bookingStatus === 'scheduled';
    if (statusFilter === 'completed') return interview.bookingStatus === 'completed';
    if (statusFilter === 'cancelled') return interview.bookingStatus === 'cancelled';
    return true;
  }) || [];

  return (
    <ReviewerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Interviews</h1>
            <p className="text-muted-foreground">
              View and manage your scheduled interviews
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Interviews</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-3 w-[150px]" />
                        </div>
                        <Skeleton className="h-8 w-[80px]" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredInterviews.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No interviews found</h3>
                  <p className="text-muted-foreground">
                    {statusFilter === 'all' 
                      ? "You don't have any scheduled interviews yet."
                      : `No ${statusFilter} interviews found.`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredInterviews.map((interview) => (
                  <Card key={interview.bookingId} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{interview.providerName}</span>
                            {getStatusBadge(interview.bookingStatus)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              <span>{interview.industryName}</span>
                            </div>
                            <span>•</span>
                            <span>{interview.expertiseLevelName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {format(new Date(interview.scheduledAt), 'EEEE, MMMM d, yyyy')} at{' '}
                              {format(new Date(interview.scheduledAt), 'h:mm a')}
                            </span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/reviewer/candidates/${interview.enrollmentId}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Calendar View</CardTitle>
                <CardDescription>
                  View your interviews in a calendar format
                </CardDescription>
              </CardHeader>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Calendar view coming soon. Use the list view to see your scheduled interviews.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ReviewerLayout>
  );
}
