/**
 * SCR-01-01: Platform Admin List Page
 * Enhanced: count badge, assignment priority, last assignment, deactivate action,
 * row click nav, pagination (20 default, 50 max), improved empty state.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatformAdmins } from '@/hooks/queries/usePlatformAdmins';
import { useAdminTier } from '@/hooks/useAdminTier';
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
import { Plus, Eye, Pencil, Shield, UserX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Available', label: 'Available' },
  { value: 'Partially_Available', label: 'Partially Available' },
  { value: 'Fully_Loaded', label: 'Fully Loaded' },
  { value: 'On_Leave', label: 'On Leave' },
  { value: 'Inactive', label: 'Inactive' },
];

const TIER_LABELS: Record<string, string> = {
  supervisor: 'Supervisor',
  senior_admin: 'Senior Admin',
  admin: 'Admin',
};

const PAGE_SIZE = 20;

function PlatformAdminListContent() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [deactivateTarget, setDeactivateTarget] = useState<any>(null);

  const { data: admins, isLoading } = usePlatformAdmins(statusFilter);
  const { isSupervisor, isSeniorAdmin } = useAdminTier();
  const canCreate = isSupervisor || isSeniorAdmin;
  const canEdit = isSupervisor || isSeniorAdmin;

  const totalCount = admins?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedAdmins = useMemo(() => {
    if (!admins) return [];
    const start = (page - 1) * PAGE_SIZE;
    return admins.slice(start, start + PAGE_SIZE);
  }, [admins, page]);

  // Reset page when filter changes
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Platform Admins</h1>
          <Badge variant="secondary" className="text-sm">{totalCount}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canCreate && (
            <Button onClick={() => navigate('/admin/platform-admins/new')}>
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden lg:inline">Add Admin</span>
            </Button>
          )}
        </div>
      </div>

      <ExecutiveContactWarningBanner />

      {!admins?.length ? (
        <div className="text-center py-12 text-muted-foreground space-y-3">
          <p>No platform admins found.</p>
          {canCreate && (
            <Button variant="outline" onClick={() => navigate('/admin/platform-admins/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add your first admin
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Workload</TableHead>
                  <TableHead>Last Assignment</TableHead>
                  <TableHead>Industries</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAdmins.map((admin) => (
                  <TableRow
                    key={admin.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/platform-admins/${admin.id}`)}
                  >
                    <TableCell className="font-medium">{admin.full_name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {TIER_LABELS[(admin as any).admin_tier] || 'Admin'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge status={admin.availability_status} />
                    </TableCell>
                    <TableCell>
                      {admin.is_supervisor && <Shield className="h-4 w-4 text-primary" />}
                    </TableCell>
                    <TableCell>
                      <AssignmentPriorityBadge priority={admin.assignment_priority} />
                    </TableCell>
                    <TableCell>
                      <WorkloadBar
                        current={admin.current_active_verifications}
                        max={admin.max_concurrent_verifications}
                      />
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
                    <TableCell>
                      <ExpertiseTags ids={admin.industry_expertise} type="industry" max={2} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/platform-admins/${admin.id}`)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
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
