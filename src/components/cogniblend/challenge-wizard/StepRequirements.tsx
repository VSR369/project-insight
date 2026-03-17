/**
 * Step 2 — Requirements
 * Mandatory fields: deliverables, maturity_level
 * Enterprise-only (advanced): complexity_parameters, ip_model, visibility, eligibility
 */

import { useState } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ChallengeFormValues } from './challengeFormSchema';

const MATURITY_LEVELS = [
  { value: 'concept', label: 'Concept / Idea Stage' },
  { value: 'prototype', label: 'Prototype' },
  { value: 'mvp', label: 'Minimum Viable Product' },
  { value: 'production', label: 'Production-Ready' },
] as const;

const IP_MODELS = [
  { value: 'full_transfer', label: 'Full IP Transfer' },
  { value: 'license', label: 'License Agreement' },
  { value: 'shared', label: 'Shared Ownership' },
  { value: 'solver_retains', label: 'Solver Retains IP' },
] as const;

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public — Open to all solvers' },
  { value: 'invite_only', label: 'Invite Only — Selected solvers' },
  { value: 'internal', label: 'Internal — Organization only' },
] as const;

interface StepRequirementsProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isLightweight: boolean;
}

export function StepRequirements({ form, mandatoryFields, isLightweight }: StepRequirementsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { register, formState: { errors }, control, watch, setValue } = form;

  const isRequired = (field: string) => mandatoryFields.includes(field);

  const deliverablesList = watch('deliverables_list') ?? [''];

  const addDeliverable = () => {
    setValue('deliverables_list', [...deliverablesList, '']);
  };

  const removeDeliverable = (index: number) => {
    if (deliverablesList.length <= 1) return;
    setValue(
      'deliverables_list',
      deliverablesList.filter((_: string, i: number) => i !== index)
    );
  };

  const updateDeliverable = (index: number, value: string) => {
    const updated = [...deliverablesList];
    updated[index] = value;
    setValue('deliverables_list', updated);
  };

  const advancedEnterprise = ['complexity_parameters', 'ip_model', 'visibility', 'eligibility'];
  const hasAdvanced = isLightweight && advancedEnterprise.some((f) => !mandatoryFields.includes(f));

  return (
    <div className="space-y-5">
      {/* Deliverables */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Deliverables {isRequired('deliverables') && <span className="text-destructive">*</span>}
        </Label>
        <p className="text-xs text-muted-foreground">List the expected outputs from solvers</p>
        <div className="space-y-2">
          {deliverablesList.map((item: string, index: number) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                placeholder={`Deliverable ${index + 1}`}
                value={item}
                onChange={(e) => updateDeliverable(index, e.target.value)}
                className="text-base"
              />
              {deliverablesList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDeliverable(index)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addDeliverable}
          className="text-muted-foreground"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Deliverable
        </Button>
      </div>

      {/* Maturity Level */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Maturity Level {isRequired('maturity_level') && <span className="text-destructive">*</span>}
        </Label>
        <Controller
          name="maturity_level"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select expected maturity level" />
              </SelectTrigger>
              <SelectContent>
                {MATURITY_LEVELS.map((ml) => (
                  <SelectItem key={ml.value} value={ml.value}>
                    {ml.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.maturity_level && (
          <p className="text-xs text-destructive">{errors.maturity_level.message}</p>
        )}
      </div>

      {/* Enterprise-only fields OR advanced expandable */}
      {!isLightweight && (
        <>
          {/* IP Model */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              IP Model {isRequired('ip_model') && <span className="text-destructive">*</span>}
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
                    {IP_MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Visibility */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Visibility {isRequired('visibility') && <span className="text-destructive">*</span>}
            </Label>
            <Controller
              name="visibility"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? 'public'} onValueChange={field.onChange}>
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_OPTIONS.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Eligibility */}
          <div className="space-y-1.5">
            <Label htmlFor="eligibility" className="text-sm font-medium">
              Eligibility Criteria {isRequired('eligibility') && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="eligibility"
              placeholder="Describe who can participate..."
              rows={3}
              className="text-base resize-none"
              {...register('eligibility')}
            />
          </div>

          {/* Complexity Parameters */}
          <div className="space-y-1.5">
            <Label htmlFor="complexity_notes" className="text-sm font-medium">
              Complexity Notes {isRequired('complexity_parameters') && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="complexity_notes"
              placeholder="Describe the technical complexity..."
              rows={3}
              className="text-base resize-none"
              {...register('complexity_notes')}
            />
          </div>
        </>
      )}

      {/* Advanced (Lightweight) */}
      {hasAdvanced && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Show Advanced Options
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-4 pl-4 border-l-2 border-muted ml-1.5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">IP Model <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Controller
                  name="ip_model"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Select IP model" />
                      </SelectTrigger>
                      <SelectContent>
                        {IP_MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Visibility <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Controller
                  name="visibility"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? 'public'} onValueChange={field.onChange}>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        {VISIBILITY_OPTIONS.map((v) => (
                          <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eligibility_adv" className="text-sm font-medium">Eligibility <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Textarea
                  id="eligibility_adv"
                  placeholder="Describe eligibility criteria..."
                  rows={2}
                  className="text-base resize-none"
                  {...register('eligibility')}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
