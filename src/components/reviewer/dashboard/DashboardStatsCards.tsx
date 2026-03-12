/**
 * Dashboard Stats Cards
 * 
 * KPI cards showing enrollment-centric reviewer statistics.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Users, AlertTriangle } from 'lucide-react';
import type { ReviewerDashboardStats } from '@/hooks/queries/useReviewerDashboard';

interface DashboardStatsCardsProps {
  stats: ReviewerDashboardStats | undefined;
  isLoading: boolean;
}

export function DashboardStatsCards({ stats, isLoading }: DashboardStatsCardsProps) {
  const statItems = [
    {
      title: 'Upcoming Interviews',
      value: stats?.upcomingInterviews ?? 0,
      description: 'Scheduled with you',
      icon: Calendar,
      colorClass: 'text-primary',
    },
    {
      title: 'New Submissions',
      value: stats?.newSubmissions ?? 0,
      description: 'In the last 7 days',
      icon: Clock,
      colorClass: 'text-blue-500',
    },
    {
      title: 'Action Required',
      value: stats?.actionRequired ?? 0,
      description: 'Needs your attention',
      icon: AlertTriangle,
      colorClass: 'text-warning',
    },
    {
      title: 'Total Enrollments',
      value: stats?.totalEnrollments ?? 0,
      description: 'Assigned to you',
      icon: Users,
      colorClass: 'text-green-500',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.colorClass}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
