/**
 * SCR-01-06: Availability Settings Page (self-service)
 * GAP-6: Wire BulkReassignConfirmModal when going On_Leave/Inactive with active verifications
 * Enhanced: Current leave summary card, auto-status explanation, restore button
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatformAdminSelf } from '@/hooks/queries/usePlatformAdmins';
import { useUpdateAvailability } from '@/hooks/mutations/usePlatformAdminMutations';
import { useAvailableAdminCounts } from '@/hooks/queries/useAvailableAdminCounts';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { AdminStatusBadge } from '@/components/admin/platform-admins/AdminStatusBadge';
import { LeaveConfirmationModal } from '@/components/admin/platform-admins/LeaveConfirmationModal';
import { BulkReassignConfirmModal } from '@/components/admin/reassignments/BulkReassignConfirmModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, AlertTriangle, Info, Calendar, CheckCircle } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

/* ─── Current Leave Summary Card ─── */
function CurrentLeaveSummary({
  leaveStart,
  leaveEnd,
  onRestore,
  isLoading,
}: {
  leaveStart: string;
  leaveEnd: string;
  onRestore: () => void;
  isLoading: boolean;
}) {
  const startDate = parseISO(leaveStart);
  const endDate = parseISO(leaveEnd);
  const today = new Date();
  const totalDays = differenceInDays(endDate, startDate) + 1;
  const remainingDays = Math.max(0, differenceInDays(endDate, today) + 1);

  return (
    <Card className="border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-200">Currently On Leave</h3>
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-blue-700 dark:text-blue-300">From</span>
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  {format(startDate, 'dd MMM yyyy')}
                </span>
                <span className="text-blue-700 dark:text-blue-300">To</span>
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  {format(endDate, 'dd MMM yyyy')}
                </span>
                <span className="text-blue-700 dark:text-blue-300">Duration</span>
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  {totalDays} day{totalDays !== 1 ? 's' : ''} ({remainingDays} remaining)
                </span>
              </div>
            </div>
            <Button
              size="sm"
              onClick={onRestore}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle className="mr-1.5 h-4 w-4" />
              Restore to Available
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Auto-Status Explanation Banner ─── */
function AutoStatusBanner({
  status,
  currentActive,
  maxConcurrent,
}: {
  status: string;
  currentActive: number;
  maxConcurrent: number;
}) {
  if (status !== 'Partially_Available' && status !== 'Fully_Loaded') return null;

  const isFullyLoaded = status === 'Fully_Loaded';

  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
      <Info className="h-4 w-4" />
      <AlertDescription>
        <strong>Auto-calculated status:</strong> Your status is{' '}
        <strong>{isFullyLoaded ? 'Fully Loaded' : 'Partially Available'}</strong> because you have{' '}
        <strong>{currentActive}/{maxConcurrent}</strong> active verifications.
        {isFullyLoaded
          ? ' No new assignments will be routed to you until you complete existing work.'
          : ' You may still receive assignments up to your capacity limit.'}
        <br />
        <span className="text-xs mt-1 block opacity-80">
          This status is managed automatically by the system and cannot be changed manually.
        </span>
      </AlertDescription>
    </Alert>
  );
}

/* ─── Main Content ─── */
function AvailabilityContent() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = usePlatformAdminSelf();
  const updateAvailability = useUpdateAvailability();
  const { data: counts } = useAvailableAdminCounts();

  const [status, setStatus] = useState<string>('');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [bulkReassignOpen, setBulkReassignOpen] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);

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

  const profileStatus = profile.availability_status;
  const isCurrentlyOnLeave = profileStatus === 'On_Leave';
  const isAutoStatus = profileStatus === 'Partially_Available' || profileStatus === 'Fully_Loaded';

  // When auto-status admin clicks "Schedule Leave", treat effective status as On_Leave
  const effectiveStatus = (isAutoStatus && showLeaveForm) ? 'On_Leave' : (status || profileStatus);
  const isGoingOnLeave = effectiveStatus === 'On_Leave' && !isCurrentlyOnLeave;
  const isRestoring = isCurrentlyOnLeave && effectiveStatus === 'Available';

  // BR-MPA-001: last available admin cannot go on leave
  const isLastAvailable = profileStatus === 'Available' && (counts?.availableCount ?? 2) <= 1;
  const blockLeave = isLastAvailable && effectiveStatus === 'On_Leave';

  const leaveVariant = isRestoring ? 'restore' as const
    : (leaveStart <= today ? 'immediate' as const : 'scheduled' as const);

  const isImmediate = leaveStart <= today;

  // GAP-6: Check if admin needs bulk reassign modal
  const needsBulkReassign = profile.current_active_verifications > 0
    && (effectiveStatus === 'On_Leave' || effectiveStatus === 'Inactive')
    && profileStatus !== effectiveStatus;

  const handleSave = () => {
    if (needsBulkReassign) {
      setBulkReassignOpen(true);
    } else if (effectiveStatus === 'On_Leave' || isRestoring) {
      setLeaveModalOpen(true);
    } else {
      doSave();
    }
  };

  const handleRestore = () => {
    setStatus('Available');
    setRestoreModalOpen(true);
  };

  const doSave = async () => {
    await updateAvailability.mutateAsync({
      availability_status: effectiveStatus,
      leave_start_date: effectiveStatus === 'On_Leave' ? leaveStart : null,
      leave_end_date: effectiveStatus === 'On_Leave' ? leaveEnd : null,
    });
    navigate('/admin/my-profile');
  };

  const doRestore = async () => {
    await updateAvailability.mutateAsync({
      availability_status: 'Available',
      leave_start_date: null,
      leave_end_date: null,
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

      {/* Enhancement 1: Current Leave Summary Card */}
      {isCurrentlyOnLeave && profile.leave_start_date && profile.leave_end_date && (
        <CurrentLeaveSummary
          leaveStart={profile.leave_start_date}
          leaveEnd={profile.leave_end_date}
          onRestore={handleRestore}
          isLoading={updateAvailability.isPending}
        />
      )}

      {/* Enhancement 2: Auto-Status Explanation Banner */}
      <AutoStatusBanner
        status={profileStatus}
        currentActive={profile.current_active_verifications}
        maxConcurrent={profile.max_concurrent_verifications}
      />

      {/* Active verification count info card */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          You currently have <strong>{profile.current_active_verifications}</strong> active verification(s)
          out of a maximum of {profile.max_concurrent_verifications}.
        </AlertDescription>
      </Alert>

      {/* Don't show the status change card for auto-calculated statuses */}
      {!isAutoStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              Current Status: <AdminStatusBadge status={profileStatus} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isCurrentlyOnLeave && (
              <>
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

                {isGoingOnLeave && !blockLeave && (
                  <>
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
              </>
            )}

            {isCurrentlyOnLeave && (
              <p className="text-sm text-muted-foreground">
                You are currently on leave. Use the <strong>"Restore to Available"</strong> button above to return.
              </p>
            )}

            {!isCurrentlyOnLeave && (
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => navigate('/admin/my-profile')}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateAvailability.isPending || blockLeave || (isGoingOnLeave && (!leaveStart || !leaveEnd))}
                >
                  {updateAvailability.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leave confirmation (going on leave) */}
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

      {/* Restore confirmation modal */}
      <LeaveConfirmationModal
        open={restoreModalOpen}
        onOpenChange={setRestoreModalOpen}
        variant="restore"
        onConfirm={doRestore}
        isLoading={updateAvailability.isPending}
      />

      {/* GAP-6: Bulk Reassign Confirmation Modal */}
      <BulkReassignConfirmModal
        open={bulkReassignOpen}
        onOpenChange={setBulkReassignOpen}
        adminId={profile.id}
        targetStatus={effectiveStatus as 'On_Leave' | 'Inactive'}
        leaveStartDate={leaveStart || undefined}
        leaveEndDate={leaveEnd || undefined}
        onConfirmed={() => {
          navigate('/admin/my-profile');
        }}
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
