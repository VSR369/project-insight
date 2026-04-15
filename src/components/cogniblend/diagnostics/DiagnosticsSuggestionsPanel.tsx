/**
 * DiagnosticsSuggestionsPanel — Pass 2 (Generate Suggestions) wave-by-wave status.
 */

import React from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, CheckCircle2, XCircle, SkipForward, Clock } from 'lucide-react';
import { EXECUTION_WAVES, SECTION_LABELS, IMPORTANCE_TO_LEVEL } from '@/lib/cogniblend/waveConfig';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';

interface Props {
  sections: Partial<Record<SectionKey, SectionStoreEntry>>;
  importanceLevels: Partial<Record<SectionKey, string>>;
}

function StatusIcon({ hasSuggestion, hasError }: { hasSuggestion: boolean; hasError: boolean }) {
  if (hasError) return <XCircle className="h-4 w-4 text-destructive" />;
  if (hasSuggestion) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  return <SkipForward className="h-4 w-4 text-muted-foreground" />;
}

function getSuggestionLabel(entry: SectionStoreEntry | undefined): string {
  if (!entry) return 'Not Run';
  if (entry.reviewStatus === 'error') return 'Error';
  if (entry.aiSuggestion != null) {
    return entry.aiAction === 'generate' ? 'Content Drafted' : 'Suggestions Generated';
  }
  if (entry.aiAction === 'skip') return 'Skipped';
  return 'Not Run';
}

export function DiagnosticsSuggestionsPanel({ sections, importanceLevels }: Props) {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <span className="font-semibold text-sm">Pass 2 — Generate Suggestions</span>
        <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-3">
        {EXECUTION_WAVES.map(wave => {
          const wSections = wave.sectionIds.map(id => ({ id, entry: sections[id] }));
          const generated = wSections.filter(s => s.entry?.aiSuggestion != null).length;
          const errors = wSections.filter(s => s.entry?.reviewStatus === 'error').length;
          const skipped = wSections.length - generated - errors;

          return (
            <div key={wave.waveNumber} className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 flex items-center justify-between">
                <span className="text-xs font-medium">Wave {wave.waveNumber}: {wave.name}</span>
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
                  {wSections.map(({ id, entry }) => {
                    const hasSuggestion = entry?.aiSuggestion != null;
                    const hasError = entry?.reviewStatus === 'error';
                    const imp = importanceLevels[id] ?? 'medium';
                    const level = IMPORTANCE_TO_LEVEL[imp.toLowerCase()] ?? 'Consultant';
                    return (
                      <TableRow key={id}>
                        <TableCell><StatusIcon hasSuggestion={hasSuggestion} hasError={hasError} /></TableCell>
                        <TableCell className="text-xs font-medium">{SECTION_LABELS[id] ?? id}</TableCell>
                        <TableCell><span className="text-xs">{getSuggestionLabel(entry)}</span></TableCell>
                        <TableCell><span className="text-xs capitalize">{entry?.aiAction ?? '—'}</span></TableCell>
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
