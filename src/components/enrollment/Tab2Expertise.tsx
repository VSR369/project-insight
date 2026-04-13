/**
 * Tab 2: Your Expertise
 * 
 * Expertise level selector, industry segment, solution types,
 * geographies served, and outcomes delivered.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Sparkles, Target, Globe, Trophy } from 'lucide-react';
import { ExpertiseLevelCards } from '@/components/enrollment/ExpertiseLevelCards';
import { SolutionTypesSelector } from '@/components/enrollment/SolutionTypesSelector';
import { GeographyTagSelector } from '@/components/registration/GeographyTagSelector';
import { OutcomesTagSelector } from '@/components/enrollment/OutcomesTagSelector';
import { useProviderProfileExtended, useUpdateProviderProfile } from '@/hooks/queries/useProviderProfile';
import { useProviderSolutionTypes, useSetProviderSolutionTypes } from '@/hooks/queries/useProviderSolutionTypes';
import { useActiveEnrollment, useUpdateEnrollmentDetails } from '@/hooks/queries/useProviderEnrollments';
import { cn } from '@/lib/utils';

interface Tab2ExpertiseProps {
  providerId: string;
  className?: string;
}

export function Tab2Expertise({ providerId, className }: Tab2ExpertiseProps) {
  const { data: profile, isLoading: profileLoading } = useProviderProfileExtended(providerId);
  const { data: solutionTypes, isLoading: stLoading } = useProviderSolutionTypes(providerId);
  const { data: activeEnrollment, isLoading: enrollmentLoading } = useActiveEnrollment(providerId);
  const updateProfile = useUpdateProviderProfile();
  const setSolutionTypes = useSetProviderSolutionTypes();
  const updateEnrollmentDetails = useUpdateEnrollmentDetails();

  const [selectedExpertiseId, setSelectedExpertiseId] = useState<string | null>(null);
  const [selectedSolutionTypeIds, setSelectedSolutionTypeIds] = useState<string[]>([]);
  const [selectedGeographies, setSelectedGeographies] = useState<string[]>([]);
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (profile?.expertise_level_id) {
      setSelectedExpertiseId(profile.expertise_level_id);
    }
  }, [profile]);

  useEffect(() => {
    if (solutionTypes) {
      setSelectedSolutionTypeIds(solutionTypes.map((st) => st.solution_type_id));
    }
  }, [solutionTypes]);

  useEffect(() => {
    if (activeEnrollment) {
      const enrollment = activeEnrollment as Record<string, unknown>;
      const geos = enrollment.geographies_served;
      const outcomes = enrollment.outcomes_delivered;
      if (Array.isArray(geos)) setSelectedGeographies(geos as string[]);
      if (Array.isArray(outcomes)) setSelectedOutcomes(outcomes as string[]);
    }
  }, [activeEnrollment]);

  const isLoading = profileLoading || stLoading || enrollmentLoading;
  const isSaving = updateProfile.isPending || setSolutionTypes.isPending || updateEnrollmentDetails.isPending;

  const handleExpertiseChange = (id: string) => {
    setSelectedExpertiseId(id);
    setIsDirty(true);
  };

  const handleSolutionTypesChange = (ids: string[]) => {
    setSelectedSolutionTypeIds(ids);
    setIsDirty(true);
  };

  const handleGeographiesChange = (ids: string[]) => {
    setSelectedGeographies(ids);
    setIsDirty(true);
  };

  const handleOutcomesChange = (tags: string[]) => {
    setSelectedOutcomes(tags);
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      if (selectedExpertiseId && selectedExpertiseId !== profile?.expertise_level_id) {
        await updateProfile.mutateAsync({
          providerId,
          updates: {},
        });
      }

      await setSolutionTypes.mutateAsync({
        providerId,
        solutionTypeIds: selectedSolutionTypeIds,
      });

      if (activeEnrollment?.id) {
        await updateEnrollmentDetails.mutateAsync({
          enrollmentId: activeEnrollment.id,
          updates: {
            geographies_served: selectedGeographies,
            outcomes_delivered: selectedOutcomes,
          },
        });
      }

      setIsDirty(false);
    } catch {
      // Error handled by mutation handlers
    }
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Expertise Level */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Expertise Level
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Select the level that best matches your experience
          </p>
        </CardHeader>
        <CardContent>
          <ExpertiseLevelCards
            selectedId={selectedExpertiseId}
            onSelect={handleExpertiseChange}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Solution Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Solution Types
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Select the types of solutions you can deliver (max 10)
          </p>
        </CardHeader>
        <CardContent>
          <SolutionTypesSelector
            selectedIds={selectedSolutionTypeIds}
            onChange={handleSolutionTypesChange}
            maxSelections={10}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Geographies Served */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Geographies Served
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Select the countries where you can deliver solutions
          </p>
        </CardHeader>
        <CardContent>
          <GeographyTagSelector
            value={selectedGeographies}
            onChange={handleGeographiesChange}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Outcomes Delivered */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Outcomes I Deliver
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            What outcomes can clients expect from your work? (max 10)
          </p>
        </CardHeader>
        <CardContent>
          <OutcomesTagSelector
            value={selectedOutcomes}
            onChange={handleOutcomesChange}
            maxTags={10}
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={!isDirty || isSaving} className="w-full lg:w-auto">
        {isSaving ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
        ) : (
          <><Save className="mr-2 h-4 w-4" /> Save Expertise</>
        )}
      </Button>
    </div>
  );
}
