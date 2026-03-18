/**
 * Step 5 — Provider Eligibility
 *
 * Merged fields from old StepRequirements:
 *   - Solver Eligibility (checkboxes)
 *   - IP Model (dropdown)
 *   - Permitted Artifact Types (checkboxes)
 * Plus targeting filters for Enterprise.
 */

import { useState, useEffect } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TargetingFiltersSection, EMPTY_TARGETING_FILTERS } from '@/components/cogniblend/publication/TargetingFiltersSection';
import type { TargetingFilters } from '@/components/cogniblend/publication/TargetingFiltersSection';
import type { ChallengeFormValues } from './challengeFormSchema';

/* ─── Constants ──────────────────────────────────────── */

const ARTIFACT_TIERS: Record<string, string[]> = {
  blueprint: ['Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram'],
  poc: ['Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram', 'Data/Evidence', 'Video Demo'],
  prototype: [
    'Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram',
    'Data/Evidence', 'Video Demo', 'Source Code', 'Hardware Specs', 'API Documentation',
  ],
  pilot: [
    'Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram',
    'Data/Evidence', 'Video Demo', 'Source Code', 'Hardware Specs', 'API Documentation',
    'Field Data', 'Deployment Guide', 'Metrics Report',
  ],
};

const IP_OPTIONS = [
  { value: 'exclusive_assignment', label: 'Exclusive Assignment', short: 'Full IP ownership', tooltip: 'Solver transfers all IP rights to you upon acceptance.' },
  { value: 'non_exclusive_license', label: 'Non-Exclusive License', short: 'Solver keeps IP, you get license', tooltip: 'Solver retains ownership; grants you a perpetual non-exclusive license.' },
  { value: 'exclusive_license', label: 'Exclusive License', short: 'Exclusive use for you', tooltip: 'Solver retains ownership; grants you an exclusive license.' },
  { value: 'joint_ownership', label: 'Joint Ownership', short: 'Both parties co-own', tooltip: 'Both parties share IP ownership.' },
  { value: 'no_transfer', label: 'No Transfer', short: 'Advisory only', tooltip: 'No IP transfer; advisory engagement only.' },
] as const;

const MATURITY_IP_DEFAULTS: Record<string, string> = {
  blueprint: 'non_exclusive_license',
  poc: 'non_exclusive_license',
  prototype: 'exclusive_assignment',
  pilot: 'exclusive_assignment',
};

interface StepProviderEligibilityProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isLightweight: boolean;
}

export function StepProviderEligibility({ form, mandatoryFields, isLightweight }: StepProviderEligibilityProps) {
  const { formState: { errors }, control, watch, setValue } = form;

  const isRequired = (field: string) => mandatoryFields.includes(field);

  // ── Artifact types ──
  const maturityLevel = watch('maturity_level');
  const selectedArtifacts = watch('permitted_artifact_types') ?? [];
  const availableArtifacts = ARTIFACT_TIERS[maturityLevel] ?? [];

  useEffect(() => {
    if (maturityLevel && ARTIFACT_TIERS[maturityLevel] && selectedArtifacts.length === 0) {
      setValue('permitted_artifact_types', [...ARTIFACT_TIERS[maturityLevel]]);
    }
  }, [maturityLevel, setValue, selectedArtifacts.length]);

  const toggleArtifact = (artifact: string) => {
    if (selectedArtifacts.includes(artifact)) {
      setValue('permitted_artifact_types', selectedArtifacts.filter((a: string) => a !== artifact));
    } else {
      setValue('permitted_artifact_types', [...selectedArtifacts, artifact]);
    }
  };

  // ── IP model default ──
  const ipModel = watch('ip_model');
  useEffect(() => {
    if (isLightweight && maturityLevel && !ipModel) {
      const defaultIp = MATURITY_IP_DEFAULTS[maturityLevel];
      if (defaultIp) setValue('ip_model', defaultIp);
    }
  }, [maturityLevel, isLightweight, ipModel, setValue]);

  // ── Targeting filters ──
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

      {/* ── Solver Eligibility ── */}
      <Controller
        name="solver_eligibility_types"
        control={control}
        render={({ field }) => {
          const selected: string[] = field.value ?? [];
          const toggle = (val: string) => {
            if (selected.includes(val)) field.onChange(selected.filter((v: string) => v !== val));
            else field.onChange([...selected, val]);
          };

          const options = [
            { value: 'individual', label: 'Individual Solvers', desc: 'Solo participants submitting solutions independently' },
            { value: 'organization', label: 'Organization / Team', desc: 'Teams or companies submitting as a collective' },
            { value: 'solution_cluster', label: 'Solution Cluster', desc: 'Coordinated multi-party submissions addressing sub-problems' },
          ];

          return (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Solver Eligibility <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground">Who can submit solutions? Select at least one.</p>
              <div className="space-y-2">
                {options.map((opt) => {
                  const checked = selected.includes(opt.value);
                  return (
                    <label key={opt.value} className={cn(
                      'flex items-start gap-3 rounded-lg border px-3 py-3 cursor-pointer transition-colors',
                      checked ? 'border-primary/30 bg-primary/5' : 'border-border bg-background hover:bg-muted/50',
                    )}>
                      <Checkbox checked={checked} onCheckedChange={() => toggle(opt.value)} className="mt-0.5" />
                      <div>
                        <span className="text-sm font-medium">{opt.label}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {errors.solver_eligibility_types && (
                <p className="text-xs text-destructive">{errors.solver_eligibility_types.message}</p>
              )}
            </div>
          );
        }}
      />

      {/* ── IP Model ── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          IP Model{' '}
          {!isLightweight && isRequired('ip_model') && <span className="text-destructive">*</span>}
          {isLightweight && <span className="text-xs text-muted-foreground ml-1">(optional)</span>}
        </Label>
        <p className="text-xs text-muted-foreground">Select how intellectual property will be handled</p>
        <Controller name="ip_model" control={control}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger className="text-base"><SelectValue placeholder="Select IP ownership model" /></SelectTrigger>
              <SelectContent>
                <TooltipProvider delayDuration={200}>
                  {IP_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">— {opt.short}</span>
                        <Tooltip>
                          <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" /></TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs text-xs">{opt.tooltip}</TooltipContent>
                        </Tooltip>
                      </div>
                    </SelectItem>
                  ))}
                </TooltipProvider>
              </SelectContent>
            </Select>
          )}
        />
        {errors.ip_model && <p className="text-xs text-destructive">{errors.ip_model.message}</p>}
      </div>

      {/* ── Permitted Artifact Types ── */}
      {maturityLevel && availableArtifacts.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Permitted Artifact Types</Label>
          <p className="text-xs text-muted-foreground">Auto-populated based on maturity level. Uncheck any you don't need.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {availableArtifacts.map((artifact) => {
              const checked = selectedArtifacts.includes(artifact);
              return (
                <label key={artifact} className={cn(
                  'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                  checked ? 'border-primary/30 bg-primary/5' : 'border-border bg-background hover:bg-muted/50',
                )}>
                  <Checkbox checked={checked} onCheckedChange={() => toggleArtifact(artifact)} />
                  <span className="text-sm">{artifact}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Targeting Filters (Enterprise) ── */}
      {!isLightweight && (
        <TargetingFiltersSection value={currentFilters} onChange={handleFiltersChange} isLightweight={isLightweight} />
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
