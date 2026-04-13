/**
 * ProfileCompletionBar
 * 
 * Compact sidebar widget showing profile strength progress with milestone label.
 */

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, ChevronRight } from 'lucide-react';
import { useProviderProfileExtended } from '@/hooks/queries/useProviderProfile';
import { computeProfileStrength, getStrengthMotivation } from '@/services/enrollment/profileStrengthService';
import { cn } from '@/lib/utils';

interface ProfileCompletionBarProps {
  providerId: string;
  className?: string;
  onViewDetails?: () => void;
}

function deriveFields(profile: ReturnType<typeof useProviderProfileExtended>['data']) {
  if (!profile) return null;
  return {
    hasName: !!(profile.first_name && profile.last_name),
    hasBio: !!profile.bio_tagline,
    hasPhone: !!profile.phone,
    hasLinks: !!(profile.linkedin_url || profile.portfolio_url),
    hasAvatar: !!profile.avatar_url,
    hasAvailability: !!profile.availability,
    hasExpertiseLevel: !!profile.expertise_level_id,
    hasIndustrySegment: !!profile.industry_segment_id,
    hasSpecialities: false, // TODO: wire when specialities hook ready
    hasSolutionTypes: false,
    hasProofPoints: false,
    hasPassedAssessment: false,
  };
}

const strengthColor = (pct: number): string => {
  if (pct >= 85) return 'text-green-600';
  if (pct >= 60) return 'text-blue-600';
  if (pct >= 40) return 'text-amber-600';
  return 'text-muted-foreground';
};

export function ProfileCompletionBar({ providerId, className, onViewDetails }: ProfileCompletionBarProps) {
  const { data: profile, isLoading } = useProviderProfileExtended(providerId);

  if (isLoading) {
    return (
      <div className={cn('space-y-2 p-3 rounded-lg bg-muted/30', className)}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    );
  }

  const fields = deriveFields(profile);
  if (!fields) return null;

  const result = computeProfileStrength(fields);
  const motivation = getStrengthMotivation(result.strength);

  return (
    <div className={cn('space-y-2 p-3 rounded-lg border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">Profile Strength</span>
        </div>
        <span className={cn('text-xs font-bold', strengthColor(result.strength))}>
          {result.strength}%
        </span>
      </div>

      {/* Progress bar */}
      <Progress value={result.strength} className="h-1.5" />

      {/* Milestone label */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
          {result.milestoneLabel}
        </Badge>
        {result.nextMilestoneLabel && (
          <span className="text-[9px] text-muted-foreground">
            Next: {result.nextMilestoneLabel}
          </span>
        )}
      </div>

      {/* Top missing item + motivation */}
      {result.missingItems.length > 0 && (
        <p className="text-[10px] text-muted-foreground leading-tight">
          {motivation}
        </p>
      )}

      {/* View details link */}
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="flex items-center gap-0.5 text-[10px] text-primary hover:underline"
        >
          View details <ChevronRight className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}
