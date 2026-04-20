/**
 * EscrowDepositForm — Inline form for confirming escrow deposits.
 * FC role only; mounted inside EscrowManagementPage.
 */

import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import { Loader2, Building2, ShieldAlert, Info } from 'lucide-react';
import { z } from 'zod';
import type { GovernanceMode } from '@/lib/governanceMode';

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const SWIFT_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

export const escrowFormSchema = z.object({
  bank_name: z.string().min(1, 'Bank name is required').max(200),
  bank_branch: z.string().max(200).optional(),
  bank_address: z.string().max(500).optional(),
  currency: z.string().min(1, 'Currency is required'),
  deposit_amount: z.coerce.number().positive('Amount must be positive'),
  deposit_date: z.string().min(1, 'Deposit date is required'),
  deposit_reference: z.string().min(1, 'Transaction reference is required').max(100),
  account_number: z.string().min(1, 'Account number is required').max(30),
  ifsc_swift_code: z
    .string()
    .min(1, 'IFSC/SWIFT code is required')
    .refine(
      (val) => IFSC_RE.test(val) || SWIFT_RE.test(val),
      'Must be a valid IFSC (11 chars, e.g. SBIN0001234) or SWIFT code (8-11 chars, e.g. SBININBBXXX)',
    ),
  fc_notes: z.string().max(1000).optional(),
});

export type EscrowFormValues = z.infer<typeof escrowFormSchema>;

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'AUD', 'CAD', 'SGD', 'AED', 'INR', 'JPY'];

const PROOF_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024,
  maxSizeMB: 10,
  allowedTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
  allowedExtensions: ['.pdf', '.png', '.jpg', '.jpeg', '.webp'],
  label: 'Deposit Proof',
} as const;

interface EscrowDepositFormProps {
  form: UseFormReturn<EscrowFormValues>;
  onSubmit: (values: EscrowFormValues) => void;
  isPending: boolean;
  proofFile: File | null;
  onProofFileChange: (file: File | null) => void;
  proofUploading: boolean;
  /** S7B-3: governance mode drives the guidance banner. */
  governanceMode?: GovernanceMode;
}

export function EscrowDepositForm({
  form,
  onSubmit,
  isPending,
  proofFile,
  onProofFileChange,
  proofUploading,
  governanceMode,
}: EscrowDepositFormProps) {
  const isControlled = governanceMode === 'CONTROLLED';
  return (
    <div className="mt-4 pt-4 border-t">
      {governanceMode && (
        <div
          className={`mb-3 rounded-md border px-3 py-2 text-xs flex items-start gap-2 ${
            isControlled
              ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
              : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300'
          }`}
        >
          {isControlled ? (
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          ) : (
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          )}
          <span>
            {isControlled
              ? 'Mandatory — challenge cannot publish until escrow is funded for the full reward total.'
              : 'Optional — Creator opted into escrow for this Structured challenge.'}
          </span>
        </div>
      )}
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

            <FormField control={form.control} name="account_number" render={({ field }) => (
              <FormItem>
                <FormLabel>Account Number *</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="e.g. 123456789012" {...field} />
                </FormControl>
                <FormDescription>Bank account number (will be stored masked)</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="ifsc_swift_code" render={({ field }) => (
              <FormItem>
                <FormLabel>IFSC/SWIFT Code *</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    className="uppercase"
                    maxLength={11}
                    placeholder="e.g. SBIN0001234"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormDescription>
                  India: 11-char IFSC (e.g. SBIN0001234). International: 8-11 char SWIFT.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <div className="lg:col-span-2 space-y-2">
              <Label className="flex items-center gap-2">
                Deposit Proof *
                {proofUploading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </Label>
              <FileUploadZone
                config={PROOF_CONFIG}
                value={proofFile}
                onChange={onProofFileChange}
                disabled={proofUploading || isPending}
              />
              <p className="text-xs text-muted-foreground">
                Upload deposit proof (PDF or image, max 10MB)
              </p>
            </div>

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
            <Button type="submit" disabled={isPending || proofUploading}>
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
