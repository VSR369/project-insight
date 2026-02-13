import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";

import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import {
  useBillingCycles, useCreateBillingCycle, useUpdateBillingCycle,
  useDeleteBillingCycle, useRestoreBillingCycle, useHardDeleteBillingCycle,
  BillingCycle, BillingCycleInsert,
} from "@/hooks/queries/useBillingCyclesAdmin";

const schema = z.object({
  code: z.string().min(2).max(20).toUpperCase(),
  name: z.string().min(2).max(100),
  months: z.coerce.number().int().min(1),
  discount_percentage: z.coerce.number().min(0).max(100),
  display_order: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

const formFields: FormFieldConfig<FormData>[] = [
  { name: "code", label: "Code", type: "text", placeholder: "e.g., MONTHLY", required: true },
  { name: "name", label: "Name", type: "text", placeholder: "e.g., Monthly", required: true },
  { name: "months", label: "Months", type: "number", placeholder: "e.g., 1", min: 1, required: true },
  { name: "discount_percentage", label: "Discount %", type: "number", placeholder: "e.g., 0", min: 0, required: true },
  { name: "display_order", label: "Display Order", type: "number", placeholder: "0", min: 0 },
  { name: "is_active", label: "Active", type: "switch" },
];

export default function BillingCyclesPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<BillingCycle | null>(null);

  const { data: items = [], isLoading } = useBillingCycles(true);
  const createM = useCreateBillingCycle();
  const updateM = useUpdateBillingCycle();
  const deleteM = useDeleteBillingCycle();
  const restoreM = useRestoreBillingCycle();
  const hardDeleteM = useHardDeleteBillingCycle();

  const columns: DataTableColumn<BillingCycle>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "months", header: "Months" },
    { accessorKey: "discount_percentage", header: "Discount %", cell: (v) => `${v}%` },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<BillingCycle>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    if (selected) await updateM.mutateAsync({ id: selected.id, ...data });
    else await createM.mutateAsync(data as BillingCycleInsert);
  };

  const defaults: Partial<FormData> = selected
    ? { code: selected.code, name: selected.name, months: selected.months, discount_percentage: selected.discount_percentage, display_order: selected.display_order, is_active: selected.is_active }
    : { code: "", name: "", months: 1, discount_percentage: 0, display_order: 0, is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Code", value: selected.code },
    { label: "Name", value: selected.name },
    { label: "Months", value: selected.months, type: "number" },
    { label: "Discount %", value: `${selected.discount_percentage}%` },
    { label: "Display Order", value: selected.display_order, type: "number" },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
    { label: "Updated At", value: selected.updated_at, type: "date" },
  ] : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Billing Cycles</h1>
        <p className="text-muted-foreground mt-1">Manage billing cycle options and discounts</p>
      </div>
      <DataTable data={items} columns={columns} actions={actions} searchKey="name" searchPlaceholder="Search billing cycles..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Billing Cycle" emptyMessage="No billing cycles found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Billing Cycle" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Billing Cycle Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Billing Cycle" : "Delete Billing Cycle"} itemName={selected?.name} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
