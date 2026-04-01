/**
 * EssentialDetailsTab — Tab 1 of Challenge Creator Form.
 * Governance-aware: QUICK hides scope/IP/outcomes as optional,
 * STRUCTURED shows all 8, CONTROLLED shows all 8 required.
 *
 * Solution maturity fetched dynamically from md_solution_maturity.
 * Expected outcomes use LineItemsInput (string[]) matching curator format.
 */

import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Info, Loader2 } from 'lucide-react';
import { useSolutionMaturityList } from '@/hooks/queries/useSolutionMaturity';
import { LineItemsInput } from '@/components/cogniblend/challenge-wizard/LineItemsInput';
import type { GovernanceMode } from '@/lib/governanceMode';
import { isFieldVisible, type FieldRulesMap } from '@/hooks/queries/useGovernanceFieldRules';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'INR', label: 'INR (₹)' },
] as const;

const IP_OPTIONS = [
  { value: 'IP-EA', label: 'We own everything', desc: 'Full IP transfer to your org' },
  { value: 'IP-EL', label: 'Exclusive license', desc: 'Solver licenses exclusively to your org' },
  { value: 'IP-NEL', label: 'Solver licenses to us', desc: 'Non-exclusive license' },
  { value: 'IP-JO', label: 'Joint ownership', desc: 'Both parties co-own' },
  { value: 'IP-NONE', label: 'No transfer (advisory)', desc: 'Consulting only' },
] as const;

interface EssentialDetailsTabProps {
  engagementModel: string;
  industrySegments: Array<{ id: string; name: string }>;
  governanceMode: GovernanceMode;
  fieldRules?: FieldRulesMap;
}

export function EssentialDetailsTab({ engagementModel, industrySegments, governanceMode, fieldRules }: EssentialDetailsTabProps) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext();
  const isMPBudgetRequired = engagementModel === 'MP';
  const rules = fieldRules ?? {};
  const showScope = isFieldVisible(rules, 'scope');
  const showIpModel = isFieldVisible(rules, 'ip_model');
  const showBudget = isFieldVisible(rules, 'platinum_award');

  const { data: maturityOptions = [], isLoading: maturityLoading } = useSolutionMaturityList();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Challenge Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Short, descriptive title for your challenge"
          className="text-base"
          {...register('title')}
        />
        {errors.title?.message && <p className="text-xs text-destructive">{String(errors.title.message)}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Problem Statement <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Describe your business problem in detail — what's happening, what impact it has, what you've tried so far.
        </p>
        <Controller
          name="problem_statement"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value}
              onChange={field.onChange}
              placeholder="Describe the problem clearly..."
            />
          )}
        />
        {errors.problem_statement?.message && <p className="text-xs text-destructive">{String(errors.problem_statement.message)}</p>}
      </div>

      {showScope && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Scope <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            What should solvers address? What should they NOT touch?
          </p>
          <Controller
            name="scope"
            control={control}
            render={({ field }) => (
              <RichTextEditor
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="Define the boundaries of this challenge..."
              />
            )}
          />
          {errors.scope?.message && <p className="text-xs text-destructive">{String(errors.scope.message)}</p>}
        </div>
      )}

      <div className="space-y-3">
        <Label className="text-sm font-medium">
          What kind of solution do you need? <span className="text-destructive">*</span>
        </Label>
        {maturityLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading solution types…
          </div>
        ) : (
          <Controller
            name="maturity_level"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={(nextValue) => {
                  field.onChange(nextValue);
                  const selectedOption = maturityOptions.find((option) => option.code === nextValue);
                  setValue('solution_maturity_id', selectedOption?.id ?? '', {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                className="space-y-2"
              >
                {maturityOptions.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/40 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem value={option.code} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{option.label}</p>
                      {option.description && <p className="text-xs text-muted-foreground">{option.description}</p>}
                    </div>
                  </label>
                ))}
              </RadioGroup>
            )}
          />
        )}
        {errors.maturity_level?.message && <p className="text-xs text-destructive">{String(errors.maturity_level.message)}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Primary Industry Segment <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Select the primary industry this challenge belongs to.
        </p>
        <Controller
          name="industry_segment_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select primary industry segment" />
              </SelectTrigger>
              <SelectContent>
                {industrySegments.map((segment) => (
                  <SelectItem key={segment.id} value={segment.id}>{segment.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.industry_segment_id?.message && <p className="text-xs text-destructive">{String(errors.industry_segment_id.message)}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Industry Domain <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">Select 1–3 industry segments.</p>
        <Controller
          name="domain_tags"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {industrySegments.map((segment) => {
                const isSelected = (field.value ?? []).includes(segment.id);
                const atMax = (field.value ?? []).length >= 3 && !isSelected;
                return (
                  <button
                    key={segment.id}
                    type="button"
                    disabled={atMax}
                    onClick={() => {
                      const current = field.value ?? [];
                      field.onChange(
                        isSelected ? current.filter((value: string) => value !== segment.id) : [...current, segment.id],
                      );
                    }}
                    className={`
                      px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                      ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:border-primary/40'}
                      ${atMax ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {segment.name}
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.domain_tags?.message && <p className="text-xs text-destructive">{String(errors.domain_tags.message)}</p>}
      </div>

      {showBudget && (
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Budget Range {isMPBudgetRequired && <span className="text-destructive">*</span>}
        </Label>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Min</span>
            <Input type="number" placeholder="0" className="w-32 text-base" {...register('budget_min', { valueAsNumber: true })} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Max</span>
            <Input type="number" placeholder="0" className="w-32 text-base" {...register('budget_max', { valueAsNumber: true })} />
          </div>
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>{currency.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        {errors.budget_min?.message && <p className="text-xs text-destructive">{String(errors.budget_min.message)}</p>}
        {errors.budget_max?.message && <p className="text-xs text-destructive">{String(errors.budget_max.message)}</p>}
        {isMPBudgetRequired && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground mt-1">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Marketplace: budget range is required for reward sizing.</span>
          </div>
        )}
      </div>

      {!isQuick && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            IP Preference <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="ip_model"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select IP ownership model" />
                </SelectTrigger>
                <SelectContent>
                  {IP_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">— {option.desc}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.ip_model?.message && <p className="text-xs text-destructive">{String(errors.ip_model.message)}</p>}
        </div>
      )}

      <Controller
        name="expected_outcomes"
        control={control}
        render={({ field }) => (
          <LineItemsInput
            value={field.value ?? ['']}
            onChange={field.onChange}
            label="What results do you expect?"
            placeholder="Describe one expected outcome..."
            required
            minItems={1}
            maxItems={10}
            addLabel="Add Outcome"
            error={errors.expected_outcomes?.message ? String(errors.expected_outcomes.message) : undefined}
          />
        )}
      />
    </div>
  );
}
