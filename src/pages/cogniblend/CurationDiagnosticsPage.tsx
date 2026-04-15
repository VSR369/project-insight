/**
 * CurationDiagnosticsPage — AI pipeline diagnostic dashboard.
 * Read-only view of Pass 1, Pass 2, and Context Discovery results.
 */

import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DiagnosticsReviewPanel } from '@/components/cogniblend/diagnostics/DiagnosticsReviewPanel';
import { DiagnosticsSuggestionsPanel } from '@/components/cogniblend/diagnostics/DiagnosticsSuggestionsPanel';
import { DiagnosticsDiscoveryPanel } from '@/components/cogniblend/diagnostics/DiagnosticsDiscoveryPanel';
import { useDiagnosticsData } from '@/hooks/cogniblend/useDiagnosticsData';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';

/**
 * We read curation store from localStorage for the given challenge.
 * This avoids coupling to a live Zustand instance.
 */
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
  const navigate = useNavigate();
  const { attachmentStats, digest, importanceLevels, isLoading } = useDiagnosticsData(challengeId);

  const sections = useMemo(() => {
    if (!challengeId) return {};
    return loadSectionsFromStorage(challengeId);
  }, [challengeId]);

  if (!challengeId) return null;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => window.close()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">AI Diagnostics</h1>
          <p className="text-xs text-muted-foreground">Pipeline status for challenge {challengeId.slice(0, 8)}…</p>
        </div>
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
          <DiagnosticsReviewPanel sections={sections} importanceLevels={importanceLevels} />
          <DiagnosticsSuggestionsPanel sections={sections} importanceLevels={importanceLevels} />
          <DiagnosticsDiscoveryPanel stats={attachmentStats} digest={digest} />
        </div>
      )}
    </div>
  );
}
