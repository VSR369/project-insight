/**
 * Shared form component for Create and Edit Platform Admin.
 * Supports admin_tier field with hierarchy-based restrictions.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { platformAdminFormSchema, ADMIN_TIER_OPTIONS, type PlatformAdminFormValues, type AdminTierValue } from './platformAdminForm.schema';
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
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { IndustryExpertisePicker } from './IndustryExpertisePicker';
import { CountryExpertisePicker } from './CountryExpertisePicker';
import { OrgTypeExpertisePicker } from './OrgTypeExpertisePicker';

interface PlatformAdminFormProps {
  mode: 'create' | 'edit';
  callerTier?: AdminTierValue;
  defaultValues?: Partial<PlatformAdminFormValues>;
  onSubmit: (data: PlatformAdminFormValues) => Promise<void>;
  isSubmitting?: boolean;
  onCancel: () => void;
}

export function PlatformAdminForm({
  mode,
  callerTier = 'admin',
  defaultValues,
  onSubmit,
  isSubmitting,
  onCancel,
}: PlatformAdminFormProps) {
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

  const handleSubmit = async (data: PlatformAdminFormValues) => {
    await onSubmit(data);
  };

  // Determine which tier options the caller can assign
  const allowedTierOptions = ADMIN_TIER_OPTIONS.filter((opt) => {
    if (callerTier === 'supervisor') return true; // supervisors can assign any tier
    if (callerTier === 'senior_admin') return opt.value === 'admin'; // senior admins can only create admin
    return false;
  });

  return (
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
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    disabled={mode === 'edit'}
                    {...field}
                  />
                </FormControl>
                {mode === 'edit' && (
                  <FormDescription>Email cannot be changed after creation.</FormDescription>
                )}
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
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Admin Tier */}
          <FormField
            control={form.control}
            name="admin_tier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Admin Tier</FormLabel>
                <Select
                  onValueChange={field.onChange}
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
  );
}
