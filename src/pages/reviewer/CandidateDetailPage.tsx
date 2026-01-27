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
  ProofPointsTabContent,
  SlotsTabContent,
  AssessmentTabContent,
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
            <TabsTrigger value="proof-points">Proof Points</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
            <TabsTrigger value="slots">Slots</TabsTrigger>
            <TabsTrigger value="interview-kit">Interview Kit</TabsTrigger>
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

          <TabsContent value="proof-points" className="mt-6">
            {enrollmentId && <ProofPointsTabContent enrollmentId={enrollmentId} />}
          </TabsContent>

          <TabsContent value="slots" className="mt-6">
            {enrollmentId && <SlotsTabContent enrollmentId={enrollmentId} />}
          </TabsContent>

          <TabsContent value="assessment" className="mt-6">
            {enrollmentId && <AssessmentTabContent enrollmentId={enrollmentId} />}
          </TabsContent>

          <TabsContent value="interview-kit" className="mt-6">
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-muted/30">
              <div className="text-4xl mb-4">🚧</div>
              <h3 className="text-lg font-semibold mb-2">Interview Kit - Coming Soon</h3>
              <p className="text-muted-foreground max-w-md">
                The Interview Kit feature is being rebuilt. Check back soon for the enhanced interview assessment experience.
              </p>
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
