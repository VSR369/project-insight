/**
 * ChallengeClarityFeedback — Post-submission feedback survey for solvers.
 *
 * 4 clarity dimensions (1-5 stars) + optional text + Submit/Skip.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSolverFeedback } from '@/hooks/cogniblend/useSolverFeedback';

interface ChallengeClarityFeedbackProps {
  challengeId: string;
  solverId: string;
  onComplete: () => void;
  onSkip: () => void;
}

interface StarRatingInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
}

function StarRatingInput({ label, value, onChange }: StarRatingInputProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <Star
              className={cn(
                'h-5 w-5 transition-colors',
                star <= value ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30',
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChallengeClarityFeedback({
  challengeId,
  solverId,
  onComplete,
  onSkip,
}: ChallengeClarityFeedbackProps) {
  const [overall, setOverall] = useState(0);
  const [problem, setProblem] = useState(0);
  const [deliverables, setDeliverables] = useState(0);
  const [evaluation, setEvaluation] = useState(0);
  const [missingInfo, setMissingInfo] = useState('');

  const { submit, isSubmitting, hasSubmitted } = useSolverFeedback(challengeId, solverId);

  const handleSubmit = useCallback(async () => {
    if (overall === 0) return;
    await submit({
      clarity_overall: overall,
      clarity_problem: problem || null,
      clarity_deliverables: deliverables || null,
      clarity_evaluation: evaluation || null,
      missing_info: missingInfo.trim() || null,
    });
    onComplete();
  }, [overall, problem, deliverables, evaluation, missingInfo, submit, onComplete]);

  if (hasSubmitted) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          How clear was this challenge brief?
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Your feedback helps us improve challenge quality. Takes 30 seconds.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <StarRatingInput label="Overall Clarity" value={overall} onChange={setOverall} />
        <StarRatingInput label="Problem Statement" value={problem} onChange={setProblem} />
        <StarRatingInput label="Deliverables" value={deliverables} onChange={setDeliverables} />
        <StarRatingInput label="Evaluation Criteria" value={evaluation} onChange={setEvaluation} />

        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            Anything missing or unclear? (optional)
          </Label>
          <Textarea
            value={missingInfo}
            onChange={(e) => setMissingInfo(e.target.value)}
            placeholder="e.g., Budget wasn't clear, deliverable format wasn't specified..."
            className="text-sm h-16"
            maxLength={500}
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={overall === 0 || isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Submit Feedback
          </Button>
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
