/**
 * SolutionRequestsListPage — Lists all solution requests (challenges)
 * for the user's org. Route: /requests
 */

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useOrgModelContext } from '@/hooks/queries/useSolutionRequestContext';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/* ── Status badge map ─────────────────────────────────── */

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Completed', className: 'bg-blue-100 text-blue-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
};

/* ── Data hook ────────────────────────────────────────── */

interface OrgRequest {
  id: string;
  title: string;
  master_status: string;
  current_phase: number | null;
  created_at: string;
  architect_name: string | null;
}

function useOrgSolutionRequests() {
  const { data: currentOrg } = useCurrentOrg();
  const orgId = currentOrg?.organizationId;

  return useQuery({
    queryKey: ['org-solution-requests', orgId],
    queryFn: async (): Promise<OrgRequest[]> => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('challenges')
        .select('id, title, master_status, current_phase, created_at')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw new Error(error.message);

      // Fetch assigned CR users for each challenge
      const challengeIds = (data ?? []).map((c: any) => c.id);
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
            .select('id, display_name, email')
            .in('id', userIds);

          const profileMap: Record<string, string> = {};
          (profiles ?? []).forEach((p: any) => {
            profileMap[p.id] = p.display_name || p.email || 'Unknown';
          });

          roles.forEach((r: any) => {
            architectMap[r.challenge_id] = profileMap[r.user_id] || 'Assigned';
          });
        }
      }

      return (data ?? []).map((c: any) => ({
        id: c.id,
        title: c.title,
        master_status: c.master_status ?? 'DRAFT',
        current_phase: c.current_phase,
        created_at: c.created_at,
        architect_name: architectMap[c.id] ?? null,
      }));
    },
    enabled: !!orgId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/* ── Page Component ───────────────────────────────────── */

export default function SolutionRequestsListPage() {
  const navigate = useNavigate();
  const { data: orgContext } = useOrgModelContext();
  const { data: requests, isLoading, error } = useOrgSolutionRequests();

  const isMP = orgContext?.operatingModel === 'MP';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 px-4">
        <div className="max-w-[900px] mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-[900px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-primary">
            Solution Requests
          </h1>
          <Button onClick={() => navigate('/requests/new')} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Request
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4 text-sm text-destructive">
              Failed to load requests: {(error as Error).message}
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!error && (!requests || requests.length === 0) && (
          <Card className="rounded-xl border-border shadow-sm">
            <CardContent className="p-12 text-center space-y-3">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="text-base font-semibold text-foreground">No requests yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first solution request to get started.
              </p>
              <Button onClick={() => navigate('/requests/new')} size="sm" className="mt-2">
                <Plus className="h-4 w-4 mr-1" />
                New Request
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        {requests && requests.length > 0 && (
          <Card className="rounded-xl border-border shadow-sm">
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Title</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[80px]">Phase</TableHead>
                    {isMP && <TableHead className="w-[160px]">Architect</TableHead>}
                    <TableHead className="w-[120px]">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map(req => {
                    const status = STATUS_MAP[req.master_status] ?? STATUS_MAP.DRAFT;
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
                          <Badge variant="secondary" className={`text-[10px] ${status.className}`}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {req.current_phase ?? '—'}
                        </TableCell>
                        {isMP && (
                          <TableCell className="text-sm text-muted-foreground">
                            {req.architect_name ?? '—'}
                          </TableCell>
                        )}
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
