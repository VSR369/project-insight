import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExpertiseLevelHeader } from "./ExpertiseLevelHeader";
import { ExpertiseProficiencyTree } from "./ExpertiseProficiencyTree";
import { ExpertiseReviewActions } from "./ExpertiseReviewActions";
import {
  useCandidateExpertise,
  useUpdateExpertiseReview,
  useVerifyExpertise,
} from "@/hooks/queries/useCandidateExpertise";

interface ExpertiseTabContentProps {
  enrollmentId: string;
}

export function ExpertiseTabContent({ enrollmentId }: ExpertiseTabContentProps) {
  const { data: expertise, isLoading, error } = useCandidateExpertise(enrollmentId);
  const { mutate: updateReview, isPending: isUpdating } = useUpdateExpertiseReview();
  const { mutate: verifyExpertise, isPending: isVerifying } = useVerifyExpertise();

  const handleUpdateFlag = (flag: string) => {
    updateReview({ enrollmentId, flagForClarification: flag });
  };

  const handleUpdateNotes = (notes: string) => {
    updateReview({ enrollmentId, reviewerNotes: notes });
  };

  const handleVerify = () => {
    verifyExpertise({ enrollmentId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !expertise) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Failed to load expertise data</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Please try again later."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <ExpertiseLevelHeader expertise={expertise} />
      <ExpertiseProficiencyTree expertise={expertise} />
      <ExpertiseReviewActions
        enrollmentId={enrollmentId}
        expertise={expertise}
        onUpdateFlag={handleUpdateFlag}
        onUpdateNotes={handleUpdateNotes}
        onVerify={handleVerify}
        isUpdating={isUpdating}
        isVerifying={isVerifying}
      />
    </div>
  );
}
