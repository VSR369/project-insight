/**
 * DemoWorkflowSteps — Visual workflow indicator for AI vs Manual paths.
 */

import { cn } from '@/lib/utils';
import { Sparkles, Settings2 } from 'lucide-react';

interface Step {
  label: string;
  role: string;
  aiNote: string;
  manualNote: string;
}

const STEPS: Step[] = [
  { label: 'Create', role: 'RQ / CR', aiNote: 'AI generates spec', manualNote: '8-step wizard' },
  { label: 'Spec Review', role: 'CR', aiNote: 'Review AI output', manualNote: 'Review wizard data' },
  { label: 'Legal Docs', role: 'LC', aiNote: 'Upload & AI review', manualNote: 'Upload documents' },
  { label: 'Curation', role: 'CU', aiNote: 'AI quality check', manualNote: '14-point checklist' },
  { label: 'Approval', role: 'ID', aiNote: 'Approve package', manualNote: 'Approve package' },
  { label: 'Publication', role: 'System', aiNote: 'Go live', manualNote: 'Go live' },
];

interface DemoWorkflowStepsProps {
  variant: 'ai' | 'manual';
}

export function DemoWorkflowSteps({ variant }: DemoWorkflowStepsProps) {
  const isAi = variant === 'ai';

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        {isAi ? (
          <Sparkles className="h-4 w-4 text-primary" />
        ) : (
          <Settings2 className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-semibold text-foreground">
          {isAi ? 'AI-Assisted Workflow' : 'Manual Editor Workflow'}
        </span>
      </div>
      <div className="flex items-start gap-1 overflow-x-auto pb-1">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex items-start">
            <div className="flex flex-col items-center min-w-[90px] lg:min-w-[110px]">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  isAi
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground',
                )}
              >
                {i + 1}
              </div>
              <span className="text-xs font-medium text-foreground mt-1 text-center">{step.label}</span>
              <span className="text-[10px] text-muted-foreground text-center">{step.role}</span>
              <span className="text-[10px] text-muted-foreground/70 text-center mt-0.5 italic">
                {isAi ? step.aiNote : step.manualNote}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'h-0.5 w-4 lg:w-6 mt-3.5 shrink-0',
                isAi ? 'bg-primary/30' : 'bg-border',
              )} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
