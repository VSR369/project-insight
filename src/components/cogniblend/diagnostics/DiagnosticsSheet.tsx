/**
 * DiagnosticsSheet — Inline slide-over panel for AI pipeline diagnostics.
 * Renders inside the curation page to avoid navigation/auth issues.
 * Reads authoritative execution history from localStorage.
 */

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { DiagnosticsReviewPanel } from '@/components/cogniblend/diagnostics/DiagnosticsReviewPanel';
import { DiagnosticsSuggestionsPanel } from '@/components/cogniblend/diagnostics/DiagnosticsSuggestionsPanel';
import { DiagnosticsDiscoveryPanel } from '@/components/cogniblend/diagnostics/DiagnosticsDiscoveryPanel';
import { DiagnosticsAcceptancePanel } from '@/components/cogniblend/diagnostics/DiagnosticsAcceptancePanel';
import { useDiagnosticsData } from '@/hooks/cogniblend/useDiagnosticsData';
import { loadExecutionRecord, loadAcceptanceRecord } from '@/services/cogniblend/waveExecutionHistory';
import { Skeleton } from '@/components/ui/skeleton';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';

interface DiagnosticsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  sections: Partial<Record<SectionKey, SectionStoreEntry>>;
}

export function DiagnosticsSheet({ open, onOpenChange, challengeId, sections }: DiagnosticsSheetProps) {
  const { attachmentStats, digest, importanceLevels, isLoading } = useDiagnosticsData(challengeId);

  const analyseRecord = open ? loadExecutionRecord(challengeId, 'analyse') : null;
  const generateRecord = open ? loadExecutionRecord(challengeId, 'generate') : null;
  const acceptanceRecord = open ? loadAcceptanceRecord(challengeId) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>AI Diagnostics</SheetTitle>
          <SheetDescription>
            Pipeline status for challenge {challengeId.slice(0, 8)}…
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 pb-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <>
              <DiagnosticsReviewPanel
                sections={sections}
                importanceLevels={importanceLevels}
                executionRecord={analyseRecord}
              />
              <DiagnosticsSuggestionsPanel
                sections={sections}
                importanceLevels={importanceLevels}
                executionRecord={generateRecord}
                analyseRecord={analyseRecord}
              />
              <DiagnosticsDiscoveryPanel stats={attachmentStats} digest={digest} />
              <DiagnosticsAcceptancePanel acceptanceRecord={acceptanceRecord} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
