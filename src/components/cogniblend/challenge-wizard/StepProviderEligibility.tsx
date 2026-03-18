/**
 * Step 5 — Provider Eligibility
 * Moved from StepTimeline: publication config + targeting filters
 */

import { UseFormReturn } from 'react-hook-form';
import type { ChallengeFormValues } from './challengeFormSchema';
import { TargetingFiltersSection, EMPTY_TARGETING_FILTERS } from '@/components/cogniblend/publication/TargetingFiltersSection';
import type { TargetingFilters } from '@/components/cogniblend/publication/TargetingFiltersSection';

interface StepProviderEligibilityProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isLightweight: boolean;
}

export function StepProviderEligibility({ form, isLightweight }: StepProviderEligibilityProps) {
  const { watch, setValue } = form;

  const currentFilters = (watch('targeting_filters') ?? EMPTY_TARGETING_FILTERS) as TargetingFilters;

  const handleFiltersChange = (filters: TargetingFilters) => {
    setValue('targeting_filters', filters, { shouldDirty: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground mb-1">Provider Eligibility & Targeting</h3>
        <p className="text-sm text-muted-foreground">
          Define which solution providers can discover, enroll in, and submit to this challenge.
        </p>
      </div>

      {!isLightweight && (
        <TargetingFiltersSection
          value={currentFilters}
          onChange={handleFiltersChange}
          isLightweight={isLightweight}
        />
      )}

      {isLightweight && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Lightweight governance uses open enrollment by default. Upgrade to Enterprise for advanced targeting filters.
          </p>
        </div>
      )}
    </div>
  );
}
