/**
 * Assessment Results Page
 * 
 * Displays assessment results with hierarchical score breakdown:
 * Proficiency Area → Sub-Domain → Speciality → Questions
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Trophy,
  XCircle,
  AlertTriangle,
  Calendar,
  RotateCcw,
  Home,
  ArrowRight,
  Lock,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useRetakeEligibility, useStartRetakeAssessment } from '@/hooks/queries/useEnrollmentAssessment';
import { useAssessmentResults } from '@/hooks/queries/useAssessmentResults';
import { WizardLayout } from '@/components/layout';
import { ResultsSummaryHeader, ResultsHierarchyTree } from '@/components/assessment';

const PASSING_SCORE = 70;

export default function AssessmentResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const attemptId = location.state?.attemptId;

  // Enrollment context for retake
  const { activeEnrollmentId, activeEnrollment } = useEnrollmentContext();
  const { data: provider } = useCurrentProvider();
  const { data: retakeEligibility, isLoading: retakeLoading } = useRetakeEligibility(
    activeEnrollmentId ?? undefined,
    provider?.id
  );
  const startRetake = useStartRetakeAssessment();

  // Fetch full results with hierarchy
  const { 
    data: resultsData, 
    isLoading, 
    error 
  } = useAssessmentResults(attemptId);

  const handleRetakeAssessment = async () => {
    if (!provider?.id || !activeEnrollmentId || !activeEnrollment) {
      navigate('/enroll/assessment');
      return;
    }

    const industrySegmentId = activeEnrollment.industry_segment_id;
    const expertiseLevelId = activeEnrollment.expertise_level_id;

    if (!industrySegmentId || !expertiseLevelId) {
      navigate('/enroll/assessment');
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !resultsData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500" />
            <h2 className="text-xl font-semibold">Results Not Found</h2>
            <p className="text-muted-foreground">
              {error?.message || 'Unable to load assessment results.'}
            </p>
            <Button onClick={() => navigate('/enroll/assessment')}>
              Go to Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { attempt, hierarchy, provider: providerInfo, enrollment } = resultsData;
  const isPassed = attempt.isPassed ?? false;
  const scorePercentage = attempt.scorePercentage ?? 0;
  const correctAnswers = hierarchy.overallCorrect;
  const totalQuestions = attempt.totalQuestions;
  const overallRating = hierarchy.overallRating;

  const providerName = providerInfo 
    ? `${providerInfo.firstName} ${providerInfo.lastName}`.trim() 
    : '—';

  const handleBack = () => navigate('/enroll/assessment');
  const handleContinue = () => isPassed ? navigate('/enroll/interview-slot') : undefined;

  return (
    <WizardLayout
      currentStep={6}
      onBack={handleBack}
      onContinue={isPassed ? handleContinue : undefined}
      hideContinueButton={!isPassed}
      continueLabel={isPassed ? "Schedule Interview" : undefined}
    >
      <div className="space-y-6">
        {/* Result Banner */}
        <Card className={cn(
          'border-2',
          isPassed 
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
            : 'border-red-500 bg-red-50 dark:bg-red-900/20'
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              {/* Icon */}
              <div className={cn(
                'flex-shrink-0 w-20 h-20 rounded-full flex items-center justify-center',
                isPassed 
                  ? 'bg-green-100 dark:bg-green-800' 
                  : 'bg-red-100 dark:bg-red-800'
              )}>
                {isPassed ? (
                  <Trophy className="h-10 w-10 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                )}
              </div>

              {/* Result Text */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Badge 
                    variant={isPassed ? 'default' : 'destructive'}
                    className="text-sm px-3 py-1"
                  >
                    {isPassed ? 'PASSED' : 'BELOW THRESHOLD'}
                  </Badge>
                </div>
                <h1 className={cn(
                  'text-3xl font-bold mb-1',
                  isPassed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                )}>
                  {scorePercentage.toFixed(2)}%
                </h1>
                <p className="text-muted-foreground">
                  {correctAnswers} out of {totalQuestions} questions correct
                </p>
              </div>
            </div>

            {/* Message */}
            <div className={cn(
              'mt-6 p-4 rounded-lg',
              isPassed 
                ? 'bg-green-100 dark:bg-green-800/30' 
                : 'bg-red-100 dark:bg-red-800/30'
            )}>
              {isPassed ? (
                <p className="text-green-800 dark:text-green-300">
                  <strong>Congratulations!</strong> You have demonstrated the required knowledge and met the {PASSING_SCORE}% verification threshold. 
                  You can now proceed to schedule your discussion with our panel.
                </p>
              ) : (
                <div className="text-red-800 dark:text-red-300">
                  <p className="mb-2">
                    <strong>Unfortunately,</strong> your score did not meet the {PASSING_SCORE}% threshold required to proceed. 
                  </p>
                  {retakeEligibility?.canRetake && (
                    <p className="text-sm opacity-90">
                      You have <strong>{retakeEligibility.attemptsRemaining}</strong> of {retakeEligibility.maxAttempts} retake attempts remaining.
                    </p>
                  )}
                  {retakeEligibility?.isInCoolingOff && (
                    <p className="text-sm opacity-90">
                      Assessment locked until <strong>{formatDate(retakeEligibility.lockedUntilDate)}</strong>.
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          {isPassed ? (
            <>
              <Button 
                size="lg" 
                className="gap-2"
                onClick={() => navigate('/enroll/interview-slot')}
              >
                <Calendar className="h-5 w-5" />
                Schedule Discussion
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/dashboard')}>
                Complete Later
              </Button>
            </>
          ) : (
            <>
              {retakeLoading ? (
                <Button variant="outline" size="lg" disabled className="gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Checking eligibility...
                </Button>
              ) : retakeEligibility?.canRetake ? (
                <Button 
                  size="lg" 
                  className="gap-2" 
                  onClick={handleRetakeAssessment}
                  disabled={startRetake.isPending}
                >
                  {startRetake.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Starting Retake...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-5 w-5" />
                      Retake Assessment ({retakeEligibility.attemptsRemaining} left)
                    </>
                  )}
                </Button>
              ) : (
                <Button variant="outline" size="lg" disabled className="gap-2">
                  <Lock className="h-5 w-5" />
                  {retakeEligibility?.isInCoolingOff 
                    ? `Locked until ${formatDate(retakeEligibility?.lockedUntilDate)}`
                    : 'Maximum Attempts Reached'}
                </Button>
              )}
              <Button variant="ghost" size="lg" onClick={() => navigate('/dashboard')}>
                <Home className="h-4 w-4 mr-2" />
                Exit to Dashboard
              </Button>
            </>
          )}
        </div>

        {/* Summary Header with Provider Context */}
        <ResultsSummaryHeader
          providerName={providerName}
          industrySegment={enrollment?.industrySegmentName ?? '—'}
          expertiseLevel={enrollment?.expertiseLevelName ?? '—'}
          totalQuestions={totalQuestions}
          correctQuestions={correctAnswers}
          scorePercentage={scorePercentage}
          overallRating={overallRating}
          isPassed={isPassed}
        />

        {/* Hierarchical Performance Breakdown */}
        <ResultsHierarchyTree 
          hierarchy={hierarchy}
          showQuestions={true}
          industrySegmentName={enrollment?.industrySegmentName}
          expertiseLevelName={enrollment?.expertiseLevelName}
        />
      </div>
    </WizardLayout>
  );
}
