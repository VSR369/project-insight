/**
 * StepProblem — Content Fields (Context, Problem Statement, Description, Scope, Deliverables, Stakeholders)
 * Extracted from StepProblem.tsx for decomposition.
 */

import { useState } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { ChevronDown, ChevronRight, Plus, Trash2, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AiFieldAssist } from './AiFieldAssist';
import type { ChallengeFormValues } from './challengeFormSchema';

const PROBLEM_MIN_STRUCTURED = 500;
const PROBLEM_MIN_QUICK = 200;
const SCOPE_MIN_STRUCTURED = 200;
const SCOPE_MIN_QUICK = 100;

interface StepProblemContentFieldsProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isQuick: boolean;
}

export function StepProblemContentFields({ form, mandatoryFields, isQuick }: StepProblemContentFieldsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const { register, formState: { errors }, watch, control, setValue } = form;

  const problemMin = isQuick ? PROBLEM_MIN_QUICK : PROBLEM_MIN_STRUCTURED;
  const scopeMin = isQuick ? SCOPE_MIN_QUICK : SCOPE_MIN_STRUCTURED;
  const isRequired = (field: string) => mandatoryFields.includes(field);

  const aiContext = {
    title: watch('title') ?? '',
    problem_statement: watch('problem_statement') ?? '',
    maturity_level: watch('maturity_level') ?? '',
    governance_mode: watch('governance_mode') ?? '',
  };

  // Deliverables
  const deliverablesList = watch('deliverables_list') ?? [''];
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

  // Stakeholders
  const stakeholders = watch('affected_stakeholders') ?? [];
  const addStakeholder = () => {
    setValue('affected_stakeholders', [
      ...stakeholders,
      { stakeholder_name: '', role: '', impact_description: '', adoption_challenge: '' },
    ]);
  };
  const removeStakeholder = (index: number) => {
    setValue('affected_stakeholders', stakeholders.filter((_: unknown, i: number) => i !== index));
  };
  const updateStakeholder = (index: number, field: string, val: string) => {
    const updated = [...stakeholders];
    updated[index] = { ...updated[index], [field]: val };
    setValue('affected_stakeholders', updated);
  };

  return (
    <>
      {/* ── 4. Context & Background ── */}
      {!isQuick && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Context & Background{' '}
            {isRequired('context_background')
              ? <span className="text-destructive">*</span>
              : <span className="text-xs text-muted-foreground ml-1">(optional)</span>}
          </Label>
          <Controller name="context_background" control={control} render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} placeholder="Provide context about the challenge background, industry landscape, and why this problem matters." storagePath="context-background" />
          )} />
          {errors.context_background && <p className="text-xs text-destructive">{errors.context_background.message}</p>}
        </div>
      )}

      {/* ── 5. Problem Statement ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Problem Statement <span className="text-destructive">*</span></Label>
          <AiFieldAssist fieldName="problem_statement" context={aiContext} onResult={(content) => setValue('problem_statement', content)} label="AI Draft" />
        </div>
        <Controller name="problem_statement" control={control} render={({ field }) => (
          <RichTextEditor value={field.value ?? ''} onChange={field.onChange} placeholder="Describe the problem in detail. What makes it challenging? What has been tried before?" minLength={problemMin} error={errors.problem_statement?.message} storagePath="problem-statements" />
        )} />
      </div>

      {/* ── 6. Detailed Description ── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Detailed Description <span className="text-xs text-muted-foreground ml-1">(optional)</span></Label>
        <Controller name="detailed_description" control={control} render={({ field }) => (
          <RichTextEditor value={field.value ?? ''} onChange={field.onChange} placeholder="Expand on the problem with technical details, constraints, and requirements." storagePath="detailed-descriptions" />
        )} />
      </div>

      {/* ── 8. Scope Definition ── */}
      {!isQuick ? (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Scope {isRequired('scope') && <span className="text-destructive">*</span>}</Label>
          <Controller name="scope" control={control} render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} placeholder="Define what is in scope and out of scope for solutions." minLength={scopeMin} error={errors.scope?.message} storagePath="scope-content" />
          )} />
        </div>
      ) : (
        <div className="pt-1">
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Show Advanced Options
          </button>
          {showAdvanced && (
            <div className="mt-3 pl-1 border-l-2 border-muted ml-1.5">
              <div className="pl-4 space-y-1.5">
                <Label className="text-sm font-medium">Scope <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Controller name="scope" control={control} render={({ field }) => (
                  <RichTextEditor value={field.value ?? ''} onChange={field.onChange} placeholder="Define what is in scope and out of scope for solutions." minLength={scopeMin} storagePath="scope-content" />
                )} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 9. Deliverables ── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Deliverables <span className="text-destructive">*</span></Label>
        <p className="text-xs text-muted-foreground">List the expected outputs from solvers. Drag to reorder.</p>
        <div className="space-y-2">
          {deliverablesList.map((item: string, index: number) => (
            <div key={index} draggable onDragStart={() => handleDragStart(index)} onDragEnd={handleDragEnd} onDragOver={(e) => handleDragOver(e, index)} className={cn('flex items-center gap-2 rounded-lg border border-border bg-background p-1 transition-shadow', dragIndex === index && 'shadow-md ring-2 ring-primary/30')}>
              <button type="button" className="cursor-grab shrink-0 p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing" tabIndex={-1}>
                <GripVertical className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground font-mono shrink-0 w-5">{index + 1}.</span>
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
      </div>

      {/* ── 10. Affected Stakeholders ── */}
      {!isQuick && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Affected Stakeholders{' '}
            {isRequired('affected_stakeholders') ? <span className="text-destructive">*</span> : <span className="text-xs text-muted-foreground ml-1">(optional)</span>}
          </Label>
          <p className="text-xs text-muted-foreground">Identify stakeholders affected by this problem.</p>
          {stakeholders.length > 0 && (
            <div className="space-y-3">
              {stakeholders.map((s: Record<string, string>, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-background p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Stakeholder {i + 1}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeStakeholder(i)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    <Input placeholder="Stakeholder name" value={s.stakeholder_name ?? ''} onChange={(e) => updateStakeholder(i, 'stakeholder_name', e.target.value)} className="text-sm" />
                    <Input placeholder="Role" value={s.role ?? ''} onChange={(e) => updateStakeholder(i, 'role', e.target.value)} className="text-sm" />
                    <Input placeholder="Impact description" value={s.impact_description ?? ''} onChange={(e) => updateStakeholder(i, 'impact_description', e.target.value)} className="text-sm" />
                    <Input placeholder="Adoption challenge" value={s.adoption_challenge ?? ''} onChange={(e) => updateStakeholder(i, 'adoption_challenge', e.target.value)} className="text-sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={addStakeholder} className="text-primary hover:text-primary/80">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Stakeholder
          </Button>
          {(errors as any).affected_stakeholders?.message && (
            <p className="text-xs text-destructive">{(errors as any).affected_stakeholders.message}</p>
          )}
        </div>
      )}
    </>
  );
}
