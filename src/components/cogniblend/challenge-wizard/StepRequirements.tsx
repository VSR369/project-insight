/**
 * Step 2 — Requirements
 *
 * Fields:
 *   1. Deliverables — dynamic sortable list, min 1 required
 *   2. Permitted Artifact Types — checkbox group based on maturity level
 *   3. Submission Guidelines — textarea (optional LW, required ENT)
 *   4. IP Model — dropdown with info tooltips
 */

import { useState, useEffect } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import {
  Plus,
  Trash2,
  GripVertical,
  Info,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import type { ChallengeFormValues } from './challengeFormSchema';

/* ─── Constants ──────────────────────────────────────── */

const ARTIFACT_TIERS: Record<string, string[]> = {
  blueprint: ['Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram'],
  poc: ['Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram', 'Data/Evidence', 'Video Demo'],
  prototype: [
    'Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram',
    'Data/Evidence', 'Video Demo',
    'Source Code', 'Hardware Specs', 'API Documentation',
  ],
  pilot: [
    'Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram',
    'Data/Evidence', 'Video Demo',
    'Source Code', 'Hardware Specs', 'API Documentation',
    'Field Data', 'Deployment Guide', 'Metrics Report',
  ],
};

const IP_OPTIONS = [
  {
    value: 'exclusive_assignment',
    label: 'Exclusive Assignment',
    short: 'You acquire full IP ownership',
    tooltip: 'The solver transfers all intellectual property rights to you upon acceptance. They may not use, license, or sell the solution to anyone else.',
  },
  {
    value: 'non_exclusive_license',
    label: 'Non-Exclusive License',
    short: 'Solver keeps IP, you get license',
    tooltip: 'The solver retains ownership but grants you a perpetual, non-exclusive license to use the solution. The solver may license it to others.',
  },
  {
    value: 'exclusive_license',
    label: 'Exclusive License',
    short: 'Solver keeps IP, exclusive use for you',
    tooltip: 'The solver retains ownership but grants you an exclusive license. No other party (including the solver) may use or license the solution.',
  },
  {
    value: 'joint_ownership',
    label: 'Joint Ownership',
    short: 'Both parties co-own',
    tooltip: 'Both you and the solver share ownership of the intellectual property. Either party may use or license it, subject to the agreement terms.',
  },
  {
    value: 'no_transfer',
    label: 'No Transfer',
    short: 'Advisory only',
    tooltip: 'No intellectual property transfer occurs. The engagement is advisory in nature — the solver provides guidance, recommendations, or consulting only.',
  },
] as const;

const MATURITY_IP_DEFAULTS: Record<string, string> = {
  blueprint: 'non_exclusive_license',
  poc: 'non_exclusive_license',
  prototype: 'exclusive_assignment',
  pilot: 'exclusive_assignment',
};

/* ─── Props ──────────────────────────────────────────── */

interface StepRequirementsProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isLightweight: boolean;
}

/* ─── Component ──────────────────────────────────────── */

export function StepRequirements({ form, mandatoryFields, isLightweight }: StepRequirementsProps) {
  const { register, formState: { errors }, control, watch, setValue } = form;

  const isRequired = (field: string) => mandatoryFields.includes(field);

  // ── Deliverables ──
  const deliverablesList = watch('deliverables_list') ?? [''];
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const addDeliverable = () => setValue('deliverables_list', [...deliverablesList, '']);

  const removeDeliverable = (index: number) => {
    if (deliverablesList.length <= 1) return;
    setValue('deliverables_list', deliverablesList.filter((_: string, i: number) => i !== index));
  };

  const updateDeliverable = (index: number, value: string) => {
    const updated = [...deliverablesList];
    updated[index] = value;
    setValue('deliverables_list', updated);
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragEnd = () => setDragIndex(null);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...deliverablesList];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setValue('deliverables_list', reordered);
    setDragIndex(index);
  };

  // ── Artifact types (driven by maturity level) ──
  const maturityLevel = watch('maturity_level');
  const selectedArtifacts = watch('permitted_artifact_types') ?? [];
  const availableArtifacts = ARTIFACT_TIERS[maturityLevel] ?? [];

  // Auto-select all artifacts when maturity changes
  useEffect(() => {
    if (maturityLevel && ARTIFACT_TIERS[maturityLevel]) {
      setValue('permitted_artifact_types', [...ARTIFACT_TIERS[maturityLevel]]);
    }
  }, [maturityLevel, setValue]);

  const toggleArtifact = (artifact: string) => {
    const current = selectedArtifacts;
    if (current.includes(artifact)) {
      setValue('permitted_artifact_types', current.filter((a: string) => a !== artifact));
    } else {
      setValue('permitted_artifact_types', [...current, artifact]);
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

  return (
    <div className="space-y-6">
      {/* ── 1. Deliverables ── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Deliverables <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          List the expected outputs from solvers. Drag to reorder.
        </p>

        <div className="space-y-2">
          {deliverablesList.map((item: string, index: number) => (
            <div
              key={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              className={cn(
                'flex items-center gap-2 rounded-lg border border-border bg-background p-1 transition-shadow',
                dragIndex === index && 'shadow-md ring-2 ring-primary/30',
              )}
            >
              <button
                type="button"
                className="cursor-grab shrink-0 p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
                tabIndex={-1}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <Input
                placeholder="Describe a specific deliverable..."
                value={item}
                onChange={(e) => updateDeliverable(index, e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0 text-base"
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
          className="text-primary hover:text-primary/80"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Deliverable
        </Button>

        {errors.deliverables_list && (
          <p className="text-xs text-destructive">{errors.deliverables_list.message}</p>
        )}
      </div>

      {/* ── 2. Permitted Artifact Types ── */}
      {maturityLevel && availableArtifacts.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Permitted Artifact Types
          </Label>
          <p className="text-xs text-muted-foreground">
            Auto-populated based on maturity level. Uncheck any you don't need.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {availableArtifacts.map((artifact) => {
              const checked = selectedArtifacts.includes(artifact);
              return (
                <label
                  key={artifact}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                    checked
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border bg-background hover:bg-muted/50',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleArtifact(artifact)}
                  />
                  <span className="text-sm">{artifact}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. Submission Guidelines ── */}
      <div className="space-y-1.5">
        <Label htmlFor="submission_guidelines" className="text-sm font-medium">
          Submission Guidelines{' '}
          {!isLightweight && isRequired('submission_guidelines') && (
            <span className="text-destructive">*</span>
          )}
          {isLightweight && (
            <span className="text-xs text-muted-foreground ml-1">(optional)</span>
          )}
        </Label>
        <Textarea
          id="submission_guidelines"
          placeholder="Any specific instructions for solvers about how to prepare and submit their solutions."
          rows={4}
          className="text-base resize-none"
          {...register('submission_guidelines')}
        />
        {errors.submission_guidelines && (
          <p className="text-xs text-destructive">{errors.submission_guidelines.message}</p>
        )}
      </div>

      {/* ── 4. Solver Eligibility ── */}
      <Controller
        name="solver_eligibility_types"
        control={control}
        render={({ field }) => {
          const selected: string[] = field.value ?? [];
          const toggle = (val: string) => {
            if (selected.includes(val)) {
              field.onChange(selected.filter((v: string) => v !== val));
            } else {
              field.onChange([...selected, val]);
            }
          };

          const options = [
            { value: 'individual', label: 'Individual Solvers', desc: 'Solo participants submitting solutions independently' },
            { value: 'organization', label: 'Organization / Team', desc: 'Teams or companies submitting as a collective' },
            { value: 'solution_cluster', label: 'Solution Cluster', desc: 'Coordinated multi-party submissions addressing sub-problems' },
          ];

          return (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Solver Eligibility <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Who can submit solutions? Select at least one.
              </p>

              <div className="space-y-2">
                {options.map((opt) => {
                  const checked = selected.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border px-3 py-3 cursor-pointer transition-colors',
                        checked
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-border bg-background hover:bg-muted/50',
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(opt.value)}
                        className="mt-0.5"
                      />
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
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          IP Model{' '}
          {!isLightweight && isRequired('ip_model') && (
            <span className="text-destructive">*</span>
          )}
          {isLightweight && (
            <span className="text-xs text-muted-foreground ml-1">(optional)</span>
          )}
        </Label>
        <p className="text-xs text-muted-foreground">
          Select how intellectual property will be handled
        </p>

        <Controller
          name="ip_model"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select IP ownership model" />
              </SelectTrigger>
              <SelectContent>
                <TooltipProvider delayDuration={200}>
                  {IP_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">— {opt.short}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs text-xs">
                            {opt.tooltip}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </SelectItem>
                  ))}
                </TooltipProvider>
              </SelectContent>
            </Select>
          )}
        />
        {errors.ip_model && (
          <p className="text-xs text-destructive">{errors.ip_model.message}</p>
        )}
      </div>
    </div>
  );
}
