import * as React from "react";
import { z } from "zod";
import { Pencil, Trash2, RotateCcw } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  DataTable,
  DataTableColumn,
  DataTableAction,
} from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  useExpertiseLevels,
  useCreateExpertiseLevel,
  useUpdateExpertiseLevel,
  useDeleteExpertiseLevel,
  useRestoreExpertiseLevel,
  ExpertiseLevel,
  ExpertiseLevelInsert,
} from "@/hooks/queries/useExpertiseLevels";

// Zod schema for form validation
const expertiseLevelSchema = z.object({
  level_number: z
    .number()
    .int("Level must be a whole number")
    .min(1, "Level must be at least 1")
    .max(10, "Level must be at most 10"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  min_years: z
    .number()
    .int("Years must be a whole number")
    .min(0, "Minimum years cannot be negative"),
  max_years: z
    .number()
    .int("Years must be a whole number")
    .min(0, "Maximum years cannot be negative")
    .nullable()
    .optional(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .nullable()
    .optional(),
  is_active: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.max_years !== null && data.max_years !== undefined) {
      return data.max_years >= data.min_years;
    }
    return true;
  },
  {
    message: "Maximum years must be greater than or equal to minimum years",
    path: ["max_years"],
  }
);

type ExpertiseLevelFormData = z.infer<typeof expertiseLevelSchema>;

// Form field configuration
const formFields: FormFieldConfig<ExpertiseLevelFormData>[] = [
  {
    name: "level_number",
    label: "Level Number",
    type: "number",
    placeholder: "e.g., 1, 2, 3",
    description: "Numeric tier for this expertise level (1 = lowest)",
    required: true,
    min: 1,
    max: 10,
  },
  {
    name: "name",
    label: "Level Name",
    type: "text",
    placeholder: "e.g., Junior, Mid-Level, Senior, Expert",
    required: true,
  },
  {
    name: "min_years",
    label: "Minimum Years of Experience",
    type: "number",
    placeholder: "0",
    description: "Minimum years required for this level",
    required: true,
    min: 0,
  },
  {
    name: "max_years",
    label: "Maximum Years of Experience",
    type: "number",
    placeholder: "Leave empty for no maximum",
    description: "Maximum years for this level (optional)",
    min: 0,
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Describe the typical capabilities and expectations for this level...",
    description: "Optional description for context",
  },
  {
    name: "is_active",
    label: "Active",
    type: "switch",
    description: "Inactive levels are hidden from users",
  },
];

export default function ExpertiseLevelsPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selectedLevel, setSelectedLevel] = React.useState<ExpertiseLevel | null>(null);

  // Queries and mutations
  const { data: levels = [], isLoading } = useExpertiseLevels(true);
  const createMutation = useCreateExpertiseLevel();
  const updateMutation = useUpdateExpertiseLevel();
  const deleteMutation = useDeleteExpertiseLevel();
  const restoreMutation = useRestoreExpertiseLevel();

  // Format years range for display
  const formatYearsRange = (min: number, max: number | null) => {
    if (max === null) {
      return `${min}+ years`;
    }
    if (min === max) {
      return `${min} year${min !== 1 ? "s" : ""}`;
    }
    return `${min}–${max} years`;
  };

  // Table columns
  const columns: DataTableColumn<ExpertiseLevel>[] = [
    {
      accessorKey: "level_number",
      header: "Level",
      cell: (value) => (
        <Badge variant="outline" className="font-mono">
          L{value as number}
        </Badge>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "min_years",
      header: "Experience Range",
      cell: (value, row) => formatYearsRange(value as number, row.max_years),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: (value) => {
        const desc = value as string | null;
        if (!desc) return "—";
        return desc.length > 40 ? `${desc.substring(0, 40)}...` : desc;
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: (value) => <StatusBadge isActive={value as boolean} />,
    },
  ];

  // Table actions
  const actions: DataTableAction<ExpertiseLevel>[] = [
    {
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: (level) => {
        setSelectedLevel(level);
        setIsFormOpen(true);
      },
    },
    {
      label: "Restore",
      icon: <RotateCcw className="h-4 w-4" />,
      onClick: (level) => {
        restoreMutation.mutate(level.id);
      },
      show: (level) => !level.is_active,
    },
    {
      label: "Deactivate",
      icon: <Trash2 className="h-4 w-4" />,
      variant: "destructive",
      onClick: (level) => {
        setSelectedLevel(level);
        setIsDeleteOpen(true);
      },
      show: (level) => level.is_active,
    },
  ];

  // Form handlers
  const handleAdd = () => {
    setSelectedLevel(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (data: ExpertiseLevelFormData) => {
    if (selectedLevel) {
      await updateMutation.mutateAsync({
        id: selectedLevel.id,
        ...data,
      });
    } else {
      await createMutation.mutateAsync(data as ExpertiseLevelInsert);
    }
  };

  const handleDelete = async () => {
    if (selectedLevel) {
      await deleteMutation.mutateAsync(selectedLevel.id);
    }
  };

  // Default values for form
  const defaultValues: Partial<ExpertiseLevelFormData> = selectedLevel
    ? {
        level_number: selectedLevel.level_number,
        name: selectedLevel.name,
        min_years: selectedLevel.min_years,
        max_years: selectedLevel.max_years,
        description: selectedLevel.description,
        is_active: selectedLevel.is_active,
      }
    : {
        level_number: (levels.length > 0 ? Math.max(...levels.map(l => l.level_number)) + 1 : 1),
        name: "",
        min_years: 0,
        max_years: null,
        description: "",
        is_active: true,
      };

  return (
    <AdminLayout
      title="Expertise Levels"
      description="Define experience tiers and requirements for solution providers"
      breadcrumbs={[
        { label: "Master Data", href: "/admin" },
        { label: "Expertise Levels" },
      ]}
    >
      <DataTable
        data={levels}
        columns={columns}
        actions={actions}
        searchKey="name"
        searchPlaceholder="Search expertise levels..."
        isLoading={isLoading}
        onAdd={handleAdd}
        addButtonLabel="Add Expertise Level"
        emptyMessage="No expertise levels found. Add your first expertise level to get started."
      />

      <MasterDataForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title="Expertise Level"
        description="Expertise levels categorize providers by their years of experience and skill tier."
        fields={formFields}
        schema={expertiseLevelSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        mode={selectedLevel ? "edit" : "create"}
      />

      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Deactivate Expertise Level"
        itemName={selectedLevel?.name}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        isSoftDelete={true}
      />
    </AdminLayout>
  );
}
