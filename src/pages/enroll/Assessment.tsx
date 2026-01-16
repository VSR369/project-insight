import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardLayout } from '@/components/layout';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useCanStartAssessment, useStartAssessment, useActiveAssessmentAttempt } from '@/hooks/queries/useAssessment';
import { useIsTerminalState } from '@/hooks/queries/useLifecycleValidation';
import { LockedFieldBanner } from '@/components/enrollment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Loader2, 
  ClipboardCheck, 
  Clock, 
  Lock, 
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

export default function EnrollAssessment() {
  const navigate = useNavigate();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: canStart, isLoading: canStartLoading } = useCanStartAssessment(provider?.id);
  const { data: activeAttempt } = useActiveAssessmentAttempt(provider?.id);
  const startAssessment = useStartAssessment();
  
  // Lifecycle validation
  const terminalState = useIsTerminalState();
  const isTerminal = terminalState.isTerminal;

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const handleBack = () => {
    navigate('/enroll/proof-points');
  };

  const handleStartAssessment = async () => {
    if (!provider?.id) return;

    const result = await startAssessment.mutateAsync({
      providerId: provider.id,
      questionsCount: 20,
      timeLimitMinutes: 60,
    });

    if (result.success) {
      // Navigate to assessment taking page (placeholder for now)
      navigate('/enroll/assessment/take');
    }
  };

  const handleContinueAssessment = () => {
    navigate('/enroll/assessment/take');
  };

  const isLoading = providerLoading || canStartLoading;

  if (isLoading) {
    return (
      <WizardLayout currentStep={6} hideBackButton hideContinueButton>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </WizardLayout>
    );
  }

  // Already in assessment
  const isInAssessment = provider?.lifecycle_status === 'assessment_in_progress';
  const hasPassedAssessment = provider?.lifecycle_status === 'assessment_passed';
  const hasCompletedAssessment = provider?.lifecycle_status === 'assessment_completed';

  return (
    <WizardLayout
      currentStep={6}
      onBack={handleBack}
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

        {/* Assessment Already Passed */}
        {hasPassedAssessment && (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-400">Assessment Passed!</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Congratulations! You've successfully passed the knowledge assessment. 
              You can now proceed to schedule your panel discussion.
            </AlertDescription>
          </Alert>
        )}

        {/* Assessment Completed (not passed) */}
        {hasCompletedAssessment && (
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">Assessment Completed</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              You've completed the assessment but didn't reach the passing threshold. 
              Contact support for next steps.
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration Lock Warning */}
        {!isInAssessment && !hasPassedAssessment && !hasCompletedAssessment && (
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">Important: Configuration Lock</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Once you start the assessment, your <strong>industry segment</strong>, <strong>expertise level</strong>, 
              and <strong>speciality selections</strong> will be permanently locked. 
              Make sure you've reviewed your profile before proceeding.
            </AlertDescription>
          </Alert>
        )}

        {/* Assessment Info Cards */}
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

        {/* Main Action Card */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isInAssessment ? (
                <>
                  <PlayCircle className="h-5 w-5 text-primary" />
                  Assessment In Progress
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
                : 'Review the information above before starting your assessment.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Locked Items Preview */}
            {!isInAssessment && !hasPassedAssessment && !hasCompletedAssessment && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Items that will be locked:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Industry Segment</Badge>
                  <Badge variant="secondary">Expertise Level</Badge>
                  <Badge variant="secondary">Proficiency Areas</Badge>
                  <Badge variant="secondary">Specialities</Badge>
                </div>
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
              ) : !hasPassedAssessment && !hasCompletedAssessment ? (
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
              ) : hasPassedAssessment ? (
                <Button 
                  onClick={() => navigate('/enroll/interview-slot')}
                  className="flex-1"
                  size="lg"
                >
                  Proceed to Panel Scheduling
                </Button>
              ) : null}
            </div>

            {/* Cannot Start Reason */}
            {!canStart?.allowed && canStart?.reason && !isInAssessment && (
              <p className="text-sm text-muted-foreground text-center">
                {canStart.reason}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Assessment Tips */}
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
            </ul>
          </CardContent>
        </Card>
      </div>
    </WizardLayout>
  );
}
