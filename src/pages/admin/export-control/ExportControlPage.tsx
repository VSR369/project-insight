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
  useExportControlStatuses, useCreateExportControlStatus, useUpdateExportControlStatus,
  useDeleteExportControlStatus, useRestoreExportControlStatus, useHardDeleteExportControlStatus,
  ExportControlStatus, ExportControlStatusInsert,
} from "@/hooks/queries/useExportControlStatuses";

const schema = z.object({
  code: z.string().min(2).max(20).toUpperCase(),
  name: z.string().min(2).max(100),
  description: z.string().max(500).nullable().optional(),
  requires_itar_compliance: z.boolean().default(false),
  display_order: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

const formFields: FormFieldConfig<FormData>[] = [
  { name: "code", label: "Code", type: "text", placeholder: "e.g., EAR, ITAR", required: true },
  { name: "name", label: "Name", type: "text", placeholder: "e.g., ITAR Controlled", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "requires_itar_compliance", label: "Requires ITAR Compliance", type: "switch", description: "Enables ITAR compliance requirements for organizations" },
  { name: "display_order", label: "Display Order", type: "number", min: 0 },
  { name: "is_active", label: "Active", type: "switch" },
];

export default function ExportControlPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ExportControlStatus | null>(null);

  const { data: items = [], isLoading } = useExportControlStatuses(true);
  const createM = useCreateExportControlStatus();
  const updateM = useUpdateExportControlStatus();
  const deleteM = useDeleteExportControlStatus();
  const restoreM = useRestoreExportControlStatus();
  const hardDeleteM = useHardDeleteExportControlStatus();

  const columns: DataTableColumn<ExportControlStatus>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "requires_itar_compliance", header: "ITAR Required", cell: (v) => (v as boolean) ? "Yes" : "No" },
    { accessorKey: "display_order", header: "Order", cell: (v) => (v as number) ?? "—" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<ExportControlStatus>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    if (selected) await updateM.mutateAsync({ id: selected.id, ...data });
    else await createM.mutateAsync(data as ExportControlStatusInsert);
  };

  const defaults: Partial<FormData> = selected
    ? { code: selected.code, name: selected.name, description: selected.description, requires_itar_compliance: selected.requires_itar_compliance, display_order: selected.display_order, is_active: selected.is_active }
    : { code: "", name: "", requires_itar_compliance: false, display_order: 0, is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Code", value: selected.code }, { label: "Name", value: selected.name },
    { label: "Description", value: selected.description },
    { label: "Requires ITAR", value: selected.requires_itar_compliance, type: "boolean" },
    { label: "Display Order", value: selected.display_order, type: "number" },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
  ] : [];

  return (
    <AdminLayout title="Export Control Statuses" description="Manage export control and ITAR compliance statuses" breadcrumbs={[{ label: "Seeker Config", href: "/admin" }, { label: "Export Control" }]}>
      <DataTable data={items} columns={columns} actions={actions} searchKey="name" searchPlaceholder="Search statuses..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Status" emptyMessage="No export control statuses found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Export Control Status" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Export Control Status Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Status" : "Delete Status"} itemName={selected?.name} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </AdminLayout>
  );
}
