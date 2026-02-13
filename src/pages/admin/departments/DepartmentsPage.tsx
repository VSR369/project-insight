import * as React from "react";
import { z } from "zod";

import { DataTable, DataTableColumn } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import { PageHeader } from "@/components/admin/PageHeader";
import { createMasterDataActions } from "@/components/admin/MasterDataActions";
import { useMasterDataPage } from "@/hooks/useMasterDataPage";
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

const columns: DataTableColumn<Department>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "description", header: "Description", cell: (v) => (v as string) || "—" },
  { accessorKey: "display_order", header: "Order", cell: (v) => (v as number) ?? "—" },
  { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
];

export default function DepartmentsPage() {
  const page = useMasterDataPage<Department>();
  const { selected } = page;

  const { data: items = [], isLoading } = useDepartments(true);
  const createM = useCreateDepartment();
  const updateM = useUpdateDepartment();
  const deleteM = useDeleteDepartment();
  const restoreM = useRestoreDepartment();
  const hardDeleteM = useHardDeleteDepartment();

  const actions = React.useMemo(() => createMasterDataActions<Department>({
    onView: page.openView,
    onEdit: page.openEdit,
    onRestore: (id) => restoreM.mutate(id),
    onDelete: page.openDelete,
  }), [page.openView, page.openEdit, page.openDelete, restoreM]);

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
      <PageHeader title="Departments" description="Manage department classifications" />
      <DataTable data={items} columns={columns} actions={actions} searchKey="name" searchPlaceholder="Search departments..." isLoading={isLoading} onAdd={page.openCreate} addButtonLabel="Add Department" emptyMessage="No departments found." />
      <MasterDataForm open={page.isFormOpen} onOpenChange={page.setIsFormOpen} title="Department" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={page.isViewOpen} onOpenChange={page.setIsViewOpen} title="Department Details" fields={viewFields} onEdit={page.switchToEdit} />
      <DeleteConfirmDialog open={page.isDeleteOpen} onOpenChange={page.setIsDeleteOpen} title={selected?.is_active ? "Deactivate Department" : "Delete Department"} itemName={selected?.name} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
