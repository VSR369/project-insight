/**
 * DiagnosticsReviewPanel — Pass 1 (Analyse) wave-by-wave status table.
 * Reads authoritative execution history when available, falls back to section store.
 */

import React from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, CheckCircle2, XCircle, SkipForward, Clock, AlertTriangle } from 'lucide-react';
import { EXECUTION_WAVES, SECTION_LABELS } from '@/lib/cogniblend/waveConfig';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';
import type { ExecutionRecord } from '@/services/cogniblend/waveExecutionHistory';

interface Props {
  sections: Partial<Record<SectionKey, SectionStoreEntry>>;
  importanceLevels: Partial<Record<SectionKey, string>>;
  reviewLevels: Partial<Record<SectionKey, string>>;
  executionRecord?: ExecutionRecord | null;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'reviewed':
    case 'completed':
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
    case 'pending':
    case 'running':
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case 'cancelled': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    default: return <SkipForward className="h-4 w-4 text-muted-foreground" />;
  }
}

export function DiagnosticsReviewPanel({ sections, importanceLevels, reviewLevels, executionRecord }: Props) {
  const hasRecord = !!executionRecord && executionRecord.waves.length > 0;

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Pass 1 — AI Review (Analyse)</span>
          {hasRecord && executionRecord.overallStatus !== 'idle' && (
            <Badge
              variant={executionRecord.overallStatus === 'completed' ? 'secondary' : 'destructive'}
              className="text-[10px]"
            >
              {executionRecord.overallStatus}
            </Badge>
          )}
        </div>
        <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-3">
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

          const wSections = wave.sectionIds.map(id => {
            const execSection = execWave?.sections.find(s => s.sectionId === id);
            return { id, entry: sections[id], execSection };
          });

          const ready = execWave
            ? execWave.sections.filter(s => s.status === 'success').length
            : wSections.filter(s => s.entry?.reviewStatus === 'reviewed').length;
          const errors = execWave
            ? execWave.sections.filter(s => s.status === 'error').length
            : wSections.filter(s => s.entry?.reviewStatus === 'error').length;
          const skipped = wSections.length - ready - errors;

          const waveStatus = execWave?.status ?? 'pending';

          return (
            <div key={wave.waveNumber} className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon status={waveStatus} />
                  <span className="text-xs font-medium">Wave {wave.waveNumber}: {wave.name}</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-[10px]">{ready} ready</Badge>
                  {errors > 0 && <Badge variant="destructive" className="text-[10px]">{errors} errors</Badge>}
                  {skipped > 0 && <Badge variant="outline" className="text-[10px]">{skipped} skipped</Badge>}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead>AI Review Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wSections.map(({ id, entry, execSection }) => {
                    const sectionStatus = execSection?.status ?? (entry?.reviewStatus ?? 'idle');
                    const sectionAction = execSection?.action ?? entry?.aiAction ?? '—';
                    const commentCount = entry?.aiComments?.length ?? 0;
                    const imp = importanceLevels[id] ?? 'medium';
                    const level = reviewLevels[id] ?? 'principal';

                    const statusLabel = (() => {
                      if (execSection) {
                        if (execSection.status === 'success') {
                          return execSection.action === 'generate'
                            ? 'Drafted & Suggestion Ready'
                            : 'Suggestion Ready';
                        }
                        if (execSection.status === 'error') return 'Error';
                        return 'Skipped';
                      }
                      if (!entry) return 'Not Run';
                      if (entry.reviewStatus === 'reviewed') {
                        return entry.aiAction === 'generate'
                          ? 'Drafted & Suggestion Ready'
                          : 'Suggestion Ready';
                      }
                      if (entry.reviewStatus === 'error') return 'Error';
                      if (entry.reviewStatus === 'pending') return 'Pending';
                      return entry.aiAction === 'skip' ? 'Skipped' : 'Not Run';
                    })();

                    return (
                      <TableRow key={id}>
                        <TableCell><StatusIcon status={sectionStatus} /></TableCell>
                        <TableCell className="text-xs font-medium">{SECTION_LABELS[id] ?? id}</TableCell>
                        <TableCell><span className="text-xs">{statusLabel}</span></TableCell>
                        <TableCell><span className="text-xs capitalize">{sectionAction}</span></TableCell>
                        <TableCell>
                          {commentCount > 0 ? (
                            <span className="text-xs">💬 {commentCount}</span>
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
      </CollapsibleContent>
    </Collapsible>
  );
}