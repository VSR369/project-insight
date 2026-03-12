/**
 * RoleInvitationResponsePage — Accept or Decline a role invitation
 * Accessible at /org/role-invitation?token=<uuid>
 */

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAcceptRoleInvitation, useDeclineRoleInvitation } from "@/hooks/queries/useRoleAssignments";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, AlertTriangle, Shield } from "lucide-react";

interface InvitationDetails {
  id: string;
  org_id: string;
  role_code: string;
  user_email: string;
  user_name: string | null;
  status: string;
  org_name?: string;
}

export default function RoleInvitationResponsePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [result, setResult] = useState<"accepted" | "declined" | null>(null);

  const acceptMutation = useAcceptRoleInvitation();
  const declineMutation = useDeclineRoleInvitation();

  useEffect(() => {
    async function fetchInvitation() {
      if (!token) {
        setError("No invitation token provided");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchErr } = await supabase
          .from("role_assignments")
          .select("id, org_id, role_code, user_email, user_name, status")
          .eq("acceptance_token", token)
          .single();

        if (fetchErr || !data) {
          setError("Invalid or expired invitation token");
          setLoading(false);
          return;
        }

        setInvitation(data as InvitationDetails);
      } catch {
        setError("Failed to load invitation details");
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    try {
      await acceptMutation.mutateAsync(token);
      setResult("accepted");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    try {
      await declineMutation.mutateAsync({ token, reason: declineReason || undefined });
      setResult("declined");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to decline invitation");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3" />
            <CardTitle>Invitation Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/org/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result === "accepted") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <CardTitle>Role Accepted!</CardTitle>
            <CardDescription>
              You have successfully accepted the <span className="font-semibold">{invitation?.role_code}</span> role.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate("/org/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result === "declined") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <CardTitle>Role Declined</CardTitle>
            <CardDescription>
              You have declined the <span className="font-semibold">{invitation?.role_code}</span> role invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/org/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) return null;

  const isExpiredOrProcessed = invitation.status !== "invited";

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-3" />
          <CardTitle>Role Invitation</CardTitle>
          <CardDescription>
            You have been invited to take on a new role in your organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Role</span>
              <Badge variant="outline" className="font-mono text-xs">
                {invitation.role_code}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Invited as</span>
              <span className="text-sm font-medium text-foreground">
                {invitation.user_name ?? invitation.user_email}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={invitation.status === "invited" ? "secondary" : "outline"}>
                {invitation.status}
              </Badge>
            </div>
          </div>

          {isExpiredOrProcessed ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                This invitation has already been {invitation.status}.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/org/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          ) : (
            <>
              {showDeclineForm ? (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Reason for declining (optional)
                  </label>
                  <Textarea
                    placeholder="Please share your reason..."
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowDeclineForm(false)}
                    >
                      Back
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleDecline}
                      disabled={declineMutation.isPending}
                    >
                      {declineMutation.isPending ? "Declining..." : "Confirm Decline"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDeclineForm(true)}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Decline
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAccept}
                    disabled={acceptMutation.isPending}
                  >
                    {acceptMutation.isPending ? (
                      "Accepting..."
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1.5" />
                        Accept Role
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
