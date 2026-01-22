import { UserCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CandidateDetail } from "@/hooks/queries/useCandidateDetail";

interface AffiliationTypeSectionProps {
  candidate: CandidateDetail;
}

const AFFILIATION_CONFIG: Record<string, {
  label: string;
  description: string;
  badgeClass: string;
}> = {
  ORG_REP: {
    label: "Representing an Organization",
    description: "You wish to join as a recognized solution provider representing your employer",
    badgeClass: "bg-green-100 text-green-700 border-green-200",
  },
  INDEPENDENT: {
    label: "Independent Consultant",
    description: "You are not currently employed by any organization and operate independently",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
  },
  SELF_ACCOUNTABLE: {
    label: "Independent (Self-Accountable)",
    description: "Working in organization but self-accountable participation",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-200",
  },
};

export function AffiliationTypeSection({ candidate }: AffiliationTypeSectionProps) {
  const modeCode = candidate.participationModeCode?.toUpperCase() || "";
  const config = AFFILIATION_CONFIG[modeCode];

  if (!config) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCircle className="h-5 w-5 text-primary" />
            Affiliation Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            Affiliation type not selected
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserCircle className="h-5 w-5 text-primary" />
          Affiliation Type
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge 
          variant="outline" 
          className={`text-sm font-medium px-3 py-1 ${config.badgeClass}`}
        >
          {config.label}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {config.description}
        </p>
      </CardContent>
    </Card>
  );
}
