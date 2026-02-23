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
  useFunctionalAreas, useCreateFunctionalArea, useUpdateFunctionalArea,
  useDeleteFunctionalArea, useRestoreFunctionalArea, useHardDeleteFunctionalArea,
  FunctionalArea, FunctionalAreaInsert,
} from "@/hooks/queries/useFunctionalAreasAdmin";
import { useDepartments } from "@/hooks/queries/useDepartmentsAdmin";

const schema = z.object({
  code: z.string().min(2).max(20).toUpperCase(),
  name: z.string().min(2).max(100),
  description: z.string().max(500).nullable().optional(),
  department_id: z.string().uuid({ message: "Department is required" }),
  display_order: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

export default function FunctionalAreasPage() {
  const page = useMasterDataPage<FunctionalArea>();
  const { selected } = page;

  const { data: items = [], isLoading } = useFunctionalAreas(true);
  const { data: departments = [] } = useDepartments(false);
  const createM = useCreateFunctionalArea();
  const updateM = useUpdateFunctionalArea();
  const deleteM = useDeleteFunctionalArea();
  const restoreM = useRestoreFunctionalArea();
  const hardDeleteM = useHardDeleteFunctionalArea();

  const formFields: FormFieldConfig<FormData>[] = React.useMemo(() => [
    { name: "code", label: "Code", type: "text" as const, placeholder: "e.g., TECH, FIN", required: true },
    { name: "name", label: "Name", type: "text" as const, placeholder: "e.g., Technology", required: true },
    { name: "description", label: "Description", type: "textarea" as const, placeholder: "Optional description" },
    {
      name: "department_id", label: "Department", type: "select" as const, placeholder: "Select department", required: true,
      options: departments.map(d => ({ value: d.id, label: d.name })),
    },
    { name: "display_order", label: "Display Order", type: "number" as const, placeholder: "0", min: 0 },
    { name: "is_active", label: "Active", type: "switch" as const },
  ], [departments]);

  const columns: DataTableColumn<FunctionalArea>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "md_departments", header: "Department", cell: (v) => (v as any)?.name || "—" },
    { accessorKey: "description", header: "Description", cell: (v) => (v as string) || "—" },
    { accessorKey: "display_order", header: "Order", cell: (v) => (v as number) ?? "—" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions = React.useMemo(() => createMasterDataActions<FunctionalArea>({
    onView: page.openView,
    onEdit: page.openEdit,
    onRestore: (id) => restoreM.mutate(id),
    onDelete: page.openDelete,
  }), [page.openView, page.openEdit, page.openDelete, restoreM]);

  const handleSubmit = async (data: FormData) => {
    const payload = { ...data, department_id: data.department_id || null };
    if (selected) await updateM.mutateAsync({ id: selected.id, ...payload });
    else await createM.mutateAsync(payload as FunctionalAreaInsert);
  };

  const defaults: Partial<FormData> = selected
    ? { code: selected.code, name: selected.name, description: selected.description, department_id: selected.department_id, display_order: selected.display_order, is_active: selected.is_active }
    : { code: "", name: "", display_order: 0, is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Code", value: selected.code },
    { label: "Name", value: selected.name },
    { label: "Department", value: selected.md_departments?.name || "—" },
    { label: "Description", value: selected.description },
    { label: "Display Order", value: selected.display_order, type: "number" },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
    { label: "Updated At", value: selected.updated_at, type: "date" },
  ] : [];

  return (
    <>
      <PageHeader title="Functional Areas" description="Manage functional area classifications linked to departments" />
      <DataTable data={items} columns={columns} actions={actions} searchKey="name" searchPlaceholder="Search functional areas..." isLoading={isLoading} onAdd={page.openCreate} addButtonLabel="Add Functional Area" emptyMessage="No functional areas found." />
      <MasterDataForm open={page.isFormOpen} onOpenChange={page.setIsFormOpen} title="Functional Area" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={page.isViewOpen} onOpenChange={page.setIsViewOpen} title="Functional Area Details" fields={viewFields} onEdit={page.switchToEdit} />
      <DeleteConfirmDialog open={page.isDeleteOpen} onOpenChange={page.setIsDeleteOpen} title={selected?.is_active ? "Deactivate Functional Area" : "Delete Functional Area"} itemName={selected?.name} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
