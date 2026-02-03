import { Building2, Globe, MapPin, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CandidateDetail } from "@/hooks/queries/useCandidateDetail";
import { STATUS_DISPLAY_NAMES } from "@/constants/lifecycle.constants";

interface CandidateProfileHeaderProps {
  candidate: CandidateDetail;
}

export function CandidateProfileHeader({ candidate }: CandidateProfileHeaderProps) {
  const shortProviderId = candidate.providerId.slice(0, 8).toUpperCase();
  const fullName = `${candidate.firstName} ${candidate.lastName}`.trim();

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
            <AlertCircle className="h-3 w-3 mr-1" />
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

  const getAffiliationBadge = () => {
    const code = candidate.participationModeCode?.toUpperCase();
    switch (code) {
      case "ORG_REP":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
            Representing an Organization
          </Badge>
        );
      case "INDEPENDENT":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
            Independent Consultant
          </Badge>
        );
      case "SELF_ACCOUNTABLE":
        return (
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">
            Independent (Self-Accountable)
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Left: Provider Identity */}
          <div className="space-y-3">
            {/* Name and ID Row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-bold">{fullName}</span>
              <span className="text-sm text-muted-foreground font-mono">
                SP-{shortProviderId}
              </span>
              {getLifecycleStatusBadge(candidate.lifecycleStatus)}
            </div>

            {/* Organization Row (if ORG_REP) */}
            {candidate.participationModeCode?.toUpperCase() === "ORG_REP" && candidate.organization && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                {candidate.organization.org_name && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    {candidate.organization.org_name}
                  </span>
                )}
                {candidate.organization.org_type && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-muted-foreground/60" />
                    {candidate.organization.org_type}
                  </span>
                )}
                {candidate.organization.org_website && (
                  <a 
                    href={candidate.organization.org_website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
              </div>
            )}

            {/* Location Row */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {candidate.countryName && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {candidate.countryName}
                </span>
              )}
              {candidate.timezone && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {candidate.timezone}
                </span>
              )}
            </div>

            {/* Expertise Badge */}
            {candidate.expertiseLevelName && (
              <Badge variant="secondary" className="font-medium">
                {candidate.expertiseLevelName}
              </Badge>
            )}
          </div>

          {/* Right: Provider Category */}
          <div className="flex flex-col items-start lg:items-end gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Provider Category
            </span>
            {getAffiliationBadge()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
