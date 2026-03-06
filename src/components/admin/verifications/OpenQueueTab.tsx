import { useState, useMemo } from 'react';
import { useOpenQueue } from '@/hooks/queries/useVerificationDashboard';
import { useClaimFromQueue, usePinQueueEntry } from '@/hooks/queries/useVerificationMutations';
import { useAdminTier } from '@/hooks/useAdminTier';
import { SLAStatusBadge } from './SLAStatusBadge';
import { ClaimConfirmationModal } from './ClaimConfirmationModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pin, PinOff, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * SCR-03-02: Open Queue Tab
 * GAP-6: Org Type column
 * GAP-7: Time in Queue color coding
 */
export function OpenQueueTab() {
  const { data: entries, isLoading } = useOpenQueue();
  const { isSupervisor } = useAdminTier();
  const pinMutation = usePinQueueEntry();
  const [claimEntry, setClaimEntry] = useState<(typeof entries extends (infer T)[] | undefined ? T : never) | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Queue is empty</h3>
        <p className="text-muted-foreground mt-1">No unclaimed verifications at this time.</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>HQ Country</TableHead>
              <TableHead>Time in Queue</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <QueueRow
                key={entry.id}
                entry={entry}
                isSupervisor={isSupervisor}
                onPin={(isPinned) => pinMutation.mutate({ entryId: entry.id, isPinned })}
                onClaim={() => setClaimEntry(entry)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {claimEntry && (
        <ClaimConfirmationModal
          open={!!claimEntry}
          onOpenChange={(open) => !open && setClaimEntry(null)}
          entry={claimEntry}
        />
      )}
    </>
  );
}

function QueueRow({
  entry,
  isSupervisor,
  onPin,
  onClaim,
}: {
  entry: any;
  isSupervisor: boolean;
  onPin: (isPinned: boolean) => void;
  onClaim: () => void;
}) {
  const ver = entry.verification;
  const org = ver?.organization;

  // GAP-7: Color-coded time in queue
  const { timeText, timeColor } = useMemo(() => {
    const enteredMs = new Date(entry.entered_at).getTime();
    const hoursInQueue = (Date.now() - enteredMs) / 3600000;
    const text = formatDistanceToNow(new Date(entry.entered_at), { addSuffix: false });
    let color = 'text-muted-foreground';
    if (hoursInQueue >= 4) color = 'text-destructive font-medium';
    else if (hoursInQueue >= 2) color = 'text-amber-600 font-medium';
    return { timeText: text, timeColor: color };
  }, [entry.entered_at]);

  return (
    <TableRow>
      <TableCell className="w-8">
        {entry.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-600" />}
        {entry.is_critical && !entry.is_pinned && (
          <Badge variant="destructive" className="text-[10px] px-1">!</Badge>
        )}
      </TableCell>
      <TableCell className="font-medium">
        {org?.organization_name ?? 'Unknown'}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {org?.country?.name ?? '—'}
      </TableCell>
      <TableCell className={`text-sm ${timeColor}`}>
        {timeText}
      </TableCell>
      <TableCell>
        <SLAStatusBadge breachTier={ver?.sla_breach_tier ?? 'NONE'} />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
        {entry.fallback_reason ?? '—'}
      </TableCell>
      <TableCell className="text-right space-x-2">
        {isSupervisor && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPin(!entry.is_pinned)}
          >
            {entry.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </Button>
        )}
        <Button size="sm" onClick={onClaim}>
          Claim
        </Button>
      </TableCell>
    </TableRow>
  );
}
