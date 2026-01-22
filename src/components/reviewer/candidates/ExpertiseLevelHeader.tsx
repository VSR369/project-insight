import { Award, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CandidateExpertise } from "@/hooks/queries/useCandidateExpertise";

interface ExpertiseLevelHeaderProps {
  expertise: CandidateExpertise;
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "verified":
      return "default";
    case "needs_clarification":
      return "destructive";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "needs_clarification":
      return "Needs Clarification";
    default:
      return "Pending";
  }
}

export function ExpertiseLevelHeader({ expertise }: ExpertiseLevelHeaderProps) {
  const yearsRange = expertise.maxYears
    ? `${expertise.minYears}-${expertise.maxYears} years`
    : `${expertise.minYears}+ years`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-primary" />
            Expertise Level
          </CardTitle>
          <Badge variant={getStatusBadgeVariant(expertise.reviewStatus)}>
            {getStatusLabel(expertise.reviewStatus)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {expertise.expertiseLevelName ? (
          <>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Level {expertise.levelNumber}:
                </span>
                <span className="font-semibold">{expertise.expertiseLevelName}</span>
              </div>
              {expertise.expertiseLevelDescription && (
                <p className="text-sm text-muted-foreground mt-1">
                  {expertise.expertiseLevelDescription}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Experience: {yearsRange}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No expertise level selected yet.
          </p>
        )}

        {/* Summary counts */}
        <div className="flex items-center gap-4 pt-2 border-t text-sm text-muted-foreground">
          <span>{expertise.totalAreas} Proficiency Areas</span>
          <span>•</span>
          <span>{expertise.totalSubDomains} Sub-domains</span>
          <span>•</span>
          <span>{expertise.totalSpecialities} Specialities</span>
        </div>
      </CardContent>
    </Card>
  );
}
