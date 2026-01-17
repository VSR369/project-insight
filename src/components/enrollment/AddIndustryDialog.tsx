/**
 * Add Industry Dialog
 * 
 * Dialog for enrolling in a new industry segment.
 * Excludes industries the provider is already enrolled in.
 */

import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
import { useCreateEnrollment } from '@/hooks/queries/useProviderEnrollments';
import { useCurrentProvider } from '@/hooks/queries/useProvider';

const formSchema = z.object({
  industrySegmentId: z.string().min(1, 'Please select an industry'),
});

type FormValues = z.infer<typeof formSchema>;

interface AddIndustryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddIndustryDialog({ open, onOpenChange }: AddIndustryDialogProps) {
  const { data: provider } = useCurrentProvider();
  const enrollmentContext = useOptionalEnrollmentContext();
  const enrollments = enrollmentContext?.enrollments ?? [];
  const refreshEnrollments = enrollmentContext?.refreshEnrollments;
  
  const { data: allIndustries = [], isLoading: industriesLoading } = useIndustrySegments();
  const createEnrollment = useCreateEnrollment();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      industrySegmentId: '',
    },
  });

  // Filter out industries the provider is already enrolled in
  const availableIndustries = useMemo(() => {
    const enrolledIds = new Set(enrollments.map(e => e.industry_segment_id));
    return allIndustries.filter(industry => !enrolledIds.has(industry.id));
  }, [allIndustries, enrollments]);

  const onSubmit = async (values: FormValues) => {
    if (!provider) return;

    try {
      await createEnrollment.mutateAsync({
        providerId: provider.id,
        industrySegmentId: values.industrySegmentId,
        isPrimary: enrollments.length === 0, // First enrollment is primary
      });
      
      refreshEnrollments?.();
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Industry</DialogTitle>
          <DialogDescription>
            Enroll in a new industry segment to demonstrate your expertise in multiple domains.
            Each industry has its own independent progress and verification path.
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
                    disabled={industriesLoading}
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
                      {availableIndustries.length === 0 && !industriesLoading && (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          You are enrolled in all available industries
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    You will need to complete the full enrollment process for this industry
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
                disabled={createEnrollment.isPending || availableIndustries.length === 0}
              >
                {createEnrollment.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Start Enrollment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
