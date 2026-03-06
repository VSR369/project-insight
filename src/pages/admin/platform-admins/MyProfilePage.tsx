/**
 * SCR-01-05: My Profile Page (self-service, read-only)
 * Enhanced: initials avatar, padlock icons, supervisor-only labels, leave dates display.
 */

import { useNavigate } from 'react-router-dom';
import { usePlatformAdminSelf } from '@/hooks/queries/usePlatformAdmins';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { AdminStatusBadge } from '@/components/admin/platform-admins/AdminStatusBadge';
import { WorkloadBar } from '@/components/admin/platform-admins/WorkloadBar';
import { ExpertiseTags } from '@/components/admin/platform-admins/ExpertiseTags';
import { InitialsAvatar } from '@/components/admin/platform-admins/InitialsAvatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Calendar, Lock } from 'lucide-react';
import { format } from 'date-fns';

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

  const isOnLeave = profile.availability_status === 'On_Leave';

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <InitialsAvatar name={profile.full_name} size="lg" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              My Profile
              {profile.is_supervisor && <Shield className="h-5 w-5 text-primary" />}
            </h1>
            <p className="text-muted-foreground">{profile.email}</p>
            {isOnLeave && profile.leave_start_date && (
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                On Leave: {format(new Date(profile.leave_start_date), 'dd MMM')}
                {profile.leave_end_date && ` – ${format(new Date(profile.leave_end_date), 'dd MMM yyyy')}`}
              </p>
            )}
          </div>
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
            <LockedRow label="Priority" value={String(profile.assignment_priority)} />
            {profile.leave_start_date && (
              <>
                <InfoRow label="Leave Start" value={format(new Date(profile.leave_start_date), 'dd MMM yyyy')} />
                <InfoRow label="Leave End" value={profile.leave_end_date ? format(new Date(profile.leave_end_date), 'dd MMM yyyy') : '—'} />
              </>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Expertise</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <p className="text-sm font-medium">Industry</p>
              </div>
              <ExpertiseTags ids={profile.industry_expertise} type="industry" max={10} />
              <p className="text-xs text-muted-foreground italic mt-1">Only a Supervisor can modify this field.</p>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <p className="text-sm font-medium">Country/Region</p>
              </div>
              <ExpertiseTags ids={profile.country_region_expertise ?? []} type="country" max={10} />
              <p className="text-xs text-muted-foreground italic mt-1">Only a Supervisor can modify this field.</p>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <p className="text-sm font-medium">Organization Types</p>
              </div>
              <ExpertiseTags ids={profile.org_type_expertise ?? []} type="org_type" max={10} />
              <p className="text-xs text-muted-foreground italic mt-1">Only a Supervisor can modify this field.</p>
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

function LockedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground flex items-center gap-1">
        <Lock className="h-3 w-3" /> {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
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
