/**
 * Reviewer Profile Header
 * 
 * Shows welcome message with reviewer name, specialties, and timezone.
 */

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tables } from '@/integrations/supabase/types';

interface ReviewerProfileHeaderProps {
  reviewer: Tables<'panel_reviewers'> | undefined;
  industryNames: string[];
  isLoading: boolean;
}

export function ReviewerProfileHeader({ 
  reviewer, 
  industryNames, 
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
        <span className="text-sm">Panel Reviewer</span>
        {industryNames.length > 0 && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <div className="flex flex-wrap gap-1">
              {industryNames.map((name) => (
                <Badge key={name} variant="secondary" className="text-xs">
                  {name}
                </Badge>
              ))}
            </div>
          </>
        )}
        <span className="text-muted-foreground/50">•</span>
        <span className="text-sm">{displayTimezone}</span>
      </div>
    </div>
  );
}
