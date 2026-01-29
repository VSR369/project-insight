import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useProofPoints } from '@/hooks/queries/useProofPoints';
import { useProviderEnrollments, useSetPrimaryEnrollment } from '@/hooks/queries/useProviderEnrollments';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useEnrollmentProficiencyAreas } from '@/hooks/queries/useEnrollmentExpertise';
import { calculateCurrentStep, getStepUrl } from '@/components/auth/OnboardingGuard';
import { getStatusDisplayName } from '@/services/lifecycleService';
import { getNextStepForStatus, getStepRoute, STEP_ROUTES } from '@/services/wizardNavigationService';
import { AppLayout, LifecycleProgressIndicator } from '@/components/layout';
import { AddIndustryDialog, EnrollmentDeleteDialog } from '@/components/enrollment';
import { PulseDashboardWidget } from '@/components/pulse/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  User, CheckCircle, Clock, FileText, ArrowRight, Target, GraduationCap, 
  Award, UserCircle, Loader2, ShieldCheck, Star, XCircle, Building2,
  ChevronRight, Factory, Layers, Crown, Trash2, AlertTriangle, Users, 
  Briefcase, ClipboardList, Plus
} from 'lucide-react';
import { useParticipationModes } from '@/hooks/queries/useMasterData';

// Terminal lifecycle statuses where profile is complete/locked
const TERMINAL_STATUSES = ['verified', 'certified', 'not_verified'];

// Lifecycle rank thresholds for progress calculation
const LIFECYCLE_PROGRESS_MAP: Record<string, number> = {
  'invited': 0,
  'registered': 10,
  'enrolled': 15,
  'mode_selected': 25,
  'org_info_pending': 30,
  'org_validated': 40,
  'expertise_selected': 50,
  'proof_points_started': 60,
  'proof_points_min_met': 70,
  'assessment_pending': 75,
  'assessment_in_progress': 80,
  'assessment_passed': 85,
  'assessment_completed': 90,
  'panel_scheduled': 92,
  'panel_completed': 95,
  'verified': 100,
  'certified': 100,
  'not_verified': 100,
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isAdmin, isLoading: rolesLoading } = useUserRoles();
  const { data: provider, isLoading } = useCurrentProvider();
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useProviderEnrollments(provider?.id);
  const { activeEnrollment, activeEnrollmentId, setActiveEnrollment } = useEnrollmentContext();
  const { data: enrollmentProficiencyAreas } = useEnrollmentProficiencyAreas(activeEnrollmentId ?? undefined);
  const { data: proofPoints = [] } = useProofPoints(provider?.id);
  const { data: participationModes = [] } = useParticipationModes();
  const setPrimaryMutation = useSetPrimaryEnrollment();

  // Redirect admins to admin dashboard - they shouldn't be on provider dashboard
  useEffect(() => {
    if (!rolesLoading && isAdmin && !provider) {
      // Admin without provider record - redirect to admin dashboard
      sessionStorage.setItem('activePortal', 'admin');
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, rolesLoading, provider, navigate]);

  // Helper to get participation mode name
  const getModeName = (modeId: string | null | undefined) => {
    if (!modeId) return null;
    const mode = participationModes.find(m => m.id === modeId);
    return mode?.name || null;
  };

  // Helper to get next action text based on lifecycle status
  const getNextAction = (enrollment: typeof enrollments[0]) => {
    const status = enrollment.lifecycle_status;
    switch (status) {
      case 'registered':
      case 'enrolled':
        return 'Select participation mode';
      case 'mode_selected':
        return 'Complete organization details';
      case 'org_info_pending':
        return 'Awaiting manager approval';
      case 'org_validated':
        return 'Select expertise level';
      case 'expertise_selected':
        return 'Add proof points';
      case 'proof_points_started':
        return 'Add more proof points (min 5)';
      case 'proof_points_min_met':
        return 'Start assessment';
      case 'assessment_pending':
        return 'Complete assessment';
      case 'assessment_in_progress':
        return 'Continue assessment';
      case 'assessment_passed':
        return 'Schedule panel interview';
      case 'panel_scheduled':
        return 'Prepare for panel interview';
      case 'panel_completed':
        return 'View certification status';
      case 'verified':
      case 'certified':
        return null; // Complete
      case 'not_verified':
        return 'Review certification status';
      default:
        return 'Continue setup';
    }
  };

  // State for set primary confirmation dialog
  const [primaryConfirmDialog, setPrimaryConfirmDialog] = useState<{
    open: boolean;
    enrollmentId: string | null;
    industryName: string | null;
  }>({ open: false, enrollmentId: null, industryName: null });

  // State for delete enrollment confirmation dialog
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    enrollmentId: string | null;
    industryName: string | null;
  }>({ open: false, enrollmentId: null, industryName: null });

  // State for Add Industry Dialog
  const [showAddIndustryDialog, setShowAddIndustryDialog] = useState(false);

  const firstName = user?.user_metadata?.first_name || provider?.first_name || 'Provider';

  // Check if any enrollment is in a terminal state
  const hasTerminalEnrollment = useMemo(() => {
    return enrollments.some(e => TERMINAL_STATUSES.includes(e.lifecycle_status));
  }, [enrollments]);

  // Legacy: Check if provider is in terminal state (for single-industry compatibility)
  const isProviderTerminal = useMemo(() => {
    return TERMINAL_STATUSES.includes(provider?.lifecycle_status || '');
  }, [provider?.lifecycle_status]);

  // Get proof points count per industry
  const proofPointsByIndustry = useMemo(() => {
    const counts: Record<string, number> = {};
    proofPoints.forEach(pp => {
      const industryId = pp.industry_segment_id || 'general';
      counts[industryId] = (counts[industryId] || 0) + 1;
    });
    return counts;
  }, [proofPoints]);

  // Calculate progress for an enrollment
  const getEnrollmentProgress = (status: string) => {
    return LIFECYCLE_PROGRESS_MAP[status] || 0;
  };

  // Get badge variant for lifecycle status
  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'verified':
      case 'certified':
      case 'active':
        return 'default';
      case 'not_verified':
      case 'suspended':
      case 'inactive':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <ShieldCheck className="h-4 w-4" />;
      case 'certified':
        return <Star className="h-4 w-4" />;
      case 'not_verified':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const currentStep = calculateCurrentStep(provider, activeEnrollment, enrollmentProficiencyAreas);

  // NOTE: Removed auto-redirect - Dashboard now shows for all users
  // Users can see their enrollment status and manually continue enrollment

  // Handle enrollment switch
  const handleEnrollmentSwitch = (enrollmentId: string) => {
    setActiveEnrollment(enrollmentId);
  };


  // Navigate to enrollment step - uses centralized navigation service
  const handleContinueEnrollment = (enrollmentId: string) => {
    const enrollment = enrollments.find(e => e.id === enrollmentId);
    if (!enrollment) return;
    
    setActiveEnrollment(enrollmentId);
    
    // UI Guard: Check if registration is incomplete (force Step 1)
    // Registration is considered incomplete if key profile fields are missing
    const isRegistrationIncomplete = !provider?.first_name || 
                                     !provider?.last_name || 
                                     !provider?.country_id;
    
    // Also force registration for 'registered' status regardless of profile completeness
    if (isRegistrationIncomplete || enrollment.lifecycle_status === 'registered') {
      navigate('/enroll/registration');
      return;
    }
    
    // Determine if org step is required based on participation mode
    const selectedMode = participationModes.find(m => m.id === enrollment.participation_mode_id);
    const requiresOrgInfo = selectedMode?.requires_org_info ?? false;
    
    // Get visible steps (hide org step if not required)
    const visibleSteps = requiresOrgInfo ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [1, 2, 4, 5, 6, 7, 8, 9];
    
    // Use navigation service to determine correct next step
    const nextStepId = getNextStepForStatus(
      enrollment.lifecycle_status,
      visibleSteps,
      requiresOrgInfo
    );
    
    const route = getStepRoute(nextStepId);
    navigate(route || '/enroll/registration');
  };

  // Navigate to first step for reviewing enrollment (always starts at step 1)
  const handleReviewEnrollment = (enrollmentId: string) => {
    setActiveEnrollment(enrollmentId);
    navigate('/enroll/registration');
  };

  // NOTE: Removed auto-redirect - Dashboard is now the primary entry point
  // First-time users see "Add Your First Industry" CTA instead of auto-redirect

  if (isLoading || enrollmentsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Check if we have multi-industry enrollments
  const hasMultipleEnrollments = enrollments.length > 1;
  const totalProofPoints = proofPoints.length;

  // Check if user is a first-time user (no enrollments yet)
  // Show welcome CTA if: loading complete AND (no provider OR provider has no enrollments)
  const isFirstTimeUser = !isLoading && !enrollmentsLoading && !!user && (!provider || enrollments.length === 0);

  return (
    <AppLayout>
      {/* Add Industry Dialog */}
      <AddIndustryDialog 
        open={showAddIndustryDialog} 
        onOpenChange={setShowAddIndustryDialog} 
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* First-Time User Welcome Section */}
        {isFirstTimeUser && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Factory className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome to CogniBlend! 👋</CardTitle>
              <CardDescription className="text-base max-w-md mx-auto">
                Start by selecting your first industry segment to begin building your professional profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-8">
              <Button size="lg" onClick={() => setShowAddIndustryDialog(true)} className="gap-2">
                <Plus className="h-5 w-5" />
                Add Your First Industry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Welcome Section - for returning users */}
        {!isFirstTimeUser && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Welcome back, {firstName}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                {hasMultipleEnrollments 
                  ? `Managing ${enrollments.length} industry enrollments`
                  : 'Here\'s your profile overview'}
              </p>
            </div>
            {!isProviderTerminal && enrollments.length > 0 && (
              <Button onClick={() => handleContinueEnrollment(activeEnrollment?.id || enrollments[0]?.id)}>
                Continue Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Multi-Industry Enrollments Overview */}
        {enrollments.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Industry Enrollments
                  </CardTitle>
                  <CardDescription>
                    {hasMultipleEnrollments 
                      ? 'Track progress across your industry enrollments'
                      : 'Your current industry enrollment progress'}
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddIndustryDialog(true)}
                >
                  <Factory className="mr-2 h-4 w-4" />
                  Add Industry
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrollments.map((enrollment) => {
                const progress = getEnrollmentProgress(enrollment.lifecycle_status);
                const isActive = activeEnrollment?.id === enrollment.id;
                const isTerminal = TERMINAL_STATUSES.includes(enrollment.lifecycle_status);
                const industryProofPoints = proofPointsByIndustry[enrollment.industry_segment_id] || 0;

                return (
                  <div
                    key={enrollment.id}
                    className={`relative p-4 rounded-lg border transition-all cursor-pointer ${
                      isActive 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'hover:bg-muted/50'
                    } ${isTerminal && enrollment.lifecycle_status !== 'not_verified' 
                        ? 'border-green-500/30 bg-green-500/5' 
                        : ''
                    } ${enrollment.lifecycle_status === 'not_verified' 
                        ? 'border-destructive/30 bg-destructive/5' 
                        : ''
                    }`}
                    onClick={() => handleEnrollmentSwitch(enrollment.id)}
                  >
                    {/* Primary Badge */}
                    {enrollment.is_primary && (
                      <Badge 
                        variant="outline" 
                        className="absolute -top-2 right-4 bg-background text-xs"
                      >
                        Primary
                      </Badge>
                    )}

                    <div className="flex items-start gap-4">
                      {/* Industry Icon */}
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                        isTerminal && enrollment.lifecycle_status !== 'not_verified'
                          ? 'bg-green-500/10 text-green-600'
                          : enrollment.lifecycle_status === 'not_verified'
                            ? 'bg-destructive/10 text-destructive'
                            : isActive 
                              ? 'bg-primary/10 text-primary' 
                              : 'bg-muted text-muted-foreground'
                      }`}>
                        {isTerminal ? getStatusIcon(enrollment.lifecycle_status) || <Building2 className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold truncate">
                            {enrollment.industry_segment?.name || 'Unknown Industry'}
                          </h4>
                          <Badge variant={getStatusBadgeVariant(enrollment.lifecycle_status)} className="gap-1">
                            {getStatusIcon(enrollment.lifecycle_status)}
                            {getStatusDisplayName(enrollment.lifecycle_status)}
                          </Badge>
                          {!isTerminal && (
                            <span className="text-xs text-muted-foreground">
                              Rank {enrollment.lifecycle_rank} ({progress}%)
                            </span>
                          )}
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                          {/* Expertise Level */}
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-3 w-3 shrink-0" />
                            {enrollment.expertise_level?.name || 'Not selected'}
                          </span>
                          
                          {/* Participation Mode */}
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 shrink-0" />
                            {getModeName(enrollment.participation_mode_id) || 'Not selected'}
                          </span>
                          
                          {/* Proof Points */}
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3 shrink-0" />
                            {industryProofPoints} proof points
                          </span>
                          
                          {/* Org Approval Status (if org_rep mode) */}
                          {enrollment.org_approval_status && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3 shrink-0" />
                              <span className={
                                enrollment.org_approval_status === 'approved' 
                                  ? 'text-green-600' 
                                  : enrollment.org_approval_status === 'pending'
                                    ? 'text-amber-600'
                                    : 'text-destructive'
                              }>
                                Org: {enrollment.org_approval_status}
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Progress Bar + Next Action */}
                        {!isTerminal && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Progress value={progress} className="flex-1 h-2" />
                              <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                                {progress}%
                              </span>
                            </div>
                            {getNextAction(enrollment) && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <ClipboardList className="h-3 w-3 text-primary" />
                                <span className="text-primary font-medium">Next:</span>
                                <span className="text-muted-foreground">{getNextAction(enrollment)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="shrink-0 flex items-center gap-2">
                        {/* Delete Button - show for all non-primary enrollments (dialog handles validation) */}
                        {!enrollment.is_primary && enrollments.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmDialog({
                                open: true,
                                enrollmentId: enrollment.id,
                                industryName: enrollment.industry_segment?.name || 'this industry',
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Set as Primary Button - only show for non-primary enrollments */}
                        {!enrollment.is_primary && enrollments.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            disabled={setPrimaryMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrimaryConfirmDialog({
                                open: true,
                                enrollmentId: enrollment.id,
                                industryName: enrollment.industry_segment?.name || 'this industry',
                              });
                            }}
                          >
                            <Crown className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Set Primary</span>
                          </Button>
                        )}

                        {/* View/Continue/Review Buttons */}
                        {isTerminal ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEnrollmentSwitch(enrollment.id);
                              navigate('/profile');
                            }}
                          >
                            View
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        ) : enrollment.lifecycle_rank >= 100 ? (
                          /* Post-assessment: show Review and Continue buttons */
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReviewEnrollment(enrollment.id);
                              }}
                              className="text-muted-foreground"
                            >
                              Review
                            </Button>
                            <Button
                              variant={isActive ? 'default' : 'outline'}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleContinueEnrollment(enrollment.id);
                              }}
                            >
                              Continue
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant={isActive ? 'default' : 'outline'}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContinueEnrollment(enrollment.id);
                            }}
                          >
                            Continue
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Stats Grid with Pulse Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Stats - 3 columns on lg */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Industries
                </CardTitle>
                <Factory className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enrollments.length}</div>
                <p className="text-xs text-muted-foreground">
                  {enrollments.filter(e => TERMINAL_STATUSES.includes(e.lifecycle_status) && e.lifecycle_status !== 'not_verified').length} verified
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Profile Status
                </CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(provider?.lifecycle_status || 'registered')} className="gap-1">
                    {getStatusIcon(provider?.lifecycle_status || '')}
                    {getStatusDisplayName(provider?.lifecycle_status || 'New')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {isProviderTerminal 
                    ? 'Profile complete' 
                    : provider?.onboarding_status === 'completed' 
                      ? 'Profile complete' 
                      : 'Complete your profile'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Proof Points
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProofPoints}</div>
                <p className="text-xs text-muted-foreground">
                  Across all industries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Enrollment
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold truncate">
                  {activeEnrollment?.industry_segment?.name || 'None'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeEnrollment 
                    ? getStatusDisplayName(activeEnrollment.lifecycle_status)
                    : 'Select an industry'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Pulse Widget - 1 column on lg */}
          <div className="lg:col-span-1">
            <PulseDashboardWidget />
          </div>
        </div>

        {/* Empty State - No Enrollments (for existing providers) */}
        {!isFirstTimeUser && enrollments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Factory className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Industry Enrollments</h3>
              <p className="text-muted-foreground mb-4">
                Start by enrolling in your first industry to begin building your professional profile.
              </p>
              <Button onClick={() => setShowAddIndustryDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Industry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions for Verified Users */}
        {hasTerminalEnrollment && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your verified profile</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start" onClick={() => navigate('/profile')}>
                <UserCircle className="mr-2 h-4 w-4" />
                View Profile
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => navigate('/enroll/proof-points')}>
                <Award className="mr-2 h-4 w-4" />
                Manage Proof Points
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => setShowAddIndustryDialog(true)}>
                <Factory className="mr-2 h-4 w-4" />
                Add New Industry
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Set Primary Confirmation Dialog */}
      <AlertDialog 
        open={primaryConfirmDialog.open} 
        onOpenChange={(open) => setPrimaryConfirmDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set as Primary Industry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make <span className="font-semibold">{primaryConfirmDialog.industryName}</span> your 
              primary industry. Your primary industry is shown first in your profile and used as the default 
              for new activities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={setPrimaryMutation.isPending}
              onClick={() => {
                if (provider?.id && primaryConfirmDialog.enrollmentId) {
                  setPrimaryMutation.mutate({
                    providerId: provider.id,
                    enrollmentId: primaryConfirmDialog.enrollmentId,
                  });
                  setPrimaryConfirmDialog({ open: false, enrollmentId: null, industryName: null });
                }
              }}
            >
              {setPrimaryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting...
                </>
              ) : (
                'Set as Primary'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Enrollment Dialog */}
      <EnrollmentDeleteDialog
        open={deleteConfirmDialog.open}
        onOpenChange={(open) => setDeleteConfirmDialog(prev => ({ ...prev, open }))}
        enrollmentId={deleteConfirmDialog.enrollmentId}
        industryName={deleteConfirmDialog.industryName}
        onDeleted={() => {
          setDeleteConfirmDialog({ open: false, enrollmentId: null, industryName: null });
        }}
      />
    </AppLayout>
  );
}
