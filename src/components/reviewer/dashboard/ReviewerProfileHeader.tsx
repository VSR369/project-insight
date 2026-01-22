/**
 * Reviewer Profile Header
 * 
 * Shows welcome message with reviewer name, assigned industries (with counts), and timezone.
 * Only displays industries where the reviewer has actual enrollment assignments.
 */

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tables } from '@/integrations/supabase/types';
import type { AssignedIndustry } from '@/hooks/queries/useReviewerDashboard';

interface ReviewerProfileHeaderProps {
  reviewer: Tables<'panel_reviewers'> | undefined;
  assignedIndustries: AssignedIndustry[];
  isLoading: boolean;
}

export function ReviewerProfileHeader({ 
  reviewer, 
  assignedIndustries, 
  isLoading 
}: ReviewerProfileHeaderProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    );
  }

  const timezone = reviewer?.timezone || 'UTC';
  const displayTimezone = timezone.replace('_', ' ').replace('/', ' / ');

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">
        Welcome back, {reviewer?.name || 'Reviewer'}!
      </h1>
      <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
        <span className="text-sm">Solution Review Panel Member</span>
        {assignedIndustries.length > 0 && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <div className="flex flex-wrap gap-1">
              {assignedIndustries.map((industry) => (
                <Badge key={industry.id} variant="secondary" className="text-xs">
                  {industry.name} ({industry.enrollmentCount})
                </Badge>
              ))}
            </div>
          </>
        )}
        {assignedIndustries.length === 0 && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <span className="text-sm italic">No active assignments</span>
          </>
        )}
        <span className="text-muted-foreground/50">•</span>
        <span className="text-sm">{displayTimezone}</span>
      </div>
    </div>
  );
}
