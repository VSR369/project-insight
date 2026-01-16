import { ReactNode, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Save, ArrowLeft, ArrowRight, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { WizardStepper, type WizardStep } from './WizardStepper';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useParticipationModes } from '@/hooks/queries/useMasterData';
import { HierarchyBreadcrumb } from '@/components/provider/HierarchyBreadcrumb';
import { BlockedModeChangeDialog } from '@/components/enrollment/BlockedModeChangeDialog';
import { useCancelOrgApprovalAndResetMode } from '@/hooks/queries/useCancelOrgApproval';
import { isWizardStepLocked, LOCK_THRESHOLDS } from '@/services/lifecycleService';
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
  const { isAdmin } = useUserRoles();
  const { data: provider } = useCurrentProvider();
  const { data: participationModes } = useParticipationModes();
  const cancelOrgApproval = useCancelOrgApprovalAndResetMode();
  
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [showNavigationBlockDialog, setShowNavigationBlockDialog] = useState(false);
  const [showOrgRequiredDialog, setShowOrgRequiredDialog] = useState(false);
  const [blockingStepTitle, setBlockingStepTitle] = useState('');
  const [blockingStepId, setBlockingStepId] = useState<number | null>(null);

  // Determine if org step is required based on selected participation mode
  // KEY FIX: If no mode is selected, default to FALSE (hide org step until mode chosen)
  const isOrgRequired = useMemo(() => {
    // No mode selected yet = org step not applicable
    if (!provider?.participation_mode_id) return false;
    // Modes not loaded yet = wait (show loading or safe default)
    if (!participationModes) return false;
    const selectedMode = participationModes.find(m => m.id === provider.participation_mode_id);
    return selectedMode?.requires_org_info ?? false;
  }, [provider?.participation_mode_id, participationModes]);

  // Filter visible steps - hide Organization step when not required
  const visibleSteps = useMemo(() => {
    if (!isOrgRequired) {
      return ENROLLMENT_STEPS.filter(step => step.id !== 3);
    }
    return ENROLLMENT_STEPS;
  }, [isOrgRequired]);

  // Check if mode step (step 2) is blocked due to pending approval
  const isModeStepBlocked = useMemo(() => {
    if (!provider?.organization) return false;
    const status = (provider.organization as any)?.approval_status;
    return status === 'pending';
  }, [provider?.organization]);

  // Organization details for blocking dialog
  const orgDetails = useMemo(() => {
    if (!provider?.organization) return null;
    const org = provider.organization as any;
    return {
      orgName: org.org_name,
      managerName: org.manager_name,
      managerEmail: org.manager_email,
    };
  }, [provider?.organization]);

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

    // Step 3: Organization (only if required AND approved - not just org_name presence)
    // KEY FIX: Use approval_status to determine completion, not just field presence
    if (isOrgRequired && provider.organization?.org_name) {
      const approvalStatus = (provider.organization as any)?.approval_status;
      // Only mark complete if approved (not pending, withdrawn, or declined)
      if (approvalStatus === 'approved') {
        completed.push(3);
      }
    }

    // IMPORTANT: If org is required but not complete, steps after org (4+) should not be accessible
    // even if they have data from a previous mode selection

    // Step 4: Expertise Level
    if (provider.expertise_level_id) {
      completed.push(4);
    }

    // Step 5-9: TODO - based on proof points, assessment, etc.
    if (provider.onboarding_status === 'completed') {
      completed.push(5, 6, 7, 8, 9);
    }

    return completed;
  }, [provider, isOrgRequired]);

  // Blocked steps - currently only step 2 (Mode) can be blocked
  const blockedSteps = useMemo(() => {
    if (isModeStepBlocked) return [2];
    return [];
  }, [isModeStepBlocked]);

  // Locked steps - based on lifecycle rank (terminal state, assessment, panel)
  const lockedSteps = useMemo(() => {
    if (!provider?.lifecycle_rank) return [];
    const locked: number[] = [];
    visibleSteps.forEach(step => {
      if (isWizardStepLocked(step.id, provider.lifecycle_rank)) {
        locked.push(step.id);
      }
    });
    return locked;
  }, [provider?.lifecycle_rank, visibleSteps]);

  // No skipped steps needed since we hide the step entirely
  const skippedSteps: number[] = [];

  // Route mapping for step navigation (must match App.tsx routes)
  const STEP_ROUTES: Record<number, string> = {
    1: '/enroll/registration',
    2: '/enroll/participation-mode',
    3: '/enroll/organization',
    4: '/enroll/expertise',
    5: '/enroll/proof-points',
    6: '/enroll/assessment',       // TODO: create these routes
    7: '/enroll/interview-slot',   // TODO: create these routes
    8: '/enroll/panel-discussion', // TODO: create these routes
    9: '/enroll/certification',    // TODO: create these routes
  };

  // Calculate next accessible step (first incomplete step after all completed)
  const nextAccessibleStep = useMemo(() => {
    const maxCompleted = completedSteps.length > 0 ? Math.max(...completedSteps) : 0;
    return maxCompleted + 1;
  }, [completedSteps]);

  // Check if a step is accessible (all preceding visible steps must be complete)
  const isStepAccessible = useMemo(() => {
    return (stepId: number): boolean => {
      if (stepId === currentStep) return true;
      
      const visibleStepIds = visibleSteps.map(s => s.id);
      const stepIndex = visibleStepIds.indexOf(stepId);
      if (stepIndex === -1) return false;
      
      // Check all preceding visible steps are completed
      for (let i = 0; i < stepIndex; i++) {
        if (!completedSteps.includes(visibleStepIds[i])) {
          return false; // A preceding step is incomplete
        }
      }
      return true;
    };
  }, [visibleSteps, completedSteps, currentStep]);

  // Compute accessible steps array
  const accessibleSteps = useMemo(() => {
    return visibleSteps
      .filter(step => isStepAccessible(step.id))
      .map(s => s.id);
  }, [visibleSteps, isStepAccessible]);

  // Check if org details are incomplete when org_rep mode is selected
  const isOrgIncomplete = useMemo(() => {
    if (!isOrgRequired) return false;
    if (!provider?.organization?.org_name) return true;
    const approvalStatus = (provider.organization as any)?.approval_status;
    // Incomplete if no approval status or not approved
    return approvalStatus !== 'approved';
  }, [isOrgRequired, provider?.organization]);

  const handleStepClick = (stepId: number) => {
    // Block navigation to step 2 (Mode) if pending approval
    if (stepId === 2 && isModeStepBlocked) {
      setShowBlockedDialog(true);
      return;
    }
    
    // Special case: org_rep mode selected but org details incomplete
    // Block access to steps after org (step 4+) and show org required dialog
    if (isOrgRequired && isOrgIncomplete && stepId > 3) {
      // Only show popup for COMPLETED steps (green circles)
      if (completedSteps.includes(stepId)) {
        setShowOrgRequiredDialog(true);
      }
      return; // Don't navigate
    }
    
    // Check if step is accessible (all preceding steps complete)
    if (!isStepAccessible(stepId)) {
      // Only show popup for COMPLETED steps that are blocked by an earlier incomplete step
      // Gray (not started) steps just do nothing
      if (completedSteps.includes(stepId)) {
        const blockingStep = visibleSteps.find(s => 
          !completedSteps.includes(s.id) && s.id < stepId
        );
        if (blockingStep) {
          setBlockingStepTitle(blockingStep.title.toLowerCase());
          setBlockingStepId(blockingStep.id);
          setShowNavigationBlockDialog(true);
        }
      }
      return; // Don't navigate
    }
    
    if (STEP_ROUTES[stepId]) {
      navigate(STEP_ROUTES[stepId]);
    }
  };

  // Handle org required dialog confirmation - navigate to org screen
  const handleOrgRequiredConfirm = () => {
    setShowOrgRequiredDialog(false);
    navigate(STEP_ROUTES[3]); // Navigate to organization screen
  };

  // Handle navigation block dialog confirmation
  const handleNavigationBlockConfirm = () => {
    setShowNavigationBlockDialog(false);
    if (blockingStepId && STEP_ROUTES[blockingStepId]) {
      navigate(STEP_ROUTES[blockingStepId]);
    }
  };

  // Handle cancel and reset mode from blocking dialog
  // Uses centralized hook for optimistic cache update + navigation
  const handleCancelAndReset = async () => {
    if (!provider?.id) return;
    
    try {
      await cancelOrgApproval.mutateAsync({
        providerId: provider.id,
        withdrawalReason: 'User cancelled to change participation mode',
      });
      setShowBlockedDialog(false);
      // Navigation happens inside the hook
    } catch (error) {
      console.error('Error cancelling request:', error);
      // Error toast is handled in the hook
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
    <>
      {/* Blocked Mode Change Dialog */}
      <BlockedModeChangeDialog
        open={showBlockedDialog}
        onOpenChange={setShowBlockedDialog}
        orgName={orgDetails?.orgName}
        managerName={orgDetails?.managerName}
        managerEmail={orgDetails?.managerEmail}
        onCancelAndReset={handleCancelAndReset}
        isResetting={cancelOrgApproval.isPending}
      />

      {/* Navigation Block Dialog - for completed steps blocked by earlier incomplete steps */}
      <AlertDialog open={showNavigationBlockDialog} onOpenChange={setShowNavigationBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Previous Step</AlertDialogTitle>
            <AlertDialogDescription>
              You want to change your {blockingStepTitle}? Please select and continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleNavigationBlockConfirm}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Org Required Dialog - when org_rep mode selected but org details incomplete */}
      <AlertDialog open={showOrgRequiredDialog} onOpenChange={setShowOrgRequiredDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Organization Details Required</AlertDialogTitle>
            <AlertDialogDescription>
              Please complete your organization details first. You can go back to change your participation mode if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleOrgRequiredConfirm}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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
            {/* DEV: Admin toggle - remove for production */}
            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/admin')}
                className="gap-2 hidden sm:flex"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Button>
            )}
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
            steps={visibleSteps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            accessibleSteps={accessibleSteps}
            skippedSteps={skippedSteps}
            blockedSteps={blockedSteps}
            lockedSteps={lockedSteps}
            nextAccessibleStep={nextAccessibleStep}
            onStepClick={handleStepClick}
          />
        </header>

        {/* Hierarchy Breadcrumb - shows current selection path */}
        <HierarchyBreadcrumb />

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
    </>
  );
}

export { ENROLLMENT_STEPS };
