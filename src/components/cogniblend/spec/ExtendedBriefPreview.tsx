/**
 * ExtendedBriefPreview — Read-only collapsible preview of AI-generated extended brief.
 * Used on AISpecReviewPage to show Category B fields (context, stakeholders, rubrics).
 */

import { Badge } from "@/components/ui/badge";
import { AiContentRenderer } from "@/components/ui/AiContentRenderer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  FileText,
  Sparkles,
  Users,
  Target,
  AlertTriangle,
  Lightbulb,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ExtendedBriefData {
  context_background?: string;
  root_causes?: string;
  affected_stakeholders?: string[];
  current_deficiencies?: string;
  // expected_outcomes removed — now a standalone column
  preferred_approach?: string;
  approaches_not_of_interest?: string;
  scoring_rubrics?: Array<{
    criterion_name: string;
    levels: Array<{ score: number; label: string; description: string }>;
  }>;
  
  reward_description?: string;
  phase_notes?: string;
  complexity_notes?: string;
}

const PREVIEW_ITEMS: Array<{
  key: keyof ExtendedBriefData;
  label: string;
  icon: React.ElementType;
  type: "text" | "array";
}> = [
  { key: "context_background", label: "Context & Background", icon: FileText, type: "text" },
  { key: "root_causes", label: "Root Causes", icon: AlertTriangle, type: "text" },
  { key: "affected_stakeholders", label: "Affected Stakeholders", icon: Users, type: "array" },
  { key: "current_deficiencies", label: "Current Deficiencies", icon: XCircle, type: "text" },
  // expected_outcomes removed from preview — standalone section now
  { key: "preferred_approach", label: "Preferred Approach", icon: Lightbulb, type: "text" },
  { key: "approaches_not_of_interest", label: "Approaches NOT of Interest", icon: XCircle, type: "text" },
];

interface ExtendedBriefPreviewProps {
  data: unknown;
}

export default function ExtendedBriefPreview({ data }: ExtendedBriefPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!data || typeof data !== "object") return null;
  const brief = data as ExtendedBriefData;

  const filledItems = PREVIEW_ITEMS.filter((item) => {
    const val = brief[item.key];
    if (Array.isArray(val)) return val.length > 0;
    return typeof val === "string" && val.trim().length > 0;
  });

  if (filledItems.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-3 w-full text-left rounded-xl border-2 border-border bg-card p-4 hover:bg-accent/30 transition-colors group">
        <Sparkles className="h-5 w-5 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Extended Brief</p>
          <p className="text-xs text-muted-foreground">
            AI-generated context, stakeholders, and scoring rubrics — {filledItems.length} sections
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          <Sparkles className="h-2.5 w-2.5 mr-0.5" />AI
        </Badge>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="rounded-xl border-2 border-t-0 border-border bg-card px-5 pb-5 pt-3 space-y-4">
        {filledItems.map((item) => {
          const val = brief[item.key];
          const Icon = item.icon;
          return (
            <div key={item.key} className="space-y-1">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {item.label}
                </p>
              </div>
              <div className="pl-6">
                {item.type === "array" && Array.isArray(val) ? (
                  <ul className="space-y-1">
                    {(val as string[]).map((v, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold mt-0.5">
                          {i + 1}
                        </span>
                        {v}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <AiContentRenderer content={val as string} compact />
                )}
              </div>
            </div>
          );
        })}

        {/* Scoring Rubrics */}
        {brief.scoring_rubrics && brief.scoring_rubrics.length > 0 && (
          <div className="space-y-2 border-t border-border/40 pt-3">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Scoring Rubrics
              </p>
            </div>
            <div className="pl-6 space-y-3">
              {brief.scoring_rubrics.map((rubric, ri) => (
                <div key={ri} className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{rubric.criterion_name}</p>
                  <div className="relative w-full overflow-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1 pr-2 text-muted-foreground font-medium w-12">Score</th>
                          <th className="text-left py-1 pr-2 text-muted-foreground font-medium w-24">Label</th>
                          <th className="text-left py-1 text-muted-foreground font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rubric.levels.map((level, li) => (
                          <tr key={li} className="border-b border-border/30">
                            <td className="py-1 pr-2 font-mono font-medium text-primary">{level.score}</td>
                            <td className="py-1 pr-2 font-medium">{level.label}</td>
                            <td className="py-1 text-muted-foreground">{level.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata notes */}
        {(brief.reward_description || brief.phase_notes || brief.complexity_notes) && (
          <div className="border-t border-border/40 pt-3 space-y-2">
            {brief.reward_description && (
              <div>
                <p className="text-xs text-muted-foreground">Reward Guidance</p>
                <p className="text-sm text-foreground">{brief.reward_description}</p>
              </div>
            )}
            {brief.phase_notes && (
              <div>
                <p className="text-xs text-muted-foreground">Phase Notes</p>
                <p className="text-sm text-foreground">{brief.phase_notes}</p>
              </div>
            )}
            {brief.complexity_notes && (
              <div>
                <p className="text-xs text-muted-foreground">Complexity Notes</p>
                <p className="text-sm text-foreground">{brief.complexity_notes}</p>
              </div>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
