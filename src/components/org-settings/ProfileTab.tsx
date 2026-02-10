/**
 * Profile Tab (ORG-001)
 * 
 * Editable organization profile form with field-level locking.
 * Legal Entity Name is always locked per Section 14 rules.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Globe, Building2, MapPin } from 'lucide-react';
import { Loader2 } from 'lucide-react';

import { useOrgProfile, useOrgIndustries, useUpdateOrgProfile } from '@/hooks/queries/useOrgSettings';
import { isFieldEditable } from '@/services/orgSettingsService';

import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  organization_name: z.string().min(2, 'Organization name must be at least 2 characters').max(200),
  trade_brand_name: z.string().max(200).optional().or(z.literal('')),
  website_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  organization_description: z.string().max(2000).optional().or(z.literal('')),
  hq_address_line1: z.string().max(255).optional().or(z.literal('')),
  hq_address_line2: z.string().max(255).optional().or(z.literal('')),
  hq_city: z.string().max(100).optional().or(z.literal('')),
  hq_postal_code: z.string().max(20).optional().or(z.literal('')),
  timezone: z.string().max(100).optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileTabProps {
  organizationId: string;
}

export function ProfileTab({ organizationId }: ProfileTabProps) {
  const { data: profile, isLoading } = useOrgProfile(organizationId);
  const { data: industries } = useOrgIndustries(organizationId);
  const updateProfile = useUpdateOrgProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      organization_name: '',
      trade_brand_name: '',
      website_url: '',
      organization_description: '',
      hq_address_line1: '',
      hq_address_line2: '',
      hq_city: '',
      hq_postal_code: '',
      timezone: '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        organization_name: profile.organization_name || '',
        trade_brand_name: profile.trade_brand_name || '',
        website_url: profile.website_url || '',
        organization_description: profile.organization_description || '',
        hq_address_line1: profile.hq_address_line1 || '',
        hq_address_line2: profile.hq_address_line2 || '',
        hq_city: profile.hq_city || '',
        hq_postal_code: profile.hq_postal_code || '',
        timezone: profile.timezone || '',
      });
    }
  }, [profile, form]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Organization not found.
      </div>
    );
  }

  const handleSubmit = async (data: ProfileFormValues) => {
    await updateProfile.mutateAsync({
      id: organizationId,
      organization_name: data.organization_name,
      trade_brand_name: data.trade_brand_name || null,
      website_url: data.website_url || null,
      organization_description: data.organization_description || null,
      hq_address_line1: data.hq_address_line1 || null,
      hq_address_line2: data.hq_address_line2 || null,
      hq_city: data.hq_city || null,
      hq_postal_code: data.hq_postal_code || null,
      timezone: data.timezone || null,
    });
  };

  // Read-only locked field display
  const LockedField = ({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <FormLabel className="text-sm font-medium text-muted-foreground">{label}</FormLabel>
        <Lock className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border text-sm text-foreground">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span>{value || '—'}</span>
      </div>
    </div>
  );

  const orgTypeName = (profile as any)?.organization_types?.name ?? 'Unknown';
  const countryName = (profile as any)?.countries?.name ?? 'Unknown';

  return (
    <div className="space-y-8">
      {/* Locked Fields Section */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Registered Information (Locked)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LockedField label="Legal Entity Name" value={profile.legal_entity_name || ''} icon={Building2} />
          <LockedField label="Organization Type" value={orgTypeName} />
          <LockedField label="Headquarters Country" value={countryName} icon={Globe} />
          <LockedField label="Founded Year" value={profile.founding_year?.toString() || ''} />
        </div>
        {industries && industries.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <FormLabel className="text-sm font-medium text-muted-foreground">Industries</FormLabel>
              <Lock className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="flex flex-wrap gap-2">
              {industries.map((ind) => (
                <Badge key={ind.id} variant="secondary" className="text-xs">
                  {(ind as any)?.industry_segments?.name ?? 'Unknown'}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Editable Fields */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <h3 className="text-sm font-semibold text-foreground">Editable Profile</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormField control={form.control} name="organization_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name *</FormLabel>
                <FormControl><Input {...field} className="text-base" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="trade_brand_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Trade / Brand Name</FormLabel>
                <FormControl><Input {...field} className="text-base" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="website_url" render={({ field }) => (
            <FormItem>
              <FormLabel>Website URL</FormLabel>
              <FormControl><Input {...field} type="url" placeholder="https://..." className="text-base" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="organization_description" render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Textarea {...field} rows={4} className="text-base resize-none" /></FormControl>
              <FormDescription>Brief description of your organization (max 2,000 chars).</FormDescription>
              <FormMessage />
            </FormItem>
          )} />

          <Separator />

          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Address Details
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormField control={form.control} name="hq_address_line1" render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 1</FormLabel>
                <FormControl><Input {...field} className="text-base" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="hq_address_line2" render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 2</FormLabel>
                <FormControl><Input {...field} className="text-base" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="hq_city" render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl><Input {...field} className="text-base" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="hq_postal_code" render={({ field }) => (
              <FormItem>
                <FormLabel>Postal Code</FormLabel>
                <FormControl><Input {...field} className="text-base" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="timezone" render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <FormControl><Input {...field} placeholder="e.g. America/New_York" className="text-base" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={updateProfile.isPending || !form.formState.isDirty}>
              {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
