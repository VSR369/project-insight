/**
 * AiDataTable — Parses AI-generated tabular data and renders it as a clean,
 * structured table with approval actions.
 *
 * Accepts pipe-delimited (markdown table) or CSV text and auto-parses into rows.
 */

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AiDataTableProps {
  /** Raw AI output containing tabular data (pipe-delimited or CSV) */
  data: string;
  /** Callback when user approves the parsed data */
  onApprove?: (rows: string[][]) => void;
  /** Callback when user requests changes */
  onRequestChanges?: (rows: string[][]) => void;
  /** Hide action buttons */
  hideActions?: boolean;
  /** Additional CSS classes for the wrapper */
  className?: string;
  /** Loading state for action buttons */
  loading?: boolean;
}

/**
 * Parse pipe-delimited markdown table or CSV text into header + rows.
 */
function parseTabularData(raw: string): { headers: string[]; rows: string[][] } | null {
  const lines = raw
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  // Try pipe-delimited (markdown table)
  const isPipe = lines[0].includes('|');
  if (isPipe) {
    const parsePipeLine = (line: string) =>
      line
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);

    const headers = parsePipeLine(lines[0]);
    if (headers.length < 2) return null;

    // Skip separator line (e.g., |---|---|)
    const startIdx = /^[\s|:-]+$/.test(lines[1]) ? 2 : 1;
    const rows = lines.slice(startIdx).map(parsePipeLine);

    return { headers, rows };
  }

  // Try CSV (comma-separated)
  const isCSV = lines[0].includes(',');
  if (isCSV) {
    const parseCSVLine = (line: string) =>
      line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));

    const headers = parseCSVLine(lines[0]);
    if (headers.length < 2) return null;

    const rows = lines.slice(1).map(parseCSVLine);
    return { headers, rows };
  }

  return null;
}

export function AiDataTable({
  data,
  onApprove,
  onRequestChanges,
  hideActions = false,
  className,
  loading = false,
}: AiDataTableProps) {
  const parsed = useMemo(() => parseTabularData(data), [data]);
  const [actioned, setActioned] = useState<'approved' | 'changes' | null>(null);

  if (!parsed) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Could not parse tabular data.
      </p>
    );
  }

  const { headers, rows } = parsed;

  const handleApprove = () => {
    setActioned('approved');
    onApprove?.(rows);
  };

  const handleRequestChanges = () => {
    setActioned('changes');
    onRequestChanges?.(rows);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative w-full overflow-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {headers.map((h, i) => (
                <TableHead key={i} className="font-semibold text-foreground text-xs uppercase tracking-wide">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, ri) => (
              <TableRow
                key={ri}
                className={cn(
                  ri % 2 === 1 && 'bg-muted/30',
                  'border-b border-border/50',
                )}
              >
                {row.map((cell, ci) => (
                  <TableCell key={ci} className="text-sm py-2.5">
                    {cell || '—'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!hideActions && (onApprove || onRequestChanges) && (
        <div className="flex gap-2 justify-end">
          {onRequestChanges && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleRequestChanges}
              disabled={loading || actioned === 'changes'}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MessageSquare className="h-3.5 w-3.5" />
              )}
              {actioned === 'changes' ? 'Changes Requested' : 'Request Changes'}
            </Button>
          )}
          {onApprove && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleApprove}
              disabled={loading || actioned === 'approved'}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {actioned === 'approved' ? 'Approved' : 'Approve'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
