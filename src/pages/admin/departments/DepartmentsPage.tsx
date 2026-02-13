import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";

import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import {
  useDepartments, useCreateDepartment, useUpdateDepartment,
  useDeleteDepartment, useRestoreDepartment, useHardDeleteDepartment,
  Department, DepartmentInsert,
} from "@/hooks/queries/useDepartmentsAdmin";

const schema = z.object({
  code: z.string().min(2).max(20).toUpperCase(),
  name: z.string().min(2).max(100),
  description: z.string().max(500).nullable().optional(),
  display_order: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

const formFields: FormFieldConfig<FormData>[] = [
  { name: "code", label: "Code", type: "text", placeholder: "e.g., IT, FIN", required: true },
  { name: "name", label: "Name", type: "text", placeholder: "e.g., Information Technology", required: true },
  { name: "description", label: "Description", type: "textarea", placeholder: "Optional description" },
  { name: "display_order", label: "Display Order", type: "number", placeholder: "0", min: 0 },
  { name: "is_active", label: "Active", type: "switch" },
];

export default function DepartmentsPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Department | null>(null);

  const { data: items = [], isLoading } = useDepartments(true);
  const createM = useCreateDepartment();
  const updateM = useUpdateDepartment();
  const deleteM = useDeleteDepartment();
  const restoreM = useRestoreDepartment();
  const hardDeleteM = useHardDeleteDepartment();

  const columns: DataTableColumn<Department>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "description", header: "Description", cell: (v) => (v as string) || "—" },
    { accessorKey: "display_order", header: "Order", cell: (v) => (v as number) ?? "—" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<Department>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    if (selected) await updateM.mutateAsync({ id: selected.id, ...data });
    else await createM.mutateAsync(data as DepartmentInsert);
  };

  const defaults: Partial<FormData> = selected
    ? { code: selected.code, name: selected.name, description: selected.description, display_order: selected.display_order, is_active: selected.is_active }
    : { code: "", name: "", display_order: 0, is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Code", value: selected.code },
    { label: "Name", value: selected.name },
    { label: "Description", value: selected.description },
    { label: "Display Order", value: selected.display_order, type: "number" },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
    { label: "Updated At", value: selected.updated_at, type: "date" },
  ] : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
        <p className="text-muted-foreground mt-1">Manage department classifications</p>
      </div>
      <DataTable data={items} columns={columns} actions={actions} searchKey="name" searchPlaceholder="Search departments..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Department" emptyMessage="No departments found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Department" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Department Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Department" : "Delete Department"} itemName={selected?.name} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
