/**
 * SectionFullscreenModal — Fullscreen overlay for a curator section panel.
 * Extracted from CuratorSectionPanel.tsx.
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Sparkles } from "lucide-react";
import { StatusBadge } from "./CuratorSectionStatusBadge";
import { ValidationResultsBar } from "./ValidationResultsBar";
import type { SectionStatus } from "./CuratorSectionPanel";
import type { ValidationResult } from "@/lib/cogniblend/postLlmValidation";

interface SectionFullscreenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  attribution?: string;
  effectiveStatus: SectionStatus;
  isLocked: boolean;
  children: React.ReactNode;
  aiReviewSlot?: React.ReactNode;
  validationResult?: ValidationResult | null;
}

export function SectionFullscreenModal({
  open,
  onOpenChange,
  label,
  attribution,
  effectiveStatus,
  isLocked,
  children,
  aiReviewSlot,
  validationResult,
}: SectionFullscreenModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-80px)] max-w-none h-[calc(100vh-80px)] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {label}
            {attribution && (
              <Badge className="bg-muted text-muted-foreground border-border text-[11px] px-1.5 py-0 hover:bg-muted">{attribution}</Badge>
            )}
            <StatusBadge status={effectiveStatus} />
          </DialogTitle>
        </DialogHeader>

        {isLocked && (
          <div className="flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2 shrink-0">
            <Eye className="h-4 w-4 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              This section is view-only. Use the Accept Section button in the panel header to approve.
            </p>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
          <div className="min-h-[500px]">{children}</div>

          {aiReviewSlot && (
            <div className="relative my-5">
              <div className="border-t border-border" />
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 py-0.5 text-[11px] font-medium text-muted-foreground border border-border rounded-full inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" />AI Analysis
              </span>
            </div>
          )}

          {aiReviewSlot}

          {validationResult && (validationResult.corrections.length > 0 || validationResult.passedChecks.length > 0) && (
            <ValidationResultsBar result={validationResult} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
