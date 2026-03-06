/**
 * SCR-01-04: View Platform Admin Page (Tabbed)
 * Enhanced: initials avatar, phone in header, updated DeactivateAdminModal props.
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePlatformAdminProfile } from '@/hooks/queries/usePlatformAdmins';
import { usePlatformAdminAuditLog } from '@/hooks/queries/usePlatformAdminAuditLog';
import { useAdminTier } from '@/hooks/useAdminTier';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { AdminStatusBadge } from '@/components/admin/platform-admins/AdminStatusBadge';
import { WorkloadBar } from '@/components/admin/platform-admins/WorkloadBar';
import { ExpertiseTags } from '@/components/admin/platform-admins/ExpertiseTags';
import { InitialsAvatar } from '@/components/admin/platform-admins/InitialsAvatar';
import { DeactivateAdminModal } from '@/components/admin/platform-admins/DeactivateAdminModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Shield, ArrowLeft, UserX, Phone } from 'lucide-react';
import { format } from 'date-fns';

const TIER_LABELS: Record<string, string> = {
  supervisor: 'Supervisor',
  senior_admin: 'Senior Admin',
  admin: 'Admin',
};

function ViewContent() {
  const { adminId } = useParams<{ adminId: string }>();
  const navigate = useNavigate();
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [auditPage, setAuditPage] = useState(1);

  const { data: admin, isLoading } = usePlatformAdminProfile(adminId);
  const { isSupervisor } = useAdminTier();
  const { data: auditData, isLoading: auditLoading } = usePlatformAdminAuditLog(adminId, auditPage);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!admin) {
    return <div className="text-center py-12 text-muted-foreground">Admin not found.</div>;
  }

  const adminTier = (admin as any).admin_tier || (admin.is_supervisor ? 'supervisor' : 'admin');

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/platform-admins')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <InitialsAvatar name={admin.full_name} size="lg" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {admin.full_name}
              {admin.is_supervisor && <Shield className="h-5 w-5 text-primary" />}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-muted-foreground">{admin.email}</p>
              {admin.phone && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" /> {admin.phone}
                </span>
              )}
              <Badge variant="outline" className="capitalize text-xs">
                {TIER_LABELS[adminTier] || 'Admin'}
              </Badge>
            </div>
          </div>
        </div>
        {isSupervisor && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/admin/platform-admins/${admin.id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            {admin.availability_status !== 'Inactive' && (
              <Button variant="destructive" onClick={() => setDeactivateOpen(true)}>
                <UserX className="mr-2 h-4 w-4" />
                Deactivate
              </Button>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="assignments">Assignment Log</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>General Info</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Phone" value={admin.phone || '—'} />
                <InfoRow label="Status">
                  <AdminStatusBadge status={admin.availability_status} />
                </InfoRow>
                <InfoRow label="Tier" value={TIER_LABELS[adminTier] || 'Admin'} />
                <InfoRow label="Supervisor" value={admin.is_supervisor ? 'Yes' : 'No'} />
                <InfoRow label="Priority" value={String(admin.assignment_priority)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Workload</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Workload">
                  <WorkloadBar current={admin.current_active_verifications} max={admin.max_concurrent_verifications} />
                </InfoRow>
                <InfoRow label="Max Verifications" value={String(admin.max_concurrent_verifications)} />
                {admin.leave_start_date && (
                  <>
                    <InfoRow label="Leave Start" value={admin.leave_start_date} />
                    <InfoRow label="Leave End" value={admin.leave_end_date || '—'} />
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Expertise</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Industry</p>
                  <ExpertiseTags ids={admin.industry_expertise} type="industry" max={10} />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Country/Region</p>
                  <ExpertiseTags ids={admin.country_region_expertise ?? []} type="country" max={10} />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Organization Types</p>
                  <ExpertiseTags ids={admin.org_type_expertise ?? []} type="org_type" max={10} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="text-lg font-medium">Coming in MOD-02</p>
              <p className="text-sm">Assignment log will be available when the auto-assignment engine is built.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Audit Log</CardTitle></CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !auditData?.data?.length ? (
                <p className="text-center py-8 text-muted-foreground">No audit entries found.</p>
              ) : (
                <>
                  <div className="relative w-full overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Field</TableHead>
                          <TableHead>Old Value</TableHead>
                          <TableHead>New Value</TableHead>
                          <TableHead>Actor</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditData.data.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <Badge variant="outline">{entry.event_type}</Badge>
                            </TableCell>
                            <TableCell>{entry.field_changed || '—'}</TableCell>
                            <TableCell className="max-w-32 truncate text-xs">
                              {entry.old_value ? JSON.stringify(entry.old_value) : '—'}
                            </TableCell>
                            <TableCell className="max-w-32 truncate text-xs">
                              {entry.new_value ? JSON.stringify(entry.new_value) : '—'}
                            </TableCell>
                            <TableCell>{entry.actor_type || '—'}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {auditData.total > auditData.pageSize && (
                    <div className="flex justify-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={auditPage === 1}
                        onClick={() => setAuditPage((p) => p - 1)}
                      >
                        Previous
                      </Button>
                      <span className="flex items-center text-sm text-muted-foreground">
                        Page {auditPage} of {Math.ceil(auditData.total / auditData.pageSize)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={auditPage >= Math.ceil(auditData.total / auditData.pageSize)}
                        onClick={() => setAuditPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="text-lg font-medium">Coming in MOD-05</p>
              <p className="text-sm">Performance metrics dashboard will be available in a future module.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeactivateAdminModal
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        adminId={admin.id}
        adminName={admin.full_name}
        adminEmail={admin.email}
        adminStatus={admin.availability_status}
        currentVerifications={admin.current_active_verifications}
        maxVerifications={admin.max_concurrent_verifications}
        pendingVerifications={admin.current_active_verifications}
        isSupervisor={admin.is_supervisor}
      />
    </div>
  );
}

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children || <span className="text-sm font-medium">{value}</span>}
    </div>
  );
}

export default function ViewPlatformAdminPage() {
  return (
    <FeatureErrorBoundary featureName="View Platform Admin">
      <ViewContent />
    </FeatureErrorBoundary>
  );
}
