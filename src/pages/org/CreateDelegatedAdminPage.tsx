/**
 * CreateDelegatedAdminPage — Form to create a new delegated admin with domain scope.
 * Includes scope overlap warning (MOD-M-SOA-01), email blur validation, config-driven expiry.
 */

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOrgContext } from '@/contexts/OrgContext';
import {
  useCreateDelegatedAdmin,
  useDelegatedAdmins,
  useActivationExpiryHours,
  checkScopeOverlap,
  checkEmailUniqueness,
  EMPTY_SCOPE,
  type DomainScope,
} from '@/hooks/queries/useDelegatedAdmins';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { ScopeMultiSelect } from '@/components/org/ScopeMultiSelect';
import { ScopeOverlapWarning } from '@/components/org/ScopeOverlapWarning';
import { SessionContextBanner } from '@/components/org/SessionContextBanner';
import { ArrowLeft, Loader2, UserPlus, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrgDelegationEnabled } from '@/hooks/queries/useTierDepthConfig';

const createAdminSchema = z.object({
  full_name: z.string().min(2, 'Name is required').max(100),
  email: z.string().email('Valid email required').max(255),
  phone: z.string().min(5, 'Phone number is required').max(30),
  title: z.string().max(100).optional(),
});

type FormValues = z.infer<typeof createAdminSchema>;

export default function CreateDelegatedAdminPage() {
  const navigate = useNavigate();
  const { organizationId } = useOrgContext();
  const createAdmin = useCreateDelegatedAdmin();
  const { data: existingAdmins = [] } = useDelegatedAdmins(organizationId);
  const { data: expiryHours = 72 } = useActivationExpiryHours();

  const [scope, setScope] = useState<DomainScope>({ ...EMPTY_SCOPE });
  const [overlapWarningOpen, setOverlapWarningOpen] = useState(false);
  const [overlappingAdmins, setOverlappingAdmins] = useState<{ name: string; email: string }[]>([]);
  const [pendingFormData, setPendingFormData] = useState<FormValues | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [inlineScopeOverlap, setInlineScopeOverlap] = useState<{ name: string; email: string }[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: { full_name: '', email: '', phone: '', title: '' },
  });

  const tempPassword = useMemo(() => {
    const array = new Uint8Array(6);
    crypto.getRandomValues(array);
    return `Temp${Date.now().toString(36).slice(-4)}!${Array.from(array, (b) => b.toString(36)).join('').slice(0, 8)}`;
  }, []);

  // Email blur uniqueness check (Gap 8)
  const handleEmailBlur = useCallback(async () => {
    const email = form.getValues('email');
    if (!email || !z.string().email().safeParse(email).success) return;
    const isUnique = await checkEmailUniqueness(organizationId, email);
    setEmailError(isUnique ? null : 'An admin with this email already exists in your organization');
  }, [form, organizationId]);

  // Scope change handler — check overlap on change (Gap 7)
  const handleScopeChange = useCallback(
    (newScope: DomainScope) => {
      setScope(newScope);
      if (newScope.industry_segment_ids.length > 0) {
        const overlaps = checkScopeOverlap(newScope, existingAdmins);
        setInlineScopeOverlap(overlaps);
      } else {
        setInlineScopeOverlap([]);
      }
    },
    [existingAdmins]
  );

  const doCreate = async (data: FormValues) => {
    await createAdmin.mutateAsync({
      organization_id: organizationId,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      title: data.title,
      domain_scope: scope,
      temp_password: tempPassword,
      expiry_hours: expiryHours,
    });
    navigate('/org/admin-management');
  };

  const onSubmit = async (data: FormValues) => {
    if (scope.industry_segment_ids.length === 0) return;
    if (emailError) return;

    // Final overlap check on submit
    const overlaps = checkScopeOverlap(scope, existingAdmins);
    if (overlaps.length > 0) {
      setOverlappingAdmins(overlaps);
      setPendingFormData(data);
      setOverlapWarningOpen(true);
      return;
    }

    await doCreate(data);
  };

  const handleOverlapConfirm = async () => {
    setOverlapWarningOpen(false);
    if (pendingFormData) {
      await doCreate(pendingFormData);
      setPendingFormData(null);
    }
  };

  const industryMissing = scope.industry_segment_ids.length === 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <SessionContextBanner />

      <Button variant="ghost" size="sm" onClick={() => navigate('/org/admin-management')}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Admin Management
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create Delegated Admin
          </CardTitle>
          <CardDescription>
            Add a new admin to help manage specific areas of your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Personal Details</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Jane Smith" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="jane@company.com"
                            onBlur={() => {
                              field.onBlur();
                              handleEmailBlur();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                        {emailError && (
                          <p className="text-xs text-destructive mt-1">{emailError}</p>
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl><Input {...field} placeholder="+1 555-0100" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title / Role</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Department Head" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Domain Scope */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-semibold text-foreground">Domain Scope</h3>
                <ScopeMultiSelect value={scope} onChange={handleScopeChange} />
                {industryMissing && (
                  <p className="text-xs text-destructive">At least one industry segment is required.</p>
                )}
                {/* Inline scope overlap warning (Gap 7) */}
                {inlineScopeOverlap.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Scope overlaps with: {inlineScopeOverlap.map((a) => a.name).join(', ')}. You can still proceed.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex gap-3 justify-end border-t pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/org/admin-management')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAdmin.isPending || industryMissing || !!emailError}>
                  {createAdmin.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Create Admin
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <ScopeOverlapWarning
        open={overlapWarningOpen}
        overlappingAdmins={overlappingAdmins}
        onConfirm={handleOverlapConfirm}
        onCancel={() => {
          setOverlapWarningOpen(false);
          setPendingFormData(null);
        }}
      />
    </div>
  );
}
