/**
 * SCR-01-01: Platform Admin List Page
 * Figma-aligned: combined name/email column, tier filter, uppercase headers,
 * redesigned pagination, updated labels.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatformAdmins } from '@/hooks/queries/usePlatformAdmins';
import { useAdminTier } from '@/hooks/useAdminTier';
import { usePlatformTierDepth } from '@/hooks/queries/useTierDepthConfig';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { AdminStatusBadge } from '@/components/admin/platform-admins/AdminStatusBadge';
import { WorkloadBar } from '@/components/admin/platform-admins/WorkloadBar';
import { ExpertiseTags } from '@/components/admin/platform-admins/ExpertiseTags';
import { AssignmentPriorityBadge } from '@/components/admin/platform-admins/AssignmentPriorityBadge';
import { ExecutiveContactWarningBanner } from '@/components/admin/platform-admins/ExecutiveContactWarningBanner';
import { DeactivateAdminModal } from '@/components/admin/platform-admins/DeactivateAdminModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Available', label: 'Available' },
  { value: 'Partially_Available', label: 'Partially Available' },
  { value: 'Fully_Loaded', label: 'Fully Loaded' },
  { value: 'On_Leave', label: 'On Leave' },
  { value: 'Inactive', label: 'Inactive' },
];

const TIER_OPTIONS = [
  { value: 'all', label: 'All Tiers' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'senior_admin', label: 'Senior Admin' },
  { value: 'admin', label: 'Admin' },
];

const PAGE_SIZE = 20;

const HEAD_CLASS = 'uppercase text-xs tracking-wider';

const TIER_LABELS: Record<string, string> = {
  supervisor: 'Supervisor',
  senior_admin: 'Senior Admin',
  admin: 'Admin',
};

function PlatformAdminListContent() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [deactivateTarget, setDeactivateTarget] = useState<any>(null);

  const { data: admins, isLoading } = usePlatformAdmins(statusFilter);
  const { isSupervisor, isSeniorAdmin } = useAdminTier();
  const { depth } = usePlatformTierDepth();
  const effectiveSupervisor = isSupervisor || depth === 1;
  const canCreate = effectiveSupervisor || isSeniorAdmin;
  const canEdit = effectiveSupervisor || isSeniorAdmin;

  // Filter tier options based on depth
  const activeTierOptions = TIER_OPTIONS.filter((opt) => {
    if (opt.value === 'all') return true;
    if (depth === 1) return opt.value === 'supervisor';
    if (depth === 2) return opt.value !== 'admin';
    return true;
  });

  // Apply tier filter client-side
  const filteredAdmins = useMemo(() => {
    if (!admins) return [];
    if (tierFilter === 'all') return admins;
    return admins.filter((a: any) => a.admin_tier === tierFilter);
  }, [admins, tierFilter]);

  const totalCount = filteredAdmins.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedAdmins = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAdmins.slice(start, start + PAGE_SIZE);
  }, [filteredAdmins, page]);

  const showingFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, totalCount);

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Platform Admins</h1>
          <Badge variant="secondary" className="text-sm">{totalCount}</Badge>
        </div>
        <div className="flex items-center gap-3">
          {isSupervisor && (
            <Select value={tierFilter} onValueChange={handleFilterChange(setTierFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                {TIER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canCreate && (
            <Button onClick={() => navigate('/admin/platform-admins/new')}>
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden lg:inline">Add Platform Admin</span>
            </Button>
          )}
        </div>
      </div>

      <ExecutiveContactWarningBanner />

      {!filteredAdmins.length ? (
        <div className="text-center py-12 text-muted-foreground space-y-3">
          <p>No platform admins found.</p>
          {canCreate && (
            <Button variant="outline" onClick={() => navigate('/admin/platform-admins/new')}>
              <Plus className="mr-2 h-4 w-4" /> Add your first admin
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={HEAD_CLASS}>Full Name</TableHead>
                  {tierFilter === 'all' && <TableHead className={HEAD_CLASS}>Tier</TableHead>}
                  <TableHead className={HEAD_CLASS}>Availability Status</TableHead>
                  <TableHead className={HEAD_CLASS}>Workload</TableHead>
                  <TableHead className={HEAD_CLASS}>Industry Expertise</TableHead>
                  <TableHead className={HEAD_CLASS}>Priority</TableHead>
                  <TableHead className={HEAD_CLASS}>Last Assignment</TableHead>
                  <TableHead className={`${HEAD_CLASS} text-right`}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAdmins.map((admin) => (
                  <TableRow
                    key={admin.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/platform-admins/${admin.id}`)}
                  >
                    {/* Full Name + Email stacked */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{admin.full_name}</span>
                        <span className="text-xs text-muted-foreground">{admin.email}</span>
                      </div>
                    </TableCell>
                    {tierFilter === 'all' && (
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-medium">
                          {TIER_LABELS[(admin as any).admin_tier] ?? (admin as any).admin_tier}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <AdminStatusBadge status={admin.availability_status} />
                    </TableCell>
                    <TableCell>
                      <WorkloadBar
                        current={admin.current_active_verifications}
                        max={admin.max_concurrent_verifications}
                      />
                    </TableCell>
                    <TableCell>
                      <ExpertiseTags ids={admin.industry_expertise} type="industry" max={2} />
                    </TableCell>
                    <TableCell>
                      <AssignmentPriorityBadge priority={admin.assignment_priority} />
                    </TableCell>
                    <TableCell>
                      {admin.last_assignment_timestamp ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(admin.last_assignment_timestamp), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Never assigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {canEdit && (isSupervisor || (admin as any).admin_tier === 'admin') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/admin/platform-admins/${admin.id}/edit`)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {isSupervisor && admin.availability_status !== 'Inactive' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeactivateTarget(admin)}
                            title="Deactivate"
                          >
                            <UserX className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col lg:flex-row justify-between items-center gap-2 pt-2">
            <span className="text-sm text-muted-foreground">
              Showing {showingFrom} to {showingTo} of {totalCount} results
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {deactivateTarget && (
        <DeactivateAdminModal
          open={!!deactivateTarget}
          onOpenChange={(open) => !open && setDeactivateTarget(null)}
          adminId={deactivateTarget.id}
          adminName={deactivateTarget.full_name}
          adminEmail={deactivateTarget.email}
          adminStatus={deactivateTarget.availability_status}
          currentVerifications={deactivateTarget.current_active_verifications}
          maxVerifications={deactivateTarget.max_concurrent_verifications}
          pendingVerifications={deactivateTarget.current_active_verifications}
          isSupervisor={deactivateTarget.is_supervisor}
        />
      )}
    </div>
  );
}

export default function PlatformAdminListPage() {
  return (
    <FeatureErrorBoundary featureName="Platform Admin List">
      <PlatformAdminListContent />
    </FeatureErrorBoundary>
  );
}
