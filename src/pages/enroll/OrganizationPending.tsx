import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { WizardLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Clock, Mail, RefreshCw, Loader2, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function OrganizationPending() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: provider, isLoading: providerLoading, refetch } = useCurrentProvider();
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const organization = provider?.organization;
  const approvalStatus = (organization as any)?.approval_status;

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

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['current-provider'] });
      
      // Re-check after refetch
      const updatedProvider = queryClient.getQueryData(['current-provider']) as any;
      const updatedStatus = updatedProvider?.organization?.approval_status;
      
      if (updatedStatus === 'approved') {
        toast.success('Your organization has been approved!');
        navigate('/enroll/expertise');
      } else if (updatedStatus === 'declined') {
        toast.error('Your organization request was declined');
        navigate('/enroll/organization-declined');
      } else {
        toast.info('Still waiting for manager approval');
      }
    } catch (error) {
      console.error('Error checking status:', error);
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
          providerName: `${provider.first_name} ${provider.last_name}`,
          providerEmail: '', // Will be fetched in the function
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
      console.error('Error resending:', error);
      toast.error(error.message || 'Failed to resend email');
    } finally {
      setIsResending(false);
    }
  };

  const handleBack = () => {
    navigate('/enroll/organization');
  };

  const handleContinue = () => {
    // Show blocking message - cannot continue until approved
    toast.error('Your organization manager approval is pending. You cannot proceed until your manager approves your request.');
  };

  if (providerLoading) {
    return (
      <WizardLayout currentStep={3} hideBackButton hideContinueButton>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </WizardLayout>
    );
  }

  return (
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
  );
}
