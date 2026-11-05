/** CreatorFormActionBar — Fill Test Data / Save Draft / AI Review / Submit buttons. */
import { Send, Save, Loader2, FlaskConical, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { GovernanceMode } from '@/lib/governanceMode';

export interface CreatorFormActionBarProps {
  governanceMode: GovernanceMode;
  isBusy: boolean;
  isSubmitting: boolean;
  isSaving: boolean;
  hasDraft: boolean;
  onFillTestData: () => void;
  onSaveDraft: () => void;
  onAIReview: () => void;
}

export function CreatorFormActionBar({ governanceMode, isBusy, isSubmitting, isSaving, hasDraft, onFillTestData, onSaveDraft, onAIReview }: CreatorFormActionBarProps) {
  const isControlled = governanceMode === 'CONTROLLED';
  const isQuick = governanceMode === 'QUICK';
  return (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
      <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onFillTestData}><FlaskConical className="h-4 w-4 mr-1.5" />Fill Test Data</Button>
      <div className="flex items-center gap-3 ml-auto">
        <Button type="button" variant="outline" onClick={onSaveDraft} disabled={isBusy}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}Save Draft</Button>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button type="button" variant={isControlled ? 'default' : 'outline'} onClick={onAIReview} disabled={isBusy} className="gap-1.5">
                  <Sparkles className="h-4 w-4" />AI Review
                  {isControlled && <Badge variant="secondary" className="ml-1 text-[10px]">Advisory</Badge>}
                  {isQuick && <Badge variant="outline" className="ml-1 text-[10px]">Optional</Badge>}
                  {!isControlled && !isQuick && <Badge variant="outline" className="ml-1 text-[10px]">Recommended</Badge>}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{hasDraft ? 'Run AI review on your draft' : 'Will auto-save draft before review'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button type="submit" disabled={isBusy}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}{isQuick ? 'Submit & Publish' : 'Submit to Curator'}</Button>
      </div>
    </div>
  );
}
