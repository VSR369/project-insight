import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Mail, Phone, Clock, Briefcase, Award } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { PanelReviewer, useApproveReviewer } from "@/hooks/queries/usePanelReviewers";
import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { RejectReviewerDialog } from "./RejectReviewerDialog";

interface PendingReviewerCardProps {
  reviewer: PanelReviewer;
}

export function PendingReviewerCard({ reviewer }: PendingReviewerCardProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  
  const { data: expertiseLevels } = useExpertiseLevels();
  const { data: industrySegments } = useIndustrySegments();
  const approveMutation = useApproveReviewer();

  // Map IDs to names
  const industryNames = reviewer.industry_segment_ids
    ?.map((id) => industrySegments?.find((s) => s.id === id)?.name)
    .filter(Boolean) || [];

  const levelNames = reviewer.expertise_level_ids
    ?.map((id) => expertiseLevels?.find((l) => l.id === id)?.name)
    .filter(Boolean) || [];

  const handleApprove = () => {
    approveMutation.mutate(reviewer.id);
  };

  const appliedAt = reviewer.created_at 
    ? formatDistanceToNow(new Date(reviewer.created_at), { addSuffix: true })
    : "Unknown";

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{reviewer.name}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {reviewer.email}
                </span>
                {reviewer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {reviewer.phone}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Applied {appliedAt}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Industries */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Industries
            </div>
            <div className="flex flex-wrap gap-1.5">
              {industryNames.length > 0 ? (
                industryNames.map((name) => (
                  <Badge key={name} variant="secondary">
                    {name}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Not specified</span>
              )}
            </div>
          </div>

          {/* Expertise Levels */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Award className="h-4 w-4 text-muted-foreground" />
              Expertise Levels
            </div>
            <div className="flex flex-wrap gap-1.5">
              {levelNames.length > 0 ? (
                levelNames.map((name) => (
                  <Badge key={name} variant="outline">
                    {name}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Not specified</span>
              )}
            </div>
          </div>

          {/* Experience */}
          {reviewer.years_experience && (
            <div className="text-sm">
              <span className="text-muted-foreground">Experience:</span>{" "}
              <span className="font-medium">{reviewer.years_experience} years</span>
            </div>
          )}

          {/* Why Join Statement */}
          {reviewer.why_join_statement && (
            <div className="space-y-2">
              <div className="text-sm font-medium">"Why I want to be a reviewer"</div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm italic">
                "{reviewer.why_join_statement}"
              </div>
            </div>
          )}

          {/* Additional Notes */}
          {reviewer.notes && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Additional Notes</div>
              <p className="text-sm text-muted-foreground">{reviewer.notes}</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-muted/30 border-t pt-4 gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => setShowRejectDialog(true)}
            disabled={approveMutation.isPending}
          >
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
          <Button
            variant="default"
            onClick={handleApprove}
            disabled={approveMutation.isPending}
          >
            <Check className="mr-2 h-4 w-4" />
            {approveMutation.isPending ? "Approving..." : "Approve"}
          </Button>
        </CardFooter>
      </Card>

      <RejectReviewerDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        reviewer={reviewer}
      />
    </>
  );
}
