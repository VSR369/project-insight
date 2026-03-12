/**
 * OrgContactProfilePage — SOA's own profile page
 * Route: /org/contact-profile
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Info, Save } from 'lucide-react';
import { useSoaProfile, useUpdateSoaProfile } from '@/hooks/queries/useSoaProfile';
import { soaProfileSchema, type SoaProfileFormValues } from '@/lib/validations/roleAssignment';
import { useOrgContext } from '@/contexts/OrgContext';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { format } from 'date-fns';

export default function OrgContactProfilePage() {
  const navigate = useNavigate();
  const { organizationId } = useOrgContext();
  const { data: profile, isLoading } = useSoaProfile(organizationId);
  const update = useUpdateSoaProfile();

  const form = useForm<SoaProfileFormValues>({
    resolver: zodResolver(soaProfileSchema),
    defaultValues: { full_name: '', phone: '', title: '' },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name ?? '',
        phone: profile.phone ?? '',
        title: profile.title ?? '',
      });
    }
  }, [profile, form]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6 p-6">
        <button
          onClick={() => navigate('/org/dashboard')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No admin profile found for your account.
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmit = async (data: SoaProfileFormValues) => {
    await update.mutateAsync({
      id: profile.id,
      full_name: data.full_name,
      phone: data.phone || undefined,
      title: data.title || undefined,
    });
  };

  const lastUpdated = profile.updated_at
    ? format(new Date(profile.updated_at), 'dd MMM yyyy, HH:mm')
    : null;

  return (
    <FeatureErrorBoundary featureName="OrgContactProfilePage">
      <div className="space-y-6 p-6">
        <button
          onClick={() => navigate('/org/dashboard')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your contact details visible to team members and in role assignments
            </p>
          </div>
          <Badge variant="outline" className="capitalize h-fit">
            {profile.admin_tier.toLowerCase()}
          </Badge>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={profile.email ?? ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email is linked to your authentication account and cannot be changed here.
                  </p>
                </FormItem>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (international format)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation / Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Head of Engineering" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Your contact information is visible to team members and used when role assignments reference you as the administering contact.
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    {lastUpdated && (
                      <p className="text-xs text-muted-foreground">Last updated: {lastUpdated}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={update.isPending || !form.formState.isDirty}
                    className="gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    {update.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </FeatureErrorBoundary>
  );
}
