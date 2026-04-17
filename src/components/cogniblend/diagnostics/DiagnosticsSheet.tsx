/**
 * DiagnosticsSheet — Inline slide-over panel for AI pipeline diagnostics.
 * Renders inside the curation page to avoid navigation/auth issues.
 * Reads authoritative execution history from localStorage.
 */

import React, { useMemo, useState, useEffect } from 'react';
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
import { ConsistencyFindingsPanel } from '@/components/cogniblend/diagnostics/ConsistencyFindingsPanel';
import { AmbiguityFindingsPanel } from '@/components/cogniblend/diagnostics/AmbiguityFindingsPanel';
import { QualityScoreSummary } from '@/components/cogniblend/diagnostics/QualityScoreSummary';
import { WaitingForRunPlaceholder } from '@/components/cogniblend/diagnostics/WaitingForRunPlaceholder';
import { useDiagnosticsData } from '@/hooks/cogniblend/useDiagnosticsData';
import { useConsistencyFindings, useAmbiguityFindings } from '@/hooks/queries/useQualityFindings';
import { loadExecutionRecord, loadAcceptanceRecord, WAVE_EXEC_CHANGED_EVENT } from '@/services/cogniblend/waveExecutionHistory';
import { DISCOVERY_WAVE_NUMBER, QA_WAVE_NUMBER } from '@/lib/cogniblend/waveConfig';
import { Skeleton } from '@/components/ui/skeleton';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';

interface DiagnosticsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  sections: Partial<Record<SectionKey, SectionStoreEntry>>;
  onReReviewSection?: (sectionId: string) => void;
}

export function DiagnosticsSheet({ open, onOpenChange, challengeId, sections, onReReviewSection }: DiagnosticsSheetProps) {
  const { attachmentStats, digest, importanceLevels, reviewLevels, isLoading } = useDiagnosticsData(challengeId);
  const { data: consistencyFindings } = useConsistencyFindings(open ? challengeId : undefined);
  const { data: ambiguityFindings } = useAmbiguityFindings(open ? challengeId : undefined);

  // refreshKey increments every time the sheet opens so localStorage is re-read
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    if (open) setRefreshKey((k) => k + 1);
  }, [open]);

  // Auto-refresh when localStorage is updated (covers sheet-open-during-execution).
  // `storage` event only fires across tabs, so we ALSO listen for the in-tab
  // custom event dispatched by waveExecutionHistory on save/clear.
  // Additionally listens for `cogni-diagnostics-reset` so Re-analyse forces an
  // immediate snapshot refresh even when the sheet is already open.
  useEffect(() => {
    if (!open) return;
    const storageHandler = (e: StorageEvent) => {
      if (
        e.key?.startsWith(`wave-exec-${challengeId}`) ||
        e.key === `wave-accept-${challengeId}`
      ) {
        setRefreshKey((k) => k + 1);
      }
    };
    const inTabHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ challengeId: string }>).detail;
      if (!detail || detail.challengeId === challengeId) {
        setRefreshKey((k) => k + 1);
      }
    };
    const resetHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ challengeId?: string }>).detail;
      if (!detail || !detail.challengeId || detail.challengeId === challengeId) {
        setRefreshKey((k) => k + 1);
      }
    };
    window.addEventListener('storage', storageHandler);
    window.addEventListener(WAVE_EXEC_CHANGED_EVENT, inTabHandler as EventListener);
    window.addEventListener('cogni-diagnostics-reset', resetHandler as EventListener);
    return () => {
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener(WAVE_EXEC_CHANGED_EVENT, inTabHandler as EventListener);
      window.removeEventListener('cogni-diagnostics-reset', resetHandler as EventListener);
    };
  }, [open, challengeId]);

  const analyseRecord = useMemo(
    () => (open ? loadExecutionRecord(challengeId, 'analyse') : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, challengeId, refreshKey],
  );
  const generateRecord = useMemo(
    () => (open ? loadExecutionRecord(challengeId, 'generate') : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, challengeId, refreshKey],
  );
  const acceptanceRecord = useMemo(
    () => (open ? loadAcceptanceRecord(challengeId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, challengeId, refreshKey],
  );

  // Compute "fresh Analyse run is in flight" gating signals.
  // While Analyse is running we suppress prior-run data in dependent panels
  // (Pass 2, Acceptance, Discovery, QA) and show explicit waiting placeholders.
  // Telemetry is intentionally NOT gated — it is a historical trend.
  const analyseRunning = analyseRecord?.overallStatus === 'running';
  const discoveryWave = analyseRecord?.waves.find((w) => w.waveNumber === DISCOVERY_WAVE_NUMBER);
  const qaWave = analyseRecord?.waves.find((w) => w.waveNumber === QA_WAVE_NUMBER);
  const discoveryDone = !analyseRunning || (discoveryWave?.status === 'completed' || discoveryWave?.status === 'error');
  const qaDone = !analyseRunning || (qaWave?.status === 'completed' || qaWave?.status === 'error');
  // Pass 2 + Acceptance are downstream of Analyse — blank them while Analyse runs.
  const downstreamGated = analyseRunning;

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
              {qaDone ? (
                <QualityScoreSummary
                  consistencyCount={consistencyFindings?.length ?? 0}
                  consistencyErrors={consistencyFindings?.filter(f => f.severity === 'error').length ?? 0}
                  ambiguityCount={ambiguityFindings?.length ?? 0}
                />
              ) : (
                <WaitingForRunPlaceholder title="Quality Score" detail="Waiting for QA wave to complete." />
              )}

              <DiagnosticsReviewPanel
                sections={sections}
                importanceLevels={importanceLevels}
                reviewLevels={reviewLevels}
                executionRecord={analyseRecord}
              />

              {downstreamGated ? (
                <WaitingForRunPlaceholder title="Suggestions (Pass 2)" detail="Waiting for the new Analyse run to complete." />
              ) : (
                <DiagnosticsSuggestionsPanel
                  sections={sections}
                  importanceLevels={importanceLevels}
                  reviewLevels={reviewLevels}
                  executionRecord={generateRecord}
                  analyseRecord={analyseRecord}
                />
              )}

              {qaDone ? (
                <>
                  <ConsistencyFindingsPanel challengeId={challengeId} />
                  <AmbiguityFindingsPanel challengeId={challengeId} />
                </>
              ) : (
                <WaitingForRunPlaceholder title="Consistency & Ambiguity" detail="Waiting for QA wave to complete." />
              )}

              {discoveryDone ? (
                <DiagnosticsDiscoveryPanel stats={attachmentStats} digest={digest} />
              ) : (
                <WaitingForRunPlaceholder title="Context Discovery" detail="Waiting for Discovery wave to complete." />
              )}

              <div>
                {downstreamGated ? (
                  <WaitingForRunPlaceholder title="Acceptance (Pass 3)" detail="Waiting for the new Analyse run to complete." />
                ) : (
                  <DiagnosticsAcceptancePanel acceptanceRecord={acceptanceRecord} onReReviewSection={onReReviewSection} />
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
