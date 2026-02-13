import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";

import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import {
  usePlatformFees, useCreatePlatformFee, useUpdatePlatformFee,
  useDeletePlatformFee, useRestorePlatformFee, useHardDeletePlatformFee,
  PlatformFee, PlatformFeeInsert,
} from "@/hooks/queries/usePlatformFees";
import { useSubscriptionTiers } from "@/hooks/queries/usePlanSelectionData";
import { useEngagementModels } from "@/hooks/queries/useEngagementModels";

const schema = z.object({
  engagement_model_id: z.string().min(1, "Engagement model is required"),
  tier_id: z.string().min(1, "Subscription tier is required"),
  platform_fee_pct: z.coerce.number().min(0).max(100),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

type PlatformFeeWithJoins = PlatformFee & {
  md_engagement_models?: { name: string } | null;
  md_subscription_tiers?: { name: string } | null;
};

export default function PlatformFeesPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<PlatformFeeWithJoins | null>(null);

  const { data: items = [], isLoading } = usePlatformFees(true);
  const { data: tiers = [] } = useSubscriptionTiers();
  const { data: models = [] } = useEngagementModels();
  const createM = useCreatePlatformFee();
  const updateM = useUpdatePlatformFee();
  const deleteM = useDeletePlatformFee();
  const restoreM = useRestorePlatformFee();
  const hardDeleteM = useHardDeletePlatformFee();

  const tierOptions = tiers.map((t) => ({ value: t.id, label: t.name }));
  const modelOptions = models.map((m) => ({ value: m.id, label: m.name }));

  const formFields: FormFieldConfig<FormData>[] = [
    { name: "engagement_model_id", label: "Engagement Model", type: "select", options: modelOptions, required: true },
    { name: "tier_id", label: "Subscription Tier", type: "select", options: tierOptions, required: true },
    { name: "platform_fee_pct", label: "Platform Fee %", type: "number", min: 0, required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "is_active", label: "Active", type: "switch" },
  ];

  const columns: DataTableColumn<PlatformFeeWithJoins>[] = [
    { accessorKey: "md_engagement_models", header: "Engagement Model", cell: (v) => (v as { name: string } | null)?.name ?? "—" },
    { accessorKey: "md_subscription_tiers", header: "Tier", cell: (v) => (v as { name: string } | null)?.name ?? "—" },
    { accessorKey: "platform_fee_pct", header: "Fee %", cell: (v) => `${v as number}%` },
    { accessorKey: "description", header: "Description", cell: (v) => (v as string) || "—" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<PlatformFeeWithJoins>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    if (selected) await updateM.mutateAsync({ id: selected.id, ...data });
    else await createM.mutateAsync(data as PlatformFeeInsert);
  };

  const defaults: Partial<FormData> = selected
    ? { engagement_model_id: selected.engagement_model_id, tier_id: selected.tier_id, platform_fee_pct: selected.platform_fee_pct, description: selected.description, is_active: selected.is_active }
    : { engagement_model_id: "", tier_id: "", platform_fee_pct: 0, description: "", is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Engagement Model", value: selected.md_engagement_models?.name ?? selected.engagement_model_id },
    { label: "Subscription Tier", value: selected.md_subscription_tiers?.name ?? selected.tier_id },
    { label: "Platform Fee %", value: `${selected.platform_fee_pct}%` },
    { label: "Description", value: selected.description ?? "—" },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
  ] : [];

  const displayName = selected ? `${selected.md_engagement_models?.name ?? ""} / ${selected.md_subscription_tiers?.name ?? ""}` : "";

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Platform Fee Configuration</h1>
        <p className="text-muted-foreground mt-1">Manage platform usage fee percentages per engagement model and subscription tier</p>
      </div>
      <DataTable data={items} columns={columns} actions={actions} searchKey="description" searchPlaceholder="Search by description..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Platform Fee" emptyMessage="No platform fees configured yet." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Platform Fee" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Platform Fee Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Platform Fee" : "Delete Platform Fee"} itemName={displayName} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
