/**
 * ChallengeWizardBottomBar — Fixed actions at bottom of wizard card.
 * Left: Save Draft. Right: Back (hidden on Step 1) + Next/Submit.
 */

import { Save, ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const isEnterprise = governanceProfile === 'ENTERPRISE';

  const submitLabel = isEnterprise
    ? 'Submit for Legal Review'
    : 'Submit for Curation';

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
        {isSaving ? (
          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-1.5" />
        )}
        Save Draft
      </Button>

      {/* Right — Back + Next/Submit */}
      <div className="flex items-center gap-2">
        {currentStep > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isSaving || isSubmitting}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
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
          {isLastStep ? submitLabel : 'Next'}
        </Button>
      </div>
    </div>
  );
}
