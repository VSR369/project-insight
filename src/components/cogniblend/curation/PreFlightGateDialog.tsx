/**
 * PreFlightGateDialog — Modal shown before global AI review
 * when mandatory sections are missing or recommended sections are empty.
 * Redesigned as an actionable navigation checklist.
 * Gap 4: Quality prediction bar + quick-action scroll buttons.
 */

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { XCircle, AlertTriangle, ChevronRight, Sparkles, PenLine } from 'lucide-react';
import type { PreFlightResult, PreFlightItem } from '@/lib/cogniblend/preFlightCheck';
import { SECTION_TO_TAB } from '@/lib/cogniblend/preFlightCheck';
import { buildIncompleteGroups } from '@/lib/cogniblend/incompleteSectionsUtil';
import type { GroupDef, SectionDef, ChallengeData, LegalDocSummary, LegalDocDetail, EscrowRecord } from '@/lib/cogniblend/curationTypes';

interface IntegrityCheckResult {
  valid: boolean;
  computedHash: string;
  storedHash: string | null;
}

interface PreFlightGateDialogProps {
  result: PreFlightResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoToSection: (sectionKey: string) => void;
  onProceed: () => void;
  /** Optional content integrity check result */
  integrityCheck?: IntegrityCheckResult | null;
  /** Shared incomplete-sections data for unified validation */
  groups?: GroupDef[];
  sectionMap?: Map<string, SectionDef>;
  groupProgress?: Record<string, { done: number; total: number }>;
  challenge?: ChallengeData | null;
  legalDocs?: LegalDocSummary[];
  legalDetails?: LegalDocDetail[];
  escrowRecord?: EscrowRecord | null;
}

function NavigableRow({
  item,
  variant,
  onNavigate,
}: {
  item: PreFlightItem;
  variant: 'required' | 'recommended';
  onNavigate: () => void;
}) {
  const tabLabel = SECTION_TO_TAB[item.sectionId] ?? 'Unknown';
  const isRequired = variant === 'required';

  return (
    <button
      type="button"
      onClick={onNavigate}
      className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer group ${
        isRequired
          ? 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10'
          : 'border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-950/40'
      }`}
    >
      {isRequired ? (
        <XCircle className="h-4 w-4 text-destructive shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
      )}

      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-foreground">{item.sectionName}</p>
        <p className="text-xs text-muted-foreground truncate">{item.reason}</p>
      </div>

      <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 h-5 font-normal text-muted-foreground">
        {tabLabel}
      </Badge>

      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function QualityPredictionBar({
  prediction,
  onGoToSection,
}: {
  prediction: PreFlightResult['qualityPrediction'];
  onGoToSection: (sectionKey: string) => void;
}) {
  const barColor =
    prediction.qualityPct >= 90
      ? '[&>div]:bg-emerald-500'
      : prediction.qualityPct >= 80
        ? '[&>div]:bg-primary'
        : prediction.qualityPct >= 70
          ? '[&>div]:bg-amber-500'
          : '[&>div]:bg-destructive';

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Quality Prediction</span>
        </div>
        <span className="text-sm font-semibold text-foreground">{prediction.qualityPct}%</span>
      </div>
      <Progress value={prediction.qualityPct} className={`h-2 ${barColor}`} />
      <p className="text-xs text-muted-foreground">
        {prediction.label} — expect ~{prediction.sectionsToEdit} sections to edit after AI review.
      </p>

      {/* Quick-action scroll buttons for missing recommended sections */}
      {(!prediction.hasScope || !prediction.hasOutcomes) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {!prediction.hasScope && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => onGoToSection('scope')}
            >
              <PenLine className="h-3 w-3" />
              Add Scope
            </Button>
          )}
          {!prediction.hasOutcomes && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => onGoToSection('expected_outcomes')}
            >
              <PenLine className="h-3 w-3" />
              Add Expected Outcomes
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function PreFlightGateDialog({
  result,
  open,
  onOpenChange,
  onGoToSection,
  onProceed,
  integrityCheck,
  groups,
  sectionMap,
  groupProgress,
  challenge,
  legalDocs,
  legalDetails,
  escrowRecord,
}: PreFlightGateDialogProps) {
  // Build incomplete sections from shared util when props are available
  const utilIncompleteKeys = useMemo(() => {
    if (!groups || !sectionMap || !groupProgress) return new Set<string>();
    const incGroups = buildIncompleteGroups(
      groups, sectionMap, groupProgress, challenge, legalDocs, legalDetails, escrowRecord,
    );
    return new Set(incGroups.flatMap((g) => g.incompleteSectionKeys));
  }, [groups, sectionMap, groupProgress, challenge, legalDocs, legalDetails, escrowRecord]);

  if (!result) return null;

  const integrityFailed = integrityCheck && !integrityCheck.valid;

  // Merge pre-flight items with util-detected incomplete sections (deduplicate by sectionId)
  const preFlightErrorIds = new Set(result.missingMandatory.map((i) => i.sectionId));
  const preFlightWarningIds = new Set(result.warnings.map((i) => i.sectionId));
  const budgetErrorIds = new Set((result.budgetAlignmentErrors ?? []).map((i) => i.sectionId));
  const budgetWarningIds = new Set((result.budgetAlignmentWarnings ?? []).map((i) => i.sectionId));
  const allKnownIds = new Set([...preFlightErrorIds, ...preFlightWarningIds, ...budgetErrorIds, ...budgetWarningIds]);

  // Add util-detected sections not already in pre-flight as warnings
  const utilExtraWarnings: PreFlightItem[] = [];
  if (sectionMap) {
    for (const key of utilIncompleteKeys) {
      if (!allKnownIds.has(key)) {
        const sec = sectionMap.get(key);
        utilExtraWarnings.push({
          sectionId: key,
          sectionName: sec?.label ?? key,
          reason: 'Section incomplete per completeness check',
        });
      }
    }
  }

  const allErrors = [
    ...result.missingMandatory,
    ...(result.budgetAlignmentErrors ?? []),
  ];
  const allWarnings = [
    ...result.warnings,
    ...(result.budgetAlignmentWarnings ?? []),
    ...utilExtraWarnings,
  ];

  const isBlocking = !result.canProceed || !!integrityFailed;
  const hasWarnings = allWarnings.length > 0;

  if (!isBlocking && !hasWarnings && !integrityFailed && result.qualityPrediction.qualityPct >= 95) return null;

  const handleNavigate = (sectionId: string) => {
    onOpenChange(false);
    setTimeout(() => onGoToSection(sectionId), 50);
  };

  const firstError = allErrors[0];
  const firstWarning = allWarnings[0];

  return (
    <Dialog
      open={open}
      onOpenChange={isBlocking ? undefined : onOpenChange}
    >
      <DialogContent
        className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        hideCloseButton={isBlocking}
        onPointerDownOutside={isBlocking ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={isBlocking ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {isBlocking ? (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Cannot run AI review
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Some sections are empty
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isBlocking
              ? 'Complete the required sections below before AI can proceed. Click any row to navigate.'
              : 'These empty sections will be AI-generated. Click any row to fill them first, or proceed.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-4">
          {/* Quality Prediction (Gap 4) */}
          <QualityPredictionBar
            prediction={result.qualityPrediction}
            onGoToSection={handleNavigate}
          />

          {/* Mandatory missing sections + budget alignment errors */}
          {integrityFailed && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 space-y-1">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm font-semibold text-destructive">Content Integrity Failed</p>
              </div>
              <p className="text-xs text-muted-foreground">
                The challenge content has been modified since it was frozen for legal review.
                Return to curation to re-freeze or resolve discrepancies.
              </p>
            </div>
          )}

          {allErrors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-destructive px-1">
                Required — Must be filled
              </p>
              {allErrors.map((item) => (
                <NavigableRow
                  key={item.sectionId}
                  item={item}
                  variant="required"
                  onNavigate={() => handleNavigate(item.sectionId)}
                />
              ))}
            </div>
          )}

          {/* Recommended empty sections + budget alignment warnings */}
          {hasWarnings && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-1">
                Recommended — Will be AI-generated
              </p>
              {allWarnings.map((item) => (
                <NavigableRow
                  key={item.sectionId}
                  item={item}
                  variant="recommended"
                  onNavigate={() => handleNavigate(item.sectionId)}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2">
          {isBlocking ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleNavigate(firstError.sectionId)}
            >
              Go to {firstError.sectionName}
            </Button>
          ) : (
            <>
              {firstWarning && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate(firstWarning.sectionId)}
                >
                  Fill them first
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onProceed();
                }}
              >
                Proceed with AI generation
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
