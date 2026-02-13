import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash, Building2 } from "lucide-react";


import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import { Badge } from "@/components/ui/badge";
import { useParticipationModes, useCreateParticipationMode, useUpdateParticipationMode, useDeleteParticipationMode, useRestoreParticipationMode, useHardDeleteParticipationMode, ParticipationMode, ParticipationModeInsert } from "@/hooks/queries/useParticipationModes";

const participationModeSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(20, "Code must be at most 20 characters").toUpperCase(),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
  description: z.string().max(500, "Description must be at most 500 characters").nullable().optional(),
  requires_org_info: z.boolean().default(false),
  display_order: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});

type ParticipationModeFormData = z.infer<typeof participationModeSchema>;

const formFields: FormFieldConfig<ParticipationModeFormData>[] = [
  { name: "code", label: "Mode Code", type: "text", placeholder: "e.g., INDIVIDUAL, FIRM", description: "Unique identifier code", required: true },
  { name: "name", label: "Mode Name", type: "text", placeholder: "e.g., Independent Consultant", required: true },
  { name: "description", label: "Description", type: "textarea", placeholder: "Brief description...", description: "Optional description" },
  { name: "requires_org_info", label: "Requires Organization Info", type: "switch", description: "If enabled, providers must enter organization details" },
  { name: "display_order", label: "Display Order", type: "number", placeholder: "0", description: "Lower numbers appear first", min: 0 },
  { name: "is_active", label: "Active", type: "switch", description: "Inactive modes are hidden" },
];

export default function ParticipationModesPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selectedMode, setSelectedMode] = React.useState<ParticipationMode | null>(null);

  const { data: modes = [], isLoading } = useParticipationModes(true);
  const createMutation = useCreateParticipationMode();
  const updateMutation = useUpdateParticipationMode();
  const deleteMutation = useDeleteParticipationMode();
  const restoreMutation = useRestoreParticipationMode();
  const hardDeleteMutation = useHardDeleteParticipationMode();

  const columns: DataTableColumn<ParticipationMode>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "description", header: "Description", cell: (value) => { const desc = value as string | null; if (!desc) return "—"; return desc.length > 40 ? `${desc.substring(0, 40)}...` : desc; } },
    { accessorKey: "requires_org_info", header: "Org Info Required", cell: (value) => (<Badge variant={value ? "default" : "outline"} className={value ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : ""}>{value ? (<span className="flex items-center gap-1"><Building2 className="h-3 w-3" />Required</span>) : "Not Required"}</Badge>) },
    { accessorKey: "display_order", header: "Order", cell: (value) => (value as number) ?? "—" },
    { accessorKey: "is_active", header: "Status", cell: (value) => <StatusBadge isActive={value as boolean} /> },
  ];

  const actions: DataTableAction<ParticipationMode>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (mode) => { setSelectedMode(mode); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (mode) => { setSelectedMode(mode); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (mode) => { restoreMutation.mutate(mode.id); }, show: (mode) => !mode.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (mode) => { setSelectedMode(mode); setIsDeleteOpen(true); }, show: (mode) => !mode.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (mode) => { setSelectedMode(mode); setIsDeleteOpen(true); }, show: (mode) => mode.is_active },
  ];

  const handleSubmit = async (data: ParticipationModeFormData) => {
    if (selectedMode) { await updateMutation.mutateAsync({ id: selectedMode.id, ...data }); } else { await createMutation.mutateAsync(data as ParticipationModeInsert); }
  };

  const handleDelete = async () => { if (selectedMode) await deleteMutation.mutateAsync(selectedMode.id); };
  const handleHardDelete = async () => { if (selectedMode) await hardDeleteMutation.mutateAsync(selectedMode.id); };

  const defaultValues: Partial<ParticipationModeFormData> = selectedMode
    ? { code: selectedMode.code, name: selectedMode.name, description: selectedMode.description, requires_org_info: selectedMode.requires_org_info, display_order: selectedMode.display_order, is_active: selectedMode.is_active }
    : { code: "", name: "", description: "", requires_org_info: false, display_order: 0, is_active: true };

  const viewFields: ViewField[] = selectedMode
    ? [
        { label: "Mode Code", value: selectedMode.code },
        { label: "Mode Name", value: selectedMode.name },
        { label: "Description", value: selectedMode.description, type: "textarea" },
        { label: "Requires Organization Info", value: selectedMode.requires_org_info, type: "boolean" },
        { label: "Display Order", value: selectedMode.display_order, type: "number" },
        { label: "Status", value: selectedMode.is_active, type: "boolean" },
        { label: "Created At", value: selectedMode.created_at, type: "date" },
        { label: "Updated At", value: selectedMode.updated_at, type: "date" },
      ]
    : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Participation Modes</h1>
        <p className="text-muted-foreground mt-1">Define how solution providers can participate</p>
      </div>
      <DataTable data={modes} columns={columns} actions={actions} searchKey="name" searchPlaceholder="Search participation modes..." isLoading={isLoading} onAdd={() => { setSelectedMode(null); setIsFormOpen(true); }} addButtonLabel="Add Participation Mode" emptyMessage="No participation modes found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Participation Mode" description="Participation modes determine how providers engage with the platform." fields={formFields} schema={participationModeSchema} defaultValues={defaultValues} onSubmit={handleSubmit} isLoading={createMutation.isPending || updateMutation.isPending} mode={selectedMode ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Participation Mode Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selectedMode?.is_active ? "Deactivate Participation Mode" : "Delete Participation Mode"} itemName={selectedMode?.name} onConfirm={selectedMode?.is_active ? handleDelete : handleHardDelete} onHardDelete={handleHardDelete} isLoading={selectedMode?.is_active ? deleteMutation.isPending : hardDeleteMutation.isPending} hardDeleteLoading={hardDeleteMutation.isPending} isSoftDelete={selectedMode?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
