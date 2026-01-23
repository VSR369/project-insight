import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, Send, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { toast } from 'sonner';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import {
  useActiveEnrollmentAssessmentAttempt,
  useAssessmentAttemptQuestions,
  useSaveAssessmentAnswer,
  useSubmitEnrollmentAssessment,
} from '@/hooks/queries/useEnrollmentAssessment';
import { AssessmentProgressHeader, QuestionSection } from '@/components/assessment';
import type { Json } from '@/integrations/supabase/types';

// Types for hierarchical question grouping
interface QuestionOption {
  index: number;
  text: string;
}

interface QuestionForDisplay {
  id: string;
  question_text: string;
  options: QuestionOption[];
  difficulty: string | null;
  speciality_id: string;
  speciality_name: string;
  sub_domain_id: string;
  sub_domain_name: string;
  proficiency_area_id: string;
  proficiency_area_name: string;
  selected_option: number | null;
}

interface SpecialityGroup {
  id: string;
  name: string;
  questions: QuestionForDisplay[];
}

interface SubDomainGroup {
  id: string;
  name: string;
  specialities: SpecialityGroup[];
}

interface ProficiencyAreaGroup {
  id: string;
  name: string;
  subDomains: SubDomainGroup[];
}

// Helper to parse options from database
function parseOptions(options: Json): QuestionOption[] {
  if (!options) return [];
  
  if (Array.isArray(options)) {
    return options.map((opt, idx) => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          index: (opt as any).index ?? idx,
          text: String((opt as any).text ?? ''),
        };
      }
      return { index: idx, text: String(opt) };
    });
  }
  
  if (typeof options === 'object' && options !== null) {
    return Object.entries(options).map(([key, text], idx) => ({
      index: idx,
      text: String(text ?? ''),
    }));
  }
  
  return [];
}

export default function TakeAssessment() {
  const navigate = useNavigate();
  const { activeEnrollmentId } = useEnrollmentContext();
  const { data: provider } = useCurrentProvider();

  // Fetch active attempt
  const { data: attempt, isLoading: isLoadingAttempt } = useActiveEnrollmentAssessmentAttempt(activeEnrollmentId);

  // Fetch questions for the attempt
  const { data: rawQuestions, isLoading: isLoadingQuestions } = useAssessmentAttemptQuestions(attempt?.id);

  // Mutations
  const saveAnswer = useSaveAssessmentAnswer();
  const submitAssessment = useSubmitEnrollmentAssessment();

  // Transform raw questions to display format
  const questions = useMemo<QuestionForDisplay[]>(() => {
    if (!rawQuestions) return [];
    
    return rawQuestions.map((response: any) => {
      const qb = response.question_bank;
      const spec = qb?.specialities;
      const subDomain = spec?.sub_domains;
      const area = subDomain?.proficiency_areas;
      
      return {
        id: qb?.id || response.question_id,
        question_text: qb?.question_text || '',
        options: parseOptions(qb?.options),
        difficulty: qb?.difficulty || null,
        speciality_id: qb?.speciality_id || '',
        speciality_name: spec?.name || 'Unknown Speciality',
        sub_domain_id: subDomain?.id || '',
        sub_domain_name: subDomain?.name || 'Unknown Sub-Domain',
        proficiency_area_id: area?.id || '',
        proficiency_area_name: area?.name || 'Unknown Area',
        selected_option: response.selected_option,
      };
    });
  }, [rawQuestions]);

  // Local state
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [savingQuestions, setSavingQuestions] = useState<Set<string>>(new Set());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showTimeExpiredDialog, setShowTimeExpiredDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize answers from loaded questions
  useEffect(() => {
    if (questions && questions.length > 0) {
      const initialAnswers: Record<string, number | null> = {};
      questions.forEach((q) => {
        initialAnswers[q.id] = q.selected_option;
      });
      setAnswers(initialAnswers);
    }
  }, [questions]);

  // Handle answer selection with autosave
  const handleAnswerChange = useCallback(async (questionId: string, optionIndex: number) => {
    if (!attempt?.id) return;

    // Optimistically update local state
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    setSavingQuestions(prev => new Set(prev).add(questionId));

    try {
      await saveAnswer.mutateAsync({
        attemptId: attempt.id,
        questionId,
        selectedOption: optionIndex,
      });
    } catch (error) {
      console.error('Failed to save answer:', error);
      toast.error('Failed to save answer. Please try again.');
      // Revert on error
      setAnswers(prev => ({ ...prev, [questionId]: null }));
    } finally {
      setSavingQuestions(prev => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  }, [attempt?.id, saveAnswer]);

  // Group questions hierarchically
  const hierarchicalQuestions = useMemo(() => {
    if (!questions || questions.length === 0) return [];

    const areaMap = new Map<string, ProficiencyAreaGroup>();

    questions.forEach((q) => {
      // Get or create proficiency area
      if (!areaMap.has(q.proficiency_area_id)) {
        areaMap.set(q.proficiency_area_id, {
          id: q.proficiency_area_id,
          name: q.proficiency_area_name || 'Unknown Area',
          subDomains: [],
        });
      }
      const area = areaMap.get(q.proficiency_area_id)!;

      // Get or create sub-domain
      let subDomain = area.subDomains.find(sd => sd.id === q.sub_domain_id);
      if (!subDomain) {
        subDomain = {
          id: q.sub_domain_id,
          name: q.sub_domain_name || 'Unknown Sub-Domain',
          specialities: [],
        };
        area.subDomains.push(subDomain);
      }

      // Get or create speciality
      let speciality = subDomain.specialities.find(sp => sp.id === q.speciality_id);
      if (!speciality) {
        speciality = {
          id: q.speciality_id,
          name: q.speciality_name || 'Unknown Speciality',
          questions: [],
        };
        subDomain.specialities.push(speciality);
      }

      // Add question
      speciality.questions.push(q);
    });

    return Array.from(areaMap.values());
  }, [questions]);

  // Create question number map for display
  const questionNumberMap = useMemo(() => {
    if (!questions) return {};
    const map: Record<string, number> = {};
    questions.forEach((q, idx) => {
      map[q.id] = idx + 1;
    });
    return map;
  }, [questions]);

  // Calculate progress
  const totalQuestions = questions?.length || 0;
  const answeredQuestions = Object.values(answers).filter(a => a != null).length;
  const unansweredCount = totalQuestions - answeredQuestions;

  // Handle time expired
  const handleTimeExpired = useCallback(() => {
    setShowTimeExpiredDialog(true);
  }, []);

  // TODO: Remove before production - temporary debugging feature
  const handleDownloadQuestions = useCallback(() => {
    if (!questions || questions.length === 0) {
      toast.error('No questions to download');
      return;
    }

    const exportData = questions.map((q, idx) => ({
      questionNumber: idx + 1,
      id: q.id,
      question_text: q.question_text,
      options: q.options,
      difficulty: q.difficulty,
      proficiency_area: q.proficiency_area_name,
      sub_domain: q.sub_domain_name,
      speciality: q.speciality_name,
    }));

    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment-questions-${attempt?.id?.slice(0, 8) || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Downloaded ${exportData.length} questions`);
  }, [questions, attempt?.id]);

  // Handle submit
  const handleSubmit = async () => {
    if (!attempt?.id || !activeEnrollmentId) return;

    setIsSubmitting(true);
    setShowSubmitDialog(false);
    setShowTimeExpiredDialog(false);

    try {
      const result = await submitAssessment.mutateAsync({
        attemptId: attempt.id,
        enrollmentId: activeEnrollmentId,
      });

      toast.success('Assessment submitted successfully!');
      navigate('/enroll/assessment/results', { state: { attemptId: attempt.id } });
    } catch (error) {
      console.error('Failed to submit assessment:', error);
      toast.error('Failed to submit assessment. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/enroll/assessment');
  };

  // Loading state
  if (isLoadingAttempt || isLoadingQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    );
  }

  // No active attempt
  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500" />
            <h2 className="text-xl font-semibold">No Active Assessment</h2>
            <p className="text-muted-foreground">
              You don't have an active assessment. Please start a new assessment.
            </p>
            <Button onClick={() => navigate('/enroll/assessment')}>
              Go to Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No questions
  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500" />
            <h2 className="text-xl font-semibold">No Questions Found</h2>
            <p className="text-muted-foreground">
              Unable to load questions for this assessment.
            </p>
            <Button onClick={() => navigate('/enroll/assessment')}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Header */}
      <AssessmentProgressHeader
        totalQuestions={totalQuestions}
        answeredQuestions={answeredQuestions}
        startedAt={attempt.started_at}
        timeLimitMinutes={attempt.time_limit_minutes}
        onTimeExpired={handleTimeExpired}
        onBack={handleBack}
      />

      {/* TODO: Remove before production - temporary debugging feature */}
      <div className="container max-w-5xl mx-auto px-4 pt-4">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadQuestions}
            className="gap-2 bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
          >
            <Download className="h-4 w-4" />
            Download Questions (DEV)
          </Button>
        </div>
      </div>

      {/* Questions */}
      <div className="container max-w-5xl mx-auto px-4 py-6">
        {hierarchicalQuestions.map((area) => (
          <QuestionSection
            key={area.id}
            proficiencyArea={area}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            savingQuestions={savingQuestions}
            questionNumberMap={questionNumberMap}
          />
        ))}

        {/* Submit Button */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t py-4 mt-8 -mx-4 px-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {unansweredCount > 0 ? (
                <span className="text-yellow-600 dark:text-yellow-400">
                  {unansweredCount} question{unansweredCount > 1 ? 's' : ''} unanswered
                </span>
              ) : (
                <span className="text-green-600 dark:text-green-400">
                  All questions answered ✓
                </span>
              )}
            </div>
            <Button
              size="lg"
              onClick={() => setShowSubmitDialog(true)}
              disabled={isSubmitting || savingQuestions.size > 0}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Assessment
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              {unansweredCount > 0 ? (
                <>
                  You have <span className="font-semibold text-yellow-600">{unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}</span>. 
                  Unanswered questions will be marked as incorrect.
                  <br /><br />
                  Are you sure you want to submit?
                </>
              ) : (
                <>
                  You have answered all {totalQuestions} questions.
                  <br /><br />
                  Once submitted, you cannot change your answers. Are you ready to submit?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Answering</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              Submit Assessment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Time Expired Dialog */}
      <AlertDialog open={showTimeExpiredDialog} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Time Expired
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your assessment time has expired. Your answers will be submitted automatically.
              {unansweredCount > 0 && (
                <span className="block mt-2 text-yellow-600">
                  {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''} will be marked as incorrect.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleSubmit}>
              Submit Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
