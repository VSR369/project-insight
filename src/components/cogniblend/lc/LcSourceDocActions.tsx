/**
 * LcSourceDocActions — Re-organize / Re-run AI Pass 3 buttons with tooltips
 * explaining what each operation does. Extracted from LcSourceDocUpload to
 * keep that file ≤ 250 lines (R1).
 */
import { FileText, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ConfirmRegenerateDialog } from '@/components/cogniblend/lc/ConfirmRegenerateDialog';

export interface LcSourceDocActionsProps {
  onRunPass3?: () => void;
  onOrganizeOnly?: () => void;
  isRunningPass3?: boolean;
  isOrganizing?: boolean;
  hasDraft: boolean;
  isDirty?: boolean;
  disabled: boolean;
  runLabel: string;
  organizeLabel: string;
}

export function LcSourceDocActions({
  onRunPass3,
  onOrganizeOnly,
  isRunningPass3 = false,
  isOrganizing = false,
  hasDraft,
  isDirty = false,
  disabled,
  runLabel,
  organizeLabel,
}: LcSourceDocActionsProps) {
  return (
    <div className="border-t pt-3 space-y-2">
      <p className="text-xs text-muted-foreground">
        AI Pass 3 merges all uploaded source documents from Creator, Curator,
        and you with the curated challenge context, then drafts a single
        seamless agreement for the Solution Provider to sign.
      </p>
      <TooltipProvider delayDuration={200}>
        <div className="flex flex-wrap gap-2">
          {onRunPass3 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <ConfirmRegenerateDialog
                    onConfirm={onRunPass3}
                    skipConfirm={!hasDraft}
                    isDirty={isDirty}
                    disabled={disabled}
                    mode="pass3"
                    trigger={
                      <Button type="button" size="sm" className="gap-1.5">
                        {isRunningPass3 ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {runLabel}
                      </Button>
                    }
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                Full AI legal pass — drafts and rewrites the unified agreement
                using your sources, the challenge context, and the regulatory
                packs configured for this challenge. Can add and remove
                clauses. Status becomes “AI-suggested”.
              </TooltipContent>
            </Tooltip>
          )}
          {onOrganizeOnly && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <ConfirmRegenerateDialog
                    onConfirm={onOrganizeOnly}
                    skipConfirm={!hasDraft}
                    isDirty={isDirty}
                    disabled={disabled}
                    mode="organize"
                    trigger={
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                      >
                        {isOrganizing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                        {organizeLabel}
                      </Button>
                    }
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                Cleans and merges clauses from your uploaded source documents
                into the unified agreement. No new wording is generated.
                Status becomes “organized”.
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}

export default LcSourceDocActions;
