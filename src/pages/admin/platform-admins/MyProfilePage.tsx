/**
 * SCR-01-05: My Profile Page (self-service, read-only)
 */

import { useNavigate } from 'react-router-dom';
import { usePlatformAdminSelf } from '@/hooks/queries/usePlatformAdmins';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { AdminStatusBadge } from '@/components/admin/platform-admins/AdminStatusBadge';
import { WorkloadBar } from '@/components/admin/platform-admins/WorkloadBar';
import { ExpertiseTags } from '@/components/admin/platform-admins/ExpertiseTags';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Calendar } from 'lucide-react';

function MyProfileContent() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = usePlatformAdminSelf();

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No admin profile found. Contact your supervisor.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            My Profile
            {profile.is_supervisor && <Shield className="h-5 w-5 text-primary" />}
          </h1>
          <p className="text-muted-foreground">{profile.email}</p>
        </div>
        <Button onClick={() => navigate('/admin/availability')}>
          <Calendar className="mr-2 h-4 w-4" />
          Update Availability
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>General Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Full Name" value={profile.full_name} />
            <InfoRow label="Email" value={profile.email} />
            <InfoRow label="Phone" value={profile.phone || '—'} />
            <InfoRow label="Role" value={profile.is_supervisor ? 'Supervisor' : 'Admin'} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Availability & Workload</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Status">
              <AdminStatusBadge status={profile.availability_status} />
            </InfoRow>
            <InfoRow label="Workload">
              <WorkloadBar current={profile.current_active_verifications} max={profile.max_concurrent_verifications} />
            </InfoRow>
            <InfoRow label="Priority" value={String(profile.assignment_priority)} />
            {profile.leave_start_date && (
              <>
                <InfoRow label="Leave Start" value={profile.leave_start_date} />
                <InfoRow label="Leave End" value={profile.leave_end_date || '—'} />
              </>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Expertise</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Industry</p>
              <ExpertiseTags ids={profile.industry_expertise} type="industry" max={10} />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Country/Region</p>
              <ExpertiseTags ids={profile.country_region_expertise ?? []} type="country" max={10} />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Organization Types</p>
              <ExpertiseTags ids={profile.org_type_expertise ?? []} type="org_type" max={10} />
            </div>
          </CardContent>
        </Card>
      </div>
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

export default function MyProfilePage() {
  return (
    <FeatureErrorBoundary featureName="My Profile">
      <MyProfileContent />
    </FeatureErrorBoundary>
  );
}
