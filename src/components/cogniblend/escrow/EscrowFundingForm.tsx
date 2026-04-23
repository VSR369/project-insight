import { useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Building2, FileText, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import type { EscrowInstallmentRecord, EscrowFundingFormValues, EscrowFundingRole } from '@/services/cogniblend/escrowInstallments/escrowInstallmentTypes';

const schema = z.object({
  bankName: z.string().min(1, 'Bank name is required').max(200),
  bankBranch: z.string().max(200),
  bankAddress: z.string().max(500),
  accountNumber: z.string().min(1, 'Account number is required').max(30),
  ifscSwiftCode: z.string().min(1, 'IFSC / SWIFT code is required').max(20),
  depositDate: z.string().min(1, 'Deposit date is required'),
  depositReference: z.string().min(1, 'Deposit reference is required').max(100),
  notes: z.string().max(1000),
  depositAmount: z.coerce.number().positive('Deposit amount must be positive'),
});

const PROOF_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024,
  maxSizeMB: 10,
  allowedTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
  allowedExtensions: ['.pdf', '.png', '.jpg', '.jpeg', '.webp'],
  label: 'Deposit Proof',
} as const;

export interface EscrowFundingFormProps {
  installment: EscrowInstallmentRecord;
  fundingRole: EscrowFundingRole;
  mode: 'confirm' | 'edit';
  proofFile: File | null;
  onOpenExistingProof?: () => void;
  onProofFileChange: (file: File | null) => void;
  isSubmitting: boolean;
  canSubmit: boolean;
  onSubmit: (values: EscrowFundingFormValues) => void;
}

function buildDefaults(installment: EscrowInstallmentRecord): EscrowFundingFormValues {
  return {
    bankName: installment.bank_name ?? '',
    bankBranch: installment.bank_branch ?? '',
    bankAddress: installment.bank_address ?? '',
    accountNumber: installment.account_number_raw ?? '',
    ifscSwiftCode: installment.ifsc_swift_code ?? '',
    depositDate: installment.deposit_date ? new Date(installment.deposit_date).toISOString().split('T')[0] ?? '' : '',
    depositReference: installment.deposit_reference ?? '',
    notes: installment.fc_notes ?? '',
    depositAmount: Number(installment.scheduled_amount),
  };
}

export function EscrowFundingForm({ installment, fundingRole, mode, proofFile, onOpenExistingProof, onProofFileChange, isSubmitting, canSubmit, onSubmit }: EscrowFundingFormProps) {
  const form = useForm<EscrowFundingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(installment),
  });

  const title = mode === 'edit' ? `Edit installment ${installment.installment_number}` : `Confirm installment ${installment.installment_number}`;
  const description = mode === 'edit'
    ? `${fundingRole === 'FC' ? 'Finance Coordinator' : 'Curator'} is updating this funded installment.`
    : `${fundingRole === 'FC' ? 'Finance Coordinator' : 'Curator'} is confirming this scheduled installment.`;
  const submitLabel = mode === 'edit' ? 'Save changes' : 'Confirm installment funding';

  useEffect(() => {
    form.reset(buildDefaults(installment));
    onProofFileChange(null);
  }, [form, installment, onProofFileChange]);

  return (
    <div className="space-y-4 rounded-md border border-border p-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FormField control={form.control} name="bankName" render={({ field }) => (
              <FormItem>
                <FormLabel>Bank name</FormLabel>
                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="bankBranch" render={({ field }) => (
              <FormItem>
                <FormLabel>Branch</FormLabel>
                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="bankAddress" render={({ field }) => (
              <FormItem className="lg:col-span-2">
                <FormLabel>Bank address</FormLabel>
                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="depositDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Deposit date</FormLabel>
                <FormControl><Input type="date" {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="depositReference" render={({ field }) => (
              <FormItem>
                <FormLabel>Deposit reference</FormLabel>
                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="accountNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Account number</FormLabel>
                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="ifscSwiftCode" render={({ field }) => (
              <FormItem>
                <FormLabel>IFSC / SWIFT</FormLabel>
                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="depositAmount" render={({ field }) => (
              <FormItem>
                <FormLabel>Deposit amount</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} disabled /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="space-y-2 lg:col-span-2">
              <p className="text-sm font-medium">Deposit proof</p>
              {installment.proof_file_name && !proofFile ? (
                <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 p-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{installment.proof_file_name}</p>
                      <p className="text-xs text-muted-foreground">Current proof will be kept unless you upload a replacement.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {onOpenExistingProof ? (
                      <Button type="button" variant="outline" size="sm" onClick={onOpenExistingProof} disabled={isSubmitting}>
                        View current proof
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <FileUploadZone config={PROOF_CONFIG} value={proofFile} onChange={onProofFileChange} disabled={isSubmitting} />
              {proofFile && installment.proof_file_name ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">New file will replace the current proof on save.</p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onProofFileChange(null)} disabled={isSubmitting}>
                    <RotateCcw className="h-4 w-4" />
                    Keep current proof
                  </Button>
                </div>
              ) : null}
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem className="lg:col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea rows={3} {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <Button type="submit" className="w-full lg:w-auto" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}
            {canSubmit ? submitLabel : 'Funding unavailable'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
