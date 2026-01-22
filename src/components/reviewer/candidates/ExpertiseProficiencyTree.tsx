import { useState } from "react";
import { ChevronDown, ChevronRight, Target, Boxes, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CandidateExpertise } from "@/hooks/queries/useCandidateExpertise";

interface ExpertiseProficiencyTreeProps {
  expertise: CandidateExpertise;
}

export function ExpertiseProficiencyTree({ expertise }: ExpertiseProficiencyTreeProps) {
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedSubDomains, setExpandedSubDomains] = useState<Set<string>>(new Set());

  const { proficiencyTree } = expertise;

  const toggleArea = (id: string) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSubDomain = (id: string) => {
    setExpandedSubDomains((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedAreas(new Set(proficiencyTree.map((a) => a.id)));
    setExpandedSubDomains(
      new Set(proficiencyTree.flatMap((a) => a.subDomains.map((sd) => sd.id)))
    );
  };

  const collapseAll = () => {
    setExpandedAreas(new Set());
    setExpandedSubDomains(new Set());
  };

  if (proficiencyTree.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            Proficiency Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No proficiency areas selected by the provider.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            Proficiency Areas
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {proficiencyTree.map((area) => (
          <div key={area.id} className="border rounded-lg overflow-hidden">
            {/* Area Level */}
            <button
              onClick={() => toggleArea(area.id)}
              className="w-full flex items-center gap-2 p-3 bg-primary/5 hover:bg-primary/10 text-left transition-colors"
              aria-expanded={expandedAreas.has(area.id)}
            >
              {expandedAreas.has(area.id) ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              <Target className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium">{area.name}</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {area.subDomains.length} sub-domains
              </Badge>
            </button>

            {/* Sub-domains */}
            {expandedAreas.has(area.id) && (
              <div className="pl-4 border-l-2 border-primary/20 ml-3">
                {area.subDomains.map((sd) => (
                  <div key={sd.id}>
                    {/* Sub-domain Level */}
                    <button
                      onClick={() => toggleSubDomain(sd.id)}
                      className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 text-left transition-colors"
                      aria-expanded={expandedSubDomains.has(sd.id)}
                    >
                      {expandedSubDomains.has(sd.id) ? (
                        <ChevronDown className="h-3 w-3 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0" />
                      )}
                      <Boxes className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-sm">{sd.name}</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {sd.specialities.length}
                      </Badge>
                    </button>

                    {/* Specialities */}
                    {expandedSubDomains.has(sd.id) && (
                      <div className="pl-6 py-1 space-y-0.5">
                        {sd.specialities.map((sp) => (
                          <div
                            key={sp.id}
                            className="flex items-center gap-2 py-1 px-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                            <span className="text-xs">{sp.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
