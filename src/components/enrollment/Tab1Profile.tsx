/**
 * Tab 1: Your Profile
 * 
 * Profile form with photo, bio, phone, LinkedIn, portfolio, availability.
 * Uses RHF + Zod, auto-saves on blur.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Save, User, Phone, Linkedin, Globe, Briefcase } from 'lucide-react';
import { useProviderProfileExtended, useUpdateProviderProfile } from '@/hooks/queries/useProviderProfile';
import { AVAILABILITY_OPTIONS } from '@/constants/enrollment.constants';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  first_name: z.string().min(1, 'Required').max(100).trim(),
  last_name: z.string().min(1, 'Required').max(100).trim(),
  bio_tagline: z.string().max(300, 'Max 300 characters').nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  linkedin_url: z.string().url('Invalid URL').or(z.literal('')).nullable().optional(),
  portfolio_url: z.string().url('Invalid URL').or(z.literal('')).nullable().optional(),
  availability: z.string().nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface Tab1ProfileProps {
  providerId: string;
  className?: string;
}

export function Tab1Profile({ providerId, className }: Tab1ProfileProps) {
  const { data: profile, isLoading } = useProviderProfileExtended(providerId);
  const updateMutation = useUpdateProviderProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: '', last_name: '', bio_tagline: '',
      phone: '', linkedin_url: '', portfolio_url: '', availability: null,
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name,
        last_name: profile.last_name,
        bio_tagline: profile.bio_tagline ?? '',
        phone: profile.phone ?? '',
        linkedin_url: profile.linkedin_url ?? '',
        portfolio_url: profile.portfolio_url ?? '',
        availability: profile.availability,
      });
    }
  }, [profile, form]);

  const onSubmit = (values: ProfileFormValues) => {
    updateMutation.mutate({
      providerId,
      updates: {
        ...values,
        bio_tagline: values.bio_tagline || null,
        phone: values.phone || null,
        linkedin_url: values.linkedin_url || null,
        portfolio_url: values.portfolio_url || null,
      },
    });
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('space-y-5', className)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FormField control={form.control} name="first_name" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> First Name
              </FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="last_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="bio_tagline" render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> Bio / Tagline
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value ?? ''}
                placeholder="e.g. Digital transformation strategist with 10+ years in healthcare IT"
                rows={3}
                maxLength={300}
                className="text-base"
              />
            </FormControl>
            <div className="text-xs text-muted-foreground text-right">
              {(field.value?.length ?? 0)}/300
            </div>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Phone
            </FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ''} placeholder="+91 9876543210" className="text-base" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FormField control={form.control} name="linkedin_url" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn URL
              </FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} placeholder="https://linkedin.com/in/yourname" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="portfolio_url" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Portfolio URL
              </FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} placeholder="https://yourportfolio.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="availability" render={({ field }) => (
          <FormItem>
            <FormLabel>Availability</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? undefined}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select your availability" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit" disabled={updateMutation.isPending || !form.formState.isDirty}>
          {updateMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="mr-2 h-4 w-4" /> Save Profile</>
          )}
        </Button>
      </form>
    </Form>
  );
}
