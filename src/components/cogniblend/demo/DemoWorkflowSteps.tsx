/**
 * DemoWorkflowSteps — Visual workflow indicator matching md_lifecycle_phase_config.
 * Phase order: Create → Curation → Compliance → Publication → Solver Submit.
 * QUICK collapses phases 2-4 into a single "Auto-Complete" step.
 */

import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import type { GovernanceMode } from '@/lib/governanceMode';

interface Step {
  label: string;
  role: string;
  description: string;
}

function buildSteps(mode: GovernanceMode): Step[] {
  if (mode === 'QUICK') {
    return [
      { label: 'Create', role: 'CR', description: 'Creator submits problem brief with 5 fields' },
      { label: 'Auto-Complete', role: 'System', description: 'Curation + Legal + Publication handled automatically' },
      { label: 'Solver Submit', role: 'Solver', description: 'Solvers submit abstracts' },
    ];
  }

  if (mode === 'CONTROLLED') {
    return [
      { label: 'Create', role: 'CR', description: 'Creator submits 12 fields + mandatory AI review' },
      { label: 'Curation', role: 'CU', description: '14-point checklist + AI review + dual curation' },
      { label: 'Compliance', role: 'LC + FC', description: 'AI-powered legal review + mandatory escrow deposit (parallel)' },
      { label: 'Publication', role: 'System', description: 'Challenge published with full audit snapshot' },
      { label: 'Solver Submit', role: 'Solver', description: 'Solvers submit proposals' },
    ];
  }

  // STRUCTURED (default)
  return [
    { label: 'Create', role: 'CR', description: 'Creator submits problem brief with 8 fields' },
    { label: 'Curation', role: 'CU', description: 'Curator reviews with 14-point quality checklist' },
    { label: 'Compliance', role: 'LC', description: 'Legal review on curated version. Optional escrow.' },
    { label: 'Publication', role: 'System', description: 'Challenge goes live' },
    { label: 'Solver Submit', role: 'Solver', description: 'Solvers submit proposals' },
  ];
}

interface DemoWorkflowStepsProps {
  governanceMode?: GovernanceMode;
  /** @deprecated No longer used — kept for backward compat */
  variant?: 'ai' | 'manual';
  /** @deprecated No longer used */
  engagementModel?: string;
}

export function DemoWorkflowSteps({ governanceMode }: DemoWorkflowStepsProps) {
  const mode = governanceMode ?? 'STRUCTURED';
  const steps = buildSteps(mode);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          Lifecycle Workflow — {mode}
        </span>
      </div>
      <div className="flex items-start gap-1 overflow-x-auto pb-1">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-start">
            <div className="flex flex-col items-center min-w-[90px] lg:min-w-[110px]">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  'bg-primary text-primary-foreground',
                )}
              >
                {i + 1}
              </div>
              <span className="text-xs font-medium text-foreground mt-1 text-center">{step.label}</span>
              <span className="text-[10px] text-muted-foreground text-center">{step.role}</span>
              <span className="text-[10px] text-muted-foreground/70 text-center mt-0.5 italic">
                {step.description}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-0.5 w-4 lg:w-6 mt-3.5 shrink-0 bg-primary/30')} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
