import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import {
  useSubscriptionTiers, useCreateSubscriptionTier, useUpdateSubscriptionTier,
  useDeleteSubscriptionTier, useRestoreSubscriptionTier, useHardDeleteSubscriptionTier,
  SubscriptionTier, SubscriptionTierInsert,
} from "@/hooks/queries/useSubscriptionTiers";

const schema = z.object({
  code: z.string().min(2).max(20).toUpperCase(),
  name: z.string().min(2).max(100),
  description: z.string().max(500).nullable().optional(),
  max_challenges: z.number().int().min(0).nullable().optional(),
  max_users: z.number().int().min(0).nullable().optional(),
  is_enterprise: z.boolean().default(false),
  display_order: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

const formFields: FormFieldConfig<FormData>[] = [
  { name: "code", label: "Code", type: "text", placeholder: "e.g., STARTER, PRO", required: true },
  { name: "name", label: "Name", type: "text", placeholder: "e.g., Starter Plan", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "max_challenges", label: "Max Challenges", type: "number", min: 0, description: "Leave empty for unlimited" },
  { name: "max_users", label: "Max Users", type: "number", min: 0, description: "Leave empty for unlimited" },
  { name: "is_enterprise", label: "Enterprise Tier", type: "switch", description: "Enterprise tiers require custom onboarding" },
  { name: "display_order", label: "Display Order", type: "number", min: 0 },
  { name: "is_active", label: "Active", type: "switch" },
];

export default function SubscriptionTiersPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<SubscriptionTier | null>(null);

  const { data: items = [], isLoading } = useSubscriptionTiers(true);
  const createM = useCreateSubscriptionTier();
  const updateM = useUpdateSubscriptionTier();
  const deleteM = useDeleteSubscriptionTier();
  const restoreM = useRestoreSubscriptionTier();
  const hardDeleteM = useHardDeleteSubscriptionTier();

  const columns: DataTableColumn<SubscriptionTier>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "max_challenges", header: "Max Challenges", cell: (v) => (v as number) ?? "∞" },
    { accessorKey: "max_users", header: "Max Users", cell: (v) => (v as number) ?? "∞" },
    { accessorKey: "is_enterprise", header: "Enterprise", cell: (v) => (v as boolean) ? "Yes" : "No" },
    { accessorKey: "display_order", header: "Order", cell: (v) => (v as number) ?? "—" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<SubscriptionTier>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    if (selected) await updateM.mutateAsync({ id: selected.id, ...data });
    else await createM.mutateAsync(data as SubscriptionTierInsert);
  };

  const defaults: Partial<FormData> = selected
    ? { code: selected.code, name: selected.name, description: selected.description, max_challenges: selected.max_challenges, max_users: selected.max_users, is_enterprise: selected.is_enterprise, display_order: selected.display_order, is_active: selected.is_active }
    : { code: "", name: "", is_enterprise: false, display_order: 0, is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Code", value: selected.code }, { label: "Name", value: selected.name },
    { label: "Description", value: selected.description },
    { label: "Max Challenges", value: selected.max_challenges, type: "number" },
    { label: "Max Users", value: selected.max_users, type: "number" },
    { label: "Enterprise", value: selected.is_enterprise, type: "boolean" },
    { label: "Display Order", value: selected.display_order, type: "number" },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
  ] : [];

  return (
    <AdminLayout title="Subscription Tiers" description="Manage subscription tier plans" breadcrumbs={[{ label: "Seeker Config", href: "/admin" }, { label: "Subscription Tiers" }]}>
      <DataTable data={items} columns={columns} actions={actions} searchKey="name" searchPlaceholder="Search tiers..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Tier" emptyMessage="No subscription tiers found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Subscription Tier" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Subscription Tier Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Tier" : "Delete Tier"} itemName={selected?.name} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </AdminLayout>
  );
}
