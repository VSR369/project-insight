import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";


import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import { useOrganizationTypes, useCreateOrganizationType, useUpdateOrganizationType, useDeleteOrganizationType, useRestoreOrganizationType, useHardDeleteOrganizationType, OrganizationType, OrganizationTypeInsert } from "@/hooks/queries/useOrganizationTypes";

const organizationTypeSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(20, "Code must be at most 20 characters").toUpperCase(),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
  description: z.string().max(500, "Description must be at most 500 characters").nullable().optional(),
  display_order: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});

type OrganizationTypeFormData = z.infer<typeof organizationTypeSchema>;

const formFields: FormFieldConfig<OrganizationTypeFormData>[] = [
  { name: "code", label: "Type Code", type: "text", placeholder: "e.g., CORP, SME, STARTUP", description: "Unique identifier code", required: true },
  { name: "name", label: "Type Name", type: "text", placeholder: "e.g., Corporation, Small Business", required: true },
  { name: "description", label: "Description", type: "textarea", placeholder: "Brief description...", description: "Optional description" },
  { name: "display_order", label: "Display Order", type: "number", placeholder: "0", description: "Lower numbers appear first", min: 0 },
  { name: "is_active", label: "Active", type: "switch", description: "Inactive types are hidden" },
];

export default function OrganizationTypesPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState<OrganizationType | null>(null);

  const { data: types = [], isLoading } = useOrganizationTypes(true);
  const createMutation = useCreateOrganizationType();
  const updateMutation = useUpdateOrganizationType();
  const deleteMutation = useDeleteOrganizationType();
  const restoreMutation = useRestoreOrganizationType();
  const hardDeleteMutation = useHardDeleteOrganizationType();

  const columns: DataTableColumn<OrganizationType>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "description", header: "Description", cell: (value) => { const desc = value as string | null; if (!desc) return "—"; return desc.length > 50 ? `${desc.substring(0, 50)}...` : desc; } },
    { accessorKey: "display_order", header: "Order", cell: (value) => (value as number) ?? "—" },
    { accessorKey: "is_active", header: "Status", cell: (value) => <StatusBadge isActive={value as boolean} /> },
  ];

  const actions: DataTableAction<OrganizationType>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (type) => { setSelectedType(type); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (type) => { setSelectedType(type); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (type) => { restoreMutation.mutate(type.id); }, show: (type) => !type.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (type) => { setSelectedType(type); setIsDeleteOpen(true); }, show: (type) => !type.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (type) => { setSelectedType(type); setIsDeleteOpen(true); }, show: (type) => type.is_active },
  ];

  const handleSubmit = async (data: OrganizationTypeFormData) => {
    if (selectedType) { await updateMutation.mutateAsync({ id: selectedType.id, ...data }); } else { await createMutation.mutateAsync(data as OrganizationTypeInsert); }
  };

  const handleDelete = async () => { if (selectedType) await deleteMutation.mutateAsync(selectedType.id); };
  const handleHardDelete = async () => { if (selectedType) await hardDeleteMutation.mutateAsync(selectedType.id); };

  const defaultValues: Partial<OrganizationTypeFormData> = selectedType
    ? { code: selectedType.code, name: selectedType.name, description: selectedType.description, display_order: selectedType.display_order, is_active: selectedType.is_active }
    : { code: "", name: "", description: "", display_order: 0, is_active: true };

  const viewFields: ViewField[] = selectedType
    ? [
        { label: "Type Code", value: selectedType.code },
        { label: "Type Name", value: selectedType.name },
        { label: "Description", value: selectedType.description, type: "textarea" },
        { label: "Display Order", value: selectedType.display_order, type: "number" },
        { label: "Status", value: selectedType.is_active, type: "boolean" },
        { label: "Created At", value: selectedType.created_at, type: "date" },
        { label: "Updated At", value: selectedType.updated_at, type: "date" },
      ]
    : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Organization Types</h1>
        <p className="text-muted-foreground mt-1">Manage organization categories for solution providers</p>
      </div>
      <DataTable data={types} columns={columns} actions={actions} searchKey="name" searchPlaceholder="Search organization types..." isLoading={isLoading} onAdd={() => { setSelectedType(null); setIsFormOpen(true); }} addButtonLabel="Add Organization Type" emptyMessage="No organization types found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Organization Type" description="Organization types categorize the entities that providers represent." fields={formFields} schema={organizationTypeSchema} defaultValues={defaultValues} onSubmit={handleSubmit} isLoading={createMutation.isPending || updateMutation.isPending} mode={selectedType ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Organization Type Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selectedType?.is_active ? "Deactivate Organization Type" : "Delete Organization Type"} itemName={selectedType?.name} onConfirm={selectedType?.is_active ? handleDelete : handleHardDelete} onHardDelete={handleHardDelete} isLoading={selectedType?.is_active ? deleteMutation.isPending : hardDeleteMutation.isPending} hardDeleteLoading={hardDeleteMutation.isPending} isSoftDelete={selectedType?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
