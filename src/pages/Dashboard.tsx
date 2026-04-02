/**
 * Dashboard — Provider dashboard orchestrator.
 * Delegates to DashboardStatsCards, DashboardEnrollmentCard, and DashboardHelpers.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { logWarning } from '@/lib/errorHandler';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useProofPoints } from '@/hooks/queries/useProofPoints';
import { useProviderEnrollments, useSetPrimaryEnrollment } from '@/hooks/queries/useProviderEnrollments';
import { useOptionalEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useEnrollmentProficiencyAreas } from '@/hooks/queries/useEnrollmentExpertise';
import { calculateCurrentStep } from '@/components/auth/OnboardingGuard';
import { getNextStepForStatus, getStepRoute } from '@/services/wizardNavigationService';
import { AppLayout } from '@/components/layout';
import { AddIndustryDialog, EnrollmentDeleteDialog } from '@/components/enrollment';
import { DashboardStatsCards } from './dashboard/DashboardStatsCards';
import { DashboardEnrollmentCard } from './dashboard/DashboardEnrollmentCard';
import { TERMINAL_STATUSES } from './dashboard/DashboardHelpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Loader2, UserCircle, Award, Factory, Layers, Plus,
} from 'lucide-react';
import { useParticipationModes } from '@/hooks/queries/useMasterData';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isAdmin, isLoading: rolesLoading } = useUserRoles();
  const { data: provider, isLoading } = useCurrentProvider();
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useProviderEnrollments(provider?.id);
  const enrollmentContext = useOptionalEnrollmentContext();

  const isContextAvailable = !!enrollmentContext && !!enrollmentContext.setActiveEnrollment;
  const activeEnrollment = enrollmentContext?.activeEnrollment ?? null;
  const activeEnrollmentId = enrollmentContext?.activeEnrollmentId ?? null;

  const { data: enrollmentProficiencyAreas } = useEnrollmentProficiencyAreas(activeEnrollmentId ?? undefined);
  const { data: proofPoints = [] } = useProofPoints(provider?.id);
  const { data: participationModes = [] } = useParticipationModes();
  const setPrimaryMutation = useSetPrimaryEnrollment();

  useEffect(() => {
    if (!rolesLoading && isAdmin && !provider) {
      sessionStorage.setItem('activePortal', 'admin');
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, rolesLoading, provider, navigate]);

  const getModeName = (modeId: string | null | undefined) => {
    if (!modeId) return null;
    return participationModes.find(m => m.id === modeId)?.name || null;
  };

  // ── Dialog state ──
  const [primaryConfirmDialog, setPrimaryConfirmDialog] = useState<{ open: boolean; enrollmentId: string | null; industryName: string | null }>({ open: false, enrollmentId: null, industryName: null });
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ open: boolean; enrollmentId: string | null; industryName: string | null }>({ open: false, enrollmentId: null, industryName: null });
  const [showAddIndustryDialog, setShowAddIndustryDialog] = useState(false);

  const firstName = user?.user_metadata?.first_name || provider?.first_name || 'Provider';

  const isProviderTerminal = useMemo(() => TERMINAL_STATUSES.includes(provider?.lifecycle_status || ''), [provider?.lifecycle_status]);
  const hasTerminalEnrollment = useMemo(() => enrollments.some(e => TERMINAL_STATUSES.includes(e.lifecycle_status)), [enrollments]);

  const proofPointsByIndustry = useMemo(() => {
    const counts: Record<string, number> = {};
    proofPoints.forEach(pp => { const id = pp.industry_segment_id || 'general'; counts[id] = (counts[id] || 0) + 1; });
    return counts;
  }, [proofPoints]);

  const currentStep = calculateCurrentStep(provider, activeEnrollment, enrollmentProficiencyAreas);

  // ── Handlers ──
  const handleEnrollmentSwitch = (enrollmentId: string) => {
    if (!isContextAvailable) { logWarning('EnrollmentContext unavailable during enrollment switch', { operation: 'enrollment_switch' }); return; }
    enrollmentContext.setActiveEnrollment(enrollmentId);
  };

  const handleContinueEnrollment = (enrollmentId: string) => {
    const enrollment = enrollments.find(e => e.id === enrollmentId);
    if (!enrollment) return;
    if (!isContextAvailable) { toast.error('Please wait for the page to fully load, then try again.'); return; }
    enrollmentContext.setActiveEnrollment(enrollmentId);

    const isRegistrationIncomplete = !provider?.first_name || !provider?.last_name || !provider?.country_id;
    if (isRegistrationIncomplete || enrollment.lifecycle_status === 'registered') { navigate('/enroll/registration'); return; }

    const selectedMode = participationModes.find(m => m.id === enrollment.participation_mode_id);
    const requiresOrgInfo = selectedMode?.requires_org_info ?? false;
    const visibleSteps = requiresOrgInfo ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [1, 2, 4, 5, 6, 7, 8, 9];
    const nextStepId = getNextStepForStatus(enrollment.lifecycle_status, visibleSteps, requiresOrgInfo);
    navigate(getStepRoute(nextStepId) || '/enroll/registration');
  };

  const handleReviewEnrollment = (enrollmentId: string) => {
    if (!isContextAvailable) { toast.error('Please wait for the page to fully load, then try again.'); return; }
    enrollmentContext.setActiveEnrollment(enrollmentId);
    navigate('/enroll/registration');
  };

  // ── Loading ──
  if (isLoading || enrollmentsLoading) {
    return <AppLayout><div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  }

  const hasMultipleEnrollments = enrollments.length > 1;
  const totalProofPoints = proofPoints.length;
  const isFirstTimeUser = !isLoading && !enrollmentsLoading && !!user && (!provider || enrollments.length === 0);

  return (
    <AppLayout>
      <AddIndustryDialog open={showAddIndustryDialog} onOpenChange={setShowAddIndustryDialog} />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* First-Time User Welcome */}
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
                <Plus className="h-5 w-5" /> Add Your First Industry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Welcome Section - returning users */}
        {!isFirstTimeUser && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Welcome back, {firstName}! 👋</h1>
              <p className="text-muted-foreground mt-1">
                {hasMultipleEnrollments ? `Managing ${enrollments.length} industry enrollments` : 'Here\'s your profile overview'}
              </p>
            </div>
            {!isProviderTerminal && enrollments.length > 0 && (
              <Button onClick={() => handleContinueEnrollment(activeEnrollment?.id || enrollments[0]?.id)}>
                Continue Setup <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Industry Enrollments */}
        {enrollments.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Industry Enrollments</CardTitle>
                  <CardDescription>{hasMultipleEnrollments ? 'Track progress across your industry enrollments' : 'Your current industry enrollment progress'}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowAddIndustryDialog(true)}>
                  <Factory className="mr-2 h-4 w-4" /> Add Industry
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrollments.map((enrollment) => (
                <DashboardEnrollmentCard
                  key={enrollment.id}
                  enrollment={enrollment}
                  isActive={activeEnrollment?.id === enrollment.id}
                  industryProofPoints={proofPointsByIndustry[enrollment.industry_segment_id] || 0}
                  enrollmentsCount={enrollments.length}
                  getModeName={getModeName}
                  onSwitch={handleEnrollmentSwitch}
                  onContinue={handleContinueEnrollment}
                  onReview={handleReviewEnrollment}
                  onSetPrimary={(id, name) => setPrimaryConfirmDialog({ open: true, enrollmentId: id, industryName: name })}
                  onDelete={(id, name) => setDeleteConfirmDialog({ open: true, enrollmentId: id, industryName: name })}
                  setPrimaryPending={setPrimaryMutation.isPending}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <DashboardStatsCards
          enrollments={enrollments}
          provider={provider}
          totalProofPoints={totalProofPoints}
          activeEnrollment={activeEnrollment}
          isProviderTerminal={isProviderTerminal}
        />

        {/* Empty State */}
        {!isFirstTimeUser && enrollments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Factory className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Industry Enrollments</h3>
              <p className="text-muted-foreground mb-4">Start by enrolling in your first industry to begin building your professional profile.</p>
              <Button onClick={() => setShowAddIndustryDialog(true)}><Plus className="mr-2 h-4 w-4" /> Add Your First Industry</Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        {hasTerminalEnrollment && (
          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle><CardDescription>Manage your verified profile</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start" onClick={() => navigate('/profile')}><UserCircle className="mr-2 h-4 w-4" /> View Profile</Button>
              <Button variant="outline" className="justify-start" onClick={() => navigate('/enroll/proof-points')}><Award className="mr-2 h-4 w-4" /> Manage Proof Points</Button>
              <Button variant="outline" className="justify-start" onClick={() => setShowAddIndustryDialog(true)}><Factory className="mr-2 h-4 w-4" /> Add New Industry</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Set Primary Dialog */}
      <AlertDialog open={primaryConfirmDialog.open} onOpenChange={(open) => setPrimaryConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set as Primary Industry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make <span className="font-semibold">{primaryConfirmDialog.industryName}</span> your primary industry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={setPrimaryMutation.isPending}
              onClick={() => {
                if (provider?.id && primaryConfirmDialog.enrollmentId) {
                  setPrimaryMutation.mutate({ providerId: provider.id, enrollmentId: primaryConfirmDialog.enrollmentId });
                  setPrimaryConfirmDialog({ open: false, enrollmentId: null, industryName: null });
                }
              }}
            >
              {setPrimaryMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting...</> : 'Set as Primary'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Enrollment Dialog */}
      <EnrollmentDeleteDialog
        open={deleteConfirmDialog.open}
        onOpenChange={(open) => setDeleteConfirmDialog(prev => ({ ...prev, open }))}
        enrollmentId={deleteConfirmDialog.enrollmentId}
        industryName={deleteConfirmDialog.industryName || 'this industry'}
      />
    </AppLayout>
  );
}
