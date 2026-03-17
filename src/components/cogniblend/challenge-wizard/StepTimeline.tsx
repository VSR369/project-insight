/**
 * Step 4 — Timeline & Schedule
 * Mandatory fields: phase_schedule
 * Enterprise-only (advanced): permitted_artifact_types
 */

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ChallengeFormValues } from './challengeFormSchema';

interface StepTimelineProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isLightweight: boolean;
}

export function StepTimeline({ form, mandatoryFields, isLightweight }: StepTimelineProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { register, formState: { errors } } = form;

  const isRequired = (field: string) => mandatoryFields.includes(field);

  return (
    <div className="space-y-5">
      {/* Submission Deadline */}
      <div className="space-y-1.5">
        <Label htmlFor="submission_deadline" className="text-sm font-medium">
          Submission Deadline {isRequired('phase_schedule') && <span className="text-destructive">*</span>}
        </Label>
        <Input
          id="submission_deadline"
          type="datetime-local"
          className="text-base max-w-sm"
          {...register('submission_deadline')}
        />
        {errors.submission_deadline && (
          <p className="text-xs text-destructive">{errors.submission_deadline.message}</p>
        )}
      </div>

      {/* Expected Timeline */}
      <div className="space-y-1.5">
        <Label htmlFor="expected_timeline" className="text-sm font-medium">
          Expected Timeline
        </Label>
        <Input
          id="expected_timeline"
          placeholder="e.g., 4 weeks, 3 months"
          className="text-base max-w-sm"
          {...register('expected_timeline')}
        />
      </div>

      {/* Review Duration */}
      <div className="space-y-1.5">
        <Label htmlFor="review_duration" className="text-sm font-medium">
          Review Period (days)
        </Label>
        <Input
          id="review_duration"
          type="number"
          min={1}
          max={90}
          placeholder="14"
          className="text-base max-w-[120px]"
          {...register('review_duration', { valueAsNumber: true })}
        />
        <p className="text-xs text-muted-foreground">How long reviewers have to evaluate submissions</p>
      </div>

      {/* Phase Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="phase_notes" className="text-sm font-medium">
          Schedule Notes
        </Label>
        <Textarea
          id="phase_notes"
          placeholder="Any additional timing considerations, milestones, or dependencies..."
          rows={3}
          className="text-base resize-none"
          {...register('phase_notes')}
        />
      </div>

      {/* Advanced (Lightweight) */}
      {isLightweight && (
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
                <Label htmlFor="permitted_artifact_types" className="text-sm font-medium">
                  Permitted Artifact Types <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="permitted_artifact_types"
                  placeholder="e.g., PDF, DOCX, ZIP, Code Repository"
                  className="text-base"
                  {...register('permitted_artifact_types')}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enterprise-only */}
      {!isLightweight && (
        <div className="space-y-1.5">
          <Label htmlFor="permitted_artifact_types_ent" className="text-sm font-medium">
            Permitted Artifact Types {isRequired('permitted_artifact_types') && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="permitted_artifact_types_ent"
            placeholder="e.g., PDF, DOCX, ZIP, Code Repository"
            className="text-base"
            {...register('permitted_artifact_types')}
          />
        </div>
      )}
    </div>
  );
}
