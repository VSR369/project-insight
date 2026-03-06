/**
 * SCR-01-01: Platform Admin List Page
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatformAdmins, usePlatformAdminSelf } from '@/hooks/queries/usePlatformAdmins';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { AdminStatusBadge } from '@/components/admin/platform-admins/AdminStatusBadge';
import { WorkloadBar } from '@/components/admin/platform-admins/WorkloadBar';
import { ExpertiseTags } from '@/components/admin/platform-admins/ExpertiseTags';
import { ExecutiveContactWarningBanner } from '@/components/admin/platform-admins/ExecutiveContactWarningBanner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Eye, Pencil, Shield } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Available', label: 'Available' },
  { value: 'Partially_Available', label: 'Partially Available' },
  { value: 'Fully_Loaded', label: 'Fully Loaded' },
  { value: 'On_Leave', label: 'On Leave' },
  { value: 'Inactive', label: 'Inactive' },
];

function PlatformAdminListContent() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: admins, isLoading } = usePlatformAdmins(statusFilter);
  const { data: self } = usePlatformAdminSelf();
  const isSupervisor = self?.is_supervisor === true;

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
        <div>
          <h1 className="text-2xl font-bold">Platform Admins</h1>
          <p className="text-muted-foreground">Manage platform administrator profiles and availability.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
          {isSupervisor && (
            <Button onClick={() => navigate('/admin/platform-admins/new')}>
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden lg:inline">Add Admin</span>
            </Button>
          )}
        </div>
      </div>

      <ExecutiveContactWarningBanner />

      {!admins?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          No platform admins found.
        </div>
      ) : (
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Workload</TableHead>
                <TableHead>Industries</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.full_name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <AdminStatusBadge status={admin.availability_status} />
                  </TableCell>
                  <TableCell>
                    {admin.is_supervisor && <Shield className="h-4 w-4 text-primary" />}
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/platform-admins/${admin.id}`)}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isSupervisor && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/platform-admins/${admin.id}/edit`)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
