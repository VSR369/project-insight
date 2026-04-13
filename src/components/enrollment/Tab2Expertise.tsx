/**
 * Tab 2: Your Expertise
 * 
 * Expertise level selector, industry segment, and solution types.
 * Reads from existing enrollment data and new provider_solution_types.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Sparkles, Target } from 'lucide-react';
import { ExpertiseLevelCards } from '@/components/enrollment/ExpertiseLevelCards';
import { SolutionTypesSelector } from '@/components/enrollment/SolutionTypesSelector';
import { useProviderProfileExtended, useUpdateProviderProfile } from '@/hooks/queries/useProviderProfile';
import { useProviderSolutionTypes, useSetProviderSolutionTypes } from '@/hooks/queries/useProviderSolutionTypes';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Tab2ExpertiseProps {
  providerId: string;
  className?: string;
}

export function Tab2Expertise({ providerId, className }: Tab2ExpertiseProps) {
  const { data: profile, isLoading: profileLoading } = useProviderProfileExtended(providerId);
  const { data: solutionTypes, isLoading: stLoading } = useProviderSolutionTypes(providerId);
  const updateProfile = useUpdateProviderProfile();
  const setSolutionTypes = useSetProviderSolutionTypes();

  const [selectedExpertiseId, setSelectedExpertiseId] = useState<string | null>(null);
  const [selectedSolutionTypeIds, setSelectedSolutionTypeIds] = useState<string[]>([]);
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

  const isLoading = profileLoading || stLoading;
  const isSaving = updateProfile.isPending || setSolutionTypes.isPending;

  const handleExpertiseChange = (id: string) => {
    setSelectedExpertiseId(id);
    setIsDirty(true);
  };

  const handleSolutionTypesChange = (ids: string[]) => {
    setSelectedSolutionTypeIds(ids);
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      if (selectedExpertiseId && selectedExpertiseId !== profile?.expertise_level_id) {
        await updateProfile.mutateAsync({
          providerId,
          updates: { },
        });
        // Expertise level update goes through enrollment, not direct profile update
        // This is handled by the existing enrollment wizard
      }

      await setSolutionTypes.mutateAsync({
        providerId,
        solutionTypeIds: selectedSolutionTypeIds,
      });

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
