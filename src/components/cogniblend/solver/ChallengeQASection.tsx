/**
 * ChallengeQASection — Q&A panel for the public challenge view.
 * Shows published Q&A pairs + an "Ask Question" form for authenticated solvers.
 * Hides the form when Q&A is closed.
 * BR-COM-003: Flags messages containing contact information for compliance review.
 */

import { useState } from 'react';
import { MessageSquare, Lock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { scanForContactInfo } from '@/lib/complianceScanner';
import {
  useChallengeQuestions,
  useMyQuestions,
  useSubmitQuestion,
  type ChallengeQARow,
} from '@/hooks/cogniblend/useChallengeQA';

interface ChallengeQASectionProps {
  challengeId: string;
}

/* ─── Single Q&A pair ─────────────────────────────── */

function QAPair({ qa, isMine }: { qa: ChallengeQARow; isMine?: boolean }) {
  const isPending = !qa.is_published && isMine;
  const isComplianceFlagged = (qa as any).compliance_flagged === true;

  return (
    <div className="space-y-2">
      {/* Question */}
      <div className="space-y-0.5">
        <p className={`text-sm leading-relaxed ${isPending ? 'italic text-muted-foreground' : 'text-foreground'}`}>
          <span className="font-semibold text-primary">Q:</span>{' '}
          {qa.question_text}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span>Asked by {qa.anonymous_id ?? 'Anonymous'}</span>
          <span>·</span>
          <span>{format(new Date(qa.asked_at), 'MMM d, yyyy')}</span>
          {isPending && (
            <Badge variant="secondary" className="text-[10px] font-medium ml-1">
              Pending answer
            </Badge>
          )}
          {isComplianceFlagged && (
            <Badge
              variant="outline"
              className="text-[10px] font-medium ml-1 border-amber-400 bg-amber-50 text-amber-700"
            >
              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
              Flagged for compliance review
            </Badge>
          )}
        </div>
      </div>

      {/* Answer */}
      {qa.answer_text && (
        <div className="border-l-4 border-emerald-500 pl-3 space-y-0.5">
          <p className="text-sm leading-relaxed text-foreground">
            <span className="font-semibold text-emerald-700">A:</span>{' '}
            {qa.answer_text}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Challenge Team</span>
            {qa.answered_at && (
              <>
                <span>·</span>
                <span>{format(new Date(qa.answered_at), 'MMM d, yyyy')}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main component ──────────────────────────────── */

export function ChallengeQASection({ challengeId }: ChallengeQASectionProps) {
  const { user } = useAuth();
  const { data: publishedQA = [] } = useChallengeQuestions(challengeId);
  const { data: myQuestions = [] } = useMyQuestions(challengeId);
  const submitQuestion = useSubmitQuestion();

  // Self-fetch is_qa_closed from the challenges table
  const { data: qaClosedFlag } = useQuery({
    queryKey: ['challenge-qa-closed', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('is_qa_closed')
        .eq('id', challengeId)
        .single();
      if (error) return false;
      return (data as any)?.is_qa_closed ?? false;
    },
    enabled: !!challengeId,
    staleTime: 60_000,
  });
  const isQaClosed = qaClosedFlag ?? false;
  const [questionText, setQuestionText] = useState('');
  const [complianceWarning, setComplianceWarning] = useState<string | null>(null);

  // Merge: show published + user's own unpublished (deduped)
  const publishedIds = new Set(publishedQA.map((q) => q.qa_id));
  const myPending = myQuestions.filter((q) => !publishedIds.has(q.qa_id));
  const allVisible = [...publishedQA, ...myPending];

  // BR-COM-003: Scan input for contact information
  const handleQuestionChange = (text: string) => {
    setQuestionText(text);
    if (text.trim().length > 10) {
      const scan = scanForContactInfo(text);
      if (scan.flagged) {
        setComplianceWarning(scan.reasons.join(', '));
      } else {
        setComplianceWarning(null);
      }
    } else {
      setComplianceWarning(null);
    }
  };

  const handleSubmit = async () => {
    if (questionText.trim().length < 20) return;

    // BR-COM-003: Check for contact info and auto-flag
    const scan = scanForContactInfo(questionText.trim());

    await submitQuestion.mutateAsync({
      challengeId,
      questionText: questionText.trim(),
      complianceFlagged: scan.flagged,
      complianceFlagReason: scan.flagged ? scan.reasons.join('; ') : undefined,
    });
    setQuestionText('');
    setComplianceWarning(null);
  };

  return (
    <div className="space-y-4">
      <Separator />

      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Questions &amp; Answers</h2>
      </div>

      {/* ── Published + own pending Q&A list ── */}
      {allVisible.length > 0 ? (
        <div className="space-y-5">
          {allVisible.map((qa) => (
            <QAPair
              key={qa.qa_id}
              qa={qa}
              isMine={qa.asked_by === user?.id}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic py-2">
          No questions have been asked yet.
        </p>
      )}

      {/* ── Ask Question form or Closed notice ── */}
      {isQaClosed ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            Q&amp;A is closed. No new questions can be submitted.
          </p>
        </div>
      ) : user ? (
        <div className="space-y-2 pt-2">
          <Textarea
            placeholder="Ask a question about this challenge... (minimum 20 characters)"
            value={questionText}
            onChange={(e) => handleQuestionChange(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />

          {/* BR-COM-003: Compliance warning */}
          {complianceWarning && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-amber-800">Compliance Notice</p>
                <p className="text-xs text-amber-700">
                  Your message appears to contain contact information ({complianceWarning}).
                  Messages with contact info will be flagged for compliance review.
                  Consider removing personal contact details.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {questionText.trim().length}/20 min characters
            </p>
            <Button
              size="sm"
              disabled={questionText.trim().length < 20 || submitQuestion.isPending}
              onClick={handleSubmit}
            >
              {submitQuestion.isPending ? 'Submitting…' : 'Submit Question'}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic py-2">
          Sign in to ask a question.
        </p>
      )}
    </div>
  );
}
