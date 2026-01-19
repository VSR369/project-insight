import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useWithdrawApprovalRequest } from '@/hooks/queries/useManagerApproval';
import { useCancelOrgApprovalAndResetMode } from '@/hooks/queries/useCancelOrgApproval';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { WizardLayout } from '@/components/layout';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { BlockedModeChangeDialog } from '@/components/enrollment/BlockedModeChangeDialog';
import { Clock, Mail, RefreshCw, Loader2, AlertCircle, Building2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

function OrganizationPendingContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: provider, isLoading: providerLoading, refetch } = useCurrentProvider();
  const { activeEnrollment, activeEnrollmentId, isLoading: enrollmentLoading } = useEnrollmentContext();
  const withdrawRequest = useWithdrawApprovalRequest();
  const cancelOrgApproval = useCancelOrgApprovalAndResetMode();
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);

  // Use enrollment-scoped organization data
  const organization = activeEnrollment?.organization as any;
  const approvalStatus = organization?.approval_status;

  // If no organization exists, redirect to organization form
  if (activeEnrollment && !organization) {
    navigate('/enroll/organization');
    return null;
  }

  // If approved, redirect to expertise
  if (approvalStatus === 'approved') {
    navigate('/enroll/expertise');
    return null;
  }

  // If declined, redirect to declined page
  if (approvalStatus === 'declined') {
    navigate('/enroll/organization-declined');
    return null;
  }

  // If expired, show expired message and redirect to organization form
  if (approvalStatus === 'expired') {
    navigate('/enroll/organization', { 
      state: { showExpiredMessage: true } 
    });
    return null;
  }

  // If withdrawn, redirect to participation mode selection
  if (approvalStatus === 'withdrawn') {
    navigate('/enroll/participation-mode', { replace: true });
    return null;
  }

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['current-provider'] });
      await queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
      
      // Re-check after refetch
      const updatedEnrollment = activeEnrollment;
      const updatedStatus = (updatedEnrollment?.organization as any)?.approval_status;
      
      if (updatedStatus === 'approved') {
        toast.success('Your organization has been approved!');
        navigate('/enroll/expertise');
      } else if (updatedStatus === 'declined') {
        toast.error('Your organization request was declined');
        navigate('/enroll/organization-declined');
      } else {
        toast.info('Still waiting for manager approval');
      }
    } catch {
      toast.error('Failed to check status');
    } finally {
      setIsChecking(false);
    }
  };

  const handleResendEmail = async () => {
    if (!provider || !organization) return;

    setIsResending(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('send-manager-credentials', {
        body: {
          providerId: provider.id,
          enrollmentId: activeEnrollmentId,
          providerName: `${provider.first_name} ${provider.last_name}`,
          providerEmail: '',
          providerDesignation: organization.designation,
          orgName: organization.org_name,
          managerEmail: organization.manager_email,
          managerName: organization.manager_name,
        },
      });

      if (error || !result?.success) {
        throw new Error(result?.error || error?.message || 'Failed to resend');
      }

      toast.success('Approval request resent to manager');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend email');
    } finally {
      setIsResending(false);
    }
  };

  const handleWithdrawRequest = async () => {
    if (!provider?.id || !activeEnrollmentId) return;

    // If already withdrawn, just send user to edit screen
    if (approvalStatus === 'withdrawn') {
      toast.info('Your request is already withdrawn. You can update your organization details now.');
      navigate('/enroll/organization');
      return;
    }

    // Only pending requests can be withdrawn
    if (approvalStatus && approvalStatus !== 'pending') {
      toast.error(`Cannot withdraw: request is currently "${approvalStatus}"`);
      return;
    }

    try {
      await withdrawRequest.mutateAsync({
        providerId: provider.id,
        enrollmentId: activeEnrollmentId,
        withdrawalReason: 'User requested to modify organization details',
      });

      // Navigate to organization form after successful withdrawal
      navigate('/enroll/organization');
    } catch {
      // Error is handled in the mutation
    }
  };

  // Handle back button - show blocking dialog instead of navigating
  const handleBack = () => {
    setShowBlockedDialog(true);
  };

  // Handle cancel and reset from blocking dialog
  // Uses centralized hook with optimistic cache update
  const handleCancelAndReset = async () => {
    if (!provider?.id || !activeEnrollmentId) return;

    try {
      await cancelOrgApproval.mutateAsync({
        providerId: provider.id,
        enrollmentId: activeEnrollmentId,
        withdrawalReason: 'User cancelled to change participation mode',
      });
      setShowBlockedDialog(false);
      // Navigation happens inside the hook
    } catch {
      // Error toast is handled in the hook
    }
  };
  const handleContinue = () => {
    toast.error('Your organization manager approval is pending. You cannot proceed until your manager approves your request.');
  };

  if (providerLoading || enrollmentLoading) {
    return (
      <WizardLayout currentStep={3} hideBackButton hideContinueButton>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </WizardLayout>
    );
  }

  return (
    <>
      {/* Blocked Mode Change Dialog */}
      <BlockedModeChangeDialog
        open={showBlockedDialog}
        onOpenChange={setShowBlockedDialog}
        orgName={organization?.org_name}
        managerName={organization?.manager_name}
        managerEmail={organization?.manager_email}
        onCancelAndReset={handleCancelAndReset}
        isResetting={cancelOrgApproval.isPending}
      />

      <WizardLayout
        currentStep={3}
        onBack={handleBack}
        onContinue={handleContinue}
        continueLabel="Continue"
      >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Waiting for Manager Approval
          </h1>
          <p className="text-muted-foreground mt-2">
            Your manager needs to approve your participation request before you can continue.
          </p>
        </div>

        {/* Status Card */}
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Approval Pending
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                    Waiting
                  </Badge>
                </CardTitle>
                <CardDescription>
                  An approval request has been sent to your manager
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {organization && (
              <div className="bg-background rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Organization:</span>
                  <span className="font-medium">{organization.org_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Manager:</span>
                  <span className="font-medium">{organization.manager_name}</span>
                  <span className="text-muted-foreground">({organization.manager_email})</span>
                </div>
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your manager will receive login credentials to access the approval portal. 
                The credentials expire in 15 days.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={handleCheckStatus}
                disabled={isChecking}
                className="flex-1"
              >
                {isChecking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Check Status
              </Button>
              <Button 
                variant="outline" 
                onClick={handleResendEmail}
                disabled={isResending}
                className="flex-1"
              >
                {isResending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Resend Email
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Change Participation Mode Section */}
        {approvalStatus === 'pending' && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                Want to Change Participation Mode?
              </CardTitle>
              <CardDescription>
                To change your participation mode, you must first cancel the current organization approval request.
                This will invalidate your manager's credentials and allow you to select a different mode.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="default" 
                className="w-full"
                onClick={() => setShowBlockedDialog(true)}
                disabled={cancelOrgApproval.isPending}
              >
                {cancelOrgApproval.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Change Participation Mode
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Change Details Section - Only show for pending status */}
        {approvalStatus === 'pending' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Need to Change Organization Details?
              </CardTitle>
              <CardDescription>
                If you need to update organization or manager information, you can withdraw the current request
                and re-submit with new details (keeps your current participation mode).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    disabled={withdrawRequest.isPending}
                  >
                    {withdrawRequest.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Edit className="mr-2 h-4 w-4" />
                    )}
                    Change Organization Details
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Withdraw Approval Request?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-3">
                        <p>
                          This will cancel the current approval request sent to <strong>{organization?.manager_email}</strong>.
                        </p>
                        <div className="bg-muted/50 rounded-md p-3 border">
                          <p className="text-sm font-medium text-foreground mb-2">What happens next:</p>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            <li>Your manager's login credentials will be invalidated immediately</li>
                            <li>Your manager will receive a notification about the withdrawal</li>
                            <li>You can then update your organization details and submit a new request</li>
                          </ul>
                        </div>
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          ⚠️ This action cannot be undone. You will need to submit a new approval request after updating details.
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Current Request</AlertDialogCancel>
                    <AlertDialogAction onClick={handleWithdrawRequest}>
                      Withdraw & Edit Details
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        {/* Blocking Notice */}
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            You cannot continue enrollment until your organization manager approves your request. 
            Please wait for their approval or contact them directly.
          </AlertDescription>
        </Alert>
      </div>
      </WizardLayout>
    </>
  );
}

export default function OrganizationPending() {
  return (
    <FeatureErrorBoundary featureName="Organization Pending">
      <OrganizationPendingContent />
    </FeatureErrorBoundary>
  );
}
