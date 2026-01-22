import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { ReviewerLayout } from "@/components/reviewer/ReviewerLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CandidateProfileHeader,
  ProviderDetailsSection,
  AffiliationTypeSection,
  OrganizationDetailsSection,
  ManagerApprovalSection,
  ReviewActionsCard,
  ExpertiseTabContent,
} from "@/components/reviewer/candidates";
import { useCandidateDetail, useUpdateCandidateReviewData } from "@/hooks/queries/useCandidateDetail";
import { toast } from "sonner";

export default function CandidateDetailPage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();

  const { data: candidate, isLoading, error } = useCandidateDetail(enrollmentId);
  const { mutate: updateReviewData, isPending: isUpdating } = useUpdateCandidateReviewData(enrollmentId);

  const handleBack = () => {
    navigate("/reviewer/candidates");
  };

  const handleClarificationUpdate = (notes: string) => {
    if (candidate?.interviewBookingId) {
      updateReviewData(
        { bookingId: candidate.interviewBookingId, clarificationNotes: notes },
        {
          onError: (err) => {
            toast.error(`Failed to save clarification: ${err.message}`);
          },
        }
      );
    }
  };

  const handleNotesUpdate = (notes: string) => {
    if (candidate?.interviewBookingId) {
      updateReviewData(
        { bookingId: candidate.interviewBookingId, reviewerNotes: notes },
        {
          onError: (err) => {
            toast.error(`Failed to save notes: ${err.message}`);
          },
        }
      );
    }
  };

  if (isLoading) {
    return (
      <ReviewerLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ReviewerLayout>
    );
  }

  if (error || !candidate) {
    return (
      <ReviewerLayout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Candidates
          </Button>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load provider details</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Please try again later."}
            </AlertDescription>
          </Alert>
        </div>
      </ReviewerLayout>
    );
  }

  // Determine if there's a pending verification warning
  const showProofPointsWarning = 
    candidate.lifecycleStatus === "proof_points_min_met" ||
    candidate.lifecycleStatus === "proof_points_review_in_progress";

  return (
    <ReviewerLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={handleBack} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Candidates
        </Button>

        {/* Profile Header Card */}
        <CandidateProfileHeader candidate={candidate} />

        {/* Warning Banner (if applicable) */}
        {showProofPointsWarning && (
          <Alert className="bg-amber-50 border-amber-200 text-amber-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Some proof points are pending verification. Review the Proof Points tab for details.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs Navigation */}
        <Tabs defaultValue="provider-details" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="provider-details">Provider Details</TabsTrigger>
            <TabsTrigger value="expertise">Expertise</TabsTrigger>
            <TabsTrigger value="proof-points" disabled>Proof Points</TabsTrigger>
            <TabsTrigger value="assessment" disabled>Assessment</TabsTrigger>
            <TabsTrigger value="slots" disabled>Slots</TabsTrigger>
            <TabsTrigger value="interview-kit" disabled>Interview Kit</TabsTrigger>
            <TabsTrigger value="review-progress" disabled>Review Progress</TabsTrigger>
          </TabsList>

          {/* Provider Details Tab Content */}
          <TabsContent value="provider-details" className="space-y-6 mt-6">
            {/* Section 1: Solution Provider Details */}
            <ProviderDetailsSection candidate={candidate} />

            {/* Section 2: Affiliation Type (Always visible) */}
            <AffiliationTypeSection candidate={candidate} />

            {/* Section 3: Organization Details (Conditional - ORG_REP only) */}
            <OrganizationDetailsSection candidate={candidate} />

            {/* Section 4: Manager Approval Status (Conditional - ORG_REP only) */}
            <ManagerApprovalSection candidate={candidate} />

            {/* Section 5: Review Actions */}
            <ReviewActionsCard
              bookingId={candidate.interviewBookingId}
              clarificationNotes={candidate.clarificationNotes}
              reviewerNotes={candidate.reviewerNotes}
              onUpdateClarification={handleClarificationUpdate}
              onUpdateNotes={handleNotesUpdate}
              isUpdating={isUpdating}
            />
          </TabsContent>

          {/* Placeholder for other tabs */}
          <TabsContent value="expertise" className="mt-6">
            {enrollmentId && <ExpertiseTabContent enrollmentId={enrollmentId} />}
          </TabsContent>

          <TabsContent value="proof-points">
            <div className="p-8 text-center text-muted-foreground">
              Proof Points tab content coming soon
            </div>
          </TabsContent>

          <TabsContent value="assessment">
            <div className="p-8 text-center text-muted-foreground">
              Assessment tab content coming soon
            </div>
          </TabsContent>

          <TabsContent value="slots">
            <div className="p-8 text-center text-muted-foreground">
              Slots tab content coming soon
            </div>
          </TabsContent>

          <TabsContent value="interview-kit">
            <div className="p-8 text-center text-muted-foreground">
              Interview Kit tab content coming soon
            </div>
          </TabsContent>

          <TabsContent value="review-progress">
            <div className="p-8 text-center text-muted-foreground">
              Review Progress tab content coming soon
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ReviewerLayout>
  );
}
