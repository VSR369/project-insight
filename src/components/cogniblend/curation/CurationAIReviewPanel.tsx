/**
 * CurationAIReviewPanel — Per-section AI review display.
 * Shows inline review comments under each section with severity badges.
 */

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bot, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionReview {
  section_key: string;
  status: "pass" | "warning" | "needs_revision";
  comments: string[];
}

interface CurationAIReviewPanelProps {
  sectionKey: string;
  review: SectionReview | undefined;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pass: { label: "Pass", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  warning: { label: "Warning", className: "bg-amber-100 text-amber-800 border-amber-300" },
  needs_revision: { label: "Needs Revision", className: "bg-red-100 text-red-800 border-red-300" },
};

export function CurationAIReviewInline({ sectionKey, review }: CurationAIReviewPanelProps) {
  if (!review) return null;

  const style = STATUS_STYLES[review.status] ?? STATUS_STYLES.pass;

  return (
    <Collapsible className="mt-2">
      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
        <Bot className="h-3.5 w-3.5" />
        <span>AI Review</span>
        <Badge className={cn("text-[10px] px-1.5 py-0", style.className)}>{style.label}</Badge>
        <ChevronDown className="h-3 w-3 ml-auto transition-transform [&[data-state=open]]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 pl-5 space-y-1.5">
        {review.comments.map((c, i) => (
          <p key={i} className="text-xs text-muted-foreground leading-relaxed">• {c}</p>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
