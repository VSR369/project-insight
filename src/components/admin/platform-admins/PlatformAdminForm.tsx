/**
 * Shared form component for Create and Edit Platform Admin.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { platformAdminFormSchema, type PlatformAdminFormValues } from './platformAdminForm.schema';
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
import { Loader2 } from 'lucide-react';
import { IndustryExpertisePicker } from './IndustryExpertisePicker';
import { CountryExpertisePicker } from './CountryExpertisePicker';
import { OrgTypeExpertisePicker } from './OrgTypeExpertisePicker';

interface PlatformAdminFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Partial<PlatformAdminFormValues>;
  onSubmit: (data: PlatformAdminFormValues) => Promise<void>;
  isSubmitting?: boolean;
  onCancel: () => void;
}

export function PlatformAdminForm({
  mode,
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

          {/* Supervisor Flag */}
          <FormField
            control={form.control}
            name="is_supervisor"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Supervisor</FormLabel>
                  <FormDescription>
                    Supervisors can manage other admin profiles.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
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
