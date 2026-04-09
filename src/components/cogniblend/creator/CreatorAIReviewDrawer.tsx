/**
 * CreatorAIReviewDrawer — Right-side Sheet for AI review of Creator's fields.
 * QUICK: 5 fields | STRUCTURED: 8 | CONTROLLED: 12 + checkboxes.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AIReviewFieldCard } from './AIReviewFieldCard';
import { DimensionScoreBadges } from './DimensionScoreBadges';
import { useCreatorAIReview, type FieldReviewResult } from '@/hooks/cogniblend/useCreatorAIReview';
import { CREATOR_REVIEW_FIELDS } from '@/constants/creatorReviewFields';
import type { GovernanceMode } from '@/lib/governanceMode';
import { GOVERNANCE_MODE_CONFIG } from '@/lib/governanceMode';

interface CreatorAIReviewDrawerProps {
  open: boolean;
  onClose: () => void;
  challengeId: string;
  governanceMode: GovernanceMode;
  engagementModel: string;
  industrySegmentId: string;
  onReviewComplete: () => void;
}

export function CreatorAIReviewDrawer({
  open,
  onClose,
  challengeId,
  governanceMode,
  engagementModel,
  industrySegmentId,
  onReviewComplete,
}: CreatorAIReviewDrawerProps) {
  const mutation = useCreatorAIReview();
  const isControlled = governanceMode === 'CONTROLLED';
  const reviewFields = CREATOR_REVIEW_FIELDS[governanceMode];
  const govCfg = GOVERNANCE_MODE_CONFIG[governanceMode];

  const [checkedFields, setCheckedFields] = useState<Record<string, boolean>>({});
  const [showStrengths, setShowStrengths] = useState(false);

  useEffect(() => {
    if (open && !mutation.data && !mutation.isPending) {
      mutation.mutate({ challengeId, governanceMode, engagementModel, industrySegmentId });
    }
  }, [open]);

  const allChecked = useMemo(() => {
    if (!isControlled) return true;
    return reviewFields.every((f) => checkedFields[f.key]);
  }, [isControlled, reviewFields, checkedFields]);

  useEffect(() => {
    if (allChecked && isControlled && mutation.data) {
      onReviewComplete();
    }
  }, [allChecked, isControlled, mutation.data]);

  const handleCheck = useCallback((key: string, checked: boolean) => {
    setCheckedFields((prev) => ({ ...prev, [key]: checked }));
  }, []);

  const resultMap = useMemo(() => {
    const map: Record<string, FieldReviewResult> = {};
    if (mutation.data?.fieldResults) {
      for (const fr of mutation.data.fieldResults) {
        map[fr.fieldKey] = fr;
      }
    }
    return map;
  }, [mutation.data]);

  const overallScore = mutation.data?.overallScore ?? 0;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            AI Review
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: govCfg.bg, color: govCfg.color }}>
              {govCfg.label}
            </span>
          </SheetTitle>
          <SheetDescription>
            Reviewing {reviewFields.length} Creator fields
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0 mt-4">
          {mutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing your challenge...</p>
            </div>
          ) : mutation.isError ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-destructive">AI review failed. Please try again.</p>
              <Button variant="outline" size="sm" onClick={() => mutation.mutate({ challengeId, governanceMode, engagementModel, industrySegmentId })}>
                Retry
              </Button>
            </div>
          ) : mutation.data ? (
            <div className="space-y-4 pr-4">
              {/* Overall Score */}
              <div className={cn(
                'rounded-lg border p-4 text-center',
                overallScore >= 80 ? 'border-emerald-200 bg-emerald-50' : overallScore >= 60 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50',
              )}>
                <p className="text-2xl font-bold">{overallScore}/100</p>
                <p className="text-xs text-muted-foreground">Overall Quality Score</p>
              </div>

              {/* Dimension Scores */}
              <DimensionScoreBadges dimensions={mutation.data.dimensions} />

              {/* Summary */}
              {mutation.data.summary && (
                <p className="text-sm text-muted-foreground leading-relaxed px-1">
                  {mutation.data.summary}
                </p>
              )}

              {/* Strengths */}
              {mutation.data.strengths.length > 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 w-full"
                    onClick={() => setShowStrengths((p) => !p)}
                  >
                    {showStrengths ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {mutation.data.strengths.length} Strengths Identified
                  </button>
                  {showStrengths && (
                    <ul className="mt-2 space-y-1 text-xs text-emerald-800">
                      {mutation.data.strengths.map((s, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="shrink-0">✅</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Per-field cards */}
              {reviewFields.map((f) => {
                const result = resultMap[f.key];
                return (
                  <AIReviewFieldCard
                    key={f.key}
                    fieldKey={f.key}
                    label={f.label}
                    score={result?.score ?? 0}
                    comment={result?.comment ?? 'No feedback available'}
                    showCheckbox={isControlled}
                    checked={checkedFields[f.key] ?? false}
                    onCheckedChange={(v) => handleCheck(f.key, v)}
                  />
                );
              })}

              {isControlled && !allChecked && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Review all {reviewFields.length} fields to enable Submit
                </p>
              )}
            </div>
          ) : null}
        </ScrollArea>

        <div className="pt-4 border-t border-border">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
