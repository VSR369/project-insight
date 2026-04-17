/**
 * CurationDiagnosticsPage — AI pipeline diagnostic dashboard.
 * Read-only view of Pass 1, Pass 2, Quality findings, and Context Discovery results.
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DiagnosticsReviewPanel } from '@/components/cogniblend/diagnostics/DiagnosticsReviewPanel';
import { DiagnosticsSuggestionsPanel } from '@/components/cogniblend/diagnostics/DiagnosticsSuggestionsPanel';
import { DiagnosticsDiscoveryPanel } from '@/components/cogniblend/diagnostics/DiagnosticsDiscoveryPanel';
import { DiagnosticsAcceptancePanel } from '@/components/cogniblend/diagnostics/DiagnosticsAcceptancePanel';
import { ConsistencyFindingsPanel } from '@/components/cogniblend/diagnostics/ConsistencyFindingsPanel';
import { AmbiguityFindingsPanel } from '@/components/cogniblend/diagnostics/AmbiguityFindingsPanel';
import { QualityScoreSummary } from '@/components/cogniblend/diagnostics/QualityScoreSummary';
import { WaitingForRunPlaceholder } from '@/components/cogniblend/diagnostics/WaitingForRunPlaceholder';
import { ChallengeTelemetryPanel } from '@/components/cogniblend/diagnostics/ChallengeTelemetryPanel';
import { useDiagnosticsData } from '@/hooks/cogniblend/useDiagnosticsData';
import { useConsistencyFindings, useAmbiguityFindings } from '@/hooks/queries/useQualityFindings';
import { loadExecutionRecord, loadAcceptanceRecord, WAVE_EXEC_CHANGED_EVENT } from '@/services/cogniblend/waveExecutionHistory';
import { DISCOVERY_WAVE_NUMBER, QA_WAVE_NUMBER } from '@/lib/cogniblend/waveConfig';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';

function loadSectionsFromStorage(challengeId: string): Partial<Record<SectionKey, SectionStoreEntry>> {
  try {
    const raw = localStorage.getItem(`curation-form-${challengeId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed?.state?.sections ?? {};
  } catch {
    return {};
  }
}

export default function CurationDiagnosticsPage() {
  const { id: challengeId } = useParams<{ id: string }>();
  const { attachmentStats, digest, importanceLevels, reviewLevels, isLoading } = useDiagnosticsData(challengeId);
  const { data: consistencyFindings } = useConsistencyFindings(challengeId);
  const { data: ambiguityFindings } = useAmbiguityFindings(challengeId);

  // Manual refresh counter so user can re-read localStorage
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Listen for in-tab wave execution / acceptance changes so the standalone
  // diagnostics page refreshes live without requiring a manual reload.
  useEffect(() => {
    if (!challengeId) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ challengeId: string }>).detail;
      if (!detail || detail.challengeId === challengeId) {
        setRefreshKey((k) => k + 1);
      }
    };
    const storageHandler = (e: StorageEvent) => {
      if (
        e.key?.startsWith(`wave-exec-${challengeId}`) ||
        e.key === `wave-accept-${challengeId}`
      ) {
        setRefreshKey((k) => k + 1);
      }
    };
    window.addEventListener(WAVE_EXEC_CHANGED_EVENT, handler as EventListener);
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener(WAVE_EXEC_CHANGED_EVENT, handler as EventListener);
      window.removeEventListener('storage', storageHandler);
    };
  }, [challengeId]);

  const sections = useMemo(() => {
    if (!challengeId) return {};
    return loadSectionsFromStorage(challengeId);
  }, [challengeId, refreshKey]);

  const analyseRecord = useMemo(
    () => (challengeId ? loadExecutionRecord(challengeId, 'analyse') : null),
    [challengeId, refreshKey],
  );
  const generateRecord = useMemo(
    () => (challengeId ? loadExecutionRecord(challengeId, 'generate') : null),
    [challengeId, refreshKey],
  );
  const acceptanceRecord = useMemo(
    () => (challengeId ? loadAcceptanceRecord(challengeId) : null),
    [challengeId, refreshKey],
  );

  if (!challengeId) return null;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => window.close()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">AI Diagnostics</h1>
          <p className="text-xs text-muted-foreground">Pipeline status for challenge {challengeId.slice(0, 8)}…</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.close()}>
          Close
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (() => {
        const analyseRunning = analyseRecord?.overallStatus === 'running';
        const discoveryWave = analyseRecord?.waves.find((w) => w.waveNumber === DISCOVERY_WAVE_NUMBER);
        const qaWave = analyseRecord?.waves.find((w) => w.waveNumber === QA_WAVE_NUMBER);
        const discoveryDone = !analyseRunning || discoveryWave?.status === 'completed' || discoveryWave?.status === 'error';
        const qaDone = !analyseRunning || qaWave?.status === 'completed' || qaWave?.status === 'error';
        const downstreamGated = analyseRunning;

        return (
          <div className="space-y-4">
            {qaDone ? (
              <QualityScoreSummary
                consistencyCount={consistencyFindings?.length ?? 0}
                consistencyErrors={consistencyFindings?.filter(f => f.severity === 'error').length ?? 0}
                ambiguityCount={ambiguityFindings?.length ?? 0}
              />
            ) : (
              <WaitingForRunPlaceholder title="Quality Score" detail="Waiting for QA wave to complete." />
            )}
            <ChallengeTelemetryPanel challengeId={challengeId} />
            <DiagnosticsReviewPanel sections={sections} importanceLevels={importanceLevels} reviewLevels={reviewLevels} executionRecord={analyseRecord} />
            {downstreamGated ? (
              <WaitingForRunPlaceholder title="Suggestions (Pass 2)" detail="Waiting for the new Analyse run to complete." />
            ) : (
              <DiagnosticsSuggestionsPanel sections={sections} importanceLevels={importanceLevels} reviewLevels={reviewLevels} executionRecord={generateRecord} analyseRecord={analyseRecord} />
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
                <DiagnosticsAcceptancePanel acceptanceRecord={acceptanceRecord} />
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
