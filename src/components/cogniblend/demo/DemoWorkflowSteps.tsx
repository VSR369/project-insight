/**
 * DemoWorkflowSteps — Visual workflow indicator for AI vs Manual paths.
 * Reflects the 10-phase lifecycle. Shows first 5 seeker-side phases.
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

  // Step 1: Create (Phase 1)
  const step1AiNote = isMP ? 'Creator submits problem brief' : 'Creator shares idea';
  const step1ManualNote = isMP ? '6-field problem brief' : '3-field idea form';

  // Step 2: Compliance (Phase 2 — LC + FC)
  const step2AiNote =
    mode === 'QUICK' ? 'Auto-applied defaults' :
    mode === 'CONTROLLED' ? 'LC review + escrow funding' :
    'LC review, optional escrow';
  const step2ManualNote =
    mode === 'QUICK' ? 'Auto-complete' :
    mode === 'CONTROLLED' ? 'Full legal + escrow gate' :
    'Legal docs + optional escrow';

  // Step 3: Curation (Phase 3)
  const step3AiNote =
    mode === 'QUICK' ? 'Auto-complete quality check' :
    mode === 'CONTROLLED' ? 'Formal gate quality review' :
    'AI quality check';
  const step3ManualNote =
    mode === 'QUICK' ? 'Simplified checklist' :
    mode === 'CONTROLLED' ? 'Full compliance checklist' :
    '14-point checklist';

  // Step 4: Publication (Phase 4)
  const step4AiNote = 'Challenge goes live';
  const step4ManualNote = 'Publish to marketplace';

  // Step 5: Abstract Submit (Phase 5)
  const step5AiNote = 'Solvers submit abstracts';
  const step5ManualNote = 'Solver abstract intake';

  return [
    { label: 'Create', role: 'CR', aiNote: step1AiNote, manualNote: step1ManualNote },
    { label: 'Compliance', role: 'LC/FC', aiNote: step2AiNote, manualNote: step2ManualNote },
    { label: 'Curation', role: 'CU', aiNote: step3AiNote, manualNote: step3ManualNote },
    { label: 'Publication', role: 'System', aiNote: step4AiNote, manualNote: step4ManualNote },
    { label: 'Abstract Submit', role: 'Solver', aiNote: step5AiNote, manualNote: step5ManualNote },
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
