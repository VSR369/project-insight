/**
 * Compliance Form (REG-003)
 * 
 * Step 3: Export control, ITAR, data residency, and compliance certifications.
 * Business Rules: BR-REG-008 (Tax ID), BR-REG-009 (Export Control)
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Shield } from 'lucide-react';

import { useRegistrationContext } from '@/contexts/RegistrationContext';
import {
  useExportControlStatuses,
  useDataResidencyOptions,
  useUpsertCompliance,
} from '@/hooks/queries/useComplianceData';
import {
  complianceSchema,
  type ComplianceFormValues,
} from '@/lib/validations/compliance';

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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export function ComplianceForm() {
  // ══════════════════════════════════════
  // SECTION 1: Context and navigation
  // ══════════════════════════════════════
  const { state, setStep3Data, setStep } = useRegistrationContext();
  const navigate = useNavigate();

  // ══════════════════════════════════════
  // SECTION 2: Form hook
  // ══════════════════════════════════════
  const form = useForm<ComplianceFormValues>({
    resolver: zodResolver(complianceSchema),
    defaultValues: {
      export_control_status_id: state.step3?.export_control_status_id ?? '',
      itar_certified: state.step3?.is_itar_restricted ?? false,
      itar_certification_expiry: '',
      data_residency_id: state.step3?.data_residency_id ?? '',
      gdpr_compliant: false,
      hipaa_compliant: false,
      soc2_compliant: false,
      iso27001_certified: false,
      compliance_notes: '',
    },
  });

  const watchedExportControlId = form.watch('export_control_status_id');
  const watchedItarCertified = form.watch('itar_certified');

  // ══════════════════════════════════════
  // SECTION 3: Query/Mutation hooks
  // ══════════════════════════════════════
  const { data: exportStatuses, isLoading: exportStatusesLoading } = useExportControlStatuses();
  const { data: dataResidencyOptions, isLoading: residencyLoading } = useDataResidencyOptions();
  const upsertCompliance = useUpsertCompliance();

  // ══════════════════════════════════════
  // SECTION 4: Derived values
  // ══════════════════════════════════════
  const selectedExportStatus = exportStatuses?.find((s) => s.id === watchedExportControlId);
  const requiresItar = selectedExportStatus?.requires_itar_compliance ?? false;

  // ══════════════════════════════════════
  // SECTION 5: useEffect hooks
  // ══════════════════════════════════════
  // Guard against ITAR reset on initial mount when restoring context
  const isInitialMount = useRef(true);

  // Clear ITAR fields when export control changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!requiresItar) {
      form.setValue('itar_certified', false);
      form.setValue('itar_certification_expiry', '');
    }
  }, [requiresItar, form]);

  // ══════════════════════════════════════
  // SECTION 6: Event handlers
  // ══════════════════════════════════════
  const handleSubmit = async (data: ComplianceFormValues) => {
    if (!state.organizationId || !state.tenantId) {
      return;
    }

    try {
      await upsertCompliance.mutateAsync({
        organization_id: state.organizationId,
        tenant_id: state.tenantId,
        export_control_status_id: data.export_control_status_id,
        itar_certified: data.itar_certified,
        itar_certification_expiry: data.itar_certification_expiry || undefined,
        data_residency_id: data.data_residency_id || undefined,
        gdpr_compliant: data.gdpr_compliant,
        hipaa_compliant: data.hipaa_compliant,
        soc2_compliant: data.soc2_compliant,
        iso27001_certified: data.iso27001_certified,
        compliance_notes: data.compliance_notes || undefined,
      });

      setStep3Data({
        tax_id: '',
        tax_id_label: '',
        export_control_status_id: data.export_control_status_id,
        is_itar_restricted: data.itar_certified,
        data_residency_id: data.data_residency_id,
      });

      setStep(4);
      navigate('/registration/plan-selection');
    } catch {
      // Error already handled by mutation's onError callback
    }
  };

  const isSubmitting = upsertCompliance.isPending;
  const isReturning = !!state.organizationId && !!state.step3;
  const { isDirty } = form.formState;
  const showContinueOnly = isReturning && !isDirty;

  const handleContinueOnly = () => {
    setStep(4);
    navigate('/registration/plan-selection');
  };

  // ══════════════════════════════════════
  // SECTION 7: Render
  // ══════════════════════════════════════
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Export Control Status */}
        <FormField
          control={form.control}
          name="export_control_status_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Export Control Classification *</FormLabel>
              {exportStatusesLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Select export control status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {exportStatuses?.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedExportStatus?.description && (
                <FormDescription>{selectedExportStatus.description}</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ITAR Warning & Fields */}
        {requiresItar && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This classification requires ITAR compliance. ITAR-restricted organizations
              have limited public listing visibility and specific data handling requirements.
            </AlertDescription>
          </Alert>
        )}

        {requiresItar && (
          <div className="space-y-4 rounded-lg border border-border p-4">
            <FormField
              control={form.control}
              name="itar_certified"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mt-1"
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="cursor-pointer">
                      We are ITAR certified
                    </FormLabel>
                    <FormDescription>
                      International Traffic in Arms Regulations compliance
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {watchedItarCertified && (
              <FormField
                control={form.control}
                name="itar_certification_expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ITAR Certification Expiry Date *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" className="text-base" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {/* Data Residency */}
        <FormField
          control={form.control}
          name="data_residency_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data Residency Preference</FormLabel>
              {residencyLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Select data residency (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {dataResidencyOptions?.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormDescription>
                Where your data should be stored and processed
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Compliance Certifications */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Shield className="h-4 w-4" />
            <span>Compliance Certifications</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Select all certifications that apply to your organization.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[
              { name: 'gdpr_compliant' as const, label: 'GDPR Compliant', desc: 'EU General Data Protection Regulation' },
              { name: 'hipaa_compliant' as const, label: 'HIPAA Compliant', desc: 'Health Insurance Portability and Accountability Act' },
              { name: 'soc2_compliant' as const, label: 'SOC 2 Compliant', desc: 'Service Organization Control 2' },
              { name: 'iso27001_certified' as const, label: 'ISO 27001 Certified', desc: 'Information Security Management' },
            ].map((cert) => (
              <FormField
                key={cert.name}
                control={form.control}
                name={cert.name}
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="space-y-0.5">
                      <FormLabel className="cursor-pointer text-sm font-medium">
                        {cert.label}
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">{cert.desc}</p>
                    </div>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="compliance_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Any additional compliance information..."
                  className="text-base resize-none"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/registration/primary-contact')}
          >
            Back
          </Button>
          {showContinueOnly ? (
            <Button type="button" onClick={handleContinueOnly}>
              Continue to Plan Selection
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save & Continue
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
