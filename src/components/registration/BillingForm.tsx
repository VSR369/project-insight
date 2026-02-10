/**
 * Billing Form (REG-005)
 * 
 * Step 5: Payment method, billing address, terms acceptance, subscription creation.
 * Business Rules: BR-REG-016, BR-SAAS-001/003, BR-ZFE-001
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2 } from 'lucide-react';

import { useRegistrationContext } from '@/contexts/RegistrationContext';
import {
  usePaymentMethods,
  useActivePlatformTerms,
  useSaveBillingInfo,
  useCreateSubscription,
} from '@/hooks/queries/useBillingData';
import { useStatesForCountry } from '@/hooks/queries/useRegistrationData';
import { CountrySelector } from './CountrySelector';
import { billingSchema, type BillingFormValues } from '@/lib/validations/billing';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PAYMENT_METHOD_LABELS: Record<string, { label: string; desc: string }> = {
  credit_card: { label: 'Credit Card', desc: 'Visa, Mastercard, American Express' },
  ach_bank_transfer: { label: 'ACH Bank Transfer', desc: 'US bank accounts only' },
  wire_transfer: { label: 'Wire Transfer', desc: 'International bank transfer' },
  shadow: { label: 'Internal Tracking', desc: 'No actual charge — shadow billing' },
};

export function BillingForm() {
  // ══════════════════════════════════════
  // SECTION 1: useState hooks
  // ══════════════════════════════════════
  const [termsOpen, setTermsOpen] = useState(false);

  // ══════════════════════════════════════
  // SECTION 2: Context and navigation
  // ══════════════════════════════════════
  const { state, setStep5Data, setStep } = useRegistrationContext();
  const navigate = useNavigate();

  // ══════════════════════════════════════
  // SECTION 3: Form hook
  // ══════════════════════════════════════
  const isInternalDept = state.orgTypeFlags?.zero_fee_eligible ?? false;
  const countryId = state.step1?.hq_country_id;

  const form = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      billing_entity_name: state.step1?.legal_entity_name ?? '',
      billing_email: state.step2?.email ?? '',
      billing_address_line1: '',
      billing_address_line2: '',
      billing_city: state.step1?.city ?? '',
      billing_state_province_id: state.step1?.state_province_id ?? '',
      billing_country_id: countryId ?? '',
      billing_postal_code: '',
      payment_method: isInternalDept ? 'shadow' : 'credit_card',
      po_number: '',
      tax_id: '',
      terms_accepted: false,
    },
  });

  const watchedBillingCountryId = form.watch('billing_country_id');

  // ══════════════════════════════════════
  // SECTION 4: Query/Mutation hooks
  // ══════════════════════════════════════
  const { data: paymentMethods, isLoading: methodsLoading } = usePaymentMethods(watchedBillingCountryId);
  const { data: platformTerms } = useActivePlatformTerms();
  const { data: billingStates, isLoading: statesLoading } = useStatesForCountry(watchedBillingCountryId);
  const saveBilling = useSaveBillingInfo();
  const createSubscription = useCreateSubscription();

  // ══════════════════════════════════════
  // SECTION 5: Derived values
  // ══════════════════════════════════════
  // Available payment methods for the selected country
  const availableMethods = isInternalDept
    ? [{ payment_method: 'shadow' as const, id: 'shadow', tier_id: null }]
    : paymentMethods?.filter((pm) => !state.step4?.tier_id || !pm.tier_id || pm.tier_id === state.step4.tier_id) ?? [];

  const isSubmitting = saveBilling.isPending || createSubscription.isPending;

  // ══════════════════════════════════════
  // SECTION 6: Event handlers
  // ══════════════════════════════════════
  const handleSubmit = async (data: BillingFormValues) => {
    if (!state.organizationId || !state.tenantId || !state.step4) {
      toast.error('Missing registration data. Please go back and complete previous steps.');
      return;
    }

    // 1. Save billing info
    await saveBilling.mutateAsync({
      organization_id: state.organizationId,
      tenant_id: state.tenantId,
      billing_entity_name: data.billing_entity_name,
      billing_email: data.billing_email,
      billing_address_line1: data.billing_address_line1,
      billing_address_line2: data.billing_address_line2,
      billing_city: data.billing_city,
      billing_state_province_id: data.billing_state_province_id,
      billing_country_id: data.billing_country_id,
      billing_postal_code: data.billing_postal_code,
      payment_method: data.payment_method,
      po_number: data.po_number,
      tax_id: data.tax_id,
    });

    // 2. Generate terms acceptance hash
    const termsHash = platformTerms
      ? await generateTermsHash(state.organizationId, platformTerms.version, platformTerms.content)
      : undefined;

    // 3. Create subscription
    await createSubscription.mutateAsync({
      organization_id: state.organizationId,
      tenant_id: state.tenantId,
      tier_id: state.step4.tier_id,
      billing_cycle_id: state.step4.billing_cycle_id,
      engagement_model_id: state.step4.engagement_model_id,
      payment_type: isInternalDept ? 'shadow' : 'live',
      terms_version: platformTerms?.version,
      terms_acceptance_hash: termsHash,
    });

    setStep5Data({
      payment_method: data.payment_method,
      is_internal_department: isInternalDept,
    });

    setStep(6);
    toast.success('Registration complete! Welcome aboard.');
    navigate('/login');
  };

  // ══════════════════════════════════════
  // SECTION 7: Render
  // ══════════════════════════════════════
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Billing Entity */}
        <FormField
          control={form.control}
          name="billing_entity_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Entity Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Company or dept name for invoicing" className="text-base" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Billing Email */}
        <FormField
          control={form.control}
          name="billing_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Email *</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="billing@company.com" className="text-base" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address */}
        <FormField
          control={form.control}
          name="billing_address_line1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address Line 1 *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Street address" className="text-base" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="billing_address_line2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address Line 2</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Suite, floor, etc." className="text-base" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* City + Postal Code side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="billing_city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City *</FormLabel>
                <FormControl>
                  <Input {...field} className="text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="billing_postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal Code *</FormLabel>
                <FormControl>
                  <Input {...field} className="text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Country + State side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="billing_country_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country *</FormLabel>
                <FormControl>
                  <CountrySelector value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="billing_state_province_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State / Province</FormLabel>
                {statesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={field.value || ''} onValueChange={field.onChange} disabled={!watchedBillingCountryId}>
                    <FormControl>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {billingStates?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* PO Number + Tax ID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="po_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PO Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Optional" className="text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tax_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax ID</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Optional" className="text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Payment Method */}
        {!isInternalDept && (
          <FormField
            control={form.control}
            name="payment_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method *</FormLabel>
                {methodsLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-1 lg:grid-cols-2 gap-3"
                    >
                      {availableMethods.map((pm) => {
                        const info = PAYMENT_METHOD_LABELS[pm.payment_method] ?? { label: pm.payment_method, desc: '' };
                        return (
                          <Label
                            key={pm.id}
                            htmlFor={`pm-${pm.id}`}
                            className={cn(
                              'flex flex-col rounded-lg border p-3 cursor-pointer transition-all',
                              field.value === pm.payment_method
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/40',
                            )}
                          >
                            <RadioGroupItem
                              id={`pm-${pm.id}`}
                              value={pm.payment_method}
                              className="sr-only"
                            />
                            <span className="font-medium text-foreground text-sm">{info.label}</span>
                            <span className="text-xs text-muted-foreground">{info.desc}</span>
                          </Label>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isInternalDept && (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              As an internal department, billing will be tracked via shadow charges for internal accounting purposes. No actual payment is required.
            </p>
          </div>
        )}

        {/* Terms & Conditions */}
        <FormField
          control={form.control}
          name="terms_accepted"
          render={({ field }) => (
            <FormItem className="flex items-start gap-3 rounded-lg border border-border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-0.5"
                />
              </FormControl>
              <div className="space-y-1">
                <FormLabel className="cursor-pointer text-sm">
                  I accept the{' '}
                  <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="text-primary underline hover:no-underline inline-flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        Terms & Conditions
                      </button>
                    </DialogTrigger>
                    <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                      <DialogHeader className="shrink-0">
                        <DialogTitle>
                          {platformTerms?.title ?? 'Terms & Conditions'}
                          {platformTerms?.version && (
                            <span className="text-muted-foreground text-sm ml-2">v{platformTerms.version}</span>
                          )}
                        </DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="flex-1 min-h-0">
                        <div className="prose prose-sm max-w-none p-4 text-foreground">
                          {platformTerms?.content ? (
                            <div dangerouslySetInnerHTML={{ __html: platformTerms.content }} />
                          ) : (
                            <p className="text-muted-foreground">No terms available.</p>
                          )}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                  {platformTerms?.version && (
                    <span className="text-muted-foreground text-xs ml-1">(v{platformTerms.version})</span>
                  )}
                </FormLabel>
                <FormDescription>
                  By accepting, you agree to our platform terms and privacy policy.
                </FormDescription>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/registration/plan-selection')}
          >
            Back
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Complete Registration
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ============================================================
// Utility: Generate SHA-256 hash for terms acceptance
// ============================================================
async function generateTermsHash(orgId: string, version: string, content: string): Promise<string> {
  const input = `${orgId}:${version}:${content}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
