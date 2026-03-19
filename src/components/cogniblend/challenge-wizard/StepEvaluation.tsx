/**
 * Step 2 — Evaluation Criteria
 *
 * 4-column table: # | Criterion Name | Weight % | Description + trash
 * Scoring Rubrics accordion below (5-level per criterion)
 * All modes show the full table with editable weights. Default values pre-filled.
 */

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AiFieldAssist } from './AiFieldAssist';
import type { ChallengeFormValues } from './challengeFormSchema';

/* ─── Rubric labels ──────────────────────────────────── */

const RUBRIC_LEVELS = [
  { key: 'score_1', label: 'Score 1 — Poor' },
  { key: 'score_2', label: 'Score 2 — Below Average' },
  { key: 'score_3', label: 'Score 3 — Meets Expectations' },
  { key: 'score_4', label: 'Score 4 — Exceeds Expectations' },
  { key: 'score_5', label: 'Score 5 — Exceptional' },
] as const;

/* ─── Props ──────────────────────────────────────────── */

interface StepEvaluationProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isLightweight: boolean;
  fieldRules?: Record<string, { visibility: string; minLength: number | null; maxLength: number | null; defaultValue: string | null }>;
}

/* ─── Component ──────────────────────────────────────── */

export function StepEvaluation({ form }: StepEvaluationProps) {
  const { formState: { errors }, watch, setValue } = form;

  const weightedCriteria = watch('weighted_criteria') ?? [];
  const totalWeight = weightedCriteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  // Track which rubric accordions are open
  const [openRubrics, setOpenRubrics] = useState<Set<number>>(new Set());

  const toggleRubric = (index: number) => {
    setOpenRubrics((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  /* ── CRUD helpers ── */

  const addCriterion = () => {
    setValue('weighted_criteria', [...weightedCriteria, { name: '', weight: 0, description: '' }]);
  };

  const removeCriterion = (index: number) => {
    if (weightedCriteria.length <= 1) return;
    const filtered = weightedCriteria.filter((_, i) => i !== index);
    setValue('weighted_criteria', filtered);
    // Clean up rubric open state
    setOpenRubrics((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => { if (i < index) next.add(i); else if (i > index) next.add(i - 1); });
      return next;
    });
  };

  const updateField = (index: number, field: string, value: any) => {
    const updated = [...weightedCriteria];
    updated[index] = { ...updated[index], [field]: value };
    setValue('weighted_criteria', updated);
  };

  const updateRubric = (criterionIndex: number, rubricKey: string, value: string) => {
    const updated = [...weightedCriteria];
    const existing = updated[criterionIndex].rubrics ?? {};
    updated[criterionIndex] = {
      ...updated[criterionIndex],
      rubrics: { ...existing, [rubricKey]: value } as any,
    };
    setValue('weighted_criteria', updated);
  };

  /* ── Named criteria for rubrics ── */
  const namedCriteria = weightedCriteria
    .map((c, i) => ({ ...c, originalIndex: i }))
    .filter((c) => c.name.trim().length > 0);

  return (
    <div className="space-y-6">
      {/* ── Section Header ── */}
      <div>
        <h3 className="text-base font-bold text-foreground mb-1">Evaluation Criteria</h3>
        <p className="text-sm text-muted-foreground">
          Define criteria and assign weights that sum to 100%. All fields are editable.
        </p>
      </div>

      {/* ─── Full 4-column weighted table (all modes) ─── */}
      {/* Table header */}
      <div className="grid grid-cols-[32px_1fr_90px_1fr_40px] gap-2 px-1">
        <span className="text-xs font-medium text-muted-foreground text-center">#</span>
        <span className="text-xs font-medium text-muted-foreground">Criterion Name <span className="text-destructive">*</span></span>
        <span className="text-xs font-medium text-muted-foreground text-center">Weight % <span className="text-destructive">*</span></span>
        <span className="text-xs font-medium text-muted-foreground">Description</span>
        <span />
      </div>

      {/* Table rows */}
      <div className="space-y-2">
        {weightedCriteria.map((criterion, index) => (
          <div key={index} className="grid grid-cols-[32px_1fr_90px_1fr_40px] gap-2 items-center">
            <span className="text-sm text-muted-foreground text-center font-medium">{index + 1}</span>
            <Input
              placeholder="e.g., Technical Approach"
              value={criterion.name}
              onChange={(e) => updateField(index, 'name', e.target.value)}
              className="text-base"
            />
            <Input
              type="number"
              min={0}
              max={100}
              value={criterion.weight}
              onChange={(e) => updateField(index, 'weight', Number(e.target.value) || 0)}
              className="text-base text-center"
            />
            <Input
              placeholder="Brief description..."
              value={criterion.description ?? ''}
              onChange={(e) => updateField(index, 'description', e.target.value)}
              className="text-base"
            />
            {weightedCriteria.length > 1 ? (
              <Button type="button" variant="ghost" size="icon" onClick={() => removeCriterion(index)}
                className="h-9 w-9 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : <div className="h-9 w-9" />}
          </div>
        ))}
      </div>

      {/* Total Weight footer */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium',
          totalWeight === 100
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : totalWeight > 100
              ? 'border-destructive/30 bg-destructive/5 text-destructive'
              : 'border-amber-200 bg-amber-50 text-amber-700',
        )}
      >
        {totalWeight === 100 ? (
          <><Check className="h-4 w-4" /> Total Weight: 100% ✓</>
        ) : totalWeight > 100 ? (
          <><AlertTriangle className="h-4 w-4" /> Total Weight: {totalWeight}% — exceeds 100%</>
        ) : (
          <><AlertTriangle className="h-4 w-4" /> Total Weight: {totalWeight}% — must sum to 100%</>
        )}
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={addCriterion} className="text-primary hover:text-primary/80">
        <Plus className="h-3.5 w-3.5 mr-1" /> + Add Criterion
      </Button>

      {errors.weighted_criteria && (
        <p className="text-xs text-destructive">{errors.weighted_criteria.message}</p>
      )}

      {/* ── Scoring Rubrics (all modes) ── */}
      {namedCriteria.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <div>
            <h4 className="text-sm font-bold text-foreground mb-0.5">Scoring Rubrics</h4>
            <p className="text-xs text-muted-foreground">
              Define what constitutes each score level (1–5) for each criterion.
            </p>
          </div>

          <div className="space-y-2">
            {namedCriteria.map((criterion) => {
              const isOpen = openRubrics.has(criterion.originalIndex);
              const rubrics = criterion.rubrics ?? {};

              return (
                <div
                  key={criterion.originalIndex}
                  className="rounded-lg border border-border overflow-hidden"
                  style={{ borderLeftWidth: '3px', borderLeftColor: 'hsl(38, 92%, 50%)' }}
                >
                  {/* Accordion header */}
                  <button
                    type="button"
                    onClick={() => toggleRubric(criterion.originalIndex)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{criterion.name}</p>
                      {criterion.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{criterion.description}</p>
                      )}
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-muted-foreground shrink-0 ml-2 transition-transform duration-200',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  {/* Accordion content — 5 rubric levels */}
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border bg-muted/10">
                      {RUBRIC_LEVELS.map((level) => (
                        <div key={level.key} className="space-y-1 pt-2">
                          <Label className="text-xs font-medium text-muted-foreground">{level.label}</Label>
                          <Input
                            placeholder={`Describe what ${level.label.split('—')[1]?.trim().toLowerCase() ?? ''} looks like...`}
                            value={(rubrics as any)?.[level.key] ?? ''}
                            onChange={(e) => updateRubric(criterion.originalIndex, level.key, e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
