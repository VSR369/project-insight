/**
 * DiagnosticsSuggestionsPanel — Pass 2 (Generate Suggestions) wave-by-wave status.
 * Reads authoritative execution history when available, falls back to section store.
 */

import React from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, CheckCircle2, XCircle, SkipForward, Clock, AlertTriangle } from 'lucide-react';
import { EXECUTION_WAVES, SECTION_LABELS, IMPORTANCE_TO_LEVEL } from '@/lib/cogniblend/waveConfig';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';
import type { ExecutionRecord } from '@/services/cogniblend/waveExecutionHistory';

interface Props {
  sections: Partial<Record<SectionKey, SectionStoreEntry>>;
  importanceLevels: Partial<Record<SectionKey, string>>;
  executionRecord?: ExecutionRecord | null;
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

export function DiagnosticsSuggestionsPanel({ sections, importanceLevels, executionRecord }: Props) {
  const hasRecord = !!executionRecord && executionRecord.waves.length > 0;

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

          const generated = execWave
            ? execWave.sections.filter(s => s.status === 'success').length
            : wSections.filter(s => s.entry?.aiSuggestion != null).length;
          const errors = execWave
            ? execWave.sections.filter(s => s.status === 'error').length
            : wSections.filter(s => s.entry?.reviewStatus === 'error').length;
          const skipped = wSections.length - generated - errors;

          const waveStatus = execWave?.status ?? 'pending';

          return (
            <div key={wave.waveNumber} className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon status={waveStatus} />
                  <span className="text-xs font-medium">Wave {wave.waveNumber}: {wave.name}</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-[10px]">{generated} generated</Badge>
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
                    <TableHead>Suggestions</TableHead>
                    <TableHead>Suggestion Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wSections.map(({ id, entry, execSection }) => {
                    const sectionStatus = execSection?.status ?? (entry?.aiSuggestion != null ? 'success' : 'skipped');
                    const sectionAction = execSection?.action ?? entry?.aiAction ?? '—';
                    const hasSuggestion = execSection?.status === 'success' || entry?.aiSuggestion != null;
                    const hasError = execSection?.status === 'error' || entry?.reviewStatus === 'error';
                    const imp = importanceLevels[id] ?? 'medium';
                    const level = IMPORTANCE_TO_LEVEL[imp.toLowerCase()] ?? 'Consultant';

                    const statusLabel = (() => {
                      if (execSection) {
                        if (execSection.status === 'success') return execSection.action === 'generate' ? 'Content Drafted' : 'Suggestions Generated';
                        if (execSection.status === 'error') return 'Error';
                        return 'Skipped';
                      }
                      if (!entry) return 'Not Run';
                      if (entry.reviewStatus === 'error') return 'Error';
                      if (entry.aiSuggestion != null) return entry.aiAction === 'generate' ? 'Content Drafted' : 'Suggestions Generated';
                      if (entry.aiAction === 'skip') return 'Skipped';
                      return 'Not Run';
                    })();

                    return (
                      <TableRow key={id}>
                        <TableCell><StatusIcon status={hasError ? 'error' : (hasSuggestion ? 'success' : 'skipped')} /></TableCell>
                        <TableCell className="text-xs font-medium">{SECTION_LABELS[id] ?? id}</TableCell>
                        <TableCell><span className="text-xs">{statusLabel}</span></TableCell>
                        <TableCell><span className="text-xs capitalize">{sectionAction}</span></TableCell>
                        <TableCell>
                          {hasSuggestion ? (
                            <span className="text-xs">✨ 1</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell><span className="text-xs">{level}</span></TableCell>
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
