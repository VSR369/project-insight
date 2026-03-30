/**
 * DemoWorkflowSteps — Visual workflow indicator for AI vs Manual paths.
 * Dynamically adapts Step 1 role and notes based on engagement model and governance mode.
 */

import { cn } from '@/lib/utils';
import { Sparkles, Settings2 } from 'lucide-react';
import type { GovernanceMode } from '@/lib/governanceMode';

interface Step {
  label: string;
  role: string;
  aiNote: string;
  manualNote: string;
}

function buildSteps(engagementModel?: string, governanceMode?: GovernanceMode): Step[] {
  const isMP = engagementModel === 'MP';
  const mode = governanceMode ?? 'STRUCTURED';

  // Step 1 adapts to engagement model
  const step1Role = 'CR';
  const step1AiNote = isMP ? 'Creator submits problem brief' : 'Creator shares idea';
  const step1ManualNote = isMP ? '6-field problem brief' : '3-field idea form';

  // Step 4 (Curation) adapts to governance mode
  const step4AiNote =
    mode === 'QUICK' ? 'Auto-complete quality check' :
    mode === 'CONTROLLED' ? 'Formal gate quality review' :
    'AI quality check';
  const step4ManualNote =
    mode === 'QUICK' ? 'Simplified checklist' :
    mode === 'CONTROLLED' ? 'Full compliance checklist' :
    '14-point checklist';

  // Step 5 (Approval) adapts to governance mode
  const step5AiNote =
    mode === 'QUICK' ? 'Auto-approved' :
    mode === 'CONTROLLED' ? 'Formal gate approval' :
    'Approve package';

  return [
    { label: 'Create', role: step1Role, aiNote: step1AiNote, manualNote: step1ManualNote },
    { label: 'Spec Review', role: 'CR', aiNote: 'Review AI output', manualNote: 'Review wizard data' },
    { label: 'Legal Docs', role: 'LC', aiNote: 'AI suggests docs, LC reviews', manualNote: 'Upload documents' },
    { label: 'Curation', role: 'CU', aiNote: step4AiNote, manualNote: step4ManualNote },
    { label: 'Approval', role: 'ID', aiNote: step5AiNote, manualNote: 'Approve package' },
    { label: 'Publication', role: 'System', aiNote: 'Go live', manualNote: 'Go live' },
  ];
}

interface DemoWorkflowStepsProps {
  variant: 'ai' | 'manual';
  engagementModel?: string;
  governanceMode?: GovernanceMode;
}

export function DemoWorkflowSteps({ variant, engagementModel, governanceMode }: DemoWorkflowStepsProps) {
  const isAi = variant === 'ai';
  const steps = buildSteps(engagementModel, governanceMode);

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
        {steps.map((step, i) => (
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
            {i < steps.length - 1 && (
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
