import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useEnrollmentProficiencyAreas } from '@/hooks/queries/useEnrollmentExpertise';
import { useEnrollmentContext, useOptionalEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useProofPoints } from '@/hooks/queries/useProofPoints';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ProviderData } from '@/services/providerService';
import type { EnrollmentWithDetails } from '@/hooks/queries/useProviderEnrollments';

interface OnboardingGuardProps {
  requiredStep: number;
  children: React.ReactNode;
}

/**
 * Calculate which step the provider/enrollment is currently on
 * CRITICAL: Uses ENROLLMENT-scoped data for multi-industry isolation
 */
export function calculateCurrentStep(
  provider: ProviderData | null,
  activeEnrollment: EnrollmentWithDetails | null,
  proficiencyAreas?: string[],
  proofPointsCount?: number
): number {
  if (!provider) return 1;

  // Step 1: Registration (Basic Profile) - still provider-level
  if (!provider.first_name || !provider.address || !provider.country_id) {
    return 1;
  }
  
  // Need an enrollment to proceed beyond step 1
  if (!activeEnrollment) return 1;

  // Step 2: Participation Mode - ENROLLMENT-scoped
  if (!activeEnrollment.participation_mode_id) {
    return 2;
  }

  // Step 3: Organization (conditional - check if requires org info)
  // For now, assume if they have participation_mode_id they can proceed
  // Organization step is handled within ChooseMode navigation

  // Step 4: Expertise Level - ENROLLMENT-scoped
  if (!activeEnrollment.expertise_level_id) {
    return 4;
  }

  // Step 5: Proficiency Areas - ENROLLMENT-scoped
  if (!proficiencyAreas || proficiencyAreas.length === 0) {
    return 5;
  }

  // Step 6: Proof Points - check if provider has added proof points for this enrollment
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
  const enrollmentContext = useOptionalEnrollmentContext();
  const activeEnrollment = enrollmentContext?.activeEnrollment ?? null;
  const activeEnrollmentId = enrollmentContext?.activeEnrollmentId ?? null;
  const enrollmentLoading = enrollmentContext?.isLoading ?? false;
  
  // CRITICAL: Use ENROLLMENT-scoped proficiency areas
  const { data: proficiencyAreas, isLoading: areasLoading } = useEnrollmentProficiencyAreas(activeEnrollmentId ?? undefined);
  
  // Proof points for the current enrollment (filter by enrollment's industry_segment_id)
  const activeIndustryId = activeEnrollment?.industry_segment_id;
  const { data: proofPoints, isLoading: proofsLoading } = useProofPoints(
    provider?.id, 
    { industrySegmentId: activeIndustryId ?? undefined }
  );
  const navigate = useNavigate();

  const isLoading = providerLoading || enrollmentLoading || areasLoading || proofsLoading;

  useEffect(() => {
    if (!isLoading && provider) {
      const proofPointsCount = proofPoints?.length ?? 0;
      const currentStep = calculateCurrentStep(provider, activeEnrollment, proficiencyAreas, proofPointsCount);
      
      if (currentStep < requiredStep) {
        toast.info('Please complete the previous step first');
        navigate(getStepUrl(currentStep));
      }
    }
  }, [provider, activeEnrollment, proficiencyAreas, proofPoints, isLoading, requiredStep, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if user should be on this step
  const proofPointsCount = proofPoints?.length ?? 0;
  const currentStep = calculateCurrentStep(provider, activeEnrollment, proficiencyAreas, proofPointsCount);
  if (currentStep < requiredStep) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
