/**
 * ChallengeQASection — Q&A panel for the public challenge view.
 * Shows published Q&A pairs + an "Ask Question" form for authenticated solvers.
 * Hides the form when Q&A is closed.
 */

import { useState } from 'react';
import { MessageSquare, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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

  return (
    <div className="space-y-2">
      {/* Question */}
      <div className="space-y-0.5">
        <p className={`text-sm leading-relaxed ${isPending ? 'italic text-muted-foreground' : 'text-foreground'}`}>
          <span className="font-semibold text-primary">Q:</span>{' '}
          {qa.question_text}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Asked by {qa.anonymous_id ?? 'Anonymous'}</span>
          <span>·</span>
          <span>{format(new Date(qa.asked_at), 'MMM d, yyyy')}</span>
          {isPending && (
            <Badge variant="secondary" className="text-[10px] font-medium ml-1">
              Pending answer
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

  // Merge: show published + user's own unpublished (deduped)
  const publishedIds = new Set(publishedQA.map((q) => q.qa_id));
  const myPending = myQuestions.filter((q) => !publishedIds.has(q.qa_id));
  const allVisible = [...publishedQA, ...myPending];

  const handleSubmit = async () => {
    if (questionText.trim().length < 20) return;
    await submitQuestion.mutateAsync({ challengeId, questionText: questionText.trim() });
    setQuestionText('');
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
            onChange={(e) => setQuestionText(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />
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
