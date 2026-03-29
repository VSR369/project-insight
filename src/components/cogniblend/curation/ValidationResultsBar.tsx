/**
 * ValidationResultsBar — Info bar below AI review output showing
 * passed checks, auto-corrections, and warnings/errors.
 */

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { ValidationResult } from '@/lib/cogniblend/postLlmValidation';

interface ValidationResultsBarProps {
  result: ValidationResult;
}

export function ValidationResultsBar({ result }: ValidationResultsBarProps) {
  const { corrections, passedChecks } = result;

  if (corrections.length === 0 && passedChecks.length === 0) return null;

  const autoFixed = corrections.filter(c => c.autoFixed);
  const errors = corrections.filter(c => c.severity === 'error' && !c.autoFixed);
  const warnings = corrections.filter(c => c.severity === 'warning');

  return (
    <div className="mt-3 rounded-md border border-border bg-muted/30 p-3 text-sm space-y-2">
      {/* Passed checks */}
      {passedChecks.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Validation passed ({passedChecks.length} check{passedChecks.length !== 1 ? 's' : ''})
          </div>
          <ul className="ml-5 space-y-0.5 text-muted-foreground">
            {passedChecks.map((check, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-emerald-500 mt-0.5">•</span>
                {check}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Auto-corrections */}
      {autoFixed.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {autoFixed.length} auto-correction{autoFixed.length !== 1 ? 's' : ''} applied
          </div>
          <ul className="ml-5 space-y-0.5 text-muted-foreground">
            {autoFixed.map((c, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>
                  {c.field}: <span className="line-through">{String(c.originalValue)}</span>
                  {' → '}
                  <span className="font-medium">{String(c.fixedValue)}</span>
                  <span className="text-xs ml-1 text-muted-foreground">({c.issue})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-destructive">
            <XCircle className="h-3.5 w-3.5" />
            {errors.length} issue{errors.length !== 1 ? 's' : ''} require attention
          </div>
          <ul className="ml-5 space-y-0.5 text-muted-foreground">
            {errors.map((c, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-destructive mt-0.5">•</span>
                <span>{c.issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
          </div>
          <ul className="ml-5 space-y-0.5 text-muted-foreground">
            {warnings.map((c, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>{c.issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
