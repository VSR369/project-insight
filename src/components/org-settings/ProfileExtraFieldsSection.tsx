/**
 * ProfileExtraFieldsSection (Phase 10b.1)
 *
 * Adds the registration-time profile fields that were previously only
 * captured during onboarding and not exposed in Settings:
 *   - linkedin_url
 *   - employee_count_range  (Select with shared bands)
 *   - annual_revenue_range  (Select with shared bands)
 *
 * Pure presentational; receives the parent RHF instance.
 */

import type { UseFormReturn } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { ProfileFormValues } from './profileFormSchema';

interface Props {
  form: UseFormReturn<ProfileFormValues>;
}

const EMPLOYEE_BANDS = [
  '1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10000+',
] as const;

const REVENUE_BANDS = [
  '<1M', '1M-10M', '10M-50M', '50M-100M', '100M-500M', '500M-1B', '1B+',
] as const;

export function ProfileExtraFieldsSection({ form }: Props) {
  const employee = form.watch('employee_count_range');
  const revenue = form.watch('annual_revenue_range');

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Company details</h3>

      <FormField control={form.control} name="linkedin_url" render={({ field }) => (
        <FormItem>
          <FormLabel>LinkedIn URL</FormLabel>
          <FormControl>
            <Input
              {...field}
              type="url"
              placeholder="https://www.linkedin.com/company/..."
              className="text-base"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FormField control={form.control} name="employee_count_range" render={() => (
          <FormItem>
            <FormLabel>Employee count</FormLabel>
            <Select
              value={employee || '__none'}
              onValueChange={(v) =>
                form.setValue('employee_count_range', v === '__none' ? '' : v, { shouldDirty: true })
              }
            >
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="__none">Not specified</SelectItem>
                {EMPLOYEE_BANDS.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="annual_revenue_range" render={() => (
          <FormItem>
            <FormLabel>Annual revenue (USD)</FormLabel>
            <Select
              value={revenue || '__none'}
              onValueChange={(v) =>
                form.setValue('annual_revenue_range', v === '__none' ? '' : v, { shouldDirty: true })
              }
            >
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="__none">Not specified</SelectItem>
                {REVENUE_BANDS.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <FormField control={form.control} name="registration_number" render={({ field }) => (
        <FormItem>
          <FormLabel>Business registration number</FormLabel>
          <FormControl>
            <Input
              {...field}
              type="text"
              placeholder="e.g. CIN, EIN, Companies House no."
              className="text-base"
              maxLength={100}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      {/*
        Deferred to post-MVP (infrastructure-blocked):
          - logo upload                 (needs storage bucket + RLS policy)
          - hq_state_province_id Select (needs md_states_provinces filtered by hq_country_id)
          - timezone Select             (needs timezone master table)
          - operating_geography_ids[]   (needs multi-select + master geography taxonomy)
      */}
    </div>
  );
}
