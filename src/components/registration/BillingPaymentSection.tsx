/**
 * BillingPaymentSection — Payment method tabs, internal dept note, PO/Tax, Terms.
 * Extracted from BillingForm.tsx for decomposition.
 */

import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CreditCard, Building2, Banknote, Shield, Lock, FileText } from 'lucide-react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { BillingFormValues } from '@/lib/validations/billing';

const PAYMENT_METHOD_LABELS: Record<string, { label: string; desc: string; icon: React.ReactNode }> = {
  credit_card: { label: 'Credit/Debit Card', desc: 'Visa, Mastercard, Amex', icon: <CreditCard className="h-4 w-4" /> },
  ach_bank_transfer: { label: 'ACH Bank Transfer', desc: 'US bank accounts', icon: <Building2 className="h-4 w-4" /> },
  wire_transfer: { label: 'Wire Transfer', desc: 'International transfer', icon: <Banknote className="h-4 w-4" /> },
  shadow: { label: 'Internal Tracking', desc: 'Shadow billing', icon: <Shield className="h-4 w-4" /> },
};

interface BillingPaymentSectionProps {
  form: UseFormReturn<BillingFormValues>;
  isInternalDept: boolean;
  availableMethods: Array<{ id: string; payment_method: string }>;
  methodsLoading: boolean;
  platformTerms?: { title: string; version: string; content: string } | null;
}

export function BillingPaymentSection({
  form, isInternalDept, availableMethods, methodsLoading, platformTerms,
}: BillingPaymentSectionProps) {
  const [termsOpen, setTermsOpen] = useState(false);

  return (
    <>
      {/* Payment Method */}
      {!isInternalDept && (
        <Card>
          <CardHeader className="pb-4"><CardTitle className="text-base">Payment Method</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="payment_method" render={({ field }) => (
              <FormItem>
                {methodsLoading ? <Skeleton className="h-12 w-full" /> : (
                  <Tabs value={field.value} onValueChange={field.onChange}>
                    <TabsList className="w-full grid grid-cols-3">
                      {availableMethods.map((pm) => {
                        const info = PAYMENT_METHOD_LABELS[pm.payment_method];
                        return (
                          <TabsTrigger key={pm.id} value={pm.payment_method} className="text-xs lg:text-sm">
                            {info?.icon}<span className="ml-1.5 hidden lg:inline">{info?.label ?? pm.payment_method}</span>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                    <TabsContent value="credit_card" className="space-y-4 mt-4">
                      <div><Label className="text-sm">Card Number</Label><div className="relative"><Input placeholder="1234 5678 9012 3456" className="text-base pr-20" /><div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground text-xs">VISA MC</div></div></div>
                      <div className="grid grid-cols-2 gap-4"><div><Label className="text-sm">Expiry Date</Label><Input placeholder="MM/YY" className="text-base" /></div><div><Label className="text-sm">CVV</Label><Input placeholder="123" className="text-base" /></div></div>
                      <div><Label className="text-sm">Cardholder Name</Label><Input placeholder="John Doe" className="text-base" /></div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3"><Lock className="h-3.5 w-3.5 shrink-0" /><span>256-bit SSL encrypted. We never store your full card number.</span></div>
                    </TabsContent>
                    <TabsContent value="ach_bank_transfer" className="mt-4"><div className="rounded-lg border border-border bg-muted/30 p-4 text-center"><Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">ACH bank transfer details will be provided after registration.</p></div></TabsContent>
                    <TabsContent value="wire_transfer" className="mt-4"><div className="rounded-lg border border-border bg-muted/30 p-4 text-center"><Banknote className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Wire transfer instructions will be emailed after registration.</p></div></TabsContent>
                  </Tabs>
                )}
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>
      )}

      {isInternalDept && (
        <Card><CardContent className="pt-5"><div className="flex items-start gap-3"><Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" /><p className="text-sm text-muted-foreground">As an internal department, billing will be tracked via shadow charges for internal accounting purposes. No actual payment is required.</p></div></CardContent></Card>
      )}

      {/* PO Number + Tax ID */}
      <Card>
        <CardHeader className="pb-4"><CardTitle className="text-base">Additional Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormField control={form.control} name="po_number" render={({ field }) => (<FormItem><FormLabel>PO Number</FormLabel><FormControl><Input {...field} placeholder="Optional" className="text-base" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="tax_id" render={({ field }) => (<FormItem><FormLabel>Tax ID</FormLabel><FormControl><Input {...field} placeholder="Optional" className="text-base" /></FormControl><FormMessage /></FormItem>)} />
          </div>
        </CardContent>
      </Card>

      {/* Terms & Conditions */}
      <FormField control={form.control} name="terms_accepted" render={({ field }) => (
        <FormItem className="flex items-start gap-3 rounded-lg border border-border p-4">
          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" /></FormControl>
          <div className="space-y-1">
            <FormLabel className="cursor-pointer text-sm">
              I accept the{' '}
              <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
                <DialogTrigger asChild>
                  <button type="button" className="text-primary underline hover:no-underline inline-flex items-center gap-1"><FileText className="h-3 w-3" />Terms & Conditions</button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                  <DialogHeader className="shrink-0">
                    <DialogTitle>{platformTerms?.title ?? 'Terms & Conditions'}{platformTerms?.version && <span className="text-muted-foreground text-sm ml-2">v{platformTerms.version}</span>}</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="editor-content max-w-none p-4">
                      {platformTerms?.content ? <div dangerouslySetInnerHTML={{ __html: platformTerms.content }} /> : <p className="text-muted-foreground">No terms available.</p>}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              {platformTerms?.version && <span className="text-muted-foreground text-xs ml-1">(v{platformTerms.version})</span>}
            </FormLabel>
            <FormDescription>By accepting, you agree to our platform terms and privacy policy.</FormDescription>
            <FormMessage />
          </div>
        </FormItem>
      )} />
    </>
  );
}
