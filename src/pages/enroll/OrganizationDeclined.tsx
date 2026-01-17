import { useNavigate } from 'react-router-dom';
import { useCurrentProvider, useUpdateProviderMode } from '@/hooks/queries/useProvider';
import { useParticipationModes } from '@/hooks/queries/useMasterData';
import { WizardLayout } from '@/components/layout';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { XCircle, Loader2, UserCircle, AlertCircle, ArrowRight, Building2 } from 'lucide-react';
import { toast } from 'sonner';

function OrganizationDeclinedContent() {
  const navigate = useNavigate();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: participationModes, isLoading: modesLoading } = useParticipationModes();
  const updateMode = useUpdateProviderMode();

  const organization = provider?.organization;
  const declineReason = (organization as any)?.decline_reason;

  const handleSwitchToIndividual = async () => {
    if (!provider || !participationModes) return;

    // Find the individual/self-accountable mode
    const individualMode = participationModes.find(
      mode => mode.code === 'SELF_ACCOUNTABLE' || mode.code === 'INDIVIDUAL'
    );

    if (!individualMode) {
      toast.error('Individual mode not found. Please contact support.');
      return;
    }

    try {
      await updateMode.mutateAsync({
        providerId: provider.id,
        participationModeId: individualMode.id,
      });

      toast.success('Switched to Individual mode');
      navigate('/enroll/expertise');
    } catch {
      toast.error('Failed to switch participation mode');
    }
  };

  const handleBack = () => {
    navigate('/enroll/participation-mode');
  };

  if (providerLoading || modesLoading) {
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
      hideContinueButton
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Organization Approval Declined
          </h1>
          <p className="text-muted-foreground mt-2">
            Your manager has declined your request to participate as an organization representative.
          </p>
        </div>

        {/* Decline Status Card */}
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Request Declined
                  <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                    Declined
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Your manager has declined this participation request
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
              </div>
            )}

            {declineReason && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Reason:</strong> {declineReason}
                </AlertDescription>
              </Alert>
            )}

            {!declineReason && (
              <p className="text-sm text-muted-foreground italic">
                No reason was provided by the manager.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Alternative Option */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <UserCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Continue as an Individual</CardTitle>
                <CardDescription>
                  You can still participate on CogniBlend as an independent solution provider
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              As an individual solution provider, you can:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
              <li>Build your professional profile and showcase your expertise</li>
              <li>Complete assessments and earn certifications</li>
              <li>Connect with organizations seeking your skills</li>
              <li>Participate in challenges and opportunities</li>
            </ul>

            <Button 
              onClick={handleSwitchToIndividual}
              disabled={updateMode.isPending}
              className="w-full sm:w-auto"
            >
              {updateMode.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  Switch to Individual Mode
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            If you believe this was declined in error, please contact your manager directly 
            or reach out to our support team for assistance.
          </AlertDescription>
        </Alert>
      </div>
    </WizardLayout>
  );
}

export default function OrganizationDeclined() {
  return (
    <FeatureErrorBoundary featureName="Organization Declined">
      <OrganizationDeclinedContent />
    </FeatureErrorBoundary>
  );
}
