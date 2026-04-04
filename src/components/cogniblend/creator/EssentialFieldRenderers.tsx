/**
 * EssentialFieldRenderers — Maturity radio, domain tag chips, budget range, IP model.
 * Extracted from EssentialDetailsTab for ≤200 line compliance.
 */

import { Controller, type Control, type UseFormRegister, type UseFormSetValue, type FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, Loader2 } from 'lucide-react';
import { isFieldVisible, type FieldRulesMap } from '@/hooks/queries/useGovernanceFieldRules';
import type { GovernanceMode } from '@/lib/governanceMode';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' }, { value: 'INR', label: 'INR (₹)' },
] as const;

const IP_OPTIONS = [
  { value: 'IP-EA', label: 'We own everything', desc: 'Full IP transfer' },
  { value: 'IP-EL', label: 'Exclusive license', desc: 'Solver licenses exclusively' },
  { value: 'IP-NEL', label: 'Solver licenses to us', desc: 'Non-exclusive license' },
  { value: 'IP-JO', label: 'Joint ownership', desc: 'Both parties co-own' },
  { value: 'IP-NONE', label: 'No transfer (advisory)', desc: 'Consulting only' },
] as const;

interface MaturityOption { id: string; code: string; label: string; description?: string }

interface EssentialFieldRenderersProps {
  control: Control<Record<string, unknown>>;
  register: UseFormRegister<Record<string, unknown>>;
  setValue: UseFormSetValue<Record<string, unknown>>;
  errors: FieldErrors;
  maturityOptions: MaturityOption[];
  maturityLoading: boolean;
  industrySegments: Array<{ id: string; name: string }>;
  fieldRules?: FieldRulesMap;
  isMPBudgetRequired: boolean;
  governanceMode: GovernanceMode;
}

export function EssentialFieldRenderers({
  control, register, setValue, errors, maturityOptions, maturityLoading,
  industrySegments, fieldRules, isMPBudgetRequired,
}: EssentialFieldRenderersProps) {
  const showIpModel = isFieldVisible(fieldRules, 'ip_model');
  const showBudget = isFieldVisible(fieldRules, 'platinum_award');

  return (
    <>
      {/* Solution Maturity */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">What kind of solution do you need? <span className="text-destructive">*</span></Label>
        {maturityLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="h-4 w-4 animate-spin" />Loading solution types…</div>
        ) : (
          <Controller name="maturity_level" control={control} render={({ field }) => (
            <RadioGroup value={field.value as string} onValueChange={(v) => { field.onChange(v); const m = maturityOptions.find((o) => o.code === v); setValue('solution_maturity_id', m?.id ?? '', { shouldDirty: true }); }} className="space-y-2">
              {maturityOptions.map((o) => (
                <label key={o.id} className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/40 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                  <RadioGroupItem value={o.code} className="mt-0.5" />
                  <div><p className="text-sm font-medium text-foreground">{o.label}</p>{o.description && <p className="text-xs text-muted-foreground">{o.description}</p>}</div>
                </label>
              ))}
            </RadioGroup>
          )} />
        )}
        {errors.maturity_level?.message && <p className="text-xs text-destructive">{String(errors.maturity_level.message)}</p>}
      </div>

      {/* Domain Tags */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Industry Domain <span className="text-destructive">*</span></Label>
        <p className="text-xs text-muted-foreground">Select 1–3 industry segments.</p>
        <Controller name="domain_tags" control={control} render={({ field }) => (
          <div className="flex flex-wrap gap-2">
            {industrySegments.map((seg) => {
              const val = (field.value as string[]) ?? [];
              const isSelected = val.includes(seg.id);
              const atMax = val.length >= 3 && !isSelected;
              return (
                <button key={seg.id} type="button" disabled={atMax} onClick={() => field.onChange(isSelected ? val.filter((v: string) => v !== seg.id) : [...val, seg.id])}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:border-primary/40'} ${atMax ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                  {seg.name}
                </button>
              );
            })}
          </div>
        )} />
        {errors.domain_tags?.message && <p className="text-xs text-destructive">{String(errors.domain_tags.message)}</p>}
      </div>

      {/* Budget Range */}
      {showBudget && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Budget Range {isMPBudgetRequired && <span className="text-destructive">*</span>}</Label>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Min</span><Input type="number" placeholder="0" className="w-32 text-base" {...register('budget_min', { valueAsNumber: true })} /></div>
            <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Max</span><Input type="number" placeholder="0" className="w-32 text-base" {...register('budget_max', { valueAsNumber: true })} /></div>
            <Controller name="currency" control={control} render={({ field }) => (
              <Select value={field.value as string} onValueChange={field.onChange}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent>{CURRENCY_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select>
            )} />
          </div>
          {errors.budget_min?.message && <p className="text-xs text-destructive">{String(errors.budget_min.message)}</p>}
          {errors.budget_max?.message && <p className="text-xs text-destructive">{String(errors.budget_max.message)}</p>}
          {isMPBudgetRequired && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground mt-1"><Info className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>Marketplace: budget range is required for reward sizing.</span></div>
          )}
        </div>
      )}

      {/* IP Model */}
      {showIpModel && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">IP Preference <span className="text-destructive">*</span></Label>
          <Controller name="ip_model" control={control} render={({ field }) => (
            <Select value={(field.value as string) ?? ''} onValueChange={field.onChange}>
              <SelectTrigger className="text-base"><SelectValue placeholder="Select IP ownership model" /></SelectTrigger>
              <SelectContent>{IP_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}><span>{o.label}</span><span className="text-xs text-muted-foreground ml-2">— {o.desc}</span></SelectItem>)}</SelectContent>
            </Select>
          )} />
          {errors.ip_model?.message && <p className="text-xs text-destructive">{String(errors.ip_model.message)}</p>}
        </div>
      )}
    </>
  );
}
