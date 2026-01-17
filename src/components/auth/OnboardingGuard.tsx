import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentProvider, useProviderProficiencyAreas } from '@/hooks/queries/useProvider';
import { useProofPoints } from '@/hooks/queries/useProofPoints';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ProviderData } from '@/services/providerService';

interface OnboardingGuardProps {
  requiredStep: number;
  children: React.ReactNode;
}

// Calculate which step the provider is currently on
export function calculateCurrentStep(
  provider: ProviderData | null,
  proficiencyAreas?: string[],
  proofPointsCount?: number
): number {
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

  // Step 5: Proficiency Areas - check if provider has selected proficiency areas
  if (!proficiencyAreas || proficiencyAreas.length === 0) {
    return 5;
  }

  // Step 6: Proof Points - check if provider has added proof points
  if (!proofPointsCount || proofPointsCount === 0) {
    return 6;
  }

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
      return '/enroll/registration';
    case 2:
      return '/enroll/participation-mode';
    case 3:
      return '/enroll/organization';
    case 4:
      return '/enroll/expertise';
    case 5:
      return '/enroll/expertise'; // Proficiency areas are on expertise page
    case 6:
      return '/enroll/proof-points';
    default:
      return '/dashboard';
  }
}

export function OnboardingGuard({ requiredStep, children }: OnboardingGuardProps) {
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: proficiencyAreas, isLoading: areasLoading } = useProviderProficiencyAreas(provider?.id);
  const { data: proofPoints, isLoading: proofsLoading } = useProofPoints(provider?.id);
  const navigate = useNavigate();

  const isLoading = providerLoading || areasLoading || proofsLoading;

  useEffect(() => {
    if (!isLoading && provider) {
      const proofPointsCount = proofPoints?.length ?? 0;
      const currentStep = calculateCurrentStep(provider, proficiencyAreas, proofPointsCount);
      
      if (currentStep < requiredStep) {
        toast.info('Please complete the previous step first');
        navigate(getStepUrl(currentStep));
      }
    }
  }, [provider, proficiencyAreas, proofPoints, isLoading, requiredStep, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if user should be on this step
  const proofPointsCount = proofPoints?.length ?? 0;
  const currentStep = calculateCurrentStep(provider, proficiencyAreas, proofPointsCount);
  if (currentStep < requiredStep) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
