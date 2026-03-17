/**
 * Step 1 — Problem Definition
 * Mandatory fields: title, description, problem_statement
 * Enterprise-only (advanced): scope
 */

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ChallengeFormValues } from './challengeFormSchema';

interface StepProblemProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isLightweight: boolean;
}

export function StepProblem({ form, mandatoryFields, isLightweight }: StepProblemProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { register, formState: { errors } } = form;

  const isRequired = (field: string) => mandatoryFields.includes(field);

  const advancedFields = ['scope'];
  const hasAdvanced = isLightweight && advancedFields.some((f) => !mandatoryFields.includes(f));

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-sm font-medium">
          Challenge Title {isRequired('title') && <span className="text-destructive">*</span>}
        </Label>
        <Input
          id="title"
          placeholder="e.g., AI-Powered Supply Chain Optimization"
          className="text-base"
          {...register('title')}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-sm font-medium">
          Brief Description {isRequired('description') && <span className="text-destructive">*</span>}
        </Label>
        <Textarea
          id="description"
          placeholder="Provide a concise overview of the challenge..."
          rows={3}
          className="text-base resize-none"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Problem Statement */}
      <div className="space-y-1.5">
        <Label htmlFor="problem_statement" className="text-sm font-medium">
          Problem Statement {isRequired('problem_statement') && <span className="text-destructive">*</span>}
        </Label>
        <Textarea
          id="problem_statement"
          placeholder="Describe the core problem this challenge aims to solve..."
          rows={5}
          className="text-base resize-none"
          {...register('problem_statement')}
        />
        {errors.problem_statement && (
          <p className="text-xs text-destructive">{errors.problem_statement.message}</p>
        )}
      </div>

      {/* Scope — always visible for Enterprise, expandable for Lightweight */}
      {!isLightweight && (
        <div className="space-y-1.5">
          <Label htmlFor="scope" className="text-sm font-medium">
            Scope {isRequired('scope') && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id="scope"
            placeholder="Define the boundaries and scope of the challenge..."
            rows={3}
            className="text-base resize-none"
            {...register('scope')}
          />
          {errors.scope && (
            <p className="text-xs text-destructive">{errors.scope.message}</p>
          )}
        </div>
      )}

      {/* Advanced Options (Lightweight only) */}
      {hasAdvanced && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Show Advanced Options
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4 pl-1 border-l-2 border-muted ml-1.5">
              <div className="pl-4 space-y-1.5">
                <Label htmlFor="scope" className="text-sm font-medium">
                  Scope <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Textarea
                  id="scope"
                  placeholder="Define the boundaries and scope..."
                  rows={3}
                  className="text-base resize-none"
                  {...register('scope')}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
