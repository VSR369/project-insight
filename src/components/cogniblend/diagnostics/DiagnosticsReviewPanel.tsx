/**
 * DiagnosticsReviewPanel — Pass 1 (Analyse) wave-by-wave status table.
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

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'reviewed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
    case 'pending': return <Clock className="h-4 w-4 text-muted-foreground" />;
    default: return <SkipForward className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusLabel(entry: SectionStoreEntry | undefined): string {
  if (!entry) return 'Not Run';
  switch (entry.reviewStatus) {
    case 'reviewed': return entry.aiAction === 'generate' ? 'Drafted' : 'Analysed';
    case 'error': return 'Error';
    case 'pending': return 'Pending';
    default: return entry.aiAction === 'skip' ? 'Skipped' : 'Not Run';
  }
}

export function DiagnosticsReviewPanel({ sections, importanceLevels }: Props) {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <span className="font-semibold text-sm">Pass 1 — AI Review (Analyse)</span>
        <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-3">
        {EXECUTION_WAVES.map(wave => {
          const wSections = wave.sectionIds.map(id => ({ id, entry: sections[id] }));
          const reviewed = wSections.filter(s => s.entry?.reviewStatus === 'reviewed').length;
          const errors = wSections.filter(s => s.entry?.reviewStatus === 'error').length;
          const skipped = wSections.filter(s => s.entry?.aiAction === 'skip' || (!s.entry?.reviewStatus || s.entry.reviewStatus === 'idle')).length;

          return (
            <div key={wave.waveNumber} className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 flex items-center justify-between">
                <span className="text-xs font-medium">Wave {wave.waveNumber}: {wave.name}</span>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-[10px]">{reviewed} analysed</Badge>
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
                    <TableHead>Review Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wSections.map(({ id, entry }) => {
                    const commentCount = entry?.aiComments?.length ?? 0;
                    const imp = importanceLevels[id] ?? 'medium';
                    const level = IMPORTANCE_TO_LEVEL[imp.toLowerCase()] ?? 'Consultant';
                    return (
                      <TableRow key={id}>
                        <TableCell><StatusIcon status={entry?.reviewStatus ?? 'idle'} /></TableCell>
                        <TableCell className="text-xs font-medium">{SECTION_LABELS[id] ?? id}</TableCell>
                        <TableCell><span className="text-xs">{getStatusLabel(entry)}</span></TableCell>
                        <TableCell><span className="text-xs capitalize">{entry?.aiAction ?? '—'}</span></TableCell>
                        <TableCell>
                          {commentCount > 0 ? (
                            <span className="text-xs">💬 {commentCount}</span>
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
