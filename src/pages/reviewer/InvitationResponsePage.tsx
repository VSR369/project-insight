import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMutationError } from "@/lib/errorHandler";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Building2, GraduationCap, Mail, User, Loader2 } from "lucide-react";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";

export default function InvitationResponsePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Fetch reviewer's invitation details
  const { data: reviewer, isLoading: reviewerLoading } = useQuery({
    queryKey: ["my-reviewer-invitation", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("id, name, email, phone, user_id, is_active, invitation_status, invitation_message, approval_status, expertise_level_ids, industry_segment_ids, invited_at, invitation_sent_at, invitation_accepted_at, enrollment_source, years_experience, timezone, languages, max_interviews_per_day, notes")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: industries } = useIndustrySegments();
  const { data: levels } = useExpertiseLevels();

  // Accept mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("accept-reviewer-invitation", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviewer-invitation"] });
      toast.success("Welcome to the Review Panel!");
      navigate("/reviewer/dashboard");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'accept_reviewer_invitation' });
    },
  });

  // Decline mutation
  const declineMutation = useMutation({
    mutationFn: async (reason?: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("decline-reviewer-invitation", {
        body: reason ? { reason } : {},
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: async () => {
      toast.success("Thank you for your response");
      await signOut();
      navigate("/login");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'decline_reviewer_invitation' });
    },
  });

  // Get industry and level names
  const industryNames = reviewer?.industry_segment_ids
    ?.map(id => industries?.find(i => i.id === id)?.name)
    .filter(Boolean) || [];
  
  const levelNames = reviewer?.expertise_level_ids
    ?.map(id => levels?.find(l => l.id === id)?.name)
    .filter(Boolean) || [];

  const handleDeclineConfirm = () => {
    declineMutation.mutate(declineReason || undefined);
    setShowDeclineDialog(false);
  };

  // Check if already accepted or other status
  if (!reviewerLoading && reviewer) {
    if (reviewer.invitation_status === "ACCEPTED") {
      navigate("/reviewer/dashboard");
      return null;
    }
    if (reviewer.invitation_status !== "SENT") {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <CardTitle>Invitation Unavailable</CardTitle>
              <CardDescription>
                This invitation is no longer available (status: {reviewer.invitation_status}).
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate("/login")}>Return to Login</Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  if (reviewerLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reviewer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle>No Invitation Found</CardTitle>
            <CardDescription>
              We couldn't find an invitation for your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/login")}>Return to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">You've Been Invited!</CardTitle>
          <CardDescription className="text-base">
            Join the CogniBlend Review Panel and help evaluate solution providers
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Invited as</p>
                <p className="font-medium">{reviewer.name}</p>
                <p className="text-sm text-muted-foreground">{reviewer.email}</p>
              </div>
            </div>

            {industryNames.length > 0 && (
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Industries</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {industryNames.map((name, i) => (
                      <Badge key={i} variant="secondary">{name}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {levelNames.length > 0 && (
              <div className="flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Expertise Levels</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {levelNames.map((name, i) => (
                      <Badge key={i} variant="outline">{name}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {reviewer.invitation_message && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-1">Message from Admin</p>
                <p className="text-sm italic">"{reviewer.invitation_message}"</p>
              </div>
            )}
          </div>

          {/* What you'll do */}
          <div>
            <h3 className="font-medium mb-2">As a panel reviewer, you will:</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Conduct expert interviews with solution providers</li>
              <li>Evaluate credentials and proof points</li>
              <li>Provide professional feedback and ratings</li>
              <li>Help maintain quality standards on the platform</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              size="lg"
              className="flex-1 gap-2"
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending || declineMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Accept Invitation
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => setShowDeclineDialog(true)}
              disabled={acceptMutation.isPending || declineMutation.isPending}
            >
              <X className="w-4 h-4" />
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this invitation? You can optionally provide a reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for declining (optional)"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeclineConfirm}
              disabled={declineMutation.isPending}
            >
              {declineMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
