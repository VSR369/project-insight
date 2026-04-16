/**
 * DiagnosticsAcceptancePanel — Per-section acceptance status from "Accept All AI Suggestions".
 * Shows Updated / Failed status for each section processed.
 */

import React from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, CheckCircle2, XCircle, Info } from 'lucide-react';
import { SECTION_LABELS } from '@/lib/cogniblend/waveConfig';
import type { AcceptanceRecord } from '@/services/cogniblend/waveExecutionHistory';

interface Props {
  acceptanceRecord: AcceptanceRecord | null;
}

const STATUS_BADGE: Record<string, { variant: 'secondary' | 'destructive' | 'outline'; label: string }> = {
  completed: { variant: 'secondary', label: 'Completed' },
  partial: { variant: 'destructive', label: 'Partial' },
  failed: { variant: 'destructive', label: 'Failed' },
};

export function DiagnosticsAcceptancePanel({ acceptanceRecord }: Props) {
  const hasRecord = !!acceptanceRecord;
  const badge = hasRecord ? STATUS_BADGE[acceptanceRecord.overallStatus] ?? STATUS_BADGE.completed : null;

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Pass 3 — Acceptance Status</span>
          {hasRecord && badge && (
            <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
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
              Accept All has not been run yet. Complete Pass 2 (Generate Suggestions) first, then use "Accept All AI Suggestions".
            </span>
          </div>
        )}
        {hasRecord && (
          <>
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] text-muted-foreground">
                Accepted: {new Date(acceptanceRecord.acceptedAt).toLocaleString()}
              </p>
              <div className="flex gap-2">
                {acceptanceRecord.totalUpdated > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {acceptanceRecord.totalUpdated} Updated
                  </Badge>
                )}
                {acceptanceRecord.totalFailed > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {acceptanceRecord.totalFailed} Failed
                  </Badge>
                )}
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acceptanceRecord.sections.map((s) => (
                    <TableRow key={s.sectionId}>
                      <TableCell>
                        {s.status === 'updated' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {SECTION_LABELS[s.sectionId] ?? s.sectionId}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs">{s.status === 'updated' ? '✓ Updated' : '✗ Failed'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {s.errorMessage ?? '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
