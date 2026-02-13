/**
 * SaasAgreementFormDialog — Dedicated form dialog for SaaS Agreements
 * Supports all DB fields with collapsible sections, contextual help,
 * conditional visibility, shadow billing cross-validation,
 * department/functional area selects, and inline child org creation.
 *
 * Standards: Section 7.3 (dialog), 8.1 (Zod+RHF), 23 (hook order)
 */

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronDown, Info, Plus } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  saasAgreementSchema,
  type SaasAgreementFormValues,
  type ChildOrgFormValues,
  SAAS_AGREEMENT_DEFAULTS,
  AGREEMENT_TYPES,
  FEE_FREQUENCIES,
  BILLING_FREQUENCIES,
  AGREEMENT_TYPE_HELP,
  AGREEMENT_SCOPES,
} from "@/pages/admin/saas/saasAgreement.schema";

import { useDepartments } from "@/hooks/queries/usePrimaryContactData";
import { useFunctionalAreas } from "@/hooks/queries/useFunctionalAreas";
import { useCreateChildOrg } from "@/hooks/queries/useSaasData";
import { CreateChildOrgDialog } from "@/components/admin/CreateChildOrgDialog";

interface SaasAgreementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  defaultValues: Partial<SaasAgreementFormValues>;
  childOrgOptions: { value: string; label: string }[];
  existingAgreements: Array<{
    id: string;
    agreement_type: string;
    shadow_charge_rate: number | null;
  }>;
  editingAgreementId?: string | null;
  parentOrgId: string;
  parentOrgName?: string;
  isLoading: boolean;
  onSubmit: (data: SaasAgreementFormValues) => Promise<void>;
}

export function SaasAgreementFormDialog({
  open,
  onOpenChange,
  mode,
  defaultValues,
  childOrgOptions,
  existingAgreements,
  editingAgreementId,
  parentOrgId,
  parentOrgName,
  isLoading,
  onSubmit,
}: SaasAgreementFormDialogProps) {
  // ══════════════════════════════════════
  // SECTION 1: useState hooks
  // ══════════════════════════════════════
  const [childOrgDialogOpen, setChildOrgDialogOpen] = useState(false);

  // ══════════════════════════════════════
  // SECTION 2: Custom hooks
  // ══════════════════════════════════════
  const { data: departments = [] } = useDepartments();
  const { data: functionalAreas = [] } = useFunctionalAreas();
  const createChildOrg = useCreateChildOrg();

  // ══════════════════════════════════════
  // SECTION 3: Form hooks
  // ══════════════════════════════════════
  const form = useForm<SaasAgreementFormValues>({
    resolver: zodResolver(saasAgreementSchema),
    defaultValues: { ...SAAS_AGREEMENT_DEFAULTS, ...defaultValues },
  });

  const agreementType = form.watch("agreement_type");
  const selectedDepartmentId = form.watch("department_id");
  const agreementScope = form.watch("agreement_scope");
  const isInternal = agreementScope === "internal";

  // ══════════════════════════════════════
  // SECTION 5: useEffect hooks
  // ══════════════════════════════════════
  useEffect(() => {
    if (open) {
      form.reset({ ...SAAS_AGREEMENT_DEFAULTS, ...defaultValues });
    }
  }, [open, defaultValues, form]);

  // ══════════════════════════════════════
  // SECTION 6: Memos
  // ══════════════════════════════════════
  const showShadowRate = agreementType === "shadow_billing" || agreementType === "cost_sharing";

  const usedShadowPercent = useMemo(() => {
    return existingAgreements
      .filter(
        (a) =>
          a.agreement_type === "shadow_billing" &&
          a.id !== editingAgreementId
      )
      .reduce((sum, a) => sum + (Number(a.shadow_charge_rate) || 0), 0);
  }, [existingAgreements, editingAgreementId]);

  const remainingShadowPercent = Math.max(0, 100 - usedShadowPercent);

  const filteredFunctionalAreas = useMemo(() => {
    if (!selectedDepartmentId) return functionalAreas;
    return functionalAreas.filter((fa) => fa.department_id === selectedDepartmentId);
  }, [functionalAreas, selectedDepartmentId]);

  // ══════════════════════════════════════
  // SECTION 7: Handlers
  // ══════════════════════════════════════
  const handleFormSubmit = async (data: SaasAgreementFormValues) => {
    if (
      data.agreement_type === "shadow_billing" &&
      data.shadow_charge_rate != null
    ) {
      const totalShadow = usedShadowPercent + data.shadow_charge_rate;
      if (totalShadow > 100) {
        toast.error(
          `Total shadow charge rate would be ${totalShadow}%, which exceeds 100%. Available: ${remainingShadowPercent}%`
        );
        return;
      }
    }

    await onSubmit(data);
    onOpenChange(false);
  };

  const handleCreateChildOrg = async (data: ChildOrgFormValues) => {
    const result = await createChildOrg.mutateAsync({
      tenant_id: parentOrgId,
      organization_name: data.organization_name,
      legal_entity_name: data.legal_entity_name,
      hq_country_id: data.hq_country_id,
      hq_state_province_id: data.hq_state_province_id,
      hq_city: data.hq_city,
      hq_postal_code: data.hq_postal_code,
      hq_address_line1: data.hq_address_line1,
    });
    if (result?.id) {
      form.setValue("child_organization_id", result.id);
    }
  };

  // ══════════════════════════════════════
  // SECTION 8: Render
  // ══════════════════════════════════════
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {mode === "create" ? "New SaaS Agreement" : "Edit SaaS Agreement"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Set up a new fee agreement"
                : "Update the agreement details"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleFormSubmit)}
              className="flex-1 min-h-0 overflow-y-auto space-y-6 py-4 px-1"
            >
              {/* ── Core Agreement ── */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Core Agreement
                </h3>

                {/* Agreement Scope Radio */}
                <FormField
                  control={form.control}
                  name="agreement_scope"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Agreement Scope</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(val) => {
                            field.onChange(val);
                            if (val === "internal") {
                              form.setValue("child_organization_id", null);
                            }
                          }}
                          value={field.value}
                          className="flex flex-col gap-2"
                        >
                          {AGREEMENT_SCOPES.map((scope) => (
                            <div key={scope.value} className="flex items-start gap-2">
                              <RadioGroupItem value={scope.value} id={`scope-${scope.value}`} className="mt-0.5" />
                              <Label htmlFor={`scope-${scope.value}`} className="font-normal cursor-pointer">
                                <span className="font-medium">{scope.label}</span>
                                <span className="text-muted-foreground text-xs block">
                                  {scope.description}
                                </span>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contextual hint */}
                <p className="text-xs text-muted-foreground italic">
                  {isInternal
                    ? `Allocate fees to an internal department of ${parentOrgName ?? "the parent organization"}`
                    : "Define fee terms with a child organization"}
                </p>

                {/* Child Organization — only in child_org mode */}
                {!isInternal && (
                  <FormField
                    control={form.control}
                    name="child_organization_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Child Organization *</FormLabel>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <FormControl>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select organization..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {childOrgOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setChildOrgDialogOpen(true)}
                            title="Create new child organization"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Department & Functional Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="department_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isInternal ? "Department *" : "Department (Child Org) *"}</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            form.setValue("functional_area_id", "");
                          }}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="functional_area_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isInternal ? "Functional Area *" : "Functional Area (Child Org) *"}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select functional area..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredFunctionalAreas.map((fa) => (
                              <SelectItem key={fa.id} value={fa.id}>
                                {fa.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="agreement_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agreement Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AGREEMENT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {AGREEMENT_TYPE_HELP[field.value] && (
                        <FormDescription className="flex items-start gap-1.5">
                          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                          {AGREEMENT_TYPE_HELP[field.value]}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="fee_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fee Amount *</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fee_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency *</FormLabel>
                        <FormControl>
                          <Input placeholder="USD" maxLength={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fee_frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fee Frequency *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FEE_FREQUENCIES.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {showShadowRate && (
                  <FormField
                    control={form.control}
                    name="shadow_charge_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shadow Charge Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            placeholder="0"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === "" ? null : Number(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        {agreementType === "shadow_billing" && (
                          <FormDescription>
                            Available: {remainingShadowPercent}% (used: {usedShadowPercent}% across other agreements)
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="billing_frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Frequency *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BILLING_FREQUENCIES.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How often the platform invoices (may differ from fee frequency)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Advanced Fees ── */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors py-2">
                  <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
                  Advanced Fees
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="base_platform_fee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Platform Fee</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === "" ? null : Number(e.target.value)
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="per_department_fee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Per Department Fee</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === "" ? null : Number(e.target.value)
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="support_tier_fee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Support Tier Fee</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === "" ? null : Number(e.target.value)
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* ── Custom Fees ── */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors py-2">
                  <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
                  Custom Fees
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="custom_fee_1_label"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Fee 1 Label</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Integration Fee"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="custom_fee_1_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Fee 1 Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === "" ? null : Number(e.target.value)
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="custom_fee_2_label"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Fee 2 Label</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Training Fee"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="custom_fee_2_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Fee 2 Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === "" ? null : Number(e.target.value)
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* ── Contract Details ── */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors py-2">
                  <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
                  Contract Details
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="msa_reference_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>MSA Reference Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. MSA-2025-001"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="msa_document_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>MSA Document URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://..."
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="starts_at"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ends_at"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="auto_renew"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Auto Renew</FormLabel>
                          <FormDescription>
                            Automatically renew when contract ends
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>

              {/* ── Notes ── */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional notes..."
                        className="min-h-[80px]"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="shrink-0 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading
                    ? "Saving..."
                    : mode === "create"
                      ? "Create Agreement"
                      : "Update Agreement"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Inline Child Org Creation Dialog */}
      <CreateChildOrgDialog
        open={childOrgDialogOpen}
        onOpenChange={setChildOrgDialogOpen}
        isLoading={createChildOrg.isPending}
        onSubmit={handleCreateChildOrg}
      />
    </>
  );
}
