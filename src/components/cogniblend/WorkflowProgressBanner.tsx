/**
 * WorkflowProgressBanner — Contextual step indicator for challenge lifecycle screens.
 * Shows current step, next step, and required role so users always know where they are.
 *
 * Corrected phase mapping:
 *   Phase 1 → Create, Phase 2 → Curation, Phase 3 → Compliance,
 *   Phase 4 → Published, Phase 5-8 → Solver Flow, Phase 9-10 → Award & Close
 */

import { Info, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Step definitions ───────────────────────────────────── */

interface WorkflowStep {
  step: number;
  label: string;
  nextLabel: string | null;
  nextRole: string | null;
  description: string;
}

const WORKFLOW_STEPS: Record<number, WorkflowStep> = {
  1: {
    step: 1,
    label: 'Create',
    nextLabel: 'Curation',
    nextRole: 'Curator (CU)',
    description: 'Creator fills in the challenge form and submits for review.',
  },
  2: {
    step: 2,
    label: 'Curation',
    nextLabel: 'Compliance',
    nextRole: 'Legal (LC) / Finance (FC)',
    description: 'Curator reviews the specification, runs AI review, and completes the checklist.',
  },
  3: {
    step: 3,
    label: 'Compliance',
    nextLabel: 'Published',
    nextRole: 'System',
    description: 'Legal Coordinator reviews documents and Financial Controller verifies escrow.',
  },
  4: {
    step: 4,
    label: 'Published',
    nextLabel: 'Solver Flow',
    nextRole: 'Solvers',
    description: 'Challenge is live and accepting submissions from solvers.',
  },
  5: {
    step: 5,
    label: 'Solver Flow',
    nextLabel: 'Award & Close',
    nextRole: 'Expert Reviewer (ER)',
    description: 'Solvers submit abstracts and solutions; expert reviewers evaluate them.',
  },
  6: {
    step: 6,
    label: 'Award & Close',
    nextLabel: null,
    nextRole: null,
    description: 'Winners selected, payments processed, challenge closed.',
  },
};

const TOTAL_STEPS = 6;

/* ── Phase → step mapping ───────────────────────────────── */

function phaseToStep(currentPhase: number | null | undefined): number {
  const phase = currentPhase ?? 1;
  if (phase <= 1) return 1;
  if (phase === 2) return 2;
  if (phase === 3) return 3;
  if (phase === 4) return 4;
  if (phase >= 5 && phase <= 8) return 5;
  return 6;
}

/* ── Component ──────────────────────────────────────────── */

interface WorkflowProgressBannerProps {
  currentPhase?: number | null;
  /** Override step directly instead of mapping from phase */
  step?: number;
  className?: string;
}

export function WorkflowProgressBanner({
  currentPhase,
  step: stepOverride,
  className,
}: WorkflowProgressBannerProps) {
  const currentStep = stepOverride ?? phaseToStep(currentPhase);
  const stepInfo = WORKFLOW_STEPS[currentStep] ?? WORKFLOW_STEPS[1];

  return (
    <div
      className={cn(
        'rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 mb-5',
        className,
      )}
    >
      {/* Step dots */}
      <div className="flex items-center gap-1.5 mb-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const s = i + 1;
          return (
            <div
              key={s}
              className={cn(
                'h-2 rounded-full transition-all',
                s < currentStep && 'bg-primary w-6',
                s === currentStep && 'bg-primary w-8',
                s > currentStep && 'bg-primary/20 w-4',
              )}
            />
          );
        })}
        <span className="ml-2 text-xs font-medium text-primary">
          Step {currentStep} of {TOTAL_STEPS}
        </span>
      </div>

      {/* Current + next */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-1.5 lg:gap-4">
        <div className="flex items-center gap-1.5">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground">
            {stepInfo.label}
          </span>
        </div>

        <p className="text-xs text-muted-foreground lg:flex-1">
          {stepInfo.description}
        </p>

        {stepInfo.nextLabel && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>
              Next: <span className="font-medium text-foreground">{stepInfo.nextLabel}</span>
            </span>
            {stepInfo.nextRole && (
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium">
                {stepInfo.nextRole}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
