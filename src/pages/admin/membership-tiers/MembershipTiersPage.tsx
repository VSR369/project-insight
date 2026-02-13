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
  useMembershipTiers, useCreateMembershipTier, useUpdateMembershipTier,
  useDeleteMembershipTier, useRestoreMembershipTier, useHardDeleteMembershipTier,
  MembershipTier, MembershipTierInsert,
} from "@/hooks/queries/useMembershipTiers";

const schema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2).max(100),
  description: z.string().max(500).nullable().optional(),
  duration_months: z.coerce.number().int().min(1),
  fee_discount_pct: z.coerce.number().min(0).max(100).default(0),
  commission_rate_pct: z.coerce.number().min(0).max(100).default(0),
  display_order: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

const formFields: FormFieldConfig<FormData>[] = [
  { name: "code", label: "Code", type: "text", placeholder: "e.g., annual, multi_year", required: true },
  { name: "name", label: "Name", type: "text", placeholder: "e.g., Annual Membership", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "duration_months", label: "Duration (months)", type: "number", min: 1, required: true },
  { name: "fee_discount_pct", label: "Fee Discount %", type: "number", min: 0, max: 100, description: "Discount percentage on challenge fees" },
  { name: "commission_rate_pct", label: "Commission Rate %", type: "number", min: 0, max: 100, description: "Commission rate percentage" },
  { name: "display_order", label: "Display Order", type: "number", min: 0 },
  { name: "is_active", label: "Active", type: "switch" },
];

export default function MembershipTiersPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<MembershipTier | null>(null);

  const { data: items = [], isLoading } = useMembershipTiers(true);
  const createM = useCreateMembershipTier();
  const updateM = useUpdateMembershipTier();
  const deleteM = useDeleteMembershipTier();
  const restoreM = useRestoreMembershipTier();
  const hardDeleteM = useHardDeleteMembershipTier();

  const columns: DataTableColumn<MembershipTier>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "duration_months", header: "Duration (mo)", cell: (v) => `${v as number}` },
    { accessorKey: "fee_discount_pct", header: "Fee Discount %", cell: (v) => `${v as number}%` },
    { accessorKey: "commission_rate_pct", header: "Commission %", cell: (v) => `${v as number}%` },
    { accessorKey: "display_order", header: "Order", cell: (v) => (v as number) ?? "—" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<MembershipTier>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    if (selected) await updateM.mutateAsync({ id: selected.id, ...data });
    else await createM.mutateAsync(data as MembershipTierInsert);
  };

  const defaults: Partial<FormData> = selected
    ? { code: selected.code, name: selected.name, description: selected.description, duration_months: selected.duration_months, fee_discount_pct: selected.fee_discount_pct, commission_rate_pct: selected.commission_rate_pct, display_order: selected.display_order, is_active: selected.is_active }
    : { code: "", name: "", duration_months: 12, fee_discount_pct: 0, commission_rate_pct: 0, display_order: 0, is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Code", value: selected.code }, { label: "Name", value: selected.name },
    { label: "Description", value: selected.description },
    { label: "Duration (months)", value: selected.duration_months, type: "number" },
    { label: "Fee Discount %", value: selected.fee_discount_pct, type: "number" },
    { label: "Commission Rate %", value: selected.commission_rate_pct, type: "number" },
    { label: "Display Order", value: selected.display_order, type: "number" },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
  ] : [];

  return (
    <AdminLayout title="Membership Tiers" description="Manage membership tier plans, discounts, and commission rates" breadcrumbs={[{ label: "Seeker Config", href: "/admin" }, { label: "Membership Tiers" }]}>
      <DataTable data={items} columns={columns} actions={actions} searchKey="name" searchPlaceholder="Search tiers..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Tier" emptyMessage="No membership tiers found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Membership Tier" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Membership Tier Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Tier" : "Delete Tier"} itemName={selected?.name} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </AdminLayout>
  );
}
