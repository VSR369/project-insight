/**
 * SCR-11a: Submission Blocked Screen
 * Shown when a challenge cannot proceed because required roles are not filled.
 * BRD Ref: BR-CORE-006, BR-AGG-004
 */

import { ShieldAlert, ArrowLeft, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRoleReadiness } from "@/hooks/queries/useRoleReadiness";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { useAdminContact } from "@/hooks/queries/useAdminContact";
import { usePendingChallengeRefsByChallenge, useCreatePendingChallengeRef } from "@/hooks/queries/usePendingChallengeRefs";
import { useEffect } from "react";

interface SubmissionBlockedScreenProps {
  orgId: string;
  model: string;
  challengeId?: string;
  challengeTitle?: string;
  onBack: () => void;
}

export function SubmissionBlockedScreen({
  orgId,
  model,
  challengeId,
  challengeTitle,
  onBack,
}: SubmissionBlockedScreenProps) {
  const { data: readinessData } = useRoleReadiness(orgId, model);
  const { data: roleCodes } = useSlmRoleCodes();
  const { data: adminContact } = useAdminContact();
  const createPendingRef = useCreatePendingChallengeRef();

  const readiness = readinessData?.[0] ?? null;
  const missingCodes = readiness?.missing_roles ?? [];

  // Auto-create pending_challenge_ref when NOT_READY detected (BR-CORE-007)
  useEffect(() => {
    if (challengeId && missingCodes.length > 0 && readiness?.overall_status === "not_ready") {
      createPendingRef.mutate({
        challenge_id: challengeId,
        org_id: orgId,
        engagement_model: model,
        missing_role_codes: missingCodes,
        blocking_reason: "Required roles not filled",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId, missingCodes.length, readiness?.overall_status]);
  const modelLabel = model === "mp" ? "Aggregator" : "Aggregator";

  const missingRoleDetails = missingCodes.map((code) => {
    const role = roleCodes?.find((r) => r.code === code);
    return role ? { display_name: role.display_name, code: role.code } : { display_name: code, code };
  });

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-6">
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30">
        <ShieldAlert className="h-8 w-8 text-amber-600" />
      </div>

      <div className="space-y-2 max-w-lg">
        <h2 className="text-xl font-semibold text-foreground">
          Challenge Submission Blocked
        </h2>
        {challengeTitle && (
          <p className="text-sm font-medium text-muted-foreground">
            {challengeTitle}
          </p>
        )}
        <p className="text-sm text-muted-foreground leading-relaxed">
          This {modelLabel} challenge cannot proceed because the required
          team roles are not yet filled. Please assign the missing roles
          before submitting.
        </p>
      </div>

      {/* Missing roles */}
      {missingRoleDetails.length > 0 && (
        <div className="space-y-2 w-full max-w-md">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Missing Roles
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {missingRoleDetails.map((role) => (
              <Badge
                key={role.code}
                variant="outline"
                className="bg-destructive/10 text-destructive border-destructive/20"
              >
                {role.display_name} ({role.code})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Admin contact */}
      {adminContact && (
        <div className="rounded-lg border bg-muted/30 p-4 max-w-sm w-full text-left space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Contact for Assistance
          </p>
          <p className="text-sm font-medium text-foreground">{adminContact.name}</p>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            {adminContact.email}
          </div>
        </div>
      )}

      <Button variant="outline" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
    </div>
  );
}
