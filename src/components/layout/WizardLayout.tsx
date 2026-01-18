import { ReactNode, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Save, ArrowLeft, ArrowRight, Loader2, Shield, Wrench, ClipboardCheck, BookOpen, LayoutDashboard, Building2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { LifecycleProgressIndicator } from './LifecycleProgressIndicator';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useEnrollmentProficiencyAreas } from '@/hooks/queries/useEnrollmentExpertise';
import { useParticipationModes } from '@/hooks/queries/useMasterData';
import { HierarchyBreadcrumb } from '@/components/provider/HierarchyBreadcrumb';
import { BlockedModeChangeDialog } from '@/components/enrollment';
import { useCancelOrgApprovalAndResetMode } from '@/hooks/queries/useCancelOrgApproval';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { isWizardStepLocked, LOCK_THRESHOLDS, LIFECYCLE_RANKS } from '@/services/lifecycleService';
import { 
  getNextStep, 
  getPreviousStep, 
  getStepRoute, 
  isStepViewOnly,
  STEP_ROUTES as NAV_STEP_ROUTES,
} from '@/services/wizardNavigationService';
import { 
  useProofPointsCount, 
  useEnrollmentAssessmentStatus, 
  useEnrollmentInterviewBooking 
} from '@/hooks/queries/useEnrollmentCompletion';

// Type for organization with approval status (prevents unsafe `as any` casts)
interface OrganizationWithApprovalStatus {
  org_name?: string;
  org_type_id?: string | null;
  manager_name?: string | null;
  manager_email?: string | null;
  approval_status?: 'pending' | 'approved' | 'declined' | 'withdrawn' | null;
}

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
  /** Override default navigation mode detection */
  navigationMode?: 'edit' | 'view' | 'auto';
}

export function WizardLayout({
  children,
  currentStep,
  onBack,
  onContinue,
  continueLabel,
  backLabel,
  isSubmitting = false,
  canContinue = true,
  hideBackButton = false,
  hideContinueButton = false,
  showSaveAndExit = true,
  navigationMode = 'auto',
}: WizardLayoutProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useUserRoles();
  const { data: provider } = useCurrentProvider();
  const { data: participationModes } = useParticipationModes();
  const { hasMultipleIndustries, activeEnrollment, activeEnrollmentId } = useEnrollmentContext();
  const cancelOrgApproval = useCancelOrgApprovalAndResetMode();
  
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [showNavigationBlockDialog, setShowNavigationBlockDialog] = useState(false);
  const [showOrgRequiredDialog, setShowOrgRequiredDialog] = useState(false);
  const [showProficiencyRequiredDialog, setShowProficiencyRequiredDialog] = useState(false);
  const [showApprovalPendingDialog, setShowApprovalPendingDialog] = useState(false);
  
  // Fetch ENROLLMENT-scoped proficiency areas for Step 4 completion check
  // CRITICAL: Use enrollment ID, not provider ID, for multi-industry isolation
  const { data: enrollmentProficiencyAreas } = useEnrollmentProficiencyAreas(activeEnrollmentId ?? undefined);
  
  // NEW: Fetch actual completion data for steps 5-7
  const { data: proofPointsCount = 0 } = useProofPointsCount(activeEnrollmentId ?? undefined);
  const { data: assessmentResult } = useEnrollmentAssessmentStatus(activeEnrollmentId ?? undefined);
  const { data: interviewBooking } = useEnrollmentInterviewBooking(activeEnrollmentId ?? undefined);
  
  const [blockingStepTitle, setBlockingStepTitle] = useState('');
  const [blockingStepId, setBlockingStepId] = useState<number | null>(null);

  // CRITICAL: Use ENROLLMENT-scoped participation mode for org requirement check
  // KEY FIX: If no mode is selected, default to FALSE (hide org step until mode chosen)
  const isOrgRequired = useMemo(() => {
    // No mode selected yet = org step not applicable
    if (!activeEnrollment?.participation_mode_id) return false;
    // Modes not loaded yet = wait (show loading or safe default)
    if (!participationModes) return false;
    const selectedMode = participationModes.find(m => m.id === activeEnrollment.participation_mode_id);
    return selectedMode?.requires_org_info ?? false;
  }, [activeEnrollment?.participation_mode_id, participationModes]);

  // Filter visible steps - hide Organization step when not required
  const visibleSteps = useMemo(() => {
    if (!isOrgRequired) {
      return ENROLLMENT_STEPS.filter(step => step.id !== 3);
    }
    return ENROLLMENT_STEPS;
  }, [isOrgRequired]);

  // CRITICAL: Check if mode step (step 2) is blocked due to pending approval
  // Use ENROLLMENT organization, not provider organization
  const isModeStepBlocked = useMemo(() => {
    if (!activeEnrollment?.organization) return false;
    const org = activeEnrollment.organization as OrganizationWithApprovalStatus;
    return org.approval_status === 'pending';
  }, [activeEnrollment?.organization]);

  // CRITICAL: Use ENROLLMENT organization for blocking dialog
  const orgDetails = useMemo(() => {
    if (!activeEnrollment?.organization) return null;
    const org = activeEnrollment.organization as OrganizationWithApprovalStatus;
    return {
      orgName: org.org_name ?? '',
      managerName: org.manager_name ?? '',
      managerEmail: org.manager_email ?? '',
    };
  }, [activeEnrollment?.organization]);

  // Get lifecycle rank for step completion checks
  const lifecycleRank = activeEnrollment?.lifecycle_rank ?? provider?.lifecycle_rank ?? 0;

  // Calculate completed steps based on ACTUAL DATA, not just onboarding_status
  const completedSteps = useMemo(() => {
    const completed: number[] = [];
    if (!provider) return completed;

    // Step 1: Registration
    if (provider.first_name && provider.address && provider.country_id && provider.industry_segment_id) {
      completed.push(1);
    }

    // Step 2: Participation Mode - ENROLLMENT-scoped
    if (activeEnrollment?.participation_mode_id) {
      completed.push(2);
    }

    // Step 3: Organization (only if required AND approved - not just org_name presence)
    // CRITICAL: Use ENROLLMENT organization, not provider organization
    if (isOrgRequired && activeEnrollment?.organization) {
      const org = activeEnrollment.organization as OrganizationWithApprovalStatus;
      // Only mark complete if approved (not pending, withdrawn, or declined)
      if (org.org_name && org.approval_status === 'approved') {
        completed.push(3);
      }
    }

    // Step 4: Expertise Level + at least one proficiency area
    // CRITICAL: Use ENROLLMENT-scoped data (not provider-level) for multi-industry isolation
    if (activeEnrollment?.expertise_level_id && enrollmentProficiencyAreas && enrollmentProficiencyAreas.length > 0) {
      completed.push(4);
    }

    // Step 5: Proof Points - at least one exists
    if (proofPointsCount > 0) {
      completed.push(5);
    }

    // Step 6: Assessment - passed
    if (assessmentResult?.is_passed) {
      completed.push(6);
    }

    // Step 7: Interview Slot - booked
    if (interviewBooking?.id) {
      completed.push(7);
    }

    // Step 8: Panel Discussion - based on lifecycle rank reaching panel_completed
    if (lifecycleRank >= (LIFECYCLE_RANKS.panel_completed ?? 130)) {
      completed.push(8);
    }

    // Step 9: Certification - based on lifecycle rank reaching certified
    if (lifecycleRank >= (LIFECYCLE_RANKS.certified ?? 140)) {
      completed.push(9);
    }

    return completed;
  }, [provider, isOrgRequired, activeEnrollment, enrollmentProficiencyAreas, proofPointsCount, assessmentResult, interviewBooking, lifecycleRank]);

  // Blocked steps - currently only step 2 (Mode) can be blocked
  const blockedSteps = useMemo(() => {
    if (isModeStepBlocked) return [2];
    return [];
  }, [isModeStepBlocked]);

  // Locked steps - based on ENROLLMENT lifecycle rank (not provider) for multi-industry isolation
  // CRITICAL: Use activeEnrollment.lifecycle_rank to ensure each industry's wizard is locked independently
  const lockedSteps = useMemo(() => {
    // Use enrollment lifecycle rank, fallback to provider for backward compatibility
    const lifecycleRank = activeEnrollment?.lifecycle_rank ?? provider?.lifecycle_rank ?? 0;
    if (!lifecycleRank) return [];
    
    const locked: number[] = [];
    visibleSteps.forEach(step => {
      if (isWizardStepLocked(step.id, lifecycleRank)) {
        locked.push(step.id);
      }
    });
    return locked;
  }, [activeEnrollment?.lifecycle_rank, provider?.lifecycle_rank, visibleSteps]);

  // No skipped steps needed since we hide the step entirely
  const skippedSteps: number[] = [];

  // Use centralized STEP_ROUTES from navigation service (imported as NAV_STEP_ROUTES)
  const STEP_ROUTES = NAV_STEP_ROUTES;

  // Calculate next accessible step (first incomplete step after all completed)
  const nextAccessibleStep = useMemo(() => {
    const maxCompleted = completedSteps.length > 0 ? Math.max(...completedSteps) : 0;
    return maxCompleted + 1;
  }, [completedSteps]);

  // Check if a step is accessible - ALL visible steps are always accessible (free navigation)
  const isStepAccessible = useMemo(() => {
    return (stepId: number): boolean => {
      // All visible steps are always accessible - navigation is free
      return visibleSteps.some(s => s.id === stepId);
    };
  }, [visibleSteps]);

  // Compute accessible steps array
  const accessibleSteps = useMemo(() => {
    return visibleSteps
      .filter(step => isStepAccessible(step.id))
      .map(s => s.id);
  }, [visibleSteps, isStepAccessible]);

  // Compute if current step is in view-only mode (locked but completed)
  // Note: lifecycleRank already declared above for completedSteps calculation
  const isViewMode = useMemo(() => {
    if (navigationMode === 'edit') return false;
    if (navigationMode === 'view') return true;
    // Auto: check if step is view-only based on lifecycle
    return isStepViewOnly(currentStep, lifecycleRank);
  }, [navigationMode, currentStep, lifecycleRank]);

  // Default navigation handlers using centralized service
  const visibleStepIds = useMemo(() => visibleSteps.map(s => s.id), [visibleSteps]);
  
  const defaultBackHandler = useCallback(() => {
    const prevStep = getPreviousStep(currentStep, visibleStepIds);
    if (prevStep) {
      const route = getStepRoute(prevStep);
      if (route) navigate(route);
    } else {
      navigate('/dashboard');
    }
  }, [currentStep, visibleStepIds, navigate]);

  const defaultContinueHandler = useCallback(() => {
    const nextStep = getNextStep(currentStep, visibleStepIds);
    if (nextStep) {
      const route = getStepRoute(nextStep);
      if (route) navigate(route);
    }
  }, [currentStep, visibleStepIds, navigate]);

  // Computed labels with view mode awareness
  const computedBackLabel = backLabel ?? (getPreviousStep(currentStep, visibleStepIds) ? 'Back' : 'Dashboard');
  const computedContinueLabel = continueLabel ?? (isViewMode ? 'View Next' : 'Continue');

  // CRITICAL: Use ENROLLMENT organization for approval status
  const orgApprovalStatus = useMemo(() => {
    if (!activeEnrollment?.organization) return null;
    const org = activeEnrollment.organization as OrganizationWithApprovalStatus;
    return org.approval_status;
  }, [activeEnrollment?.organization]);

  // Check if org details are incomplete when org_rep mode is selected
  // CRITICAL: Use ENROLLMENT organization
  const isOrgIncomplete = useMemo(() => {
    if (!isOrgRequired) return false;
    if (!activeEnrollment?.organization) return true;
    const org = activeEnrollment.organization as OrganizationWithApprovalStatus;
    // Incomplete if no org_name or not approved
    return !org.org_name || orgApprovalStatus !== 'approved';
  }, [isOrgRequired, activeEnrollment?.organization, orgApprovalStatus]);

  const handleStepClick = (stepId: number) => {
    // Block navigation to step 2 (Mode) ONLY if pending approval exists
    // This is the only true navigation block - prevents changing mode while approval is pending
    if (stepId === 2 && isModeStepBlocked) {
      setShowBlockedDialog(true);
      return;
    }
    
    // All other navigation is FREE - navigate to any visible step
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
    } catch {
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

      {/* Proficiency Areas Required Dialog */}
      <AlertDialog open={showProficiencyRequiredDialog} onOpenChange={setShowProficiencyRequiredDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Select Proficiency Areas</AlertDialogTitle>
            <AlertDialogDescription>
              Please select at least one proficiency area before proceeding to Proof Points. 
              Your proficiency areas determine which specialties you can add evidence for.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setShowProficiencyRequiredDialog(false);
              navigate('/enroll/expertise');
            }}>
              Select Proficiency Areas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approval Pending Dialog - when trying to access steps while waiting for manager */}
      <AlertDialog open={showApprovalPendingDialog} onOpenChange={setShowApprovalPendingDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Awaiting Manager Approval</AlertDialogTitle>
            <AlertDialogDescription>
              Your request for manager approval has been sent. Once your manager approves 
              your organization details, you will be able to proceed with selecting your 
              expertise level and proficiency areas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setShowApprovalPendingDialog(false);
              navigate('/enroll/organization-pending');
            }}>
              Check Approval Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex items-center justify-between h-14 px-4">
            {/* Logo and Industry Label (Read-Only) */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">CB</span>
                </div>
                <span className="font-semibold text-sm hidden sm:inline">CogniBlend</span>
              </div>
              
              {/* Industry Label - READ ONLY (no selector/dropdown) */}
              {activeEnrollment && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">
                      {activeEnrollment.industry_segment?.name || 'Unknown Industry'}
                    </span>
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => navigate('/dashboard')}
                  >
                    Switch Industry
                  </Button>
                </div>
              )}
              
              {/* Lifecycle Progress Indicator */}
              {activeEnrollment && (
                <LifecycleProgressIndicator
                  currentStatus={activeEnrollment.lifecycle_status}
                  currentRank={activeEnrollment.lifecycle_rank}
                  className="hidden lg:flex"
                />
              )}
            </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Tools Dropdown - Always Visible */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Wrench className="h-4 w-4" />
                  <span className="hidden sm:inline">Tools</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover z-50">
                <DropdownMenuItem onClick={() => navigate('/tools/regression-test')}>
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Regression Test
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/tools/lifecycle-rules')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Lifecycle Rules
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
            orgApprovalStatus={orgApprovalStatus}
            industryName={activeEnrollment?.industry_segment?.name}
            lifecycleStatus={activeEnrollment?.lifecycle_status ?? provider?.lifecycle_status}
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
              {!hideBackButton && (
                <Button
                  variant="outline"
                  onClick={onBack ?? defaultBackHandler}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {computedBackLabel}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* View mode indicator */}
              {isViewMode && (
                <Badge variant="secondary" className="gap-1">
                  <Eye className="h-3 w-3" />
                  View Only
                </Badge>
              )}
              {!hideContinueButton && getNextStep(currentStep, visibleStepIds) && (
                <Button
                  onClick={onContinue ?? defaultContinueHandler}
                  disabled={!canContinue || isSubmitting}
                  className="gap-2"
                  variant={isViewMode ? "outline" : "default"}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {computedContinueLabel}
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
