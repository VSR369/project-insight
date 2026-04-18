/**
 * DiagnosticsSuggestionsPanel — Pass 2 (Generate Suggestions) wave-by-wave status.
 * Only shows real status when an authoritative execution record exists.
 * When Pass 2 has not been run, all sections show "Not Run".
 */

import React from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, CheckCircle2, XCircle, SkipForward, Clock, AlertTriangle, Info } from 'lucide-react';
import {
  EXECUTION_WAVES,
  SECTION_LABELS,
  QA_WAVE_NUMBER,
  HARMONIZE_WAVE_NUMBER,
} from '@/lib/cogniblend/waveConfig';
import { WaveTimingTable } from '@/components/cogniblend/diagnostics/WaveTimingTable';
import { classifyPass2Outcome } from '@/lib/cogniblend/diagnosticsActionLabel';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';
import type { ExecutionRecord } from '@/services/cogniblend/waveExecutionHistory';

interface Props {
  sections: Partial<Record<SectionKey, SectionStoreEntry>>;
  importanceLevels: Partial<Record<SectionKey, string>>;
  reviewLevels: Partial<Record<SectionKey, string>>;
  executionRecord?: ExecutionRecord | null;
  analyseRecord?: ExecutionRecord | null;
}

/** Build a set of section IDs where Pass 1 action was 'generate' (AI-drafted content) */
function buildAiDraftedSet(analyseRecord: ExecutionRecord | null | undefined): Set<SectionKey> {
  const set = new Set<SectionKey>();
  if (!analyseRecord) return set;
  for (const wave of analyseRecord.waves) {
    for (const s of wave.sections) {
      if (s.action === 'generate' && s.status === 'success') {
        set.add(s.sectionId);
      }
    }
  }
  return set;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'success':
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
    case 'running':
    case 'pending':
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case 'cancelled': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    default: return <SkipForward className="h-4 w-4 text-muted-foreground" />;
  }
}

export function DiagnosticsSuggestionsPanel({ sections, importanceLevels, reviewLevels, executionRecord, analyseRecord }: Props) {
  const hasRecord = !!executionRecord && executionRecord.waves.length > 0;
  const aiDraftedSections = React.useMemo(() => buildAiDraftedSet(analyseRecord), [analyseRecord]);

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Pass 2 — Generate Suggestions</span>
          {hasRecord && executionRecord.overallStatus !== 'idle' && (
            <Badge
              variant={executionRecord.overallStatus === 'completed' ? 'secondary' : 'destructive'}
              className="text-[10px]"
            >
              {executionRecord.overallStatus}
            </Badge>
          )}
          {!hasRecord && (
            <Badge variant="outline" className="text-[10px]">Not Run</Badge>
          )}
        </div>
        <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-3">
        {!hasRecord && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/60 border border-dashed">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">
              Generate Suggestions has not been run yet. Complete Pass 1 (Analyse) first, then run Generate Suggestions.
            </span>
          </div>
        )}
        {hasRecord && executionRecord.startedAt && (
          <p className="text-[10px] text-muted-foreground px-1">
            Started: {new Date(executionRecord.startedAt).toLocaleString()}
            {executionRecord.completedAt && ` · Completed: ${new Date(executionRecord.completedAt).toLocaleString()}`}
            {executionRecord.errorMessage && ` · Error: ${executionRecord.errorMessage}`}
          </p>
        )}
        {EXECUTION_WAVES.map(wave => {
          const execWave = hasRecord
            ? executionRecord.waves.find(w => w.waveNumber === wave.waveNumber)
            : null;
          const waveStatus = execWave?.status ?? 'skipped';

          // ── F4c: Wave 11 (QA) — explicit skip explainer chip in Pass 2 ──
          if (wave.waveNumber === QA_WAVE_NUMBER) {
            return (
              <div key={wave.waveNumber} className="border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-muted/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={hasRecord ? waveStatus : 'skipped'} />
                    <span className="text-xs font-medium">Wave {wave.waveNumber}: {wave.name}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Skipped in Pass 2</Badge>
                </div>
                <div className="flex items-start gap-2 px-3 py-2 bg-background">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground">
                    Skipped — QA already done in Pass 1. Cross-suggestion consistency is handled by Wave 12 (Harmonization).
                  </span>
                </div>
              </div>
            );
          }

          // ── F4d: Wave 12 (Harmonization) — render metrics badges, no section table ──
          if (wave.waveNumber === HARMONIZE_WAVE_NUMBER) {
            const metrics = execWave?.harmonizeMetrics;
            return (
              <div key={wave.waveNumber} className="border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-muted/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={hasRecord ? waveStatus : 'skipped'} />
                    <span className="text-xs font-medium">Wave {wave.waveNumber}: {wave.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {metrics?.crossSectionScore != null && (
                      <Badge variant="secondary" className="text-[10px]">Score: {metrics.crossSectionScore}</Badge>
                    )}
                    {metrics?.issuesFound != null && (
                      <Badge variant="outline" className="text-[10px]">Issues: {metrics.issuesFound}</Badge>
                    )}
                    {metrics?.appliedCount != null && metrics.appliedCount > 0 && (
                      <Badge variant="secondary" className="text-[10px]">Applied: {metrics.appliedCount}</Badge>
                    )}
                    {metrics?.droppedCount != null && metrics.droppedCount > 0 && (
                      <Badge variant="destructive" className="text-[10px]">Dropped: {metrics.droppedCount}</Badge>
                    )}
                  </div>
                </div>
                {metrics?.skippedReason && (
                  <div className="flex items-start gap-2 px-3 py-2 bg-background">
                    <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground">{metrics.skippedReason}</span>
                  </div>
                )}
                {!metrics && hasRecord && (
                  <div className="flex items-start gap-2 px-3 py-2 bg-background">
                    <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground">
                      Cross-section harmonization audits all cluster suggestions for consistency before Accept All.
                    </span>
                  </div>
                )}
              </div>
            );
          }

          const wSections = wave.sectionIds.map(id => {
            const execSection = execWave?.sections.find(s => s.sectionId === id);
            return { id, entry: sections[id], execSection };
          });

          // Counts derive from the section store (single source of truth).
          const generated = wSections.filter(
            ({ entry }) => !!entry?.aiSuggestion || entry?.addressed === true,
          ).length;
          const errors = execWave
            ? execWave.sections.filter(s => s.status === 'error').length
            : 0;
          const pass2Failures = execWave
            ? execWave.sections.filter(s => s.isPass2Failure === true).length
            : 0;
          const notRun = Math.max(0, wSections.length - generated - errors);

          return (
            <div key={wave.waveNumber} className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon status={hasRecord ? waveStatus : 'skipped'} />
                  <span className="text-xs font-medium">Wave {wave.waveNumber}: {wave.name}</span>
                </div>
                <div className="flex gap-2">
                  {generated > 0 && <Badge variant="secondary" className="text-[10px]">{generated} generated</Badge>}
                  {errors > 0 && <Badge variant="destructive" className="text-[10px]">{errors} errors</Badge>}
                  {pass2Failures > 0 && <Badge variant="destructive" className="text-[10px]">{pass2Failures} pass-2 failed</Badge>}
                  {notRun > 0 && <Badge variant="outline" className="text-[10px]">{notRun} not run</Badge>}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Suggestions</TableHead>
                    <TableHead>AI Review Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wSections.map(({ id, entry, execSection }) => {
                    const level = reviewLevels[id] ?? 'principal';

                    const sectionStatus = execSection?.status ?? 'skipped';
                    const hasLiveSuggestion = !!entry?.aiSuggestion;
                    const wasAddressed = entry?.addressed === true;
                    const hasSuggestion = execSection?.status === 'success';
                    const isPass2Failure = execSection?.isPass2Failure === true;

                    const statusLabel = (() => {
                      if (!hasRecord) return 'Not Run';
                      if (!execSection) return 'Not Run';
                      if (execSection.status === 'success') {
                        if (isPass2Failure) return 'Suggestion Failed';
                        if (wasAddressed && !hasLiveSuggestion) return 'Accepted by Curator';
                        if (!hasLiveSuggestion && entry?.reviewStatus === 'idle') return 'Discarded by Curator';
                        if (execSection.action === 'generate') return 'AI Content Generated';
                        if (aiDraftedSections.has(id)) return 'AI Content Generated';
                        return 'AI Suggestion Ready';
                      }
                      if (execSection.status === 'error') return 'Error';
                      return 'Skipped';
                    })();

                    // F4a: uniform "Suggest" action label in Pass 2.
                    const actionLabel =
                      sectionStatus === 'skipped' ? 'Skipped' : 'Suggest';

                    // F4b: Reason — errorCode/errorMessage or skippedReason.
                    const reasonCode = execSection?.errorCode;
                    const reasonMsg = execSection?.errorMessage;
                    const skipReason = execSection?.skippedReason;
                    const showReason = !!(reasonCode || reasonMsg || skipReason);

                    return (
                      <TableRow key={id}>
                        <TableCell>
                          <StatusIcon status={hasRecord ? sectionStatus : 'skipped'} />
                        </TableCell>
                        <TableCell className="text-xs font-medium">{SECTION_LABELS[id] ?? id}</TableCell>
                        <TableCell><span className="text-xs">{statusLabel}</span></TableCell>
                        <TableCell><span className="text-xs">{actionLabel}</span></TableCell>
                        <TableCell>
                          {showReason ? (
                            <div className="flex flex-col gap-1 max-w-[240px]">
                              {reasonCode && (
                                <Badge
                                  variant={isPass2Failure || sectionStatus === 'error' ? 'destructive' : 'outline'}
                                  className="text-[10px] w-fit"
                                >
                                  {reasonCode}
                                </Badge>
                              )}
                              {(reasonMsg || skipReason) && (
                                <span
                                  className="text-[10px] text-muted-foreground line-clamp-2"
                                  title={reasonMsg ?? skipReason ?? ''}
                                >
                                  {reasonMsg ?? skipReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {hasSuggestion && hasLiveSuggestion ? (
                            <span className="text-xs">✨ 1 pending</span>
                          ) : hasSuggestion && wasAddressed ? (
                            <span className="text-xs text-muted-foreground">✓ accepted</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell><span className="text-xs capitalize">{level}</span></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          );
        })}
        {hasRecord && <WaveTimingTable record={executionRecord} />}
      </CollapsibleContent>
    </Collapsible>
  );
}
