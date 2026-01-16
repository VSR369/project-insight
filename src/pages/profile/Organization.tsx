import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useOrganizationTypes } from '@/hooks/queries/useMasterData';
import { useCurrentProvider, useUpsertOrganization } from '@/hooks/queries/useProvider';
import { useCanModifyField, useIsTerminalState } from '@/hooks/queries/useLifecycleValidation';
import { LockedFieldBanner } from '@/components/enrollment/LockedFieldBanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowLeft, Building2, User, Loader2, Lock } from 'lucide-react';
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

export default function Organization() {
  const navigate = useNavigate();
  const { data: orgTypes, isLoading: orgTypesLoading } = useOrganizationTypes();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const upsertOrg = useUpsertOrganization();

  // Lifecycle validation
  const configurationCheck = useCanModifyField('configuration');
  const terminalState = useIsTerminalState();
  const isTerminal = terminalState.isTerminal;
  const isLocked = !configurationCheck.allowed || isTerminal;

  // Check if org is already approved (cannot modify after approval)
  const isApproved = provider?.organization?.approval_status === 'approved';
  const effectivelyLocked = isLocked || isApproved;

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

  // Pre-fill from existing organization data
  useEffect(() => {
    if (provider?.organization) {
      const org = provider.organization;
      form.reset({
        orgName: org.org_name || '',
        orgTypeId: org.org_type_id || '',
        orgWebsite: org.org_website || '',
        designation: org.designation || '',
        managerName: org.manager_name || '',
        managerEmail: org.manager_email || '',
        managerPhone: org.manager_phone || '',
      });
    }
  }, [provider?.organization, form]);

  const onSubmit = async (data: OrganizationFormData) => {
    if (effectivelyLocked) {
      toast.error('Organization details cannot be modified.');
      return;
    }

    if (!provider?.id) {
      toast.error('Provider profile not found. Please try again.');
      return;
    }

    try {
      await upsertOrg.mutateAsync({
        providerId: provider.id,
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
      navigate('/profile/build/expertise');
    } catch (error) {
      toast.error('Failed to save organization details. Please try again.');
      console.error('Error saving organization:', error);
    }
  };

  if (orgTypesLoading || providerLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Step 2 of 5</span>
            <span>•</span>
            <span>Organization Details</span>
            {effectivelyLocked && <Lock className="h-3 w-3" />}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Tell Us About Your Organization
          </h1>
          <p className="text-muted-foreground mt-2">
            Provide details about the organization you represent.
          </p>
        </div>

        {/* Lock Banner */}
        {effectivelyLocked && (
          <LockedFieldBanner
            lockLevel={isTerminal ? 'everything' : isApproved ? 'content' : configurationCheck.lockLevel || 'configuration'}
            reason={isApproved 
              ? 'Organization details cannot be changed after manager approval.' 
              : configurationCheck.reason}
            className="mb-6"
          />
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Organization Details */}
            <Card className={effectivelyLocked ? 'bg-muted/30' : ''}>
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
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Acme Corporation" 
                          disabled={effectivelyLocked}
                          {...field} 
                        />
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
                        <FormLabel>Organization Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={effectivelyLocked}
                        >
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
                          <Input 
                            placeholder="Senior Consultant" 
                            disabled={effectivelyLocked}
                            {...field} 
                          />
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
                        <Input 
                          placeholder="https://example.com" 
                          disabled={effectivelyLocked}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Manager Contact */}
            <Card className={effectivelyLocked ? 'bg-muted/30' : ''}>
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
                      <FormLabel>Manager Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John Smith" 
                          disabled={effectivelyLocked}
                          {...field} 
                        />
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
                        <FormLabel>Manager Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="manager@company.com" 
                            disabled={effectivelyLocked}
                            {...field} 
                          />
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
                          <Input 
                            placeholder="+91 9876543210" 
                            disabled={effectivelyLocked}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/profile/build/choose-mode')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button 
                type="submit" 
                disabled={upsertOrg.isPending || effectivelyLocked} 
                className="gap-2 sm:ml-auto"
              >
                {upsertOrg.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
