/**
 * CurationDiagnosticsPage — AI pipeline diagnostic dashboard.
 * Read-only view of Pass 1, Pass 2, and Context Discovery results.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DiagnosticsReviewPanel } from '@/components/cogniblend/diagnostics/DiagnosticsReviewPanel';
import { DiagnosticsSuggestionsPanel } from '@/components/cogniblend/diagnostics/DiagnosticsSuggestionsPanel';
import { DiagnosticsDiscoveryPanel } from '@/components/cogniblend/diagnostics/DiagnosticsDiscoveryPanel';
import { DiagnosticsAcceptancePanel } from '@/components/cogniblend/diagnostics/DiagnosticsAcceptancePanel';
import { useDiagnosticsData } from '@/hooks/cogniblend/useDiagnosticsData';
import { loadExecutionRecord, loadAcceptanceRecord } from '@/services/cogniblend/waveExecutionHistory';
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
  const { attachmentStats, digest, importanceLevels, isLoading } = useDiagnosticsData(challengeId);

  // Manual refresh counter so user can re-read localStorage
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

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
      ) : (
        <div className="space-y-4">
          <DiagnosticsReviewPanel sections={sections} importanceLevels={importanceLevels} executionRecord={analyseRecord} />
          <DiagnosticsSuggestionsPanel sections={sections} importanceLevels={importanceLevels} executionRecord={generateRecord} analyseRecord={analyseRecord} />
          <DiagnosticsDiscoveryPanel stats={attachmentStats} digest={digest} />
          <div>
            <DiagnosticsAcceptancePanel acceptanceRecord={acceptanceRecord} />
          </div>
        </div>
      )}
    </div>
  );
}
