import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InterviewKitSectionProps {
  name: string;
  questionCount: number;
  score: number;
  maxScore: number;
  ratedCount: number;
  totalCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

export function InterviewKitSection({
  name,
  questionCount,
  score,
  maxScore,
  ratedCount,
  totalCount,
  isExpanded,
  onToggle,
  children,
}: InterviewKitSectionProps) {
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div
          className={cn(
            "flex items-center justify-between w-full px-4 py-3 bg-card border rounded-lg cursor-pointer transition-colors",
            "hover:bg-muted/50",
            isExpanded && "rounded-b-none border-b-0"
          )}
        >
          <div className="flex items-center gap-3">
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
            <span className="font-medium text-foreground">{name}</span>
            <Badge variant="secondary" className="text-xs">
              {questionCount} {questionCount === 1 ? "question" : "questions"}
            </Badge>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <span className="text-muted-foreground">
              {score}/{maxScore}
            </span>
            <span className="text-muted-foreground w-10 text-right">
              {percentage}%
            </span>
            <span className="text-muted-foreground w-20 text-right">
              {ratedCount}/{totalCount} rated
            </span>
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border border-t-0 rounded-b-lg bg-muted/20 p-4">
          {children || (
            <p className="text-sm text-muted-foreground text-center py-4">
              Questions will be generated here
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
