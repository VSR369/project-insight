import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubmitInterview } from "@/hooks/queries/useInterviewKitEvaluation";
import { toast } from "sonner";

interface InterviewKitFooterProps {
  allRated: boolean;
  totalScore: number;
  maxScore: number;
  totalQuestions: number;
  correctCount: number;
  bookingId: string;
  evaluationId: string;
  onExport: () => void;
}

export function InterviewKitFooter({
  allRated,
  totalScore,
  maxScore,
  totalQuestions,
  correctCount,
  bookingId,
  evaluationId,
  onExport,
}: InterviewKitFooterProps) {
  const submitInterview = useSubmitInterview();

  const scorePercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const scoreOutOf10 = maxScore > 0 ? (totalScore / maxScore) * 10 : 0;

  const handleSubmit = () => {
    if (!allRated) {
      toast.error("Please rate all questions before submitting");
      return;
    }

    submitInterview.mutate({
      bookingId,
      evaluationId,
      totalQuestions,
      correctCount,
      scorePercentage,
      scoreOutOf10: Math.round(scoreOutOf10 * 10) / 10, // 1 decimal
    });
  };

  return (
    <div className="flex items-center justify-between pt-4 border-t">
      <div className="text-sm text-muted-foreground">
        {allRated
          ? `Score: ${scoreOutOf10.toFixed(1)}/10 (${scorePercentage.toFixed(0)}%)`
          : "Complete all ratings to submit"}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!allRated}
          onClick={onExport}
          className="gap-2"
        >
          <FileDown className="h-4 w-4" />
          Export PDF
        </Button>
        <Button
          size="sm"
          disabled={!allRated || submitInterview.isPending}
          onClick={handleSubmit}
          className="gap-2"
        >
          {submitInterview.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit Interview
        </Button>
      </div>
    </div>
  );
}
