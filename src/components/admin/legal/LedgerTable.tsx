/**
 * LedgerTable — Renders the paginated acceptance log rows.
 * Loading / empty / error states handled by parent.
 */
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { LedgerRow } from '@/hooks/queries/useLegalAcceptanceLedger';

interface LedgerTableProps {
  rows: LedgerRow[];
}

const fmt = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const truncate = (s: string | null, n = 8): string =>
  s ? `${s.slice(0, n)}…${s.slice(-4)}` : '—';

export function LedgerTable({ rows }: LedgerTableProps) {
  return (
    <div className="relative w-full overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[170px]">Accepted at</TableHead>
            <TableHead>Document</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Challenge</TableHead>
            <TableHead>IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-xs whitespace-nowrap">{fmt(r.accepted_at)}</TableCell>
              <TableCell>
                <Badge variant="outline">{r.document_code}</Badge>
              </TableCell>
              <TableCell className="text-xs">v{r.document_version || '—'}</TableCell>
              <TableCell className="text-xs">{r.trigger_event ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={r.action === 'accepted' ? 'default' : 'secondary'}>
                  {r.action}
                </Badge>
              </TableCell>
              <TableCell className="text-xs font-mono" title={r.user_id}>
                {truncate(r.user_id)}
              </TableCell>
              <TableCell className="text-xs font-mono" title={r.challenge_id ?? ''}>
                {r.challenge_id ? truncate(r.challenge_id) : '—'}
              </TableCell>
              <TableCell className="text-xs">{r.ip_address ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
