/**
 * Step 2 — Requirements
 *
 * Fields:
 *   1. Deliverables — dynamic sortable list, min 1 required
 *   2. Permitted Artifact Types — checkbox group based on maturity level
 *   3. Submission Guidelines — textarea (optional LW, required ENT)
 *   4. Solver Eligibility — checkboxes: Individual, Organization/Team, Solution Cluster
 *   5. IP Model — dropdown with info tooltips
 */

import { useState, useEffect } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { Plus, Trash2, GripVertical, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ChallengeFormValues } from './challengeFormSchema';
import { SubmissionTemplateUpload } from './SubmissionTemplateUpload';
import { ARTIFACT_TIERS, IP_OPTIONS, MATURITY_IP_DEFAULTS } from './requirementsConstants';

/* ─── Props ──────────────────────────────────────────── */

interface StepRequirementsProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isQuick: boolean;
}

/* ─── Component ──────────────────────────────────────── */

export function StepRequirements({ form, mandatoryFields, isQuick }: StepRequirementsProps) {
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
    if (isQuick && maturityLevel && !ipModel) {
      const defaultIp = MATURITY_IP_DEFAULTS[maturityLevel];
      if (defaultIp) setValue('ip_model', defaultIp);
    }
  }, [maturityLevel, isQuick, ipModel, setValue]);

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
              <button type="button" className="cursor-grab shrink-0 p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing" tabIndex={-1}>
                <GripVertical className="h-4 w-4" />
              </button>
              <Input placeholder="Describe a specific deliverable..." value={item} onChange={(e) => updateDeliverable(index, e.target.value)} className="border-0 shadow-none focus-visible:ring-0 text-base" />
              {deliverablesList.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeDeliverable(index)} className="shrink-0 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button type="button" variant="ghost" size="sm" onClick={addDeliverable} className="text-primary hover:text-primary/80">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Deliverable
        </Button>

        {errors.deliverables_list && (
          <p className="text-xs text-destructive">{errors.deliverables_list.message}</p>
        )}
      </div>

      {/* ── 2. Permitted Artifact Types ── */}
      {maturityLevel && availableArtifacts.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Permitted Artifact Types</Label>
          <p className="text-xs text-muted-foreground">Auto-populated based on maturity level. Uncheck any you don't need.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {availableArtifacts.map((artifact) => {
              const checked = selectedArtifacts.includes(artifact);
              return (
                <label key={artifact} className={cn('flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors', checked ? 'border-primary/30 bg-primary/5' : 'border-border bg-background hover:bg-muted/50')}>
                  <Checkbox checked={checked} onCheckedChange={() => toggleArtifact(artifact)} />
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
          {!isQuick && isRequired('submission_guidelines') && <span className="text-destructive">*</span>}
          {isQuick && <span className="text-xs text-muted-foreground ml-1">(optional)</span>}
        </Label>
        <Textarea id="submission_guidelines" placeholder="Any specific instructions for solvers about how to prepare and submit their solutions." rows={4} className="text-base resize-none" {...register('submission_guidelines')} />
        {errors.submission_guidelines && <p className="text-xs text-destructive">{errors.submission_guidelines.message}</p>}
      </div>

      {/* ── 3b. Upload Submission Template ── */}
      <SubmissionTemplateUpload form={form} />

      {/* ── 4. Solver Eligibility note ── */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Solver eligibility is configured in <strong>Step 5 — Provider Eligibility & Matchmaking</strong>.
        </p>
      </div>

      {/* ── 5. IP Model ── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          IP Model{' '}
          {!isQuick && isRequired('ip_model') && <span className="text-destructive">*</span>}
          {isQuick && <span className="text-xs text-muted-foreground ml-1">(optional)</span>}
        </Label>
        <p className="text-xs text-muted-foreground">Select how intellectual property will be handled</p>
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
    </div>
  );
}
