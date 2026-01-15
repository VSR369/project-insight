import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import { Badge } from "@/components/ui/badge";
import { useExpertiseLevels, useCreateExpertiseLevel, useUpdateExpertiseLevel, useDeleteExpertiseLevel, useRestoreExpertiseLevel, useHardDeleteExpertiseLevel, ExpertiseLevel, ExpertiseLevelInsert } from "@/hooks/queries/useExpertiseLevels";

const expertiseLevelSchema = z.object({
  level_number: z.number().int("Level must be a whole number").min(0, "Level must be at least 0").max(10, "Level must be at most 10"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
  min_years: z.number().int("Years must be a whole number").min(0, "Minimum years cannot be negative"),
  max_years: z.number().int("Years must be a whole number").min(0, "Maximum years cannot be negative").nullable().optional(),
  description: z.string().max(500, "Description must be at most 500 characters").nullable().optional(),
  is_active: z.boolean().default(true),
}).refine((data) => { if (data.max_years !== null && data.max_years !== undefined) { return data.max_years >= data.min_years; } return true; }, { message: "Maximum years must be greater than or equal to minimum years", path: ["max_years"] });

type ExpertiseLevelFormData = z.infer<typeof expertiseLevelSchema>;

const formFields: FormFieldConfig<ExpertiseLevelFormData>[] = [
  { name: "level_number", label: "Level Number", type: "number", placeholder: "e.g., 0, 1, 2, 3", description: "Numeric tier for this expertise level (0 = learner, 1+ = professional tiers)", required: true, min: 0, max: 10 },
  { name: "name", label: "Level Name", type: "text", placeholder: "e.g., Junior, Mid-Level, Senior, Expert", required: true },
  { name: "min_years", label: "Minimum Years of Experience", type: "number", placeholder: "0", description: "Minimum years required for this level", required: true, min: 0 },
  { name: "max_years", label: "Maximum Years of Experience", type: "number", placeholder: "Leave empty for no maximum", description: "Maximum years for this level (optional)", min: 0 },
  { name: "description", label: "Description", type: "textarea", placeholder: "Describe the typical capabilities...", description: "Optional description for context" },
  { name: "is_active", label: "Active", type: "switch", description: "Inactive levels are hidden from users" },
];

export default function ExpertiseLevelsPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selectedLevel, setSelectedLevel] = React.useState<ExpertiseLevel | null>(null);

  const { data: levels = [], isLoading } = useExpertiseLevels(true);
  const createMutation = useCreateExpertiseLevel();
  const updateMutation = useUpdateExpertiseLevel();
  const deleteMutation = useDeleteExpertiseLevel();
  const restoreMutation = useRestoreExpertiseLevel();
  const hardDeleteMutation = useHardDeleteExpertiseLevel();

  const formatYearsRange = (min: number, max: number | null) => max === null ? `${min}+ years` : min === max ? `${min} year${min !== 1 ? "s" : ""}` : `${min}–${max} years`;

  const columns: DataTableColumn<ExpertiseLevel>[] = [
    { accessorKey: "level_number", header: "Level", cell: (value) => <Badge variant="outline" className="font-mono">L{value as number}</Badge> },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "min_years", header: "Experience Range", cell: (value, row) => formatYearsRange(value as number, row.max_years) },
    { accessorKey: "description", header: "Description", cell: (value) => { const desc = value as string | null; if (!desc) return "—"; return desc.length > 40 ? `${desc.substring(0, 40)}...` : desc; } },
    { accessorKey: "is_active", header: "Status", cell: (value) => <StatusBadge isActive={value as boolean} /> },
  ];

  const actions: DataTableAction<ExpertiseLevel>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (level) => { setSelectedLevel(level); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (level) => { setSelectedLevel(level); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (level) => { restoreMutation.mutate(level.id); }, show: (level) => !level.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (level) => { setSelectedLevel(level); setIsDeleteOpen(true); }, show: (level) => !level.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (level) => { setSelectedLevel(level); setIsDeleteOpen(true); }, show: (level) => level.is_active },
  ];

  const handleSubmit = async (data: ExpertiseLevelFormData) => {
    if (selectedLevel) { await updateMutation.mutateAsync({ id: selectedLevel.id, ...data }); } else { await createMutation.mutateAsync(data as ExpertiseLevelInsert); }
  };

  const handleDelete = async () => { if (selectedLevel) await deleteMutation.mutateAsync(selectedLevel.id); };
  const handleHardDelete = async () => { if (selectedLevel) await hardDeleteMutation.mutateAsync(selectedLevel.id); };

  const defaultValues: Partial<ExpertiseLevelFormData> = selectedLevel
    ? { level_number: selectedLevel.level_number, name: selectedLevel.name, min_years: selectedLevel.min_years, max_years: selectedLevel.max_years, description: selectedLevel.description, is_active: selectedLevel.is_active }
    : { level_number: (levels.length > 0 ? Math.max(...levels.map(l => l.level_number)) + 1 : 0), name: "", min_years: 0, max_years: null, description: "", is_active: true };

  const viewFields: ViewField[] = selectedLevel
    ? [
        { label: "Level Number", value: selectedLevel.level_number, type: "number" },
        { label: "Level Name", value: selectedLevel.name },
        { label: "Minimum Years", value: selectedLevel.min_years, type: "number" },
        { label: "Maximum Years", value: selectedLevel.max_years, type: "number" },
        { label: "Experience Range", value: formatYearsRange(selectedLevel.min_years, selectedLevel.max_years) },
        { label: "Description", value: selectedLevel.description, type: "textarea" },
        { label: "Status", value: selectedLevel.is_active, type: "boolean" },
        { label: "Created At", value: selectedLevel.created_at, type: "date" },
        { label: "Updated At", value: selectedLevel.updated_at, type: "date" },
      ]
    : [];

  return (
    <AdminLayout title="Expertise Levels" description="Define experience tiers and requirements for solution providers" breadcrumbs={[{ label: "Master Data", href: "/admin" }, { label: "Expertise Levels" }]}>
      <DataTable data={levels} columns={columns} actions={actions} searchKey="name" searchPlaceholder="Search expertise levels..." isLoading={isLoading} onAdd={() => { setSelectedLevel(null); setIsFormOpen(true); }} addButtonLabel="Add Expertise Level" emptyMessage="No expertise levels found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Expertise Level" description="Expertise levels categorize providers by their years of experience." fields={formFields} schema={expertiseLevelSchema} defaultValues={defaultValues} onSubmit={handleSubmit} isLoading={createMutation.isPending || updateMutation.isPending} mode={selectedLevel ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Expertise Level Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selectedLevel?.is_active ? "Deactivate Expertise Level" : "Delete Expertise Level"} itemName={selectedLevel?.name} onConfirm={selectedLevel?.is_active ? handleDelete : handleHardDelete} onHardDelete={handleHardDelete} isLoading={selectedLevel?.is_active ? deleteMutation.isPending : hardDeleteMutation.isPending} hardDeleteLoading={hardDeleteMutation.isPending} isSoftDelete={selectedLevel?.is_active ?? true} showHardDelete={false} />
    </AdminLayout>
  );
}
