/**
 * lifecycleRulesHelpers — Helper functions for LifecycleRulesPage.
 * Extracted from LifecycleRulesPage.tsx.
 */

export function getStatusDescription(status: string): string {
  const descriptions: Record<string, string> = {
    invited: "User has been invited but not yet registered",
    registered: "User has completed registration",
    enrolled: "User has created an industry enrollment",
    mode_selected: "User has selected participation mode",
    org_info_pending: "Organization info submitted, awaiting approval",
    org_validated: "Organization has been validated",
    expertise_selected: "User has selected expertise level",
    proof_points_started: "User has started adding proof points",
    proof_points_min_met: "Minimum proof points requirement met",
    assessment_in_progress: "User is taking the assessment",
    assessment_passed: "User has passed the assessment",
    panel_scheduled: "Interview panel has been scheduled",
    panel_completed: "Interview panel has been completed",
    verified: "User has been verified",
    certified: "User has been certified",
    not_verified: "Verification was not successful",
    active: "User is active on the platform",
    suspended: "User account is suspended",
    inactive: "User account is inactive",
  };
  return descriptions[status] || "No description available";
}

export function getStageName(rank: number): string {
  if (rank < 30) return "Registration";
  if (rank < 70) return "Configuration";
  if (rank < 100) return "Profile Building";
  if (rank < 130) return "Assessment";
  if (rank < 150) return "Verification";
  return "Completed";
}

export function getStageVariant(rank: number): "default" | "secondary" | "outline" | "destructive" {
  if (rank < 30) return "secondary";
  if (rank < 70) return "default";
  if (rank < 100) return "outline";
  if (rank < 150) return "default";
  return "secondary";
}
