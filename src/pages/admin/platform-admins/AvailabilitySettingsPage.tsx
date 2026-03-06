/**
 * SCR-01-06: Availability Settings Page (self-service)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatformAdminSelf } from '@/hooks/queries/usePlatformAdmins';
import { useUpdateAvailability } from '@/hooks/mutations/usePlatformAdminMutations';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { AdminStatusBadge } from '@/components/admin/platform-admins/AdminStatusBadge';
import { LeaveConfirmationModal } from '@/components/admin/platform-admins/LeaveConfirmationModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';

function AvailabilityContent() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = usePlatformAdminSelf();
  const updateAvailability = useUpdateAvailability();

  const [status, setStatus] = useState<string>('');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  // Initialize from profile when loaded
  useState(() => {
    if (profile) {
      setStatus(profile.availability_status);
      setLeaveStart(profile.leave_start_date || '');
      setLeaveEnd(profile.leave_end_date || '');
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-lg">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-12 text-muted-foreground">No admin profile found.</div>;
  }

  const effectiveStatus = status || profile.availability_status;
  const isOnLeave = effectiveStatus === 'On_Leave';

  const handleSave = () => {
    if (isOnLeave) {
      setLeaveModalOpen(true);
    } else {
      doSave();
    }
  };

  const doSave = async () => {
    await updateAvailability.mutateAsync({
      availability_status: effectiveStatus,
      leave_start_date: isOnLeave ? leaveStart : null,
      leave_end_date: isOnLeave ? leaveEnd : null,
    });
    navigate('/admin/my-profile');
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/my-profile')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Availability Settings</h1>
          <p className="text-muted-foreground">Update your availability status.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current Status: <AdminStatusBadge status={profile.availability_status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>New Status</Label>
            <Select value={effectiveStatus} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="On_Leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isOnLeave && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Leave Start Date</Label>
                <Input
                  type="date"
                  value={leaveStart}
                  onChange={(e) => setLeaveStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Leave End Date</Label>
                <Input
                  type="date"
                  value={leaveEnd}
                  onChange={(e) => setLeaveEnd(e.target.value)}
                  min={leaveStart}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate('/admin/my-profile')}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateAvailability.isPending || (isOnLeave && (!leaveStart || !leaveEnd))}
            >
              {updateAvailability.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <LeaveConfirmationModal
        open={leaveModalOpen}
        onOpenChange={setLeaveModalOpen}
        leaveStart={leaveStart}
        leaveEnd={leaveEnd}
        onConfirm={doSave}
        isLoading={updateAvailability.isPending}
      />
    </div>
  );
}

export default function AvailabilitySettingsPage() {
  return (
    <FeatureErrorBoundary featureName="Availability Settings">
      <AvailabilityContent />
    </FeatureErrorBoundary>
  );
}
