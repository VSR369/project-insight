import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useInterviewKitSession } from "@/hooks/queries/useInterviewKitSession";
import { RECOMMENDATION_THRESHOLDS } from "@/constants/interview-kit.constants";

interface InterviewKitTabContentProps {
  enrollmentId: string;
  bookingId?: string | null;
}

export function InterviewKitTabContent({ enrollmentId, bookingId }: InterviewKitTabContentProps) {
  const { data: session, isLoading, error } = useInterviewKitSession(enrollmentId, bookingId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load Interview Kit"}
        </AlertDescription>
      </Alert>
    );
  }

  const recConfig = RECOMMENDATION_THRESHOLDS[session.recommendation];

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{session.ratedCount}/{session.totalQuestions}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Score</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session.totalScore}/{session.maxScore}</div>
            <div className="text-sm text-muted-foreground">{session.scorePercentage.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Sections</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{session.sectionCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Recommendation</CardTitle></CardHeader>
          <CardContent>
            <Badge className={`${recConfig.bgColor} ${recConfig.color} ${recConfig.borderColor}`}>
              {recConfig.label}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm">Right: {session.rightCount} ({session.totalQuestions > 0 ? ((session.rightCount / session.totalQuestions) * 100).toFixed(1) : 0}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm">Wrong: {session.wrongCount} ({session.totalQuestions > 0 ? ((session.wrongCount / session.totalQuestions) * 100).toFixed(1) : 0}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground" />
              <span className="text-sm">Not Answered: {session.notAnsweredCount} ({session.totalQuestions > 0 ? ((session.notAnsweredCount / session.totalQuestions) * 100).toFixed(1) : 0}%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      {session.sections.map((section) => (
        <Card key={section.type}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">{section.label}</CardTitle>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{section.sectionScore}/{section.sectionMaxScore} score</span>
                <span>{section.ratedCount}/{section.questions.length} rated</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.questions.map((q, idx) => (
              <div key={q.id || idx} className="p-4 border rounded-lg space-y-3">
                <div className="font-medium">Q{idx + 1}. {q.questionText}</div>
                {q.expectedAnswer && (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                    <span className="font-medium">Expected: </span>{q.expectedAnswer}
                  </div>
                )}
                <div className="text-sm">
                  Rating: <Badge variant={q.rating === 'right' ? 'default' : q.rating === 'wrong' ? 'destructive' : 'secondary'}>
                    {q.rating || 'Not rated'}
                  </Badge>
                  {q.validationError && <span className="ml-2 text-destructive">{q.validationError}</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Validation Errors */}
      {session.validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {session.validationErrors.join('. ')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
