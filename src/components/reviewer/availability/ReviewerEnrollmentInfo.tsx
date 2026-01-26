/**
 * Reviewer Enrollment Info Component
 * 
 * Displays the reviewer's enrolled industries and expertise levels
 * at the top of the availability page for quick reference.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, GraduationCap } from "lucide-react";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";
import { Skeleton } from "@/components/ui/skeleton";

interface ReviewerEnrollmentInfoProps {
  industrySegmentIds: string[];
  expertiseLevelIds: string[];
}

export function ReviewerEnrollmentInfo({
  industrySegmentIds,
  expertiseLevelIds,
}: ReviewerEnrollmentInfoProps) {
  const { data: allIndustries = [], isLoading: loadingIndustries } = useIndustrySegments();
  const { data: allLevels = [], isLoading: loadingLevels } = useExpertiseLevels();

  // Filter to only enrolled items
  const enrolledIndustries = allIndustries.filter((ind) =>
    industrySegmentIds.includes(ind.id)
  );
  const enrolledLevels = allLevels
    .filter((lvl) => expertiseLevelIds.includes(lvl.id))
    .sort((a, b) => a.level_number - b.level_number);

  const isLoading = loadingIndustries || loadingLevels;

  if (isLoading) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-28" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Industries Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Industries
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {enrolledIndustries.length > 0 ? (
                enrolledIndustries.map((industry) => (
                  <Badge
                    key={industry.id}
                    variant="secondary"
                    className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    {industry.name}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground italic">
                  No industries assigned
                </span>
              )}
            </div>
          </div>

          {/* Divider for larger screens */}
          <div className="hidden sm:block w-px bg-border" />

          {/* Expertise Levels Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Expertise Levels
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {enrolledLevels.length > 0 ? (
                enrolledLevels.map((level) => (
                  <Badge
                    key={level.id}
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                  >
                    L{level.level_number}: {level.name}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground italic">
                  No expertise levels assigned
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
