import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, Send, Download, PlayCircle } from 'lucide-react';
import html2pdf from 'html2pdf.js';
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
  useCanStartEnrollmentAssessment,
  useStartEnrollmentAssessment,
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
  correct_option: number | null;
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

// Helper to parse options from database (uses 1-based indexing)
function parseOptions(options: Json): QuestionOption[] {
  if (!options) return [];
  
  if (Array.isArray(options)) {
    return options.map((opt, idx) => {
      if (typeof opt === 'object' && opt !== null) {
        // Use stored index, or default to 1-based indexing
        const rawIndex = (opt as any).index;
        return {
          index: rawIndex != null ? rawIndex : idx + 1,
          text: String((opt as any).text ?? ''),
        };
      }
      return { index: idx + 1, text: String(opt) };
    });
  }
  
  if (typeof options === 'object' && options !== null) {
    return Object.entries(options).map(([key, text], idx) => ({
      index: idx + 1,
      text: String(text ?? ''),
    }));
  }
  
  return [];
}

export default function TakeAssessment() {
  const navigate = useNavigate();
  const { activeEnrollmentId, activeEnrollment } = useEnrollmentContext();
  const { data: provider } = useCurrentProvider();

  // Fetch active attempt
  const { data: attempt, isLoading: isLoadingAttempt } = useActiveEnrollmentAssessmentAttempt(activeEnrollmentId);

  // Fetch questions for the attempt
  const { data: rawQuestions, isLoading: isLoadingQuestions } = useAssessmentAttemptQuestions(attempt?.id);

  // Check if user can start an assessment (for "No Active Assessment" screen)
  const { data: canStart, isLoading: canStartLoading } = useCanStartEnrollmentAssessment(
    activeEnrollmentId ?? undefined,
    provider?.id
  );

  // Mutations
  const saveAnswer = useSaveAssessmentAnswer();
  const submitAssessment = useSubmitEnrollmentAssessment();
  const startAssessment = useStartEnrollmentAssessment();

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
        correct_option: qb?.correct_option || null,
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

  // Refs for question cards (for auto-scroll to next question)
  const questionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Register question ref callback
  const registerQuestionRef = useCallback((questionId: string, element: HTMLDivElement | null) => {
    if (element) {
      questionRefs.current.set(questionId, element);
    } else {
      questionRefs.current.delete(questionId);
    }
  }, []);

  // Scroll to next question
  const scrollToNextQuestion = useCallback((currentQuestionId: string) => {
    if (!questions || questions.length === 0) return;
    
    const currentIndex = questions.findIndex(q => q.id === currentQuestionId);
    if (currentIndex === -1 || currentIndex >= questions.length - 1) return;
    
    const nextQuestion = questions[currentIndex + 1];
    const nextElement = questionRefs.current.get(nextQuestion.id);
    
    if (nextElement) {
      // Small delay to let the answer state update visually first
      requestAnimationFrame(() => {
        nextElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [questions]);

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

  // Handle answer selection with autosave + auto-advance
  const handleAnswerChange = useCallback(async (questionId: string, optionIndex: number) => {
    if (!attempt?.id) return;

    // Optimistically update local state
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    setSavingQuestions(prev => new Set(prev).add(questionId));

    // IMMEDIATELY scroll to next question (don't wait for save)
    scrollToNextQuestion(questionId);

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
  }, [attempt?.id, saveAnswer, scrollToNextQuestion]);

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
  const handleDownloadQuestionsPDF = useCallback(() => {
    if (!questions || questions.length === 0) {
      toast.error('No questions to download');
      return;
    }

    const industryName = activeEnrollment?.industry_segment?.name || 'N/A';
    const levelName = activeEnrollment?.expertise_level?.name || 'N/A';

    // Generate HTML content for PDF
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #333; }
            .header h2 { margin: 0 0 10px 0; font-size: 18px; }
            .header p { margin: 5px 0; color: #555; }
            .question { margin-bottom: 25px; page-break-inside: avoid; border: 1px solid #ddd; border-radius: 4px; padding: 12px; }
            .question-header { background: #f5f5f5; padding: 8px 10px; margin: -12px -12px 10px -12px; border-radius: 4px 4px 0 0; font-weight: bold; display: flex; justify-content: space-between; }
            .q-number { color: #333; }
            .difficulty { font-size: 10px; color: #666; background: #e9e9e9; padding: 2px 8px; border-radius: 3px; }
            .hierarchy { color: #666; font-size: 10px; margin-bottom: 8px; font-style: italic; }
            .question-text { margin: 10px 0; font-weight: bold; line-height: 1.4; }
            .options { margin-left: 15px; margin-top: 10px; }
            .option { margin: 6px 0; padding: 6px 10px; border-radius: 3px; }
            .correct { background: #d4edda; border-left: 4px solid #28a745; }
            .correct::after { content: ' ✓ CORRECT'; color: #28a745; font-weight: bold; font-size: 10px; }
            .incorrect { color: #555; background: #f8f8f8; }
            .answer-summary { margin-top: 10px; padding-top: 8px; border-top: 1px dashed #ccc; color: #28a745; font-weight: bold; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Assessment Questions with Answer Key</h2>
            <p><strong>Industry:</strong> ${industryName} | <strong>Level:</strong> ${levelName}</p>
            <p><strong>Total Questions:</strong> ${questions.length} | <strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          ${questions.map((q, idx) => `
            <div class="question">
              <div class="question-header">
                <span class="q-number">Q${idx + 1}</span>
                <span class="difficulty">${q.difficulty || 'N/A'}</span>
              </div>
              <div class="hierarchy">
                ${q.proficiency_area_name} → ${q.sub_domain_name} → ${q.speciality_name}
              </div>
              <div class="question-text">${q.question_text}</div>
              <div class="options">
                ${q.options.map(opt => `
                  <div class="option ${opt.index === q.correct_option ? 'correct' : 'incorrect'}">
                    ${opt.index}. ${opt.text}
                  </div>
                `).join('')}
              </div>
              <div class="answer-summary">Correct Answer: Option ${q.correct_option}</div>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    // Generate PDF
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    
    html2pdf()
      .from(container)
      .set({
        margin: [10, 10, 10, 10],
        filename: `assessment-answers-${attempt?.id?.slice(0, 8) || 'unknown'}-${new Date().toISOString().split('T')[0]}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .save()
      .then(() => {
        toast.success(`Downloaded ${questions.length} questions as PDF`);
      })
      .catch((err: Error) => {
        console.error('PDF generation failed:', err);
        toast.error('Failed to generate PDF');
      });
  }, [questions, attempt?.id, activeEnrollment]);

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

  // Handle start assessment directly from this page
  const handleStartAssessment = async () => {
    if (!provider?.id || !activeEnrollmentId || !activeEnrollment) return;

    try {
      const result = await startAssessment.mutateAsync({
        enrollmentId: activeEnrollmentId,
        providerId: provider.id,
        industrySegmentId: activeEnrollment.industry_segment_id,
        expertiseLevelId: activeEnrollment.expertise_level_id,
        questionsCount: 20,
        timeLimitMinutes: 60,
      });

      if (result.success) {
        toast.success('Assessment started!');
        // Reload to fetch the new attempt
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to start assessment:', error);
      toast.error('Failed to start assessment. Please try again.');
    }
  };

  // No active attempt
  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500" />
            <h2 className="text-xl font-semibold">
              {canStartLoading ? 'Checking...' : canStart?.allowed ? 'Start Your Assessment' : 'Assessment Not Available'}
            </h2>
            
            {canStartLoading ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            ) : canStart?.allowed ? (
              <>
                <p className="text-muted-foreground">
                  You don't have an active assessment. Start one now?
                </p>
                <Button 
                  onClick={handleStartAssessment}
                  disabled={startAssessment.isPending}
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
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  {canStart?.reason || "You cannot start an assessment at this time."}
                </p>
                <Button onClick={() => navigate('/enroll/assessment')}>
                  Go to Assessment Page
                </Button>
              </>
            )}
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
            onClick={handleDownloadQuestionsPDF}
            className="gap-2 bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
          >
            <Download className="h-4 w-4" />
            Download Questions PDF (DEV)
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
            registerQuestionRef={registerQuestionRef}
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
