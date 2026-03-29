/**
 * PreFlightGateDialog — Modal shown before global AI review
 * when mandatory sections are missing or recommended sections are empty.
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
import { AlertTriangle, XCircle, Info } from 'lucide-react';
import type { PreFlightResult } from '@/lib/cogniblend/preFlightCheck';

interface PreFlightGateDialogProps {
  result: PreFlightResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Navigate to a section by key */
  onGoToSection: (sectionKey: string) => void;
  /** Called when user chooses to proceed despite warnings */
  onProceed: () => void;
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
                <Info className="h-5 w-5 text-amber-500" />
                Sections will be AI-generated
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isBlocking
              ? 'These mandatory sections need your input before AI can proceed:'
              : 'These sections are empty and will be AI-generated:'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-3">
          {/* Mandatory missing sections */}
          {result.missingMandatory.map((item) => (
            <div
              key={item.sectionId}
              className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
            >
              <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.sectionName}</p>
                <p className="text-xs text-muted-foreground">{item.reason}</p>
              </div>
            </div>
          ))}

          {/* Recommended empty sections */}
          {result.warnings.map((item) => (
            <div
              key={item.sectionId}
              className="flex items-start gap-3 rounded-lg border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 p-3"
            >
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.sectionName}</p>
                <p className="text-xs text-muted-foreground">{item.reason}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="shrink-0 gap-2">
          {isBlocking ? (
            /* Blocking: show Go-to buttons for each mandatory section */
            result.missingMandatory.map((item) => (
              <Button
                key={item.sectionId}
                variant="default"
                size="sm"
                onClick={() => {
                  onGoToSection(item.sectionId);
                  onOpenChange(false);
                }}
              >
                Go to {item.sectionName}
              </Button>
            ))
          ) : (
            /* Warning only: allow proceed or fill first */
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
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
