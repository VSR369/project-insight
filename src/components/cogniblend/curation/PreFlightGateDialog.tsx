/**
 * PreFlightGateDialog — Modal shown before global AI review
 * when mandatory sections are missing or recommended sections are empty.
 * Redesigned as an actionable navigation checklist.
 */

import React from 'react';
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
import { XCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import type { PreFlightResult, PreFlightItem } from '@/lib/cogniblend/preFlightCheck';
import { SECTION_TO_TAB } from '@/lib/cogniblend/preFlightCheck';

interface PreFlightGateDialogProps {
  result: PreFlightResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoToSection: (sectionKey: string) => void;
  onProceed: () => void;
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

export function PreFlightGateDialog({
  result,
  open,
  onOpenChange,
  onGoToSection,
  onProceed,
}: PreFlightGateDialogProps) {
  if (!result) return null;

  const isBlocking = !result.canProceed;
  const hasWarnings = result.warnings.length > 0;

  if (!isBlocking && !hasWarnings) return null;

  const handleNavigate = (sectionId: string) => {
    onGoToSection(sectionId);
    onOpenChange(false);
  };

  const firstMandatory = result.missingMandatory[0];
  const firstWarning = result.warnings[0];

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
          {/* Mandatory missing sections */}
          {result.missingMandatory.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-destructive px-1">
                Required — Must be filled
              </p>
              {result.missingMandatory.map((item) => (
                <NavigableRow
                  key={item.sectionId}
                  item={item}
                  variant="required"
                  onNavigate={() => handleNavigate(item.sectionId)}
                />
              ))}
            </div>
          )}

          {/* Recommended empty sections */}
          {hasWarnings && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-1">
                Recommended — Will be AI-generated
              </p>
              {result.warnings.map((item) => (
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
              onClick={() => handleNavigate(firstMandatory.sectionId)}
            >
              Go to {firstMandatory.sectionName}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigate(firstWarning.sectionId)}
              >
                Fill them first
              </Button>
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
