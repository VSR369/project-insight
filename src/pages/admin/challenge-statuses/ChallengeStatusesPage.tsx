import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";

import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import {
  useChallengeStatuses, useCreateChallengeStatus, useUpdateChallengeStatus,
  useDeleteChallengeStatus, useRestoreChallengeStatus, useHardDeleteChallengeStatus,
  ChallengeStatus, ChallengeStatusInsert,
} from "@/hooks/queries/useChallengeStatuses";

const schema = z.object({
  status_code: z.string().min(2).max(30),
  status_label: z.string().min(2).max(100),
  blocks_model_switch: z.boolean().default(false),
  display_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

const formFields: FormFieldConfig<FormData>[] = [
  { name: "status_code", label: "Status Code", type: "text", placeholder: "e.g., ACTIVE, PAUSED", required: true },
  { name: "status_label", label: "Status Label", type: "text", placeholder: "e.g., Active", required: true },
  { name: "blocks_model_switch", label: "Blocks Model Switch", type: "switch", description: "Prevents switching engagement model while in this status" },
  { name: "display_order", label: "Display Order", type: "number", min: 0 },
  { name: "is_active", label: "Active", type: "switch" },
];

export default function ChallengeStatusesPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ChallengeStatus | null>(null);

  const { data: items = [], isLoading } = useChallengeStatuses(true);
  const createM = useCreateChallengeStatus();
  const updateM = useUpdateChallengeStatus();
  const deleteM = useDeleteChallengeStatus();
  const restoreM = useRestoreChallengeStatus();
  const hardDeleteM = useHardDeleteChallengeStatus();

  const columns: DataTableColumn<ChallengeStatus>[] = [
    { accessorKey: "status_code", header: "Code" },
    { accessorKey: "status_label", header: "Label" },
    { accessorKey: "blocks_model_switch", header: "Blocks Switch", cell: (v) => (v as boolean) ? "Yes" : "No" },
    { accessorKey: "display_order", header: "Order" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<ChallengeStatus>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    if (selected) await updateM.mutateAsync({ id: selected.id, ...data });
    else await createM.mutateAsync(data as ChallengeStatusInsert);
  };

  const defaults: Partial<FormData> = selected
    ? { status_code: selected.status_code, status_label: selected.status_label, blocks_model_switch: selected.blocks_model_switch, display_order: selected.display_order, is_active: selected.is_active }
    : { status_code: "", status_label: "", blocks_model_switch: false, display_order: 0, is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Status Code", value: selected.status_code },
    { label: "Status Label", value: selected.status_label },
    { label: "Blocks Model Switch", value: selected.blocks_model_switch, type: "boolean" },
    { label: "Display Order", value: selected.display_order, type: "number" },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
  ] : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Challenge Statuses</h1>
        <p className="text-muted-foreground mt-1">Manage challenge active statuses</p>
      </div>
      <DataTable data={items} columns={columns} actions={actions} searchKey="status_label" searchPlaceholder="Search statuses..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Status" emptyMessage="No challenge statuses found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Challenge Status" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Challenge Status Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Status" : "Delete Status"} itemName={selected?.status_label} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
