import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";

import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import {
  useSubsidizedPricing, useCreateSubsidizedPricing, useUpdateSubsidizedPricing,
  useDeleteSubsidizedPricing, useRestoreSubsidizedPricing, useHardDeleteSubsidizedPricing,
  useOrgTypeRuleOptions, SubsidizedPricing,
} from "@/hooks/queries/useSubsidizedPricingAdmin";

const schema = z.object({
  org_type_rule_id: z.string().min(1, "Organization type rule is required"),
  discount_percentage: z.coerce.number().min(0).max(100),
  max_duration_months: z.coerce.number().int().min(1).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

export default function SubsidizedPricingPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<SubsidizedPricing | null>(null);

  const { data: items = [], isLoading } = useSubsidizedPricing(true);
  const { data: ruleOptions = [] } = useOrgTypeRuleOptions();
  const createM = useCreateSubsidizedPricing();
  const updateM = useUpdateSubsidizedPricing();
  const deleteM = useDeleteSubsidizedPricing();
  const restoreM = useRestoreSubsidizedPricing();
  const hardDeleteM = useHardDeleteSubsidizedPricing();

  const selectOptions = ruleOptions.map((r) => ({ value: r.id, label: `${r.org_type_name} (${r.org_type_code})` }));

  const formFields: FormFieldConfig<FormData>[] = [
    { name: "org_type_rule_id", label: "Organization Type", type: "select", options: selectOptions, required: true },
    { name: "discount_percentage", label: "Discount %", type: "number", placeholder: "e.g., 50", min: 0, required: true },
    { name: "max_duration_months", label: "Max Duration (months)", type: "number", placeholder: "e.g., 12", min: 1 },
    { name: "description", label: "Description", type: "textarea", placeholder: "Optional description" },
    { name: "is_active", label: "Active", type: "switch" },
  ];

  const getOrgTypeName = (item: SubsidizedPricing) => {
    const rule = item.org_type_rule;
    if (rule && rule.org_type) return `${rule.org_type.name} (${rule.org_type.code})`;
    return "—";
  };

  const columns: DataTableColumn<SubsidizedPricing>[] = [
    { accessorKey: "org_type_rule", header: "Organization Type", cell: (_v, row) => row ? getOrgTypeName(row) : "—" },
    { accessorKey: "discount_percentage", header: "Discount %", cell: (v) => `${v}%` },
    { accessorKey: "max_duration_months", header: "Max Duration", cell: (v) => v ? `${v} months` : "—" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<SubsidizedPricing>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    if (selected) await updateM.mutateAsync({ id: selected.id, ...data });
    else await createM.mutateAsync(data);
  };

  const defaults: Partial<FormData> = selected
    ? { org_type_rule_id: selected.org_type_rule_id, discount_percentage: selected.discount_percentage, max_duration_months: selected.max_duration_months, description: selected.description, is_active: selected.is_active }
    : { org_type_rule_id: "", discount_percentage: 0, max_duration_months: 12, is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Organization Type", value: getOrgTypeName(selected) },
    { label: "Discount %", value: `${selected.discount_percentage}%` },
    { label: "Max Duration", value: selected.max_duration_months ? `${selected.max_duration_months} months` : "—" },
    { label: "Description", value: selected.description },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
    { label: "Updated At", value: selected.updated_at, type: "date" },
  ] : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Subsidized Pricing</h1>
        <p className="text-muted-foreground mt-1">Manage subsidized pricing discounts by organization type</p>
      </div>
      <DataTable data={items} columns={columns} actions={actions} searchKey="description" searchPlaceholder="Search subsidized pricing..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Subsidized Pricing" emptyMessage="No subsidized pricing records found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Subsidized Pricing" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Subsidized Pricing Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Subsidized Pricing" : "Delete Subsidized Pricing"} itemName={selected ? getOrgTypeName(selected) : undefined} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
