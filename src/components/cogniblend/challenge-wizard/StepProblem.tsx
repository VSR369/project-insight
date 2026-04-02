/**
 * Step 1 — Challenge Brief
 *
 * Orchestrates three field groups:
 *   - CoreFields: title, hook, description, industry, countries
 *   - ContentFields: context, problem statement, scope, deliverables, stakeholders
 *   - ClassificationFields: line-items, domain tags, taxonomy, maturity
 */

import { UseFormReturn } from 'react-hook-form';
import { useTaxonomySuggestions } from '@/hooks/cogniblend/useTaxonomySuggestions';
import { useIndustrySegmentOptions } from '@/hooks/queries/useTaxonomySelectors';
import { useCountries } from '@/hooks/queries/useMasterData';
import { useSolutionMaturityList } from '@/hooks/queries/useSolutionMaturity';
import { StepProblemCoreFields } from './StepProblemCoreFields';
import { StepProblemContentFields } from './StepProblemContentFields';
import { StepProblemClassificationFields } from './StepProblemClassificationFields';
import type { ChallengeFormValues } from './challengeFormSchema';

/* ─── Props ──────────────────────────────────────────────── */

interface StepProblemProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isQuick: boolean;
  fieldRules?: Record<string, { visibility: string; minLength: number | null; maxLength: number | null; defaultValue: string | null }>;
}

/* ─── Component ──────────────────────────────────────────── */

export function StepProblem({ form, mandatoryFields, isQuick }: StepProblemProps) {
  // Master data hooks
  const { data: industrySegments = [], isLoading: loadingSegments } = useIndustrySegmentOptions();
  const { data: countriesList = [], isLoading: loadingCountries } = useCountries();
  const { data: maturityOptions = [], isLoading: loadingMaturity } = useSolutionMaturityList();

  const problemStatement = form.watch('problem_statement') ?? '';
  const { suggestions: taxonomySuggestions } = useTaxonomySuggestions(problemStatement);

  return (
    <div className="space-y-6">
      <StepProblemCoreFields
        form={form}
        isQuick={isQuick}
        industrySegments={industrySegments}
        loadingSegments={loadingSegments}
        countriesList={countriesList}
        loadingCountries={loadingCountries}
      />

      <StepProblemContentFields
        form={form}
        mandatoryFields={mandatoryFields}
        isQuick={isQuick}
      />

      <StepProblemClassificationFields
        form={form}
        mandatoryFields={mandatoryFields}
        isQuick={isQuick}
        maturityOptions={maturityOptions}
        loadingMaturity={loadingMaturity}
        taxonomySuggestions={taxonomySuggestions}
      />
    </div>
  );
}
