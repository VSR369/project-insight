import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronRight,
  Trophy,
  AlertTriangle,
  Calendar,
  RotateCcw,
  Home,
  ArrowRight,
  Lock,
  Loader2 as Loader
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useRetakeEligibility, useStartRetakeAssessment } from '@/hooks/queries/useEnrollmentAssessment';
import { WizardLayout } from '@/components/layout';

interface AssessmentResult {
  id: string;
  score_percentage: number;
  is_passed: boolean;
  total_questions: number;
  answered_questions: number;
  started_at: string;
  submitted_at: string;
}

interface QuestionResult {
  id: string;
  question_text: string;
  selected_option: number | null;
  correct_option: number;
  is_correct: boolean;
  options: { index: number; text: string }[];
  difficulty: string | null;
  speciality_name: string;
  sub_domain_name: string;
  proficiency_area_name: string;
  expected_answer_guidance: string | null;
}

interface AreaBreakdown {
  name: string;
  correct: number;
  total: number;
  percentage: number;
}

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

  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [questions, setQuestions] = useState<QuestionResult[]>([]);
  const [areaBreakdown, setAreaBreakdown] = useState<AreaBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailedResults, setShowDetailedResults] = useState(false);

  useEffect(() => {
    if (!attemptId) {
      navigate('/enroll/assessment');
      return;
    }

    loadResults();
  }, [attemptId]);

  const loadResults = async () => {
    try {
      // Fetch attempt result
      const { data: attemptData, error: attemptError } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;
      setResult(attemptData);

      // Fetch question results with details
      const { data: responsesData, error: responsesError } = await supabase
        .from('assessment_attempt_responses')
        .select(`
          id,
          question_id,
          selected_option,
          is_correct,
          question_bank!inner (
            id,
            question_text,
            correct_option,
            options,
            difficulty,
            expected_answer_guidance,
            speciality_id,
            specialities!inner (
              name,
              sub_domain_id,
              sub_domains!inner (
                name,
                proficiency_area_id,
                proficiency_areas!inner (
                  name
                )
              )
            )
          )
        `)
        .eq('attempt_id', attemptId);

      if (responsesError) throw responsesError;

      // Transform responses to question results
      const questionResults: QuestionResult[] = (responsesData || []).map((r: any) => {
        const qb = r.question_bank;
        const spec = qb.specialities;
        const subDomain = spec.sub_domains;
        const area = subDomain.proficiency_areas;

        // Parse options
        let options: { index: number; text: string }[] = [];
        if (qb.options) {
          if (Array.isArray(qb.options)) {
            options = qb.options;
          } else if (typeof qb.options === 'object') {
            options = Object.entries(qb.options).map(([key, text], idx) => ({
              index: idx,
              text: text as string,
            }));
          }
        }

        return {
          id: qb.id,
          question_text: qb.question_text,
          selected_option: r.selected_option,
          correct_option: qb.correct_option,
          is_correct: r.is_correct || false,
          options,
          difficulty: qb.difficulty,
          speciality_name: spec.name,
          sub_domain_name: subDomain.name,
          proficiency_area_name: area.name,
          expected_answer_guidance: qb.expected_answer_guidance,
        };
      });

      setQuestions(questionResults);

      // Calculate area breakdown
      const areaMap = new Map<string, { correct: number; total: number }>();
      questionResults.forEach((q) => {
        const current = areaMap.get(q.proficiency_area_name) || { correct: 0, total: 0 };
        current.total++;
        if (q.is_correct) current.correct++;
        areaMap.set(q.proficiency_area_name, current);
      });

      const breakdown: AreaBreakdown[] = Array.from(areaMap.entries()).map(([name, stats]) => ({
        name,
        correct: stats.correct,
        total: stats.total,
        percentage: Math.round((stats.correct / stats.total) * 100),
      }));

      setAreaBreakdown(breakdown);
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500" />
            <h2 className="text-xl font-semibold">Results Not Found</h2>
            <p className="text-muted-foreground">
              Unable to load assessment results.
            </p>
            <Button onClick={() => navigate('/enroll/assessment')}>
              Go to Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPassed = result.is_passed;
  const scorePercentage = Math.round(result.score_percentage || 0);
  const correctAnswers = questions.filter(q => q.is_correct).length;

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
          'mb-8 border-2',
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
                  {scorePercentage}%
                </h1>
                <p className="text-muted-foreground">
                  {correctAnswers} out of {result.total_questions} questions correct
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
        <div className="flex flex-wrap gap-4 mb-8">
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
              {/* Retake button - conditional based on eligibility */}
              {retakeLoading ? (
                <Button variant="outline" size="lg" disabled className="gap-2">
                  <Loader className="h-5 w-5 animate-spin" />
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
                      <Loader className="h-5 w-5 animate-spin" />
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

        {/* Area Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Performance by Proficiency Area</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {areaBreakdown.map((area) => (
              <div key={area.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{area.name}</span>
                  <span className={cn(
                    'font-semibold',
                    area.percentage >= PASSING_SCORE ? 'text-green-600' : 'text-red-600'
                  )}>
                    {area.correct}/{area.total} ({area.percentage}%)
                  </span>
                </div>
                <Progress 
                  value={area.percentage} 
                  className={cn(
                    'h-2',
                    area.percentage >= PASSING_SCORE 
                      ? '[&>div]:bg-green-500' 
                      : '[&>div]:bg-red-500'
                  )}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Detailed Results Toggle */}
        <Collapsible open={showDetailedResults} onOpenChange={setShowDetailedResults}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full mb-4 gap-2">
              {showDetailedResults ? (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Hide Detailed Results
                </>
              ) : (
                <>
                  <ChevronRight className="h-4 w-4" />
                  Show Detailed Results
                </>
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <Card>
              <CardHeader>
                <CardTitle>Question-by-Question Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions.map((q, idx) => (
                  <div 
                    key={q.id}
                    className={cn(
                      'p-4 rounded-lg border-2',
                      q.is_correct 
                        ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10' 
                        : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10'
                    )}
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        {q.is_correct ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        )}
                        <Badge variant="outline">Question {idx + 1}</Badge>
                        {q.difficulty && (
                          <Badge variant="secondary" className="text-xs">
                            {q.difficulty}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-900/20">
                        {q.speciality_name}
                      </Badge>
                    </div>

                    {/* Question Text */}
                    <p className="text-foreground mb-4">{q.question_text}</p>

                    {/* Options */}
                    <div className="space-y-2 mb-4">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = q.selected_option === opt.index;
                        const isCorrect = q.correct_option === opt.index;
                        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

                        return (
                          <div
                            key={opt.index}
                            className={cn(
                              'p-3 rounded-lg border text-sm',
                              isCorrect && 'border-green-500 bg-green-100 dark:bg-green-900/30',
                              isSelected && !isCorrect && 'border-red-500 bg-red-100 dark:bg-red-900/30',
                              !isCorrect && !isSelected && 'border-border bg-background'
                            )}
                          >
                            <span className="font-semibold mr-2">{letters[optIdx]}.</span>
                            {opt.text}
                            {isCorrect && (
                              <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
                            )}
                            {isSelected && !isCorrect && (
                              <span className="ml-2 text-red-600 font-medium">✗ Your answer</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.expected_answer_guidance && (
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        <p className="font-medium text-muted-foreground mb-1">Explanation:</p>
                        <p className="text-foreground">{q.expected_answer_guidance}</p>
                      </div>
                    )}

                    {idx < questions.length - 1 && <Separator className="mt-6" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </WizardLayout>
  );
}