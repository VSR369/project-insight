import { Eye, AlertCircle, Clock, CheckCircle, XCircle, User, Building2, MapPin, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReviewerCandidate } from "@/hooks/queries/useReviewerCandidates";
import { STATUS_DISPLAY_NAMES } from "@/constants/lifecycle.constants";
import { format } from "date-fns";

interface CandidateCardProps {
  candidate: ReviewerCandidate;
  onOpenProfile: (enrollmentId: string) => void;
}

export function CandidateCard({ candidate, onOpenProfile }: CandidateCardProps) {
  const getLifecycleStatusBadge = (status: string) => {
    const displayName = STATUS_DISPLAY_NAMES[status] || status.replace(/_/g, " ");
    
    switch (status) {
      case "certified":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            {displayName}
          </Badge>
        );
      case "interview_unsuccessful":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <XCircle className="h-3 w-3 mr-1" />
            {displayName}
          </Badge>
        );
      case "panel_scheduled":
      case "interview_scheduled":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            {displayName}
          </Badge>
        );
      case "panel_completed":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            {displayName}
          </Badge>
        );
      case "proof_points_min_met":
      case "assessment_pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            {displayName}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {displayName}
          </Badge>
        );
    }
  };

  const formatInterviewDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return null;
    }
  };

  const getProofPointScoreColor = () => {
    const total = candidate.proofPointsTotal;
    const verified = candidate.proofPointsVerified;
    if (total === 0) return "text-muted-foreground";
    const ratio = verified / total;
    if (ratio >= 0.8) return "text-green-600";
    if (ratio >= 0.5) return "text-amber-600";
    return "text-red-600";
  };

  const getAssessmentScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const shortProviderId = candidate.providerId.slice(0, 8).toUpperCase();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-mono">
                SP-{shortProviderId}
              </span>
              <span className="text-lg font-semibold">{candidate.providerName}</span>
              {getLifecycleStatusBadge(candidate.lifecycleStatus)}
              {candidate.flagForClarification && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Action Required
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              {candidate.participationModeName && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {candidate.participationModeName}
                </span>
              )}
              {candidate.countryName && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {candidate.countryName}
                </span>
              )}
              {candidate.expertiseLevelName && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {candidate.expertiseLevelName}
                </span>
              )}
            </div>
            {candidate.proficiencyAreas.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {candidate.proficiencyAreas.slice(0, 3).map((area, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {area}
                  </Badge>
                ))}
                {candidate.proficiencyAreas.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{candidate.proficiencyAreas.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => onOpenProfile(candidate.enrollmentId)}
          >
            <Eye className="h-4 w-4" />
            Open Profile
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
          {/* Proof Points Section */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Proof Points
            </p>
            <p className={`text-xl font-bold ${getProofPointScoreColor()}`}>
              {candidate.proofPointsTotal}
            </p>
            <div className="text-xs text-muted-foreground space-y-0.5">
              {candidate.proofPointsVerified > 0 && (
                <p className="text-green-600">✓ {candidate.proofPointsVerified} verified</p>
              )}
              {candidate.proofPointsHigh > 0 && (
                <p>High: {candidate.proofPointsHigh}</p>
              )}
              {candidate.proofPointsMedium > 0 && (
                <p>Medium: {candidate.proofPointsMedium}</p>
              )}
              {candidate.proofPointsNeedsRevision > 0 && (
                <p className="text-amber-600">⚠ {candidate.proofPointsNeedsRevision} needs revision</p>
              )}
            </div>
          </div>

          {/* Assessment Section */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Assessment
            </p>
            {candidate.assessmentScore !== null ? (
              <>
                <p className={`text-xl font-bold ${getAssessmentScoreColor(candidate.assessmentScore)}`}>
                  {candidate.assessmentScore.toFixed(0)}%
                </p>
                <div className="text-xs text-muted-foreground">
                  <p className={candidate.assessmentPassed ? "text-green-600" : "text-red-600"}>
                    {candidate.assessmentPassed ? "Passed" : "Failed"}
                  </p>
                  {candidate.assessmentQuestionsAnswered && (
                    <p>{candidate.assessmentQuestionsAnswered} questions answered</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Not completed</p>
            )}
          </div>

          {/* Interview Date Section */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Interview
            </p>
            {candidate.interviewScheduledAt ? (
              <>
                <p className="text-sm font-medium">
                  {formatInterviewDate(candidate.interviewScheduledAt)}
                </p>
                <Badge 
                  variant="outline" 
                  className={
                    candidate.interviewStatus === "completed" 
                      ? "bg-green-50 text-green-700 border-green-200"
                      : candidate.interviewStatus === "cancelled"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }
                >
                  {candidate.interviewStatus?.replace(/_/g, " ") || "Scheduled"}
                </Badge>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Not scheduled</p>
            )}
          </div>

          {/* Interview Score Section */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Interview Score
            </p>
            {candidate.interviewScore !== null ? (
              <>
                <p className={`text-xl font-bold ${getAssessmentScoreColor(candidate.interviewScore * 10)}`}>
                  {candidate.interviewScore.toFixed(1)}/10
                </p>
                {candidate.interviewOutcome && (
                  <Badge 
                    variant="outline"
                    className={
                      candidate.interviewOutcome === "pass"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : candidate.interviewOutcome === "fail"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }
                  >
                    {candidate.interviewOutcome === "pass" ? "Pass" : 
                     candidate.interviewOutcome === "fail" ? "Fail" : "Follow Up"}
                  </Badge>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Not evaluated</p>
            )}
          </div>
        </div>

        {/* Reviewer Notes */}
        {candidate.reviewerNotes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
              <strong>Notes:</strong> {candidate.reviewerNotes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
