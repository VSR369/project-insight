/**
 * CommunicationsPage — Admin view for flagged communication logs.
 * Shows flagged Q&A/notification messages with approve/block actions.
 */

import { format } from 'date-fns';
import { ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useFlaggedCommunications,
  useReviewCommunication,
} from '@/hooks/admin/useCommunicationLog';

export default function CommunicationsPage() {
  const { data: logs = [], isLoading } = useFlaggedCommunications();
  const reviewMutation = useReviewCommunication();

  const pending = logs.filter((l) => !l.review_action);
  const reviewed = logs.filter((l) => !!l.review_action);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-6 w-6 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">Flagged Communications</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Messages flagged for containing contact information patterns (email, phone, URLs).
      </p>

      {/* Pending Review */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Pending Review ({pending.length})
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4">
            No flagged messages pending review.
          </p>
        ) : (
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Flag Reason</TableHead>
                  <TableHead className="max-w-xs">Message</TableHead>
                  <TableHead>Sender ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((log) => (
                  <TableRow key={log.log_id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(log.logged_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="text-xs">
                        {log.flag_reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      {log.message_text}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {log.sender_id.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reviewMutation.isPending}
                          onClick={() =>
                            reviewMutation.mutate({ logId: log.log_id, action: 'APPROVED' })
                          }
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={reviewMutation.isPending}
                          onClick={() =>
                            reviewMutation.mutate({ logId: log.log_id, action: 'BLOCKED' })
                          }
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Block
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Reviewed ({reviewed.length})
          </h2>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="max-w-xs">Message</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Reviewed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewed.map((log) => (
                  <TableRow key={log.log_id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(log.logged_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      {log.message_text}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={log.review_action === 'APPROVED' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {log.review_action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {log.reviewed_at
                        ? format(new Date(log.reviewed_at), 'MMM d, yyyy HH:mm')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
