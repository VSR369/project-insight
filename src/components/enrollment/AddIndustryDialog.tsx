/**
 * Add Industry Dialog
 * 
 * Dialog for enrolling in a new industry segment.
 * Handles both first-time users (creates provider) and existing providers.
 * Navigates to registration if profile incomplete, otherwise to participation mode.
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';
import { useOptionalEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useCreateEnrollment, useProviderEnrollments } from '@/hooks/queries/useProviderEnrollments';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { withCreatedBy } from '@/lib/auditFields';

const formSchema = z.object({
  industrySegmentId: z.string().min(1, 'Please select an industry'),
});

type FormValues = z.infer<typeof formSchema>;

interface AddIndustryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddIndustryDialog({ open, onOpenChange }: AddIndustryDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const enrollmentContext = useOptionalEnrollmentContext();
  const setActiveEnrollment = enrollmentContext?.setActiveEnrollment;
  const refreshEnrollments = enrollmentContext?.refreshEnrollments;
  
  // Fetch enrollments directly to ensure we have latest data for filtering
  const { data: providerEnrollments = [], isLoading: enrollmentsLoading } = useProviderEnrollments(provider?.id);
  
  const { data: allIndustries = [], isLoading: industriesLoading } = useIndustrySegments();
  const createEnrollment = useCreateEnrollment();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      industrySegmentId: '',
    },
  });

  // Filter out industries the provider is already enrolled in
  // Use directly fetched enrollments for accurate filtering
  const availableIndustries = useMemo(() => {
    const enrolledIds = new Set(providerEnrollments.map(e => e.industry_segment_id));
    return allIndustries.filter(industry => !enrolledIds.has(industry.id));
  }, [allIndustries, providerEnrollments]);

  // Check if provider has completed basic registration
  const isRegistrationComplete = useMemo(() => {
    if (!provider) return false;
    return !!(provider.first_name && provider.address && provider.country_id);
  }, [provider]);

  const onSubmit = async (values: FormValues) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to continue');
        return;
      }

      let providerId = provider?.id;

      // UPSERT pattern: Check for existing provider first, then create if needed
      if (!providerId) {
        // First, check if provider already exists (handles race conditions)
        const { data: existingProvider, error: fetchError } = await supabase
          .from('solution_providers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) {
          console.error('Error checking for existing provider:', fetchError);
          toast.error('Failed to verify profile. Please try again.');
          return;
        }

        if (existingProvider) {
          // Provider exists, use existing ID
          providerId = existingProvider.id;
          console.log('Found existing provider:', providerId);
        } else {
          // Create new provider with audit fields
          const providerData = await withCreatedBy({
            user_id: user.id,
            first_name: user.user_metadata?.first_name || 'Provider',
            last_name: user.user_metadata?.last_name || '',
            is_student: user.user_metadata?.is_student || false,
            lifecycle_status: 'registered' as const,
            lifecycle_rank: 10,
            onboarding_status: 'in_progress' as const,
          });

          const { data: newProvider, error: providerError } = await supabase
            .from('solution_providers')
            .insert(providerData)
            .select('id')
            .single();

          if (providerError) {
            // Handle unique constraint violation (race condition)
            if (providerError.code === '23505') {
              // Provider was created by another process, fetch it
              const { data: raceProvider } = await supabase
                .from('solution_providers')
                .select('id')
                .eq('user_id', user.id)
                .single();
              
              if (raceProvider) {
                providerId = raceProvider.id;
                console.log('Found provider after race condition:', providerId);
              } else {
                throw new Error('Failed to create or find provider');
              }
            } else {
              console.error('Error creating provider:', providerError);
              toast.error('Failed to create profile. Please try again.');
              return;
            }
          } else {
            providerId = newProvider.id;
            console.log('Created new provider:', providerId);
          }
        }
        
        // Invalidate provider query to refresh
        queryClient.invalidateQueries({ queryKey: ['current-provider'] });
      }

      // Create enrollment for the selected industry
      const newEnrollment = await createEnrollment.mutateAsync({
        providerId,
        industrySegmentId: values.industrySegmentId,
        isPrimary: providerEnrollments.length === 0, // First enrollment is primary
      });
      
      // Set as active enrollment
      setActiveEnrollment?.(newEnrollment.id);
      refreshEnrollments?.();
      form.reset();
      onOpenChange(false);

      // Navigate based on registration completeness
      if (isRegistrationComplete || provider) {
        // Existing provider with complete profile - go to participation mode
        toast.success(`Started enrollment in ${newEnrollment.industry_segment?.name || 'new industry'}!`);
        navigate('/enroll/participation-mode');
      } else {
        // First-time user - go to registration to complete profile
        toast.success(`Industry selected! Now complete your profile.`);
        navigate('/enroll/registration');
      }
    } catch (error) {
      console.error('Error creating enrollment:', error);
      toast.error('Failed to create enrollment. Please try again.');
    }
  };

  const isLoading = providerLoading || industriesLoading || enrollmentsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {provider ? 'Add New Industry' : 'Select Your Industry'}
          </DialogTitle>
          <DialogDescription>
            {provider 
              ? 'Enroll in a new industry segment to demonstrate your expertise in multiple domains. Each industry has its own independent progress and verification path.'
              : 'Choose an industry segment to begin your professional profile. You can add more industries later.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="industrySegmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry Segment</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an industry segment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableIndustries.map((industry) => (
                        <SelectItem key={industry.id} value={industry.id}>
                          {industry.name}
                        </SelectItem>
                      ))}
                      {availableIndustries.length === 0 && !isLoading && (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          You are enrolled in all available industries
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {provider 
                      ? 'You will need to complete the full enrollment process for this industry'
                      : 'After selecting, you\'ll complete your profile registration'
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createEnrollment.isPending || availableIndustries.length === 0 || isLoading}
              >
                {createEnrollment.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {provider ? 'Start Enrollment' : 'Get Started'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
