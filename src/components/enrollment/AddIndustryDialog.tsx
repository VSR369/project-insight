/**
 * Add Industry Dialog
 * 
 * Dialog for enrolling in a new industry segment.
 * Uses useAddIndustryEnrollment hook for business logic (R2).
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';
import { useOptionalEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useCreateEnrollment, useProviderEnrollments } from '@/hooks/queries/useProviderEnrollments';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useAddIndustryEnrollment } from '@/hooks/queries/useAddIndustryEnrollment';

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
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const enrollmentContext = useOptionalEnrollmentContext();
  const { data: providerEnrollments = [], isLoading: enrollmentsLoading } = useProviderEnrollments(provider?.id);
  const { data: allIndustries = [], isLoading: industriesLoading } = useIndustrySegments();
  const createEnrollment = useCreateEnrollment();
  const addIndustry = useAddIndustryEnrollment(createEnrollment);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { industrySegmentId: '' },
  });

  const availableIndustries = useMemo(() => {
    const enrolledIds = new Set(providerEnrollments.map(e => e.industry_segment_id));
    return allIndustries.filter(i => !enrolledIds.has(i.id));
  }, [allIndustries, providerEnrollments]);

  const isRegistrationComplete = useMemo(() => {
    if (!provider) return false;
    return !!(provider.first_name && provider.address && provider.country_id);
  }, [provider]);

  const onSubmit = async (values: FormValues) => {
    const result = await addIndustry.mutateAsync({
      industrySegmentId: values.industrySegmentId,
      existingProviderId: provider?.id,
      enrollmentCount: providerEnrollments.length,
    });

    enrollmentContext?.setActiveEnrollment?.(result.enrollmentId);
    enrollmentContext?.refreshEnrollments?.();
    form.reset();
    onOpenChange(false);

    if (isRegistrationComplete || provider) {
      toast.success(`Started enrollment in ${result.industryName || 'new industry'}!`);
      navigate('/enroll/participation-mode');
    } else {
      toast.success('Industry selected! Now complete your profile.');
      navigate('/enroll/registration');
    }
  };

  const isLoading = providerLoading || industriesLoading || enrollmentsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{provider ? 'Add New Industry' : 'Select Your Industry'}</DialogTitle>
          <DialogDescription>
            {provider
              ? 'Enroll in a new industry segment to demonstrate your expertise in multiple domains.'
              : 'Choose an industry segment to begin your professional profile.'}
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
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select an industry segment" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableIndustries.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                      {availableIndustries.length === 0 && !isLoading && (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          You are enrolled in all available industries
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {provider ? 'Complete the full enrollment process for this industry' : 'After selecting, you\'ll complete your profile'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={addIndustry.isPending || availableIndustries.length === 0 || isLoading}>
                {addIndustry.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {provider ? 'Start Enrollment' : 'Get Started'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
