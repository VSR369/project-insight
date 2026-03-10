/**
 * Shared form component for Create and Edit Platform Admin.
 * Enhanced: padlock icon on email (edit mode), capacity warning, supervisor flag toggle modal (MOD-M-06).
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { platformAdminFormSchema, ADMIN_TIER_OPTIONS, type PlatformAdminFormValues, type AdminTierValue } from './platformAdminForm.schema';
import { usePlatformTierDepth } from '@/hooks/queries/useTierDepthConfig';
import { useMpaConfigValue } from '@/hooks/queries/useMpaConfig';
import { SupervisorFlagToggleModal } from './SupervisorFlagToggleModal';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Lock, AlertTriangle } from 'lucide-react';
import { IndustryExpertisePicker } from './IndustryExpertisePicker';
import { CountryExpertisePicker } from './CountryExpertisePicker';
import { OrgTypeExpertisePicker } from './OrgTypeExpertisePicker';

interface PlatformAdminFormProps {
  mode: 'create' | 'edit';
  callerTier?: AdminTierValue;
  defaultValues?: Partial<PlatformAdminFormValues>;
  currentActiveVerifications?: number;
  onSubmit: (data: PlatformAdminFormValues) => Promise<void>;
  isSubmitting?: boolean;
  onCancel: () => void;
}

export function PlatformAdminForm({
  mode,
  callerTier = 'admin',
  defaultValues,
  currentActiveVerifications = 0,
  onSubmit,
  isSubmitting,
  onCancel,
}: PlatformAdminFormProps) {
  const [supervisorModalOpen, setSupervisorModalOpen] = useState(false);
  const [pendingSupervisorTier, setPendingSupervisorTier] = useState<string | null>(null);
  const { depth } = usePlatformTierDepth();
  const { data: maxIndustries } = useMpaConfigValue('basic_admin_max_industries');
  const { data: maxCountries } = useMpaConfigValue('basic_admin_max_countries');
  const { data: maxOrgTypes } = useMpaConfigValue('basic_admin_max_org_types');

  const watchedTier = form.watch('admin_tier');
  const isBasicAdmin = watchedTier === 'admin';

  // Caps only apply to Basic Admin tier; Supervisor/Senior are uncapped
  const industryCap = isBasicAdmin ? parseInt(maxIndustries ?? '3', 10) : undefined;
  const countryCap = isBasicAdmin ? parseInt(maxCountries ?? '3', 10) : undefined;
  const orgTypeCap = isBasicAdmin ? parseInt(maxOrgTypes ?? '3', 10) : undefined;

  const form = useForm<PlatformAdminFormValues>({
    resolver: zodResolver(platformAdminFormSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      is_supervisor: false,
      admin_tier: 'admin',
      industry_expertise: [],
      country_region_expertise: [],
      org_type_expertise: [],
      max_concurrent_verifications: 10,
      assignment_priority: 5,
      ...defaultValues,
    },
  });

  const watchedMaxConcurrent = form.watch('max_concurrent_verifications');
  const showCapacityWarning = mode === 'edit' && watchedMaxConcurrent < currentActiveVerifications;

  const handleSubmit = async (data: PlatformAdminFormValues) => {
    await onSubmit(data);
  };

  // Determine which tier options the caller can assign, filtered by tier depth
  const allowedTierOptions = ADMIN_TIER_OPTIONS.filter((opt) => {
    // Filter by tier depth config first
    if (depth === 1 && opt.value !== 'supervisor') return false;
    if (depth === 2 && opt.value === 'admin') return false;
    // Then filter by caller's tier
    if (callerTier === 'supervisor') return true;
    if (callerTier === 'senior_admin') return opt.value === 'admin';
    return false;
  });

  const handleTierChange = (value: string) => {
    const currentTier = form.getValues('admin_tier');
    const isChangingSupervisor = value === 'supervisor' || currentTier === 'supervisor';

    if (isChangingSupervisor && value !== currentTier) {
      setPendingSupervisorTier(value);
      setSupervisorModalOpen(true);
    } else {
      form.setValue('admin_tier', value as AdminTierValue);
      form.setValue('is_supervisor', value === 'supervisor');
    }
  };

  const handleSupervisorConfirm = () => {
    if (pendingSupervisorTier) {
      form.setValue('admin_tier', pendingSupervisorTier as AdminTierValue);
      form.setValue('is_supervisor', pendingSupervisorTier === 'supervisor');
      setPendingSupervisorTier(null);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Full Name */}
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    Email
                    {mode === 'edit' && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>Email cannot be changed after creation</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="admin@example.com"
                      disabled={mode === 'edit'}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormDescription>E.164 format (e.g. +1234567890)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Admin Tier — hidden when depth=1 (single tier) */}
            {depth > 1 && (
              <FormField
                control={form.control}
                name="admin_tier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Tier</FormLabel>
                    <Select
                      onValueChange={handleTierChange}
                      value={field.value}
                      disabled={allowedTierOptions.length <= 1}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allowedTierOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {callerTier === 'senior_admin'
                        ? 'Senior Admins can only create Admin-tier accounts.'
                        : 'Supervisor, Senior Admin, or Admin access level.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Max Concurrent Verifications */}
            <FormField
              control={form.control}
              name="max_concurrent_verifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Concurrent Verifications</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={100} {...field} />
                  </FormControl>
                  <FormDescription>1–100</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assignment Priority */}
            <FormField
              control={form.control}
              name="assignment_priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignment Priority</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={10} {...field} />
                  </FormControl>
                  <FormDescription>1 (highest) – 10 (lowest)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Capacity warning */}
          {showCapacityWarning && (
            <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Reducing max concurrent verifications below the current active count ({currentActiveVerifications}).
                Existing assignments will not be removed, but no new ones will be assigned until workload drops.
              </AlertDescription>
            </Alert>
          )}

          {/* Industry Expertise */}
          <FormField
            control={form.control}
            name="industry_expertise"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry Expertise *</FormLabel>
                <FormControl>
                  <IndustryExpertisePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormDescription>At least one industry is required.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Country/Region Expertise */}
          <FormField
            control={form.control}
            name="country_region_expertise"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country/Region Expertise</FormLabel>
                <FormControl>
                  <CountryExpertisePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Org Type Expertise */}
          <FormField
            control={form.control}
            name="org_type_expertise"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Type Expertise</FormLabel>
                <FormControl>
                  <OrgTypeExpertisePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Create Admin' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>

      <SupervisorFlagToggleModal
        open={supervisorModalOpen}
        onOpenChange={(open) => {
          setSupervisorModalOpen(open);
          if (!open) setPendingSupervisorTier(null);
        }}
        enabling={pendingSupervisorTier === 'supervisor'}
        adminName={form.getValues('full_name') || 'this admin'}
        onConfirm={handleSupervisorConfirm}
      />
    </>
  );
}
