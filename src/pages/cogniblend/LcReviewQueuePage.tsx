/**
 * LcReviewQueuePage — Dashboard for Legal Coordinator (LC) role.
 * Route: /cogni/legal-review
 *
 * Lists pending legal_review_requests assigned to the current user,
 * with challenge title, requester, date, status. Each row links to
 * the full review panel.
 */

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileCheck, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CACHE_FREQUENT } from '@/config/queryCache';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/* ─── Types ─────────────────────────────────────────────── */

interface ReviewQueueItem {
  id: string;
  challengeId: string;
  challengeTitle: string;
  documentType: string | null;
  tier: string | null;
  requestedBy: string;
  requestedAt: string;
  status: string;
  isMandatory: boolean;
  notes: string | null;
}

/* ─── Hook ──────────────────────────────────────────────── */

function useLcReviewQueue() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['lc-review-queue', user?.id],
    queryFn: async (): Promise<ReviewQueueItem[]> => {
      if (!user?.id) return [];

      // Fetch review requests where this user is the LC
      const { data: requests, error } = await supabase
        .from('legal_review_requests' as any)
        .select('id, challenge_id, document_id, requested_by, requested_at, status, is_mandatory, notes')
        .eq('lc_user_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) throw new Error(error.message);
      if (!requests || requests.length === 0) return [];

      // Get challenge titles
      const challengeIds = [...new Set((requests as any[]).map((r: any) => r.challenge_id))];
      const { data: challenges } = await supabase
        .from('challenges')
        .select('id, title')
        .in('id', challengeIds);

      const challengeMap = new Map((challenges ?? []).map((c) => [c.id, c.title]));

      // Get document details for requests with specific document_id
      const docIds = (requests as any[]).filter((r: any) => r.document_id).map((r: any) => r.document_id);
      let docMap = new Map<string, { document_type: string; tier: string }>();
      if (docIds.length > 0) {
        const { data: docs } = await supabase
          .from('challenge_legal_docs')
          .select('id, document_type, tier')
          .in('id', docIds);
        docMap = new Map((docs ?? []).map((d) => [d.id, { document_type: d.document_type, tier: d.tier }]));
      }

      return (requests as any[]).map((r: any) => {
        const doc = r.document_id ? docMap.get(r.document_id) : null;
        return {
          id: r.id,
          challengeId: r.challenge_id,
          challengeTitle: challengeMap.get(r.challenge_id) ?? 'Untitled Challenge',
          documentType: doc?.document_type ?? null,
          tier: doc?.tier ?? null,
          requestedBy: r.requested_by,
          requestedAt: r.requested_at,
          status: r.status,
          isMandatory: r.is_mandatory,
          notes: r.notes,
        };
      });
    },
    enabled: !!user?.id,
    ...CACHE_FREQUENT,
  });
}

/* ─── Status badge ──────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
          <Clock className="h-3 w-3 mr-1" /> Pending
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="outline" className="border-muted bg-muted/50 text-muted-foreground">
          <XCircle className="h-3 w-3 mr-1" /> Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

/* ─── Page component ────────────────────────────────────── */

export default function LcReviewQueuePage() {
  const navigate = useNavigate();
  const { data: items, isLoading, error } = useLcReviewQueue();

  const pendingCount = items?.filter((i) => i.status === 'pending').length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <FileCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Legal Review Queue</h1>
          {pendingCount > 0 && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300">
              {pendingCount} pending
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1">
          Review and approve legal documents for challenges assigned to you.
        </p>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load review queue. Please try again.
            </div>
          ) : !items || items.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No review requests</p>
              <p className="text-sm text-muted-foreground mt-1">
                You'll see requests here when Challenge Creators send legal documents for your review.
              </p>
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Challenge</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {item.challengeTitle}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.documentType ?? 'All documents'}
                      </TableCell>
                      <TableCell>
                        {item.isMandatory ? (
                          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                            Mandatory
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Ad-hoc
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(item.requestedAt), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={item.status === 'pending' ? 'default' : 'outline'}
                          onClick={() => navigate(`/cogni/legal-review/${item.challengeId}?requestId=${item.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          {item.status === 'pending' ? 'Review' : 'View'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
