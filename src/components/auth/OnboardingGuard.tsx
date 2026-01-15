import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ProviderData } from '@/services/providerService';

interface OnboardingGuardProps {
  requiredStep: number;
  children: React.ReactNode;
}

// Calculate which step the provider is currently on
export function calculateCurrentStep(provider: ProviderData | null): number {
  if (!provider) return 1;

  // Step 1: Registration (Basic Profile)
  if (!provider.first_name || !provider.address || !provider.country_id || !provider.industry_segment_id) {
    return 1;
  }

  // Step 2: Participation Mode
  if (!provider.participation_mode_id) {
    return 2;
  }

  // Step 3: Organization (conditional - check if requires org info)
  // For now, assume if they have participation_mode_id they can proceed
  // Organization step is handled within ChooseMode navigation

  // Step 4: Expertise Level
  if (!provider.expertise_level_id) {
    return 4;
  }

  // Step 5: Proficiency Areas
  // TODO: Check if provider has selected proficiency areas

  // Step 6: Proof Points
  // TODO: Check if provider has added proof points

  // If all steps completed
  if (provider.onboarding_status === 'completed') {
    return 7; // Beyond all steps
  }

  return 6; // Default to proof points step
}

// Get the URL for a specific step
export function getStepUrl(step: number): string {
  switch (step) {
    case 1:
      return '/profile/build/registration';
    case 2:
      return '/profile/build/choose-mode';
    case 3:
      return '/profile/build/organization';
    case 4:
      return '/profile/build/expertise';
    case 5:
      return '/profile/build/proficiency';
    case 6:
      return '/profile/build/proof-points';
    default:
      return '/dashboard';
  }
}

export function OnboardingGuard({ requiredStep, children }: OnboardingGuardProps) {
  const { data: provider, isLoading } = useCurrentProvider();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && provider) {
      const currentStep = calculateCurrentStep(provider);
      
      if (currentStep < requiredStep) {
        toast.info('Please complete the previous step first');
        navigate(getStepUrl(currentStep));
      }
    }
  }, [provider, isLoading, requiredStep, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if user should be on this step
  const currentStep = calculateCurrentStep(provider);
  if (currentStep < requiredStep) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
