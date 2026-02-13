/**
 * SaasAgreementPage — Admin: Create/manage SaaS agreements between parent & child orgs
 * Phase 6: SAS-001 — Compliance overhaul
 *
 * Standards: Section 7.2 (loading/empty/error), 7.4 (CRUD), 8.1 (Zod+RHF),
 * 9.3 (responsive), 23 (hook order), 24.1 (audit fields)
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  FileText,
  Building2,
  Pencil,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { useOrgPickerOptions } from "@/hooks/queries/useOrgPicker";
import {
  useSaasAgreements,
  useCreateSaasAgreement,
  useUpdateSaasAgreement,
} from "@/hooks/queries/useSaasData";
import {
  type SaasAgreementFormValues,
  SAAS_AGREEMENT_DEFAULTS,
} from "@/pages/admin/saas/saasAgreement.schema";
import { SaasAgreementFormDialog } from "@/components/admin/SaasAgreementFormDialog";

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  active: "default",
  expired: "secondary",
  cancelled: "destructive",
  suspended: "outline",
};

export default function SaasAgreementPage() {
  // ══════════════════════════════════════
  // SECTION 1: useState hooks
  // ══════════════════════════════════════
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<{
    id: string;
    parentOrgId: string;
  } | null>(null);
  const [selectedParentOrgId, setSelectedParentOrgId] = useState<string>("");

  // ══════════════════════════════════════
  // SECTION 2: Custom hooks
  // ══════════════════════════════════════
  const { data: orgOptions = [], isLoading: orgsLoading } =
    useOrgPickerOptions();

  // ══════════════════════════════════════
  // SECTION 4: Query/Mutation hooks
  // ══════════════════════════════════════
  const {
    data: agreements,
    isLoading,
    isError,
    refetch,
  } = useSaasAgreements(selectedParentOrgId || undefined);
  const createAgreement = useCreateSaasAgreement();
  const updateAgreement = useUpdateSaasAgreement();

  // ══════════════════════════════════════
  // SECTION 5: Memos
  // ══════════════════════════════════════
  const childOrgOptions = useMemo(
    () =>
      orgOptions
        .filter((o) => o.value !== selectedParentOrgId)
        .map((o) => ({ value: o.value, label: o.label })),
    [orgOptions, selectedParentOrgId]
  );

  const dialogMode = editingAgreement ? "edit" : "create";
  const isMutating = createAgreement.isPending || updateAgreement.isPending;

  // ══════════════════════════════════════
  // SECTION 7: Handlers
  // ══════════════════════════════════════
  const handleOpenCreate = () => {
    setEditingAgreement(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (agreementId: string) => {
    setEditingAgreement({
      id: agreementId,
      parentOrgId: selectedParentOrgId,
    });
    setDialogOpen(true);
  };

  const getDefaultValues = (): Partial<SaasAgreementFormValues> => {
    if (!editingAgreement || !agreements) return SAAS_AGREEMENT_DEFAULTS;
    const found = agreements.find(
      (a: { id: string }) => a.id === editingAgreement.id
    );
    if (!found) return SAAS_AGREEMENT_DEFAULTS;
    return {
      child_organization_id: found.child_organization_id,
      agreement_type: found.agreement_type as SaasAgreementFormValues["agreement_type"],
      fee_amount: Number(found.fee_amount),
      fee_currency: found.fee_currency,
      fee_frequency: found.fee_frequency as SaasAgreementFormValues["fee_frequency"],
      shadow_charge_rate: found.shadow_charge_rate,
      billing_frequency: (found.billing_frequency ?? "monthly") as SaasAgreementFormValues["billing_frequency"],
      base_platform_fee: found.base_platform_fee,
      per_department_fee: found.per_department_fee,
      support_tier_fee: found.support_tier_fee,
      custom_fee_1_label: found.custom_fee_1_label,
      custom_fee_1_amount: found.custom_fee_1_amount,
      custom_fee_2_label: found.custom_fee_2_label,
      custom_fee_2_amount: found.custom_fee_2_amount,
      msa_reference_number: found.msa_reference_number,
      msa_document_url: found.msa_document_url,
      starts_at: found.starts_at,
      ends_at: found.ends_at,
      auto_renew: found.auto_renew ?? true,
      notes: found.notes,
    };
  };

  const handleSubmit = async (data: SaasAgreementFormValues) => {
    const allFields = {
      child_organization_id: data.child_organization_id,
      agreement_type: data.agreement_type,
      fee_amount: data.fee_amount,
      fee_currency: data.fee_currency,
      fee_frequency: data.fee_frequency,
      shadow_charge_rate: data.shadow_charge_rate,
      billing_frequency: data.billing_frequency,
      base_platform_fee: data.base_platform_fee,
      per_department_fee: data.per_department_fee,
      support_tier_fee: data.support_tier_fee,
      custom_fee_1_label: data.custom_fee_1_label,
      custom_fee_1_amount: data.custom_fee_1_amount,
      custom_fee_2_label: data.custom_fee_2_label,
      custom_fee_2_amount: data.custom_fee_2_amount,
      msa_reference_number: data.msa_reference_number,
      msa_document_url: data.msa_document_url,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      auto_renew: data.auto_renew,
      notes: data.notes,
    };

    if (editingAgreement) {
      await updateAgreement.mutateAsync({
        agreementId: editingAgreement.id,
        parentOrgId: editingAgreement.parentOrgId,
        updates: allFields,
      });
    } else {
      if (!selectedParentOrgId) return;
      await createAgreement.mutateAsync({
        tenant_id: selectedParentOrgId,
        parent_organization_id: selectedParentOrgId,
        ...allFields,
      });
    }
  };

  const handleSuspend = (agreementId: string) => {
    updateAgreement.mutate({
      agreementId,
      parentOrgId: selectedParentOrgId,
      updates: { lifecycle_status: "suspended" },
    });
  };

  const handleActivate = (agreementId: string) => {
    updateAgreement.mutate({
      agreementId,
      parentOrgId: selectedParentOrgId,
      updates: { lifecycle_status: "active" },
    });
  };

  // ══════════════════════════════════════
  // SECTION 8: Render
  // ══════════════════════════════════════
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">SaaS Agreements</h1>
        <p className="text-muted-foreground mt-1">
          Manage SaaS fee agreements between parent and child organizations
        </p>
      </div>

      <div className="space-y-6">
        {/* Parent Org Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block">
                  Parent Organization
                </label>
                {orgsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={selectedParentOrgId}
                    onValueChange={setSelectedParentOrgId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent organization..." />
                    </SelectTrigger>
                    <SelectContent>
                      {orgOptions.map((org) => (
                        <SelectItem key={org.value} value={org.value}>
                          {org.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button
                onClick={handleOpenCreate}
                disabled={!selectedParentOrgId}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden lg:inline ml-1">New Agreement</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Agreements Table */}
        {selectedParentOrgId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Agreements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p className="text-muted-foreground">
                    Failed to load agreements
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </div>
              ) : agreements && agreements.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Child Organization</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Fee Freq.</TableHead>
                      <TableHead>Billing Freq.</TableHead>
                      <TableHead>MSA Ref</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agreements.map((agreement) => {
                      const childOrg = agreement.seeker_organizations as {
                        organization_name: string;
                      } | null;
                      return (
                        <TableRow key={agreement.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {childOrg?.organization_name ??
                                agreement.child_organization_id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {agreement.agreement_type.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {agreement.fee_currency}{" "}
                            {Number(agreement.fee_amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="capitalize">
                            {agreement.fee_frequency}
                          </TableCell>
                          <TableCell className="capitalize">
                            {agreement.billing_frequency ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {agreement.msa_reference_number ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                STATUS_VARIANTS[agreement.lifecycle_status] ??
                                "secondary"
                              }
                              className="text-xs"
                            >
                              {agreement.lifecycle_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(
                              new Date(agreement.created_at),
                              "MMM dd, yyyy"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(agreement.id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {agreement.lifecycle_status === "active" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSuspend(agreement.id)}
                                >
                                  Suspend
                                </Button>
                              )}
                              {agreement.lifecycle_status === "suspended" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleActivate(agreement.id)}
                                >
                                  Reactivate
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <FileText className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground">
                    No agreements found for this organization
                  </p>
                  <Button size="sm" onClick={handleOpenCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Agreement
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!selectedParentOrgId && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center gap-3">
                <Building2 className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">
                  Select a parent organization above to view agreements
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <SaasAgreementFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        defaultValues={getDefaultValues()}
        childOrgOptions={childOrgOptions}
        existingAgreements={
          (agreements ?? []).map((a) => ({
            id: a.id,
            agreement_type: a.agreement_type,
            shadow_charge_rate: a.shadow_charge_rate,
          }))
        }
        editingAgreementId={editingAgreement?.id}
        isLoading={isMutating}
        onSubmit={handleSubmit}
      />
    </>
  );
}
