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
import { EXECUTION_WAVES, SECTION_LABELS, IMPORTANCE_TO_LEVEL } from '@/lib/cogniblend/waveConfig';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';
import type { ExecutionRecord } from '@/services/cogniblend/waveExecutionHistory';

interface Props {
  sections: Partial<Record<SectionKey, SectionStoreEntry>>;
  importanceLevels: Partial<Record<SectionKey, string>>;
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

export function DiagnosticsSuggestionsPanel({ sections, importanceLevels, executionRecord, analyseRecord }: Props) {
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

          const wSections = wave.sectionIds.map(id => {
            const execSection = execWave?.sections.find(s => s.sectionId === id);
            return { id, entry: sections[id], execSection };
          });

          // When no record exists, everything is 0 — all "Not Run"
          const generated = execWave
            ? execWave.sections.filter(s => s.status === 'success').length
            : 0;
          const errors = execWave
            ? execWave.sections.filter(s => s.status === 'error').length
            : 0;
          const notRun = wSections.length - generated - errors;

          const waveStatus = execWave?.status ?? 'skipped';

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
                    <TableHead>Suggestions</TableHead>
                    <TableHead>Suggestion Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wSections.map(({ id, execSection }) => {
                    const imp = importanceLevels[id] ?? 'medium';
                    const level = IMPORTANCE_TO_LEVEL[imp.toLowerCase()] ?? 'Consultant';

                    // Only use execution record — no store fallback
                    const sectionStatus = execSection?.status ?? 'skipped';
                    const sectionAction = execSection?.action ?? '—';
                    const hasSuggestion = execSection?.status === 'success';

                    const statusLabel = (() => {
                      if (!hasRecord) return 'Not Run';
                      if (!execSection) return 'Not Run';
                      if (execSection.status === 'success') {
                        if (execSection.action === 'generate') return 'AI Content Drafted';
                        // Cross-reference Pass 1: was this section AI-drafted?
                        if (aiDraftedSections.has(id)) return 'AI Drafted & Suggestions Generated';
                        return 'Suggestion Generated';
                      }
                      if (execSection.status === 'error') return 'Error';
                      return 'Skipped';
                    })();

                    return (
                      <TableRow key={id}>
                        <TableCell>
                          <StatusIcon status={hasRecord ? sectionStatus : 'skipped'} />
                        </TableCell>
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