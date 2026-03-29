/**
 * CompletenessChecklistCard — Right-rail sidebar widget showing
 * a 10-point structural gap analysis for the challenge.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertTriangle, XCircle, ClipboardCheck, Loader2 } from 'lucide-react';
import type { CompletenessResult, CompletenessFailure } from '@/lib/cogniblend/completenessCheck';
import type { CompletenessCheckDef } from '@/lib/cogniblend/completenessCheck';
import { cn } from '@/lib/utils';

interface CompletenessChecklistCardProps {
  result: CompletenessResult | null;
  checkDefs: CompletenessCheckDef[];
  isRunning: boolean;
  onRun: () => void;
  onNavigateToSection?: (sectionKey: string) => void;
}

export function CompletenessChecklistCard({
  result,
  checkDefs,
  isRunning,
  onRun,
  onNavigateToSection,
}: CompletenessChecklistCardProps) {
  // Build a map of failed concepts for quick lookup
  const failedMap = new Map<string, CompletenessFailure>();
  if (result) {
    for (const f of result.failed) {
      failedMap.set(f.concept, f);
    }
  }

  const scoreColor = !result
    ? 'text-muted-foreground'
    : result.score >= 80
      ? 'text-emerald-600'
      : result.score >= 60
        ? 'text-amber-600'
        : 'text-destructive';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Challenge Completeness
          </CardTitle>
          {result && (
            <span className={cn('text-lg font-bold', scoreColor)}>
              {result.passed}/{result.totalChecks}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {result && (
          <Progress
            value={result.score}
            className="h-1.5"
          />
        )}

        {result ? (
          <div className="space-y-1.5">
            {checkDefs.map((check) => {
              const failure = failedMap.get(check.concept);
              const isPassed = !failure;

              // Check if this concept was applicable (not skipped conditional)
              const wasSkipped =
                check.criticality === 'conditional' &&
                !isPassed &&
                !result.failed.some((f) => f.concept === check.concept) &&
                result.totalChecks < checkDefs.length;

              if (wasSkipped) return null;

              return (
                <TooltipProvider key={check.id} delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          'w-full flex items-start gap-2 text-left rounded-md px-2 py-1.5 text-xs transition-colors',
                          isPassed
                            ? 'text-foreground hover:bg-muted/50'
                            : 'text-foreground hover:bg-muted/50 cursor-pointer',
                        )}
                        onClick={() => {
                          if (!isPassed && failure?.missingSections?.[0] && onNavigateToSection) {
                            onNavigateToSection(failure.missingSections[0]);
                          }
                        }}
                        disabled={isPassed}
                      >
                        {isPassed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : failure?.criticality === 'error' ? (
                          <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <span className={cn(isPassed && 'text-muted-foreground')}>
                          {check.concept}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs text-xs">
                      <p className="font-medium mb-1">{check.question}</p>
                      {!isPassed && failure && (
                        <p className="text-muted-foreground">{failure.remediationHint}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Run the check to identify structural gaps in your challenge.
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onRun}
          disabled={isRunning}
          className="w-full text-xs"
        >
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
          )}
          {result ? 'Re-run completeness check' : 'Run completeness check'}
        </Button>
      </CardContent>
    </Card>
  );
}
