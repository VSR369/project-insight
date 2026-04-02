/**
 * SolverExpertiseViewMode — Read-only display of solver expertise requirements.
 * Extracted from SolverExpertiseSection.tsx.
 */

import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";
import type { SolverExpertiseData } from "./SolverExpertiseSection";

interface SolverExpertiseViewModeProps {
  parsed: SolverExpertiseData;
  industryName: string | undefined;
  effectiveSegmentId: string | null;
}

export function SolverExpertiseViewMode({ parsed, industryName, effectiveSegmentId }: SolverExpertiseViewModeProps) {
  if (!effectiveSegmentId) {
    return (
      <div className="text-sm text-muted-foreground italic py-2">
        No industry segment configured yet. Click <strong>Edit</strong> to select one and configure expertise requirements.
      </div>
    );
  }

  const hasAnySelection =
    (parsed.expertise_levels?.length ?? 0) +
    (parsed.proficiency_areas?.length ?? 0) +
    (parsed.sub_domains?.length ?? 0) +
    (parsed.specialities?.length ?? 0) > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <GraduationCap className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Industry:</span>
        <Badge variant="outline">{industryName ?? "Loading..."}</Badge>
      </div>

      {!hasAnySelection ? (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">All Applicable</Badge>
          <span className="text-xs text-muted-foreground">No specific expertise restrictions — all solver expertise levels qualify.</span>
        </div>
      ) : (
        <div className="space-y-2">
          <ExpertiseBadgeRow label="Expertise Levels" items={parsed.expertise_levels} emptyLabel="All Levels" variant="outline" />
          <ExpertiseBadgeRow label="Proficiency Areas" items={parsed.proficiency_areas} emptyLabel="All Areas" variant="secondary" />
          <ExpertiseBadgeRow label="Sub-domains" items={parsed.sub_domains} emptyLabel="All Sub-domains" variant="outline" />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Specialities</p>
            {(!parsed.specialities || parsed.specialities.length === 0) ? (
              <Badge variant="secondary" className="text-xs">All Specialities</Badge>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {parsed.specialities.map(sp => (
                  <Badge key={sp.id} className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">{sp.name}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExpertiseBadgeRow({ label, items, emptyLabel, variant }: {
  label: string;
  items: Array<{ id: string; name: string }> | undefined;
  emptyLabel: string;
  variant: "outline" | "secondary";
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {(!items || items.length === 0) ? (
        <Badge variant="secondary" className="text-xs">{emptyLabel}</Badge>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map(item => (
            <Badge key={item.id} variant={variant} className="text-xs">{item.name}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
