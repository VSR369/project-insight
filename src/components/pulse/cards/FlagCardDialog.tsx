/**
 * FlagCardDialog - Report content dialog
 * Allows users to flag inappropriate cards or layers
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Flag, AlertTriangle, Lock } from 'lucide-react';
import { flagSchema, type FlagInput } from '@/lib/validations/pulseCard';
import { useCreateFlag } from '@/hooks/queries/usePulseModeration';
import { usePulseCardsReputation } from '@/hooks/queries/usePulseCardsReputation';
import { FLAG_TYPES, REPUTATION_GATES } from '@/constants/pulseCards.constants';

interface FlagCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'card' | 'layer';
  targetId: string;
  providerId: string;
}

export function FlagCardDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  providerId,
}: FlagCardDialogProps) {
  const { data: reputation, isLoading: repLoading } = usePulseCardsReputation(providerId);
  const createFlag = useCreateFlag();

  const canFlag = reputation?.canFlag ?? false;

  const form = useForm<FlagInput>({
    resolver: zodResolver(flagSchema),
    defaultValues: {
      target_type: targetType,
      target_id: targetId,
      flag_type: undefined,
      description: '',
    },
  });

  const onSubmit = async (data: FlagInput) => {
    try {
      await createFlag.mutateAsync({
        ...data,
        target_type: targetType,
        target_id: targetId,
        reporter_id: providerId,
      });
      form.reset();
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const flagTypeEntries = Object.entries(FLAG_TYPES) as [keyof typeof FLAG_TYPES, typeof FLAG_TYPES[keyof typeof FLAG_TYPES]][];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Report {targetType === 'card' ? 'Card' : 'Contribution'}
          </DialogTitle>
          <DialogDescription>
            Help us maintain a constructive community by reporting content that violates our guidelines.
          </DialogDescription>
        </DialogHeader>

        {/* Reputation Gate Warning */}
        {!canFlag && !repLoading && (
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You need at least {REPUTATION_GATES.FLAG_CONTENT} reputation points to flag content.
              You currently have {reputation?.total || 0} points.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Flag Type Selection */}
            <FormField
              control={form.control}
              name="flag_type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Reason for report *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                    >
                      {flagTypeEntries.map(([key, config]) => (
                        <FormItem
                          key={key}
                          className="flex items-start space-x-3 space-y-0 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                        >
                          <FormControl>
                            <RadioGroupItem
                              value={key}
                              disabled={!canFlag}
                              className="mt-0.5"
                            />
                          </FormControl>
                          <div className="space-y-0.5 flex-1">
                            <FormLabel className="font-medium cursor-pointer">
                              {config.emoji} {config.label}
                            </FormLabel>
                            <FormDescription className="text-xs">
                              {config.description}
                            </FormDescription>
                          </div>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional Details */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional details (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Provide any additional context that would help reviewers understand the issue..."
                      className="min-h-[80px] resize-none"
                      maxLength={500}
                      disabled={!canFlag}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {(field.value?.length || 0)}/500 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Warning */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Note:</strong> False reports may result in reputation penalties.
                Only flag content that genuinely violates community guidelines.
              </AlertDescription>
            </Alert>

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
                variant="destructive"
                disabled={!canFlag || createFlag.isPending}
              >
                {createFlag.isPending ? 'Submitting...' : 'Submit Report'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
