import { ReactNode, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Save, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { WizardStepper, type WizardStep } from './WizardStepper';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useParticipationModes } from '@/hooks/queries/useMasterData';

// Define all 9 enrollment steps
const ENROLLMENT_STEPS: WizardStep[] = [
  { id: 1, title: 'Complete Registration', shortTitle: 'Register' },
  { id: 2, title: 'Participation Mode', shortTitle: 'Mode' },
  { id: 3, title: 'Organization Details', shortTitle: 'Org' },
  { id: 4, title: 'Expertise Level', shortTitle: 'Expertise' },
  { id: 5, title: 'Proof Points', shortTitle: 'Proof' },
  { id: 6, title: 'Assess Knowledge', shortTitle: 'Assess' },
  { id: 7, title: 'Interview Slot', shortTitle: 'Slot' },
  { id: 8, title: 'Panel Discussion', shortTitle: 'Panel' },
  { id: 9, title: 'Certification', shortTitle: 'Cert' },
];

interface WizardLayoutProps {
  children: ReactNode;
  currentStep: number;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  backLabel?: string;
  isSubmitting?: boolean;
  canContinue?: boolean;
  hideBackButton?: boolean;
  hideContinueButton?: boolean;
  showSaveAndExit?: boolean;
}

export function WizardLayout({
  children,
  currentStep,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  backLabel = 'Back',
  isSubmitting = false,
  canContinue = true,
  hideBackButton = false,
  hideContinueButton = false,
  showSaveAndExit = true,
}: WizardLayoutProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: provider } = useCurrentProvider();
  const { data: participationModes } = useParticipationModes();

  // Calculate completed steps based on provider data
  const completedSteps = useMemo(() => {
    const completed: number[] = [];
    if (!provider) return completed;

    // Step 1: Registration
    if (provider.first_name && provider.address && provider.country_id && provider.industry_segment_id) {
      completed.push(1);
    }

    // Step 2: Participation Mode
    if (provider.participation_mode_id) {
      completed.push(2);
    }

    // Step 3: Organization (if applicable)
    const selectedMode = participationModes?.find(m => m.id === provider.participation_mode_id);
    if (selectedMode && !selectedMode.requires_org_info) {
      // Org not required, mark as completed (skipped)
      completed.push(3);
    } else if (provider.organization?.org_name) {
      completed.push(3);
    }

    // Step 4: Expertise Level
    if (provider.expertise_level_id) {
      completed.push(4);
    }

    // Step 5-9: TODO - based on proof points, assessment, etc.
    if (provider.onboarding_status === 'completed') {
      completed.push(5, 6, 7, 8, 9);
    }

    return completed;
  }, [provider, participationModes]);

  // Calculate skipped steps (e.g., Org step when not required)
  const skippedSteps = useMemo(() => {
    if (!provider?.participation_mode_id || !participationModes) return [];
    
    const selectedMode = participationModes.find(m => m.id === provider.participation_mode_id);
    if (selectedMode && !selectedMode.requires_org_info) {
      return [3]; // Org step is skipped
    }
    return [];
  }, [provider?.participation_mode_id, participationModes]);

  // Route mapping for step navigation
  const STEP_ROUTES: Record<number, string> = {
    1: '/enroll/registration',
    2: '/enroll/mode',
    3: '/enroll/organization',
    4: '/enroll/expertise',
    5: '/enroll/proof-points',
    6: '/enroll/assessment',
    7: '/enroll/interview-slot',
    8: '/enroll/panel-discussion',
    9: '/enroll/certification',
  };

  const handleStepClick = (stepId: number) => {
    // Allow navigation to completed steps only
    if (completedSteps.includes(stepId) && STEP_ROUTES[stepId]) {
      navigate(STEP_ROUTES[stepId]);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSaveAndExit = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center justify-between h-14 px-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CB</span>
            </div>
            <span className="font-semibold text-sm hidden sm:inline">CogniBlend</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {showSaveAndExit && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSaveAndExit}
                className="gap-2 hidden sm:flex"
              >
                <Save className="h-4 w-4" />
                Save & Exit
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log Out</span>
            </Button>
          </div>
        </div>

        {/* Step Indicator */}
        <WizardStepper
          steps={ENROLLMENT_STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          skippedSteps={skippedSteps}
          onStepClick={handleStepClick}
        />
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container max-w-4xl py-6 px-4">
          {children}
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center justify-between h-16 px-4">
          <div>
            {!hideBackButton && onBack && (
              <Button
                variant="outline"
                onClick={onBack}
                disabled={isSubmitting}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Button>
            )}
          </div>
          <div>
            {!hideContinueButton && onContinue && (
              <Button
                onClick={onContinue}
                disabled={!canContinue || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {continueLabel}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export { ENROLLMENT_STEPS };
