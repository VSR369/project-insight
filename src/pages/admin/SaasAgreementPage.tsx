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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  FileText,
  Building2,
  Pencil,
  AlertCircle,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Trash2,
  Crown,
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
import { useEnterpriseContactRequests } from "@/hooks/queries/useEnterpriseRequests";

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
  const [viewingAgreementId, setViewingAgreementId] = useState<string | null>(null);
  const [deletingAgreementId, setDeletingAgreementId] = useState<string | null>(null);

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
  const { data: enterpriseRequests } = useEnterpriseContactRequests();

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
  const parentOrgName = useMemo(
    () => orgOptions.find((o) => o.value === selectedParentOrgId)?.label ?? "",
    [orgOptions, selectedParentOrgId]
  );

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
      agreement_scope: found.child_organization_id ? "child_org" : "internal",
      child_organization_id: found.child_organization_id,
      agreement_type: found.agreement_type as SaasAgreementFormValues["agreement_type"],
      fee_amount: Number(found.fee_amount),
      fee_currency: found.fee_currency,
      fee_frequency: found.fee_frequency as SaasAgreementFormValues["fee_frequency"],
      shadow_charge_rate: found.shadow_charge_rate,
      department_id: found.department_id ?? "",
      functional_area_id: found.functional_area_id ?? "",
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
    const childOrgId = data.agreement_scope === "internal" ? null : (data.child_organization_id || null);
    const allFields = {
      child_organization_id: childOrgId,
      agreement_type: data.agreement_type,
      fee_amount: data.fee_amount,
      fee_currency: data.fee_currency,
      fee_frequency: data.fee_frequency,
      shadow_charge_rate: data.shadow_charge_rate,
      department_id: data.department_id || null,
      functional_area_id: data.functional_area_id || null,
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

  const handleDelete = (agreementId: string) => {
    updateAgreement.mutate({
      agreementId,
      parentOrgId: selectedParentOrgId,
      updates: {
        lifecycle_status: "cancelled",
        cancellation_reason: "Deleted by admin",
        cancelled_at: new Date().toISOString(),
      },
    });
    setDeletingAgreementId(null);
  };

  const viewingAgreement = useMemo(() => {
    if (!viewingAgreementId || !agreements) return null;
    return agreements.find((a: { id: string }) => a.id === viewingAgreementId) ?? null;
  }, [viewingAgreementId, agreements]);

  // ══════════════════════════════════════
  // SECTION 8: Render
  // ══════════════════════════════════════
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Enterprise Agreements</h1>
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
                      const isInternal = !agreement.child_organization_id;
                      return (
                        <TableRow key={agreement.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {isInternal ? (
                                <Badge variant="secondary" className="text-xs">Internal</Badge>
                              ) : (
                                childOrg?.organization_name ?? agreement.child_organization_id
                              )}
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setViewingAgreementId(agreement.id)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenEdit(agreement.id)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                {agreement.lifecycle_status === "active" && (
                                  <DropdownMenuItem onClick={() => handleSuspend(agreement.id)}>
                                    Suspend
                                  </DropdownMenuItem>
                                )}
                                {agreement.lifecycle_status === "suspended" && (
                                  <DropdownMenuItem onClick={() => handleActivate(agreement.id)}>
                                    Reactivate
                                  </DropdownMenuItem>
                                )}
                                {agreement.lifecycle_status !== "cancelled" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => setDeletingAgreementId(agreement.id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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

        {/* Enterprise Tier Requests */}
        {enterpriseRequests && enterpriseRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-violet-500" />
                Enterprise Tier Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Organizations that selected the Enterprise tier during registration and require a custom agreement.
              </p>
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enterpriseRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-violet-500" />
                            {req.organization_name}
                          </div>
                        </TableCell>
                        <TableCell>{req.contact_name}</TableCell>
                        <TableCell className="text-muted-foreground">{req.contact_email}</TableCell>
                        <TableCell className="text-muted-foreground">{req.company_size ?? '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={req.status === 'responded' ? 'default' : req.status === 'new' ? 'secondary' : 'outline'}
                            className="text-xs capitalize"
                          >
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(req.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
        parentOrgId={selectedParentOrgId}
        parentOrgName={parentOrgName}
        isLoading={isMutating}
        onSubmit={handleSubmit}
      />

      {/* View Agreement Dialog */}
      <Dialog open={!!viewingAgreementId} onOpenChange={(open) => !open && setViewingAgreementId(null)}>
        <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Agreement Details</DialogTitle>
            <DialogDescription>Read-only view of the agreement</DialogDescription>
          </DialogHeader>
          {viewingAgreement && (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-4 text-sm">
              <DetailRow label="Child Organization" value={
                (viewingAgreement.seeker_organizations as { organization_name: string } | null)?.organization_name
                  ?? (viewingAgreement.child_organization_id ? viewingAgreement.child_organization_id : "Internal")
              } />
              <DetailRow label="Type" value={viewingAgreement.agreement_type.replace("_", " ")} />
              <DetailRow label="Status" value={viewingAgreement.lifecycle_status} />
              <DetailRow label="Fee" value={`${viewingAgreement.fee_currency} ${Number(viewingAgreement.fee_amount).toLocaleString()}`} />
              <DetailRow label="Fee Frequency" value={viewingAgreement.fee_frequency} />
              <DetailRow label="Billing Frequency" value={viewingAgreement.billing_frequency ?? "—"} />
              {viewingAgreement.shadow_charge_rate != null && (
                <DetailRow label="Shadow Charge Rate" value={`${viewingAgreement.shadow_charge_rate}%`} />
              )}
              {viewingAgreement.base_platform_fee != null && (
                <DetailRow label="Base Platform Fee" value={Number(viewingAgreement.base_platform_fee).toLocaleString()} />
              )}
              {viewingAgreement.per_department_fee != null && (
                <DetailRow label="Per Department Fee" value={Number(viewingAgreement.per_department_fee).toLocaleString()} />
              )}
              {viewingAgreement.support_tier_fee != null && (
                <DetailRow label="Support Tier Fee" value={Number(viewingAgreement.support_tier_fee).toLocaleString()} />
              )}
              {viewingAgreement.custom_fee_1_label && (
                <DetailRow label={viewingAgreement.custom_fee_1_label} value={Number(viewingAgreement.custom_fee_1_amount ?? 0).toLocaleString()} />
              )}
              {viewingAgreement.custom_fee_2_label && (
                <DetailRow label={viewingAgreement.custom_fee_2_label} value={Number(viewingAgreement.custom_fee_2_amount ?? 0).toLocaleString()} />
              )}
              <DetailRow label="MSA Reference" value={viewingAgreement.msa_reference_number ?? "—"} />
              <DetailRow label="MSA Document" value={viewingAgreement.msa_document_url ?? "—"} />
              <DetailRow label="Starts At" value={viewingAgreement.starts_at ? format(new Date(viewingAgreement.starts_at), "MMM dd, yyyy") : "—"} />
              <DetailRow label="Ends At" value={viewingAgreement.ends_at ? format(new Date(viewingAgreement.ends_at), "MMM dd, yyyy") : "—"} />
              <DetailRow label="Auto Renew" value={viewingAgreement.auto_renew ? "Yes" : "No"} />
              <DetailRow label="Notes" value={viewingAgreement.notes ?? "—"} />
              <DetailRow label="Created" value={format(new Date(viewingAgreement.created_at), "MMM dd, yyyy")} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingAgreementId} onOpenChange={(open) => !open && setDeletingAgreementId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agreement</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the agreement. This action cannot be undone. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingAgreementId && handleDelete(deletingAgreementId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right capitalize">{value}</span>
    </div>
  );
}
