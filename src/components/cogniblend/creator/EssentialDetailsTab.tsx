/**
 * EssentialDetailsTab — Tab 1 of Challenge Creator Form.
 * Governance-aware field visibility via fieldRules.
 * Industry segment elevated to config panel — not rendered here.
 */

import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { CreatorPhaseTimeline, type PhaseEntry } from './CreatorPhaseTimeline';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSolutionMaturityList } from '@/hooks/queries/useSolutionMaturity';
import type { GovernanceMode } from '@/lib/governanceMode';
import { isFieldVisible, isFieldRequired, type FieldRulesMap } from '@/hooks/queries/useGovernanceFieldRules';
import { EssentialFieldRenderers } from './EssentialFieldRenderers';
import { DomainTagsInput } from './DomainTagsInput';

interface EssentialDetailsTabProps {
  engagementModel: string;
  governanceMode: GovernanceMode;
  fieldRules?: FieldRulesMap;
}

export function EssentialDetailsTab({ engagementModel, governanceMode, fieldRules }: EssentialDetailsTabProps) {
  const [optionalOpen, setOptionalOpen] = useState(false);
  const { control, register, setValue, formState: { errors } } = useFormContext();
  const isMPBudgetRequired = engagementModel === 'MP';
  const rules = fieldRules ?? {};
  const showScope = isFieldVisible(rules, 'scope');
  const showHook = isFieldVisible(rules, 'hook');
  const isStructured = governanceMode === 'STRUCTURED';
  const showContextBackground = isFieldVisible(rules, 'context_background');
  const showExpectedTimeline = isFieldVisible(rules, 'expected_timeline');
  const showOptionalSection = isStructured && (showContextBackground || showExpectedTimeline);
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

      {/* Domain Tags */}
      <Controller
        name="domain_tags"
        control={control}
        render={({ field }) => (
          <DomainTagsInput
            value={(field.value as string[]) ?? []}
            onChange={field.onChange}
            error={errors.domain_tags?.message ? String(errors.domain_tags.message) : undefined}
            required
          />
        )}
      />

      {/* Maturity, Budget, IP Model, Weighted Criteria */}
      <EssentialFieldRenderers
        control={control}
        register={register}
        setValue={setValue}
        errors={errors}
        maturityOptions={maturityOptions}
        maturityLoading={maturityLoading}
        fieldRules={fieldRules}
        isMPBudgetRequired={isMPBudgetRequired}
        governanceMode={governanceMode}
      />

      {/* Collapsible optional fields for STRUCTURED mode */}
      {showOptionalSection && (
        <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-2">
            <ChevronDown className={`h-4 w-4 transition-transform ${optionalOpen ? 'rotate-180' : ''}`} />
            Additional context (optional)
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6 pt-2">
            {showContextBackground && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Organization Context {isFieldRequired(rules, 'context_background') && <span className="text-destructive">*</span>}
                </Label>
                <p className="text-xs text-muted-foreground">Background about your organization relevant to this challenge.</p>
                <Controller name="context_background" control={control} render={({ field }) => (
                  <RichTextEditor value={field.value ?? ''} onChange={field.onChange} placeholder="Describe your organization context..." />
                )} />
                {errors.context_background?.message && <p className="text-xs text-destructive">{String(errors.context_background.message)}</p>}
              </div>
            )}
            {showExpectedTimeline && (
              <Controller name="expected_timeline" control={control} render={({ field: tlField }) => (
                <Controller name="phase_durations" control={control} render={({ field: pdField }) => (
                  <CreatorPhaseTimeline
                    governanceMode="STRUCTURED"
                    value={{ expected_timeline: tlField.value, phase_durations: pdField.value as PhaseEntry[] }}
                    onChange={(val) => { tlField.onChange(val.expected_timeline); pdField.onChange(val.phase_durations ?? []); }}
                  />
                )} />
              )} />
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
