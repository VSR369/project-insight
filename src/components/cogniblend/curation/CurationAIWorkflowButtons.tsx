/** CurationAIWorkflowButtons — Analyse → Context Library → Generate primary actions. */
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Bot, Loader2, Sparkles, BookOpen } from "lucide-react";

export interface CurationAIWorkflowButtonsProps {
  isLoading: boolean;
  onAnalyse?: () => void;
  onGenerateSuggestions?: () => void;
  pass1Done?: boolean;
  contextLibraryReviewed?: boolean;
  onOpenContextLibrary: () => void;
  onAIReview: () => void;
}

export function CurationAIWorkflowButtons({
  isLoading, onAnalyse, onGenerateSuggestions, pass1Done, contextLibraryReviewed, onOpenContextLibrary, onAIReview,
}: CurationAIWorkflowButtonsProps) {
  return onAnalyse && onGenerateSuggestions ? (
    <div className="space-y-2">
      <Button
        variant={pass1Done ? "outline" : "default"}
        size="sm"
        onClick={onAnalyse}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Bot className="h-4 w-4 mr-1.5" />}
        {pass1Done ? 'Re-analyse Challenge' : 'Analyse Challenge'}
      </Button>
      {pass1Done && (
        <>
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 text-xs text-blue-800 dark:text-blue-300 space-y-1.5">
            <p className="font-medium">Next step: Review discovered sources</p>
            <p>Open the Context Library to review and accept/reject sources before generating suggestions.</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-1 text-xs"
              onClick={onOpenContextLibrary}
            >
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              Open Context Library
            </Button>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="w-full block">
                <Button
                  variant="default"
                  size="sm"
                  onClick={onGenerateSuggestions}
                  disabled={isLoading || !contextLibraryReviewed}
                  className="w-full"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Generate Suggestions
                </Button>
              </span>
            </TooltipTrigger>
            {!contextLibraryReviewed && (
              <TooltipContent>Review Context Library sources first</TooltipContent>
            )}
          </Tooltip>
        </>
      )}
    </div>
  ) : (
    <Button variant="outline" size="sm" onClick={onAIReview} disabled={isLoading} className="w-full">
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Bot className="h-4 w-4 mr-1.5" />}
      Review Sections by AI
    </Button>
  );
}
