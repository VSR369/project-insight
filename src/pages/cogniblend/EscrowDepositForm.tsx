import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Building2, Info, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import type { GovernanceMode } from '@/lib/governanceMode';

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const SWIFT_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'AUD', 'CAD', 'SGD', 'AED', 'INR', 'JPY'];
const PROOF_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024,
  maxSizeMB: 10,
  allowedTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
  allowedExtensions: ['.pdf', '.png', '.jpg', '.jpeg', '.webp'],
  label: 'Deposit Proof',
} as const;

export const escrowFormSchema = z.object({
  bank_name: z.string().min(1, 'Bank name is required').max(200),
  bank_branch: z.string().max(200).optional(),
  bank_address: z.string().max(500).optional(),
  currency: z.string().min(1, 'Currency is required'),
  deposit_amount: z.coerce.number().positive('Amount must be positive'),
  deposit_date: z.string().min(1, 'Deposit date is required'),
  deposit_reference: z.string().min(1, 'Transaction reference is required').max(100),
  account_number: z.string().max(30),
  ifsc_swift_code: z
    .string()
    .min(1, 'IFSC/SWIFT code is required')
    .refine(
      (value) => IFSC_RE.test(value) || SWIFT_RE.test(value),
      'Must be a valid IFSC (11 chars) or SWIFT code (8-11 chars)',
    ),
  fc_notes: z.string().max(1000).optional(),
});

export type EscrowFormValues = z.infer<typeof escrowFormSchema>;

interface EscrowDepositFormProps {
  form: UseFormReturn<EscrowFormValues>;
  onSubmit: (values: EscrowFormValues) => void;
  isPending: boolean;
  proofFile: File | null;
  onProofFileChange: (file: File | null) => void;
  proofUploading: boolean;
  governanceMode?: GovernanceMode;
  isEditable?: boolean;
  isSubmitEnabled?: boolean;
  existingProofFileName?: string | null;
  maskedAccountNumber?: string | null;
  previewMessage?: string;
}

export function EscrowDepositForm({
  form,
  onSubmit,
  isPending,
  proofFile,
  onProofFileChange,
  proofUploading,
  governanceMode,
  isEditable = true,
  isSubmitEnabled = true,
  existingProofFileName,
  maskedAccountNumber,
  previewMessage,
}: EscrowDepositFormProps) {
  const isControlled = governanceMode === 'CONTROLLED';
  const isDisabled = !isEditable || isPending || proofUploading;

  return (
    <div className="space-y-4 border-t pt-4">
      {governanceMode && (
        <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {isControlled ? <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span>
            {isControlled
              ? 'Mandatory — challenge cannot publish until escrow is funded for the full reward total.'
              : 'Optional — Creator opted into escrow for this Structured challenge.'}
          </span>
        </div>
      )}

      {previewMessage && <p className="text-xs text-muted-foreground">{previewMessage}</p>}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FormField control={form.control} name="bank_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Bank Name *</FormLabel>
                <FormControl><Input placeholder="e.g. HSBC Holdings" disabled={isDisabled} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="bank_branch" render={({ field }) => (
              <FormItem>
                <FormLabel>Branch</FormLabel>
                <FormControl><Input placeholder="e.g. London Main" disabled={isDisabled} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="bank_address" render={({ field }) => (
              <FormItem className="lg:col-span-2">
                <FormLabel>Bank Address</FormLabel>
                <FormControl><Input placeholder="e.g. 8 Canada Square, London E14 5HQ" disabled={isDisabled} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="currency" render={({ field }) => (
              <FormItem>
                <FormLabel>Currency *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isDisabled}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl>
                  <SelectContent>{CURRENCIES.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="deposit_amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Deposited Amount *</FormLabel>
                <FormControl><Input type="number" step="0.01" disabled={isDisabled} {...field} /></FormControl>
                <FormDescription>Must match the reward structure total.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="deposit_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Deposit Date *</FormLabel>
                <FormControl><Input type="date" disabled={isDisabled} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="deposit_reference" render={({ field }) => (
              <FormItem>
                <FormLabel>Transaction Reference *</FormLabel>
                <FormControl><Input placeholder="e.g. TXN-2026-03-001" disabled={isDisabled} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="account_number" render={({ field }) => (
              <FormItem>
                <FormLabel>Account Number</FormLabel>
                <FormControl><Input type="text" placeholder="Enter account number when submission unlocks" disabled={isDisabled} {...field} /></FormControl>
                <FormDescription>
                  {maskedAccountNumber ? `Stored account reference: ${maskedAccountNumber}` : 'The stored account number is masked after submission.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="ifsc_swift_code" render={({ field }) => (
              <FormItem>
                <FormLabel>IFSC / SWIFT Code *</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    className="uppercase"
                    maxLength={11}
                    placeholder="e.g. SBIN0001234"
                    disabled={isDisabled}
                    {...field}
                    onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormDescription>India: 11-char IFSC. International: 8-11 char SWIFT.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <div className="space-y-2 lg:col-span-2">
              <Label className="flex items-center gap-2">
                Deposit Proof
                {proofUploading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </Label>
              <FileUploadZone
                config={PROOF_CONFIG}
                value={proofFile}
                onChange={onProofFileChange}
                disabled={isDisabled}
              />
              {existingProofFileName && !proofFile && (
                <p className="text-xs text-muted-foreground">Existing proof on file: {existingProofFileName}</p>
              )}
            </div>
            <FormField control={form.control} name="fc_notes" render={({ field }) => (
              <FormItem className="lg:col-span-2">
                <FormLabel>FC Notes</FormLabel>
                <FormControl><Textarea placeholder="Any additional notes about the deposit…" rows={2} disabled={isDisabled} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="flex flex-col items-end gap-2">
            <Button type="submit" disabled={!isSubmitEnabled || isPending || proofUploading}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}
              {isSubmitEnabled ? 'Confirm Escrow Deposit' : 'Submission unlocks at Phase 3'}
            </Button>
            {!isSubmitEnabled && <p className="text-xs text-muted-foreground">You can review all required fields now and submit once the lifecycle gate opens.</p>}
          </div>
        </form>
      </Form>
    </div>
  );
}
