import { useEffect } from 'react';
import { ReviewerLayout } from '@/components/reviewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Users, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { logInfo } from '@/lib/errorHandler';

// Dashboard components
import {
  ActionRequiredWidget,
  DashboardStatsCards,
  NewSubmissionsWidget,
  ReviewerProfileHeader,
  UpcomingInterviewsList,
} from '@/components/reviewer/dashboard';

// Hooks
import { useCurrentReviewer } from '@/hooks/queries/useReviewerAvailability';
import {
  useReviewerDashboardStats,
  useReviewerUpcomingInterviews,
  useActionRequiredEnrollments,
  useNewEnrollmentSubmissions,
} from '@/hooks/queries/useReviewerDashboard';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';

export default function ReviewerDashboard() {
  const navigate = useNavigate();

  // Fetch current reviewer profile
  const { 
    data: reviewer, 
    isLoading: reviewerLoading, 
    error: reviewerError 
  } = useCurrentReviewer();

  // Fetch industry segments for name lookup
  const { data: industries } = useIndustrySegments();

  // Resolve reviewer's industry names from IDs
  const industryNames = reviewer?.industry_segment_ids
    ?.map((id) => industries?.find((i) => i.id === id)?.name)
    .filter(Boolean) as string[] || [];

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading, error: statsError } = useReviewerDashboardStats(reviewer?.id);
  const { data: upcomingInterviews, isLoading: interviewsLoading, error: interviewsError } = useReviewerUpcomingInterviews(reviewer?.id, 5);
  const { data: actionRequired, isLoading: actionLoading, error: actionError } = useActionRequiredEnrollments(reviewer?.id, 5);
  const { data: newSubmissions, isLoading: submissionsLoading, error: submissionsError } = useNewEnrollmentSubmissions(reviewer?.id, 5);

  // Aggregate dashboard data errors
  const dashboardDataError = statsError || interviewsError || actionError || submissionsError;

  // Debug logging for dashboard state
  useEffect(() => {
    if (reviewer && !reviewerLoading) {
      logInfo("ReviewerDashboard: render state", {
        operation: "dashboard_render",
        component: "ReviewerDashboard",
        additionalData: {
          reviewerId: reviewer.id,
          reviewerName: reviewer.name,
          reviewerEmail: reviewer.email,
          industrySegmentIds: reviewer.industry_segment_ids,
          expertiseLevelIds: reviewer.expertise_level_ids,
          industryNames,
          isActive: reviewer.is_active,
        },
      });
    }
  }, [reviewer, reviewerLoading, industryNames]);

  useEffect(() => {
    if (!statsLoading && !interviewsLoading && !actionLoading && !submissionsLoading) {
      logInfo("ReviewerDashboard: data loaded", {
        operation: "dashboard_data_loaded",
        component: "ReviewerDashboard",
        additionalData: {
          reviewerId: reviewer?.id,
          stats: stats ? {
            total: stats.totalEnrollments,
            new: stats.newSubmissions,
            action: stats.actionRequired,
            upcoming: stats.upcomingInterviews,
          } : null,
          upcomingInterviewsCount: upcomingInterviews?.length || 0,
          upcomingInterviews: upcomingInterviews?.map((i) => ({
            bookingId: i.bookingId,
            industry: i.industryName,
            provider: i.providerName,
            startAt: i.startAt,
          })),
          actionRequiredCount: actionRequired?.length || 0,
          newSubmissionsCount: newSubmissions?.length || 0,
        },
      });
    }
  }, [reviewer, stats, statsLoading, upcomingInterviews, interviewsLoading, actionRequired, actionLoading, newSubmissions, submissionsLoading]);

  // Handle error states
  if (reviewerError) {
    const errorMessage = reviewerError.message;
    
    if (errorMessage === 'NOT_AUTHENTICATED') {
      return (
        <ReviewerLayout>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
              Please log in to access the reviewer dashboard.
            </AlertDescription>
          </Alert>
        </ReviewerLayout>
      );
    }

    if (errorMessage === 'NOT_A_REVIEWER') {
      return (
        <ReviewerLayout>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You are not registered as a panel reviewer. Please contact an administrator if you believe this is an error.
            </AlertDescription>
          </Alert>
        </ReviewerLayout>
      );
    }

    if (errorMessage === 'REVIEWER_INACTIVE') {
      return (
        <ReviewerLayout>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Account Inactive</AlertTitle>
            <AlertDescription>
              Your reviewer account is currently inactive. Please contact an administrator.
            </AlertDescription>
          </Alert>
        </ReviewerLayout>
      );
    }

    return (
      <ReviewerLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Unable to load dashboard: {errorMessage}
          </AlertDescription>
        </Alert>
      </ReviewerLayout>
    );
  }

  return (
    <ReviewerLayout>
      <div className="space-y-6">
        {/* Welcome Section with Profile Header */}
        <ReviewerProfileHeader
          reviewer={reviewer}
          industryNames={industryNames}
          isLoading={reviewerLoading}
        />

        {/* Dashboard Data Error Alert */}
        {dashboardDataError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Unable to Load Dashboard Data</AlertTitle>
            <AlertDescription>
              Some dashboard data could not be loaded: {dashboardDataError.message}
              <br />
              <span className="text-xs text-muted-foreground">
                Please try refreshing the page. If the issue persists, contact support.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid - Enrollment-centric KPIs */}
        <DashboardStatsCards stats={stats} isLoading={statsLoading} />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Action Required Widget - High Priority */}
            <ActionRequiredWidget
              items={actionRequired || []}
              isLoading={actionLoading}
            />

            {/* Upcoming Interviews */}
            <UpcomingInterviewsList
              interviews={upcomingInterviews || []}
              isLoading={interviewsLoading}
              onViewAll={() => navigate('/reviewer/interviews')}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* New Submissions */}
            <NewSubmissionsWidget
              items={newSubmissions || []}
              isLoading={submissionsLoading}
            />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/reviewer/availability')}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Manage Availability
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/reviewer/enrollments')}
                >
                  <Users className="mr-2 h-4 w-4" />
                  View All Enrollments
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/reviewer/settings')}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Update Preferences
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ReviewerLayout>
  );
}
