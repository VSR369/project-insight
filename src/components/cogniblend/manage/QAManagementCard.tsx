/**
 * QAManagementCard — Card for managing challenge Q&A on the manage page.
 * Governance-aware: ENTERPRISE (MP/AGG) has publish flow; LIGHTWEIGHT is immediate.
 */

import { useState } from 'react';
import { MessageSquare, Send, Forward, Check, Lock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import {
  useAllChallengeQuestions,
  useAnswerQuestion,
  usePublishAnswer,
  useRouteQuestion,
  useCloseQA,
  type ManagedQARow,
} from '@/hooks/cogniblend/useQAManagement';

interface QAManagementCardProps {
  challengeId: string;
  challengeTitle: string;
  userId: string;
  governanceProfile: string;
}

/* ─── Single question management row ─────────────────────── */

function QuestionRow({
  qa,
  userId,
  challengeId,
  challengeTitle,
  operatingModel,
  isQuick,
}: {
  qa: ManagedQARow;
  userId: string;
  challengeId: string;
  challengeTitle: string;
  operatingModel: string;
  isQuick: boolean;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [answerText, setAnswerText] = useState(qa.answer_text ?? '');

  const answerMutation = useAnswerQuestion();
  const publishMutation = usePublishAnswer();
  const routeMutation = useRouteQuestion();

  const handleSaveAnswer = async () => {
    if (!answerText.trim()) return;
    await answerMutation.mutateAsync({
      qaId: qa.qa_id,
      challengeId,
      answerText: answerText.trim(),
      userId,
    });

    // In LIGHTWEIGHT mode, auto-publish immediately
    if (isQuick) {
      await publishMutation.mutateAsync({ qaId: qa.qa_id, challengeId, userId });
    }

    setShowAnswer(false);
  };

  const handleRoute = () => {
    routeMutation.mutate({
      qaId: qa.qa_id,
      challengeId,
      challengeTitle,
      operatingModel,
      userId,
    });
  };

  const handlePublish = () => {
    publishMutation.mutate({ qaId: qa.qa_id, challengeId, userId });
  };

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      {/* Question header */}
      <div className="space-y-0.5">
        <p className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold text-primary">Q:</span> {qa.question_text}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{qa.anonymous_id ?? 'Anonymous'}</span>
          <span>·</span>
          <span>{format(new Date(qa.asked_at), 'MMM d, yyyy HH:mm')}</span>
          {!qa.answer_text && (
            <Badge variant="destructive" className="text-[10px] font-medium ml-1">
              Unanswered
            </Badge>
          )}
          {qa.answer_text && !qa.is_published && !isQuick && (
            <Badge variant="secondary" className="text-[10px] font-medium ml-1">
              Answered · Unpublished
            </Badge>
          )}
          {qa.is_published && (
            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-medium ml-1 hover:bg-emerald-100">
              Published
            </Badge>
          )}
        </div>
      </div>

      {/* Existing answer display */}
      {qa.answer_text && !showAnswer && (
        <div className="border-l-4 border-emerald-500 pl-3">
          <p className="text-sm text-foreground leading-relaxed">
            <span className="font-semibold text-emerald-700">A:</span> {qa.answer_text}
          </p>
          {qa.answered_at && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Answered {format(new Date(qa.answered_at), 'MMM d, yyyy HH:mm')}
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* Answer directly */}
        {!qa.answer_text && !showAnswer && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowAnswer(true)}
          >
            <Send className="h-3 w-3" /> Answer Directly
          </Button>
        )}

        {/* Route to Architect/Creator (Enterprise only) */}
        {!isQuick && !qa.answer_text && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 border-amber-400 text-amber-700 hover:bg-amber-50"
            onClick={handleRoute}
            disabled={routeMutation.isPending}
          >
            <Forward className="h-3 w-3" />
            Route to {operatingModel === 'MP' ? 'Architect' : 'Creator'}
          </Button>
        )}

        {/* Publish answer (Enterprise only, when answered but unpublished) */}
        {!isQuick && qa.answer_text && !qa.is_published && (
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handlePublish}
            disabled={publishMutation.isPending}
          >
            <Check className="h-3 w-3" /> Publish Answer
          </Button>
        )}

        {/* Edit answer */}
        {qa.answer_text && !showAnswer && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => { setShowAnswer(true); setAnswerText(qa.answer_text ?? ''); }}
          >
            Edit
          </Button>
        )}
      </div>

      {/* Inline answer textarea */}
      {showAnswer && (
        <div className="space-y-2 pt-1">
          <Textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Write your answer…"
            rows={3}
            className="text-sm resize-none"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSaveAnswer}
              disabled={!answerText.trim() || answerMutation.isPending}
            >
              {answerMutation.isPending ? 'Saving…' : isQuick ? 'Save & Publish' : 'Save Answer'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowAnswer(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main card ──────────────────────────────────────────── */

export function QAManagementCard({
  challengeId,
  challengeTitle,
  userId,
  governanceProfile,
}: QAManagementCardProps) {
  const { data: questions = [] } = useAllChallengeQuestions(challengeId);
  const closeQA = useCloseQA();

  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  // Self-fetch operating model and is_qa_closed
  const { data: challengeMeta } = useQuery({
    queryKey: ['challenge-qa-meta', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('operating_model, is_qa_closed')
        .eq('id', challengeId)
        .single();
      if (error) return { operating_model: 'MP', is_qa_closed: false };
      return data as { operating_model: string; is_qa_closed: boolean };
    },
    enabled: !!challengeId,
    staleTime: 60_000,
  });

  const operatingModel = (challengeMeta as any)?.operating_model ?? 'MP';
  const isQaClosed = (challengeMeta as any)?.is_qa_closed ?? false;
  const isQuick = governanceProfile === 'LIGHTWEIGHT';

  const unansweredCount = questions.filter((q) => !q.answer_text).length;

  const handleCloseQA = async () => {
    await closeQA.mutateAsync({ challengeId, challengeTitle, userId });
    setConfirmCloseOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <MessageSquare className="h-4.5 w-4.5 text-primary" />
              Q&amp;A Management
            </CardTitle>
            {unansweredCount > 0 && (
              <Badge variant="destructive" className="w-fit text-[11px] font-semibold">
                <AlertCircle className="h-3 w-3 mr-1" />
                {unansweredCount} unanswered question{unansweredCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {unansweredCount === 0 && questions.length > 0 && (
              <Badge className="w-fit bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-semibold hover:bg-emerald-100">
                All answered
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Q&A status toggle */}
          <div className="flex items-center justify-between rounded-lg bg-muted/40 border border-border px-4 py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                Q&amp;A Status
              </p>
              <p className="text-xs text-muted-foreground">
                {isQaClosed
                  ? 'Closed — no new questions accepted'
                  : 'Open — solvers can submit questions'}
              </p>
            </div>
            {isQaClosed ? (
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">Closed</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmCloseOpen(true)}
              >
                Close Q&amp;A
              </Button>
            )}
          </div>

          <Separator />

          {/* Question list */}
          {questions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              No questions have been submitted yet.
            </p>
          ) : (
            <div className="space-y-3">
              {questions.map((q) => (
                <QuestionRow
                  key={q.qa_id}
                  qa={q}
                  userId={userId}
                  challengeId={challengeId}
                  challengeTitle={challengeTitle}
                  operatingModel={operatingModel}
                  isQuick={isQuick}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Close Q&A confirmation ─── */}
      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Q&amp;A?</AlertDialogTitle>
            <AlertDialogDescription>
              No new questions will be accepted. Existing published Q&amp;A will remain visible
              to all enrolled solvers. All enrolled solvers will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseQA}
              disabled={closeQA.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {closeQA.isPending ? 'Closing…' : 'Close Q&A'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
