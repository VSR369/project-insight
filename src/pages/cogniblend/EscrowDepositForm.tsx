/**
 * EscrowDepositForm — Inline form for confirming escrow deposits.
 * Extracted from EscrowManagementPage.tsx.
 */

import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Building2 } from 'lucide-react';
import { z } from 'zod';

export const escrowFormSchema = z.object({
  bank_name: z.string().min(1, 'Bank name is required').max(200),
  bank_branch: z.string().max(200).optional(),
  bank_address: z.string().max(500).optional(),
  currency: z.string().min(1, 'Currency is required'),
  deposit_amount: z.coerce.number().positive('Amount must be positive'),
  deposit_date: z.string().min(1, 'Deposit date is required'),
  deposit_reference: z.string().min(1, 'Transaction reference is required').max(100),
  fc_notes: z.string().max(1000).optional(),
});

export type EscrowFormValues = z.infer<typeof escrowFormSchema>;

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'AUD', 'CAD', 'SGD', 'AED', 'INR', 'JPY'];

interface EscrowDepositFormProps {
  form: UseFormReturn<EscrowFormValues>;
  onSubmit: (values: EscrowFormValues) => void;
  isPending: boolean;
}

export function EscrowDepositForm({ form, onSubmit, isPending }: EscrowDepositFormProps) {
  return (
    <div className="mt-4 pt-4 border-t">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormField control={form.control} name="bank_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Bank Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. HSBC Holdings" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="bank_branch" render={({ field }) => (
              <FormItem>
                <FormLabel>Branch</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. London Main" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="bank_address" render={({ field }) => (
              <FormItem className="lg:col-span-2">
                <FormLabel>Bank Address</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 8 Canada Square, London E14 5HQ" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="currency" render={({ field }) => (
              <FormItem>
                <FormLabel>Currency *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="deposit_amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Deposited Amount *</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormDescription>Must match the reward structure total</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="deposit_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Deposit Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="deposit_reference" render={({ field }) => (
              <FormItem>
                <FormLabel>Transaction Reference *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. TXN-2026-03-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="fc_notes" render={({ field }) => (
              <FormItem className="lg:col-span-2">
                <FormLabel>FC Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Any additional notes about the deposit…" rows={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Building2 className="h-4 w-4 mr-2" />
              )}
              Confirm Escrow Deposit
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
