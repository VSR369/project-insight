/**
 * SolutionRequestsListPage — "My Requests" page listing solution requests
 * (challenges in Phase 1–2) for the user's org.
 * Route: /requests
 *
 * Features:
 * - Status / title search filters
 * - Cursor-based pagination (20 per page, Load More)
 * - Operating model badge, urgency badge, assigned architect
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Plus, FileInput, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useOrgModelContext } from '@/hooks/queries/useSolutionRequestContext';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE = 20;

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Submitted' },
  { value: 'COMPLETED', label: 'Approved' },
] as const;

const STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  ACTIVE: { label: 'Submitted', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
};

const URGENCY_BADGE_MAP: Record<string, { label: string; className: string }> = {
  standard: { label: 'Standard', className: 'bg-muted text-muted-foreground' },
  urgent: { label: 'Urgent', className: 'bg-amber-100 text-amber-700' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700' },
};

const MODEL_BADGE_MAP: Record<string, { label: string; className: string }> = {
  MP: { label: 'MP', className: 'bg-violet-100 text-violet-700' },
  AGG: { label: 'AGG', className: 'bg-sky-100 text-sky-700' },
};

// ============================================================================
// DATE FORMATTER
// ============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================================================
// TYPES
// ============================================================================

interface RequestRow {
  id: string;
  title: string;
  master_status: string;
  operating_model: string | null;
  current_phase: number | null;
  created_at: string;
  urgency: string;
  architect_name: string | null;
}

interface PageResult {
  rows: RequestRow[];
  nextCursor: string | null;
}

// ============================================================================
// HOOK: useMyRequests (cursor-based infinite query)
// ============================================================================

function useMyRequests(statusFilter: string, searchTerm: string) {
  const { data: currentOrg } = useCurrentOrg();
  const orgId = currentOrg?.organizationId;

  return useInfiniteQuery<PageResult>({
    queryKey: ['my-requests', orgId, statusFilter, searchTerm],
    queryFn: async ({ pageParam }): Promise<PageResult> => {
      if (!orgId) return { rows: [], nextCursor: null };

      let query = supabase
        .from('challenges')
        .select('id, title, master_status, current_phase, created_at, eligibility, operating_model')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .lte('current_phase', 2)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE + 1); // fetch one extra to detect next page

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('master_status', statusFilter);
      }

      if (searchTerm.trim()) {
        query = query.ilike('title', `%${searchTerm.trim()}%`);
      }

      // Cursor: use created_at of the last item
      if (pageParam) {
        query = query.lt('created_at', pageParam as string);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const items = data ?? [];
      const hasMore = items.length > PAGE_SIZE;
      const pageItems = hasMore ? items.slice(0, PAGE_SIZE) : items;
      const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.created_at : null;

      // Fetch architect names for these challenges
      const challengeIds = pageItems.map((c: any) => c.id);
      let architectMap: Record<string, string> = {};

      if (challengeIds.length > 0) {
        const { data: roles } = await supabase
          .from('user_challenge_roles')
          .select('challenge_id, user_id')
          .in('challenge_id', challengeIds)
          .eq('role_code', 'CR')
          .eq('is_active', true)
          .limit(200);

        if (roles && roles.length > 0) {
          const userIds = [...new Set(roles.map((r: any) => r.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', userIds);

          const profileMap: Record<string, string> = {};
          (profiles ?? []).forEach((p: any) => {
            const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
            profileMap[p.id] = fullName || p.email || 'Unknown';
          });

          roles.forEach((r: any) => {
            architectMap[r.challenge_id] = profileMap[r.user_id] || 'Assigned';
          });
        }
      }

      const rows: RequestRow[] = pageItems.map((c: any) => {
        // Parse urgency from eligibility JSON
        let urgency = 'standard';
        try {
          const elig = typeof c.eligibility === 'string' ? JSON.parse(c.eligibility) : c.eligibility;
          if (elig?.urgency) urgency = elig.urgency;
        } catch {
          // ignore parse errors
        }

        return {
          id: c.id,
          title: c.title,
          master_status: c.master_status ?? 'DRAFT',
          operating_model: c.operating_model ?? null,
          current_phase: c.current_phase,
          created_at: c.created_at,
          urgency,
          architect_name: architectMap[c.id] ?? null,
        };
      });

      return { rows, nextCursor };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!orgId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function SolutionRequestsListPage() {
  const navigate = useNavigate();

  // ── State ──
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // ── Hooks ──
  const { data: orgContext, isLoading: orgLoading } = useOrgModelContext();
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyRequests(statusFilter, searchTerm);

  const allRows = useMemo(
    () => data?.pages.flatMap((p) => p.rows) ?? [],
    [data],
  );

  const isMP = orgContext?.operatingModel === 'MP';

  // ── Loading state ──
  if (isLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 px-4">
        <div className="max-w-[960px] mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 flex-1" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const isEmpty = !error && allRows.length === 0;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-[960px] mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-primary">My Requests</h1>
          <Button onClick={() => navigate('/requests/new')} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Request
          </Button>
        </div>

        {/* ── Filters ── */}
        {!isEmpty && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title…"
                className="pl-9"
              />
            </div>
          </div>
        )}

        {/* ── Error state ── */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4 text-sm text-destructive">
              Failed to load requests: {(error as Error).message}
            </CardContent>
          </Card>
        )}

        {/* ── Empty state ── */}
        {isEmpty && (
          <Card className="rounded-xl border-border shadow-sm">
            <CardContent className="p-16 text-center space-y-3">
              <FileInput className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="text-base font-semibold text-foreground">
                No solution requests yet
              </h3>
              <p className="text-[13px] text-muted-foreground">
                Submit your first request to get started.
              </p>
              <Button
                onClick={() => navigate('/requests/new')}
                size="sm"
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Request
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Table ── */}
        {allRows.length > 0 && (
          <Card className="rounded-xl border-border shadow-sm">
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Title</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[80px]">Model</TableHead>
                    <TableHead className="w-[120px]">Created</TableHead>
                    <TableHead className="w-[100px]">Urgency</TableHead>
                    <TableHead className="w-[150px]">Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRows.map((req) => {
                    const status =
                      STATUS_BADGE_MAP[req.master_status] ??
                      STATUS_BADGE_MAP.DRAFT;
                    const urgency =
                      URGENCY_BADGE_MAP[req.urgency] ??
                      URGENCY_BADGE_MAP.standard;
                    const model = req.operating_model
                      ? MODEL_BADGE_MAP[req.operating_model]
                      : null;

                    const assignedTo =
                      req.architect_name ??
                      (req.operating_model === 'AGG' ? 'Self' : '—');

                    return (
                      <TableRow
                        key={req.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => navigate(`/org/challenges/${req.id}`)}
                      >
                        <TableCell className="font-medium text-sm text-primary">
                          {req.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px]', status.className)}
                          >
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {model ? (
                            <Badge
                              variant="secondary"
                              className={cn('text-[10px]', model.className)}
                            >
                              {model.label}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(req.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px]', urgency.className)}
                          >
                            {urgency.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {assignedTo}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Load More */}
            {hasNextPage && (
              <div className="flex justify-center py-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="gap-2"
                >
                  {isFetchingNextPage && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Load More
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* No results for active filter */}
        {!isEmpty &&
          allRows.length === 0 &&
          (statusFilter !== 'all' || searchTerm.trim()) && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No requests match your current filters.
            </p>
          )}
      </div>
    </div>
  );
}
