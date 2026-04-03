/**
 * ChallengeWizardBottomBar — Fixed actions at bottom of wizard card.
 * Left: Save Draft. Right: Back + Next/Submit with contextual labels.
 */

import { Save, ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveGovernanceMode, isStructuredOrAbove } from '@/lib/governanceMode';

const STEP_NEXT_LABELS: Record<number, string> = {
  0: 'Continue to Challenge Brief',
  1: 'Continue to Evaluation Criteria',
  2: 'Next: Rewards & Payment',
  3: 'Next: Timeline & Phase Schedule',
  4: 'Next: Provider Eligibility',
  5: 'Next: Templates',
  6: 'Next: Review & Submit',
};

const STEP_BACK_LABELS: Record<number, string> = {
  1: 'Back to Mode & Model',
  2: 'Back to Challenge Brief',
  3: 'Back to Evaluation',
  4: 'Back to Rewards',
  5: 'Back to Timeline',
  6: 'Back to Eligibility',
  7: 'Back to Templates',
};

interface ChallengeWizardBottomBarProps {
  currentStep: number;
  totalSteps: number;
  governanceProfile: string | null;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  isSaving: boolean;
  isSubmitting: boolean;
}

export function ChallengeWizardBottomBar({
  currentStep,
  totalSteps,
  governanceProfile,
  onBack,
  onNext,
  onSaveDraft,
  isSaving,
  isSubmitting,
}: ChallengeWizardBottomBarProps) {
  const isLastStep = currentStep === totalSteps;
  const isEnterprise = isStructuredOrAbove(resolveGovernanceMode(governanceProfile));

  const submitLabel = isEnterprise ? 'Submit for Legal Review' : 'Submit for Curation';
  const nextLabel = isLastStep ? submitLabel : (STEP_NEXT_LABELS[currentStep] ?? 'Next');
  const backLabel = STEP_BACK_LABELS[currentStep] ?? 'Back';

  return (
    <div className="flex items-center justify-between pt-5 border-t border-border mt-6">
      {/* Left — Save Draft */}
      <Button
        type="button"
        variant="outline"
        onClick={onSaveDraft}
        disabled={isSaving || isSubmitting}
        className="text-muted-foreground"
      >
        {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
        Save Draft
      </Button>

      {/* Right — Back + Next/Submit */}
      <div className="flex items-center gap-2">
        {currentStep > 0 && (
          <Button type="button" variant="outline" onClick={onBack} disabled={isSaving || isSubmitting}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {backLabel}
          </Button>
        )}

        <Button
          type="button"
          onClick={onNext}
          disabled={isSaving || isSubmitting}
          style={{ backgroundColor: '#378ADD' }}
          className="text-white hover:opacity-90"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : isLastStep ? (
            <Send className="h-4 w-4 mr-1.5" />
          ) : (
            <ArrowRight className="h-4 w-4 mr-1.5" />
          )}
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
