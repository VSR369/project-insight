/**
 * SCR-01-06: Availability Settings Page (self-service)
 * Fixed: useState bug → useEffect, added BR-MPA-001, leave banners, min-date.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatformAdminSelf } from '@/hooks/queries/usePlatformAdmins';
import { useUpdateAvailability } from '@/hooks/mutations/usePlatformAdminMutations';
import { useAvailableAdminCounts } from '@/hooks/queries/useAvailableAdminCounts';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { AdminStatusBadge } from '@/components/admin/platform-admins/AdminStatusBadge';
import { LeaveConfirmationModal } from '@/components/admin/platform-admins/LeaveConfirmationModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';

function AvailabilityContent() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = usePlatformAdminSelf();
  const updateAvailability = useUpdateAvailability();
  const { data: counts } = useAvailableAdminCounts();

  const [status, setStatus] = useState<string>('');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  // Initialize from profile when loaded (fixed: was using useState incorrectly)
  useEffect(() => {
    if (profile) {
      setStatus(profile.availability_status);
      setLeaveStart(profile.leave_start_date || '');
      setLeaveEnd(profile.leave_end_date || '');
    }
  }, [profile]);

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

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
  const isRestoring = profile.availability_status === 'On_Leave' && effectiveStatus === 'Available';

  // BR-MPA-001: last available admin cannot go on leave
  const isLastAvailable = profile.availability_status === 'Available' && (counts?.availableCount ?? 2) <= 1;
  const blockLeave = isLastAvailable && isOnLeave;

  // Determine leave variant
  const leaveVariant = isRestoring ? 'restore' as const
    : (leaveStart === today ? 'immediate' as const : 'scheduled' as const);

  // Determine if leave is immediate or scheduled
  const isImmediate = leaveStart <= today;

  const handleSave = () => {
    if (isOnLeave || isRestoring) {
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

      {/* Active verification count info card */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          You currently have <strong>{profile.current_active_verifications}</strong> active verification(s)
          out of a maximum of {profile.max_concurrent_verifications}.
        </AlertDescription>
      </Alert>

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

          {/* BR-MPA-001 block */}
          {blockLeave && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You are the last Available admin. At least one admin must remain Available.
                Going on leave is blocked until another admin becomes available.
              </AlertDescription>
            </Alert>
          )}

          {isOnLeave && !blockLeave && (
            <>
              {/* Immediate vs Scheduled banner */}
              {leaveStart && (
                isImmediate ? (
                  <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Immediate leave:</strong> Your leave starts today. Pending verifications will need to be reassigned.
                    </AlertDescription>
                  </Alert>
                ) : leaveStart > today ? (
                  <Alert className="border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Scheduled leave:</strong> You will continue receiving assignments until {leaveStart}.
                    </AlertDescription>
                  </Alert>
                ) : null
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Leave Start Date</Label>
                  <Input
                    type="date"
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    min={today}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Leave End Date</Label>
                  <Input
                    type="date"
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    min={leaveStart || today}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate('/admin/my-profile')}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateAvailability.isPending || blockLeave || (isOnLeave && (!leaveStart || !leaveEnd))}
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
        variant={leaveVariant}
        leaveStart={leaveStart}
        leaveEnd={leaveEnd}
        pendingVerifications={profile.current_active_verifications}
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
