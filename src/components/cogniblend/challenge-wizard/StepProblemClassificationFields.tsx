/**
 * StepProblem — Classification Fields (LineItems, Domain Tags, Taxonomy Tags, Maturity Level)
 * Extracted from StepProblem.tsx for decomposition.
 */

import { UseFormReturn, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineItemsInput } from './LineItemsInput';
import { DomainTagSelect, MaturityRadioCards } from './StepProblemSubComponents';
import type { ChallengeFormValues } from './challengeFormSchema';

interface StepProblemClassificationFieldsProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isQuick: boolean;
  maturityOptions: Array<{ id: string; code: string; label: string; description: string | null }>;
  loadingMaturity: boolean;
  taxonomySuggestions: Array<{ tag: string; source: string }>;
}

export function StepProblemClassificationFields({
  form, mandatoryFields, isQuick, maturityOptions, loadingMaturity, taxonomySuggestions,
}: StepProblemClassificationFieldsProps) {
  const { register, formState: { errors }, control, setValue } = form;
  const isRequired = (field: string) => mandatoryFields.includes(field);

  return (
    <>
      {/* ── 7. Root Causes ── */}
      {!isQuick && (
        <Controller name="root_causes" control={control} render={({ field }) => (
          <LineItemsInput
            value={Array.isArray(field.value) ? field.value : ['']}
            onChange={field.onChange}
            label={`Root Causes${isRequired('root_causes') ? '' : ' (optional)'}`}
            placeholder="Identify an underlying root cause..."
            addLabel="Add Root Cause"
            error={(errors as any).root_causes?.message}
          />
        )} />
      )}

      {/* ── 11. Current Deficiencies ── */}
      {!isQuick && (
        <Controller name="current_deficiencies" control={control} render={({ field }) => (
          <LineItemsInput
            value={Array.isArray(field.value) ? field.value : ['']}
            onChange={field.onChange}
            label={`Current Deficiencies${isRequired('current_deficiencies') ? '' : ' (optional)'}`}
            placeholder="Describe a gap in current solutions..."
            addLabel="Add Deficiency"
            error={(errors as any).current_deficiencies?.message}
          />
        )} />
      )}

      {/* ── 12. Expected Outcomes ── */}
      <Controller name="expected_outcomes" control={control} render={({ field }) => (
        <LineItemsInput
          value={Array.isArray(field.value) ? field.value : ['']}
          onChange={field.onChange}
          label="Expected Outcomes"
          placeholder="What outcome do you expect?"
          addLabel="Add Outcome"
        />
      )} />

      {/* ── 13. Preferred Approach ── */}
      {!isQuick && (
        <Controller name="preferred_approach" control={control} render={({ field }) => (
          <LineItemsInput
            value={Array.isArray(field.value) ? field.value : ['']}
            onChange={field.onChange}
            label="Preferred Approach (optional)"
            placeholder="Describe a preferred methodology..."
            addLabel="Add Approach"
          />
        )} />
      )}

      {/* ── 14. Approaches NOT of Interest ── */}
      {!isQuick && (
        <Controller name="approaches_not_of_interest" control={control} render={({ field }) => (
          <LineItemsInput
            value={Array.isArray(field.value) ? field.value : ['']}
            onChange={field.onChange}
            label="Approaches NOT of Interest (optional)"
            placeholder="Describe an approach that should NOT be submitted..."
            addLabel="Add Excluded Approach"
          />
        )} />
      )}

      {/* ── 15. Submission Guidelines ── */}
      <Controller name="submission_guidelines" control={control} render={({ field }) => (
        <LineItemsInput
          value={Array.isArray(field.value) ? field.value : ['']}
          onChange={field.onChange}
          label="Submission Guidelines"
          placeholder="Specific instruction for solvers..."
          addLabel="Add Guideline"
        />
      )} />

      {/* ── 16. Domain Tags ── */}
      <Controller name="domain_tags" control={control} render={({ field }) => (
        <DomainTagSelect value={field.value} onChange={field.onChange} error={errors.domain_tags?.message} taxonomySuggestions={taxonomySuggestions} />
      )} />

      {/* ── 16b. Taxonomy Tags ── */}
      <div className="space-y-1.5">
        <Label htmlFor="taxonomy_tags" className="text-sm font-medium">
          Taxonomy Tags <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <Input id="taxonomy_tags" placeholder="Comma-separated taxonomy tags, e.g. SAP, ERP, Cloud Migration" className="text-base" {...register('taxonomy_tags')} />
        <p className="text-xs text-muted-foreground">Used for advanced classification and search indexing</p>
      </div>

      {/* ── 17. Solution Maturity Level ── */}
      <Controller name="maturity_level" control={control} render={({ field }) => (
        <MaturityRadioCards
          value={field.value}
          onChange={(code, id) => { field.onChange(code); setValue('solution_maturity_id', id); }}
          error={errors.maturity_level?.message}
          options={maturityOptions}
          loading={loadingMaturity}
        />
      )} />
    </>
  );
}
