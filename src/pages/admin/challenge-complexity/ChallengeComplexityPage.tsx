import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";

import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import {
  useChallengeComplexityList, useCreateChallengeComplexity, useUpdateChallengeComplexity,
  useDeleteChallengeComplexity, useRestoreChallengeComplexity, useHardDeleteChallengeComplexity,
  ChallengeComplexity, ChallengeComplexityInsert,
} from "@/hooks/queries/useChallengeComplexity";

const schema = z.object({
  complexity_code: z.string().min(2).max(20).toUpperCase(),
  complexity_label: z.string().min(2).max(100),
  complexity_level: z.number().int().min(1),
  consulting_fee_multiplier: z.number().min(0).default(1),
  management_fee_multiplier: z.number().min(0).default(1),
  description: z.string().max(500).nullable().optional(),
  display_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

const formFields: FormFieldConfig<FormData>[] = [
  { name: "complexity_code", label: "Code", type: "text", placeholder: "e.g., LOW, MED, HIGH", required: true },
  { name: "complexity_label", label: "Label", type: "text", placeholder: "e.g., Low Complexity", required: true },
  { name: "complexity_level", label: "Level", type: "number", min: 1, description: "Numeric tier (1 = simplest)", required: true },
  { name: "consulting_fee_multiplier", label: "Consulting Fee Multiplier", type: "number", min: 0, description: "1.0 = base rate" },
  { name: "management_fee_multiplier", label: "Management Fee Multiplier", type: "number", min: 0, description: "1.0 = base rate" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "display_order", label: "Display Order", type: "number", min: 0 },
  { name: "is_active", label: "Active", type: "switch" },
];

export default function ChallengeComplexityPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ChallengeComplexity | null>(null);

  const { data: items = [], isLoading } = useChallengeComplexityList(true);
  const createM = useCreateChallengeComplexity();
  const updateM = useUpdateChallengeComplexity();
  const deleteM = useDeleteChallengeComplexity();
  const restoreM = useRestoreChallengeComplexity();
  const hardDeleteM = useHardDeleteChallengeComplexity();

  const columns: DataTableColumn<ChallengeComplexity>[] = [
    { accessorKey: "complexity_code", header: "Code" },
    { accessorKey: "complexity_label", header: "Label" },
    { accessorKey: "complexity_level", header: "Level" },
    { accessorKey: "consulting_fee_multiplier", header: "Consulting ×", cell: (v) => `${v}×` },
    { accessorKey: "management_fee_multiplier", header: "Mgmt ×", cell: (v) => `${v}×` },
    { accessorKey: "display_order", header: "Order" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<ChallengeComplexity>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    if (selected) await updateM.mutateAsync({ id: selected.id, ...data });
    else await createM.mutateAsync(data as ChallengeComplexityInsert);
  };

  const defaults: Partial<FormData> = selected
    ? { complexity_code: selected.complexity_code, complexity_label: selected.complexity_label, complexity_level: selected.complexity_level, consulting_fee_multiplier: selected.consulting_fee_multiplier, management_fee_multiplier: selected.management_fee_multiplier, description: selected.description, display_order: selected.display_order, is_active: selected.is_active }
    : { complexity_code: "", complexity_label: "", complexity_level: 1, consulting_fee_multiplier: 1, management_fee_multiplier: 1, display_order: 0, is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Code", value: selected.complexity_code }, { label: "Label", value: selected.complexity_label },
    { label: "Level", value: selected.complexity_level, type: "number" },
    { label: "Consulting Multiplier", value: selected.consulting_fee_multiplier, type: "number" },
    { label: "Management Multiplier", value: selected.management_fee_multiplier, type: "number" },
    { label: "Description", value: selected.description },
    { label: "Display Order", value: selected.display_order, type: "number" },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
  ] : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Challenge Complexity</h1>
        <p className="text-muted-foreground mt-1">Manage challenge complexity levels and fee multipliers</p>
      </div>
      <DataTable data={items} columns={columns} actions={actions} searchKey="complexity_label" searchPlaceholder="Search complexity..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Complexity" emptyMessage="No complexity levels found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Challenge Complexity" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Challenge Complexity Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Complexity" : "Delete Complexity"} itemName={selected?.complexity_label} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
