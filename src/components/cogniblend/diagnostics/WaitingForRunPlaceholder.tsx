/**
 * WaitingForRunPlaceholder — Shown inside the Diagnostics drawer for panels
 * whose data depends on a wave that hasn't completed yet during a fresh
 * Analyse run. Prevents stale prior-run data from being read as current.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  title: string;
  /** Optional sub-line, e.g. "Waiting for QA wave to complete." */
  detail?: string;
}

export function WaitingForRunPlaceholder({ title, detail }: Props) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {detail ?? 'Waiting for current run…'}
      </p>
    </div>
  );
}
