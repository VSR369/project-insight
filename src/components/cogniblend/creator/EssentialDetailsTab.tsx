/**
 * EssentialDetailsTab — Tab 1 of Challenge Creator Form.
 * Governance-aware field visibility via fieldRules.
 * Industry segment elevated to config panel — not rendered here.
 */

import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { useSolutionMaturityList } from '@/hooks/queries/useSolutionMaturity';
import type { GovernanceMode } from '@/lib/governanceMode';
import { isFieldVisible, isFieldRequired, type FieldRulesMap } from '@/hooks/queries/useGovernanceFieldRules';
import { EssentialFieldRenderers } from './EssentialFieldRenderers';

interface EssentialDetailsTabProps {
  engagementModel: string;
  industrySegments: Array<{ id: string; name: string }>;
  governanceMode: GovernanceMode;
  fieldRules?: FieldRulesMap;
}

export function EssentialDetailsTab({ engagementModel, industrySegments, governanceMode, fieldRules }: EssentialDetailsTabProps) {
  const { control, register, setValue, formState: { errors } } = useFormContext();
  const isMPBudgetRequired = engagementModel === 'MP';
  const rules = fieldRules ?? {};
  const showScope = isFieldVisible(rules, 'scope');
  const showHook = isFieldVisible(rules, 'hook');
  const { data: maturityOptions = [], isLoading: maturityLoading } = useSolutionMaturityList();

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">Challenge Title <span className="text-destructive">*</span></Label>
        <Input id="title" placeholder="Short, descriptive title for your challenge" className="text-base" {...register('title')} />
        {errors.title?.message && <p className="text-xs text-destructive">{String(errors.title.message)}</p>}
      </div>

      {/* Hook (CONTROLLED only) */}
      {showHook && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            One-Line Summary {isFieldRequired(rules, 'hook') && <span className="text-destructive">*</span>}
          </Label>
          <Input placeholder="Elevator pitch — max 300 chars" className="text-base" maxLength={300} {...register('hook')} />
          {errors.hook?.message && <p className="text-xs text-destructive">{String(errors.hook.message)}</p>}
        </div>
      )}

      {/* Problem Statement */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Problem Statement <span className="text-destructive">*</span></Label>
        <p className="text-xs text-muted-foreground">Describe your business problem in detail — what's happening, what impact it has.</p>
        <Controller name="problem_statement" control={control} render={({ field }) => (
          <RichTextEditor value={field.value} onChange={field.onChange} placeholder="Describe the problem clearly..." />
        )} />
        {errors.problem_statement?.message && <p className="text-xs text-destructive">{String(errors.problem_statement.message)}</p>}
      </div>

      {/* Scope */}
      {showScope && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Scope <span className="text-destructive">*</span></Label>
          <p className="text-xs text-muted-foreground">What should solvers address? What should they NOT touch?</p>
          <Controller name="scope" control={control} render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} placeholder="Define the boundaries of this challenge..." />
          )} />
          {errors.scope?.message && <p className="text-xs text-destructive">{String(errors.scope.message)}</p>}
        </div>
      )}

      {/* Maturity, Domain Tags, Budget, IP Model, Weighted Criteria */}
      <EssentialFieldRenderers
        control={control}
        register={register}
        setValue={setValue}
        errors={errors}
        maturityOptions={maturityOptions}
        maturityLoading={maturityLoading}
        industrySegments={industrySegments}
        fieldRules={fieldRules}
        isMPBudgetRequired={isMPBudgetRequired}
        governanceMode={governanceMode}
      />
    </div>
  );
}
