import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { WizardLayout } from '@/components/layout';
import { useOrganizationTypes } from '@/hooks/queries/useMasterData';
import { useCurrentProvider, useUpsertOrganization } from '@/hooks/queries/useProvider';
import { useSendManagerCredentials, checkOrgApprovalStatus } from '@/hooks/queries/useManagerApproval';
import { useEnrollmentCanModifyField, useEnrollmentIsTerminal } from '@/hooks/queries/useEnrollmentExpertise';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { LockedFieldBanner } from '@/components/enrollment';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, User, Loader2, AlertCircle, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const organizationSchema = z.object({
  orgName: z.string().min(2, 'Organization name is required'),
  orgTypeId: z.string().min(1, 'Please select organization type'),
  orgWebsite: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  designation: z.string().optional(),
  managerName: z.string().min(2, 'Manager name is required'),
  managerEmail: z.string().email('Please enter a valid email'),
  managerPhone: z.string().optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

function OrganizationContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showExpiredMessage, setShowExpiredMessage] = useState(
    (location.state as any)?.showExpiredMessage || false
  );
  const { data: orgTypes, isLoading: orgTypesLoading } = useOrganizationTypes();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { activeEnrollment, activeEnrollmentId, isLoading: enrollmentLoading } = useEnrollmentContext();
  const upsertOrg = useUpsertOrganization();
  const sendCredentials = useSendManagerCredentials();

  // Lifecycle validation - enrollment-scoped
  const contentCheck = useEnrollmentCanModifyField(activeEnrollmentId ?? undefined, 'content');
  const terminalState = useEnrollmentIsTerminal(activeEnrollmentId ?? undefined);
  const isTerminal = terminalState.isTerminal;

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      orgName: '',
      orgTypeId: '',
      orgWebsite: '',
      designation: '',
      managerName: '',
      managerEmail: '',
      managerPhone: '',
    },
  });

  // Check approval status on load - from enrollment's organization JSONB
  useEffect(() => {
    const enrollmentOrg = activeEnrollment?.organization as any;
    
    if (enrollmentOrg) {
      const { status, canContinue } = checkOrgApprovalStatus(enrollmentOrg);
      
      if (status === 'pending') {
        navigate('/enroll/organization-pending');
        return;
      }
      if (status === 'declined') {
        navigate('/enroll/organization-declined');
        return;
      }
      // For 'withdrawn' status, allow editing (canContinue is true)
      // For 'approved' status, can proceed but fields are locked

      form.reset({
        orgName: enrollmentOrg.org_name || '',
        orgTypeId: enrollmentOrg.org_type_id || '',
        orgWebsite: enrollmentOrg.org_website || '',
        designation: enrollmentOrg.designation || '',
        managerName: enrollmentOrg.manager_name || '',
        managerEmail: enrollmentOrg.manager_email || '',
        managerPhone: enrollmentOrg.manager_phone || '',
      });
    }
  }, [activeEnrollment?.organization, form, navigate]);

  const handleBack = () => {
    navigate('/enroll/participation-mode');
  };

  const handleContinue = async () => {
    if (isTerminal) {
      toast.error('Profile is locked and cannot be modified.');
      return;
    }

    const isValid = await form.trigger();
    if (!isValid) return;

    const data = form.getValues();

    if (!provider?.id || !activeEnrollmentId) {
      toast.error('Provider profile or enrollment not found. Please try again.');
      return;
    }

    try {
      // Save organization details to enrollment's organization JSONB
      await upsertOrg.mutateAsync({
        enrollmentId: activeEnrollmentId,
        data: {
          orgName: data.orgName,
          orgTypeId: data.orgTypeId,
          orgWebsite: data.orgWebsite || undefined,
          designation: data.designation || undefined,
          managerName: data.managerName,
          managerEmail: data.managerEmail,
          managerPhone: data.managerPhone || undefined,
        },
      });

      // Check if already approved (from enrollment's organization)
      const currentStatus = (activeEnrollment?.organization as any)?.approval_status;
      if (currentStatus === 'approved') {
        navigate('/enroll/expertise');
        return;
      }

      // Send manager credentials for new/pending submissions
      await sendCredentials.mutateAsync({
        providerId: provider.id,
        providerName: `${provider.first_name} ${provider.last_name}`,
        providerEmail: '',
        providerDesignation: data.designation,
        orgName: data.orgName,
        managerEmail: data.managerEmail,
        managerName: data.managerName,
      });

      // Redirect to pending page
      navigate('/enroll/organization-pending');
    } catch {
      toast.error('Failed to save organization details. Please try again.');
    }
  };

  if (orgTypesLoading || providerLoading || enrollmentLoading) {
    return (
      <WizardLayout currentStep={3} hideBackButton hideContinueButton>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </WizardLayout>
    );
  }

  // Read approval status from enrollment's organization JSONB
  const approvalStatus = (activeEnrollment?.organization as any)?.approval_status;
  const isApproved = approvalStatus === 'approved';
  const isWithdrawn = approvalStatus === 'withdrawn';
  const isFormDisabled = isApproved || isTerminal;

  return (
    <WizardLayout
      currentStep={3}
      onBack={handleBack}
      onContinue={handleContinue}
      isSubmitting={upsertOrg.isPending || sendCredentials.isPending}
      continueLabel={isApproved ? "Continue" : "Submit for Approval"}
      canContinue={!isTerminal}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Tell Us About Your Organization
          </h1>
          <p className="text-muted-foreground mt-2">
            Provide details about the organization you represent.
          </p>
        </div>

        {/* Terminal State Lock Banner */}
        {isTerminal && (
          <LockedFieldBanner 
            lockLevel="everything"
            reason="Your profile has been verified. Organization details cannot be modified."
          />
        )}
        
        {!isTerminal && !contentCheck.allowed && (
          <LockedFieldBanner 
            lockLevel="content"
            reason={contentCheck.reason || undefined}
          />
        )}

        {/* Approval Notice */}
        {!isApproved && !isWithdrawn && !isTerminal && (
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Your manager will receive an email with login credentials to approve your participation. 
              You cannot continue until they approve.
            </AlertDescription>
          </Alert>
        )}

        {isWithdrawn && !isTerminal && (
          <Alert className="border-blue-200 bg-blue-50/50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              Your previous approval request was withdrawn. Please update the details below and submit for approval again.
            </AlertDescription>
          </Alert>
        )}

        {showExpiredMessage && !isTerminal && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your previous manager approval request has expired after 15 days without a response. 
              Please resubmit with the same or different manager details.
            </AlertDescription>
          </Alert>
        )}

        {isApproved && !isTerminal && (
          <Alert className="border-green-200 bg-green-50/50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Your organization has been approved by your manager.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form className="space-y-6">
            {/* Organization Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Organization Details</CardTitle>
                </div>
                <CardDescription>Basic information about your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="orgName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corporation" {...field} disabled={isFormDisabled} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="orgTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isFormDisabled}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {orgTypes?.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Designation (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Innovation Lead" {...field} disabled={isTerminal} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="orgWebsite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} disabled={isTerminal} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Manager Contact */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Manager Contact</CardTitle>
                </div>
                <CardDescription>
                  Contact details of your reporting manager for verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="managerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} disabled={isFormDisabled} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="managerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manager Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="manager@company.com" {...field} disabled={isFormDisabled} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="managerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manager Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 9876543210" {...field} disabled={isTerminal} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </WizardLayout>
  );
}

export default function EnrollOrganization() {
  return (
    <FeatureErrorBoundary featureName="Organization Form">
      <OrganizationContent />
    </FeatureErrorBoundary>
  );
}
