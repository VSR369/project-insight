import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { WizardLayout } from '@/components/layout';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { 
  useCanStartEnrollmentAssessment, 
  useStartEnrollmentAssessment, 
  useActiveEnrollmentAssessmentAttempt,
  useActiveAssessmentAcrossEnrollments,
  useEnrollmentIsTerminal,
  useRetakeEligibility,
  useStartRetakeAssessment,
} from '@/hooks/queries/useEnrollmentAssessment';
import { LockedFieldBanner } from '@/components/enrollment';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { LIFECYCLE_RANKS } from '@/constants/lifecycle.constants';
import { 
  Loader2, 
  ClipboardCheck, 
  Clock, 
  Lock, 
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  Shield,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  CalendarClock,
  Eye,
  Trophy
} from 'lucide-react';

function AssessmentContent() {
  const navigate = useNavigate();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  
  // Get active enrollment from context
  const { 
    activeEnrollment, 
    activeEnrollmentId,
    activeIndustryId,
    setActiveEnrollment,
    isLoading: enrollmentLoading 
  } = useEnrollmentContext();
  
  // Enrollment-scoped assessment hooks
  const { data: canStart, isLoading: canStartLoading } = useCanStartEnrollmentAssessment(
    activeEnrollmentId ?? undefined, 
    provider?.id
  );
  const { data: activeAttempt } = useActiveEnrollmentAssessmentAttempt(activeEnrollmentId ?? undefined);
  const { data: activeAssessmentElsewhere } = useActiveAssessmentAcrossEnrollments(provider?.id);
  const { data: retakeEligibility, isLoading: retakeLoading } = useRetakeEligibility(
    activeEnrollmentId ?? undefined,
    provider?.id
  );
  
  const startAssessment = useStartEnrollmentAssessment();
  const startRetake = useStartRetakeAssessment();
  
  // Lifecycle validation scoped to enrollment
  const { data: terminalState } = useEnrollmentIsTerminal(activeEnrollmentId ?? undefined);
  const isTerminal = terminalState?.isTerminal ?? false;

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Use lifecycle_rank for robust state detection (works at current AND future stages)
  const lifecycleRank = activeEnrollment?.lifecycle_rank ?? 0;
  const enrollmentStatus = activeEnrollment?.lifecycle_status;
  
  // Rank-based state checks (110 = assessment_passed, 100 = assessment_in_progress)
  const hasPassedAssessment = lifecycleRank >= LIFECYCLE_RANKS.assessment_passed; // 110+
  const isInViewMode = lifecycleRank >= LIFECYCLE_RANKS.assessment_passed; // View mode after passing

  // Fetch the last passed attempt for this enrollment when in view mode
  // IMPORTANT: This hook must be before any early returns to follow React rules
  const { data: lastPassedAttempt, isLoading: lastAttemptLoading } = useQuery({
    queryKey: ['last-passed-attempt', activeEnrollmentId],
    queryFn: async () => {
      if (!activeEnrollmentId) return null;
      const { data, error } = await supabase
        .from('assessment_attempts')
        .select('id, score_percentage, is_passed, total_questions, answered_questions, submitted_at')
        .eq('enrollment_id', activeEnrollmentId)
        .eq('is_passed', true)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) return null;
      return data;
    },
    enabled: isInViewMode && !!activeEnrollmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes - results don't change
  });

  // Back navigation is handled by WizardLayout's default handler

  const handleStartAssessment = async () => {
    if (!provider?.id || !activeEnrollmentId || !activeEnrollment) return;

    const industrySegmentId = activeEnrollment.industry_segment_id;
    const expertiseLevelId = activeEnrollment.expertise_level_id;

    if (!industrySegmentId || !expertiseLevelId) {
      return; // Cannot start without industry and expertise
    }

    const result = await startAssessment.mutateAsync({
      enrollmentId: activeEnrollmentId,
      providerId: provider.id,
      industrySegmentId,
      expertiseLevelId,
      questionsCount: 20,
      timeLimitMinutes: 60,
    });

    if (result.success) {
      navigate('/enroll/assessment/take');
    }
  };

  const handleRetakeAssessment = async () => {
    if (!provider?.id || !activeEnrollmentId || !activeEnrollment) return;

    const industrySegmentId = activeEnrollment.industry_segment_id;
    const expertiseLevelId = activeEnrollment.expertise_level_id;

    if (!industrySegmentId || !expertiseLevelId) {
      return;
    }

    const result = await startRetake.mutateAsync({
      enrollmentId: activeEnrollmentId,
      providerId: provider.id,
      industrySegmentId,
      expertiseLevelId,
      questionsCount: 20,
      timeLimitMinutes: 60,
    });

    if (result.success) {
      navigate('/enroll/assessment/take');
    }
  };

  const handleContinueAssessment = () => {
    navigate('/enroll/assessment/take');
  };

  const handleGoToOtherAssessment = () => {
    if (activeAssessmentElsewhere?.enrollmentId) {
      setActiveEnrollment(activeAssessmentElsewhere.enrollmentId);
      navigate('/enroll/assessment/take');
    }
  };

  const isLoading = providerLoading || canStartLoading || enrollmentLoading || retakeLoading;

  // Helper to check if an attempt is expired (time limit passed)
  const isAttemptExpired = (attempt: { started_at: string; time_limit_minutes: number }) => {
    const startedAt = new Date(attempt.started_at);
    const expiresAt = new Date(startedAt.getTime() + attempt.time_limit_minutes * 60 * 1000);
    return new Date() >= expiresAt;
  };

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <WizardLayout currentStep={6} hideContinueButton>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </WizardLayout>
    );
  }

  // No enrollment selected
  if (!activeEnrollment) {
    return (
      <WizardLayout currentStep={6} hideContinueButton>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Industry Selected</AlertTitle>
          <AlertDescription>
            Please complete industry and expertise selection before taking the assessment.
          </AlertDescription>
        </Alert>
      </WizardLayout>
    );
  }

  // Check if there's an active assessment for another enrollment (sequential rule)
  const hasAssessmentElsewhere = activeAssessmentElsewhere && 
    activeAssessmentElsewhere.enrollmentId !== activeEnrollmentId;

  // Use ACTUAL attempt existence for "Continue" button (not just lifecycle status)
  // This fixes stale status where lifecycle says 'in_progress' but no valid attempt exists
  const hasActiveAttempt = activeAttempt && !isAttemptExpired(activeAttempt);
  const isInAssessment = !!hasActiveAttempt;
  const hasCompletedAssessment = enrollmentStatus === 'assessment_completed';

  // Assessment page uses custom action buttons inside the card
  // Use WizardLayout's default back navigation
  return (
    <WizardLayout
      currentStep={6}
      hideContinueButton
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Knowledge Assessment
          </h1>
          <p className="text-muted-foreground mt-2">
            Demonstrate your expertise through our comprehensive assessment. 
            This validates your proficiency in your selected industry and specialities.
          </p>
        </div>

        {/* Terminal State Lock Banner */}
        {isTerminal && (
          <LockedFieldBanner 
            lockLevel="everything"
            reason="Your profile has been verified. Assessment cannot be retaken."
          />
        )}

        {/* Sequential Assessment Rule - Active Assessment Elsewhere */}
        {hasAssessmentElsewhere && (
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800 dark:text-blue-400">Assessment In Progress</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <p className="mb-3">
                You have an active assessment for <strong>{activeAssessmentElsewhere.industryName || 'another industry'}</strong>. 
                Complete it before starting a new one.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGoToOtherAssessment}
                className="gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                Go to Active Assessment
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Assessment Already Passed - View Mode Results Summary */}
        {hasPassedAssessment && lastPassedAttempt && (
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10 dark:border-green-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-400">
                <Trophy className="h-5 w-5" />
                Assessment Passed
              </CardTitle>
              <CardDescription className="text-green-700 dark:text-green-300">
                Congratulations! You've successfully passed the knowledge assessment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Results Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white dark:bg-green-950/30 rounded-lg">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {lastPassedAttempt.score_percentage?.toFixed(0) ?? '--'}%
                  </p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
                <div className="text-center p-3 bg-white dark:bg-green-950/30 rounded-lg">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {lastPassedAttempt.answered_questions ?? '--'} / {lastPassedAttempt.total_questions}
                  </p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div className="text-center p-3 bg-white dark:bg-green-950/30 rounded-lg">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                    Passed
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(lastPassedAttempt.submitted_at ?? undefined)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline"
                  onClick={() => navigate('/enroll/assessment/results', { state: { attemptId: lastPassedAttempt.id } })}
                  className="flex-1"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Detailed Results
                </Button>
                <Button 
                  onClick={() => navigate('/enroll/interview-slot')}
                  className="flex-1"
                >
                  Schedule Interview
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assessment Already Passed - Loading state for results */}
        {hasPassedAssessment && lastAttemptLoading && (
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10 dark:border-green-800">
            <CardContent className="p-6 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-green-600 mr-2" />
              <span className="text-green-700 dark:text-green-300">Loading assessment results...</span>
            </CardContent>
          </Card>
        )}

        {/* Assessment Already Passed - No attempt data fallback */}
        {hasPassedAssessment && !lastAttemptLoading && !lastPassedAttempt && (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-400">Assessment Passed!</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Congratulations! You've successfully passed the knowledge assessment for this industry. 
              You can now proceed to schedule your panel discussion.
            </AlertDescription>
          </Alert>
        )}

        {/* Assessment Completed (not passed) - Retake Available */}
        {hasCompletedAssessment && retakeEligibility?.canRetake && (
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
            <RotateCcw className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">Ready for Another Attempt</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              <p className="mb-2">
                You have <strong>{retakeEligibility.attemptsRemaining}</strong> of {retakeEligibility.maxAttempts} attempts 
                remaining in the current 90-day window.
              </p>
              {retakeEligibility.windowEndDate && (
                <p className="text-sm opacity-80">
                  Window expires: {formatDate(retakeEligibility.windowEndDate)}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Assessment Completed - In Cooling Off Period */}
        {hasCompletedAssessment && retakeEligibility?.isInCoolingOff && (
          <Alert className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800">
            <CalendarClock className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800 dark:text-red-400">Assessment Temporarily Locked</AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300">
              <p className="mb-2">
                You have used all {retakeEligibility.maxAttempts} attempts within the 90-day window. 
                The assessment is locked until <strong>{formatDate(retakeEligibility.lockedUntilDate)}</strong>.
              </p>
              {retakeEligibility.daysUntilUnlock && (
                <p className="text-sm opacity-80">
                  {retakeEligibility.daysUntilUnlock} days remaining in cooling-off period.
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Assessment Completed - Max Attempts (not in cooling off, past all windows) */}
        {hasCompletedAssessment && !retakeEligibility?.canRetake && !retakeEligibility?.isInCoolingOff && (
          <Alert className="bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800">
            <AlertCircle className="h-4 w-4 text-gray-600" />
            <AlertTitle className="text-gray-800 dark:text-gray-400">Assessment Status</AlertTitle>
            <AlertDescription className="text-gray-700 dark:text-gray-300">
              {retakeEligibility?.reason || 'Contact support for next steps.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration Lock Warning */}
        {!isInAssessment && !hasPassedAssessment && !hasCompletedAssessment && !hasAssessmentElsewhere && (
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">Important: Configuration Lock</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Once you start the assessment, your <strong>expertise level</strong> and <strong>speciality selections</strong> 
              for this industry will be permanently locked. 
              Make sure you've reviewed your profile before proceeding.
            </AlertDescription>
          </Alert>
        )}

        {/* Assessment Info Cards - Hide when in view mode (results already shown) */}
        {!isInViewMode && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">20</p>
                <p className="text-xs text-muted-foreground">Multiple choice & scenario-based</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Time Limit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">60 min</p>
                <p className="text-xs text-muted-foreground">Timer starts when you begin</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Passing Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">70%</p>
                <p className="text-xs text-muted-foreground">Minimum to proceed</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Action Card - Hide when in view mode (results card has buttons) */}
        {!isInViewMode && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isInAssessment ? (
                  <>
                    <PlayCircle className="h-5 w-5 text-primary" />
                    Assessment In Progress
                  </>
                ) : hasCompletedAssessment && retakeEligibility?.canRetake ? (
                  <>
                    <RotateCcw className="h-5 w-5 text-primary" />
                    Retake Available
                  </>
                ) : hasCompletedAssessment && !retakeEligibility?.canRetake ? (
                  <>
                    <Lock className="h-5 w-5 text-muted-foreground" />
                    Assessment Locked
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    Ready to Begin?
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {isInAssessment 
                  ? 'You have an active assessment. Continue where you left off.'
                  : hasCompletedAssessment && retakeEligibility?.canRetake
                  ? `You can retake the assessment. ${retakeEligibility.attemptsRemaining} attempt(s) remaining.`
                  : hasCompletedAssessment && !retakeEligibility?.canRetake
                  ? retakeEligibility?.isInCoolingOff 
                    ? `Assessment will unlock on ${formatDate(retakeEligibility.lockedUntilDate)}`
                    : 'Review your results below or contact support.'
                  : 'Review the information above before starting your assessment.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Locked Items Preview */}
              {!isInAssessment && !hasPassedAssessment && !hasCompletedAssessment && !hasAssessmentElsewhere && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium">Items that will be locked for this industry:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Expertise Level</Badge>
                    <Badge variant="secondary">Proficiency Areas</Badge>
                    <Badge variant="secondary">Specialities</Badge>
                  </div>
                </div>
              )}

              {/* Retake Info */}
              {hasCompletedAssessment && retakeEligibility && (
                <div className={`rounded-lg p-4 ${retakeEligibility.canRetake ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-muted/50'}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Attempts Used</span>
                    <span className={retakeEligibility.canRetake ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}>
                      {retakeEligibility.attemptsUsed} / {retakeEligibility.maxAttempts}
                    </span>
                  </div>
                  {retakeEligibility.isInCoolingOff && retakeEligibility.daysUntilUnlock && (
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="font-medium">Days Until Unlock</span>
                      <span className="text-red-600 dark:text-red-400">
                        {retakeEligibility.daysUntilUnlock} days
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Active Attempt Info */}
              {isInAssessment && activeAttempt && (
                <div className="bg-primary/10 rounded-lg p-4">
                  <p className="text-sm">
                    Started: {new Date(activeAttempt.started_at).toLocaleString()}
                  </p>
                  <p className="text-sm">
                    Questions: {activeAttempt.answered_questions || 0} / {activeAttempt.total_questions} answered
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {isInAssessment ? (
                  <Button 
                    onClick={handleContinueAssessment}
                    className="flex-1"
                    size="lg"
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Continue Assessment
                  </Button>
                ) : hasAssessmentElsewhere ? (
                  <Button 
                    onClick={handleGoToOtherAssessment}
                    className="flex-1"
                    size="lg"
                    variant="outline"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Go to Active Assessment
                  </Button>
                ) : hasCompletedAssessment && retakeEligibility?.canRetake ? (
                  <Button 
                    onClick={handleRetakeAssessment}
                    className="flex-1"
                    size="lg"
                    disabled={startRetake.isPending}
                  >
                    {startRetake.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting Retake...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Retake Assessment ({retakeEligibility.attemptsRemaining} left)
                      </>
                    )}
                  </Button>
                ) : hasCompletedAssessment && !retakeEligibility?.canRetake ? (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    disabled 
                    className="flex-1"
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    {retakeEligibility?.isInCoolingOff 
                      ? `Locked Until ${formatDate(retakeEligibility.lockedUntilDate)}`
                      : 'Assessment Locked'
                    }
                  </Button>
                ) : (
                  <Button 
                    onClick={handleStartAssessment}
                    className="flex-1"
                    size="lg"
                    disabled={!canStart?.allowed || startAssessment.isPending || isTerminal}
                  >
                    {startAssessment.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Start Assessment
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Cannot Start Reason */}
              {!canStart?.allowed && canStart?.reason && !isInAssessment && !hasAssessmentElsewhere && !hasCompletedAssessment && (
                <p className="text-sm text-muted-foreground text-center">
                  {canStart.reason}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Assessment Tips - Hide when in view mode */}
        {!isInViewMode && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assessment Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Ensure stable internet connection before starting
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Questions are based on your selected industry and expertise level
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  You can navigate between questions before submitting
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Auto-submit occurs when time expires
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Complete one industry assessment before starting another
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  You have up to 3 attempts within a 90-day window
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </WizardLayout>
  );
}

export default function EnrollAssessment() {
  return (
    <FeatureErrorBoundary featureName="Assessment">
      <AssessmentContent />
    </FeatureErrorBoundary>
  );
}