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
import {
  useIndustrySegments,
  useCreateIndustrySegment,
  useUpdateIndustrySegment,
  useDeleteIndustrySegment,
  useRestoreIndustrySegment,
  IndustrySegment,
  IndustrySegmentInsert,
} from "@/hooks/queries/useIndustrySegments";

// Zod schema for form validation
const industrySegmentSchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(20, "Code must be at most 20 characters")
    .toUpperCase(),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .nullable()
    .optional(),
  display_order: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});

type IndustrySegmentFormData = z.infer<typeof industrySegmentSchema>;

// Form field configuration
const formFields: FormFieldConfig<IndustrySegmentFormData>[] = [
  {
    name: "code",
    label: "Segment Code",
    type: "text",
    placeholder: "e.g., TECH, HEALTH, FIN",
    description: "Unique identifier code for this industry segment",
    required: true,
  },
  {
    name: "name",
    label: "Segment Name",
    type: "text",
    placeholder: "e.g., Technology, Healthcare, Finance",
    required: true,
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Brief description of this industry segment...",
    description: "Optional description for context",
  },
  {
    name: "display_order",
    label: "Display Order",
    type: "number",
    placeholder: "0",
    description: "Lower numbers appear first",
    min: 0,
  },
  {
    name: "is_active",
    label: "Active",
    type: "switch",
    description: "Inactive segments are hidden from users",
  },
];

export default function IndustrySegmentsPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selectedSegment, setSelectedSegment] = React.useState<IndustrySegment | null>(null);

  // Queries and mutations (include inactive for admin view)
  const { data: segments = [], isLoading } = useIndustrySegments(true);
  const createMutation = useCreateIndustrySegment();
  const updateMutation = useUpdateIndustrySegment();
  const deleteMutation = useDeleteIndustrySegment();
  const restoreMutation = useRestoreIndustrySegment();

  // Table columns
  const columns: DataTableColumn<IndustrySegment>[] = [
    {
      accessorKey: "code",
      header: "Code",
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: (value) => {
        const desc = value as string | null;
        if (!desc) return "—";
        return desc.length > 50 ? `${desc.substring(0, 50)}...` : desc;
      },
    },
    {
      accessorKey: "display_order",
      header: "Order",
      cell: (value) => (value as number) ?? "—",
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: (value) => <StatusBadge isActive={value as boolean} />,
    },
  ];

  // Table actions
  const actions: DataTableAction<IndustrySegment>[] = [
    {
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: (segment) => {
        setSelectedSegment(segment);
        setIsFormOpen(true);
      },
    },
    {
      label: "Restore",
      icon: <RotateCcw className="h-4 w-4" />,
      onClick: (segment) => {
        restoreMutation.mutate(segment.id);
      },
      show: (segment) => !segment.is_active,
    },
    {
      label: "Deactivate",
      icon: <Trash2 className="h-4 w-4" />,
      variant: "destructive",
      onClick: (segment) => {
        setSelectedSegment(segment);
        setIsDeleteOpen(true);
      },
      show: (segment) => segment.is_active,
    },
  ];

  // Form handlers
  const handleAdd = () => {
    setSelectedSegment(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (data: IndustrySegmentFormData) => {
    if (selectedSegment) {
      await updateMutation.mutateAsync({
        id: selectedSegment.id,
        ...data,
      });
    } else {
      await createMutation.mutateAsync(data as IndustrySegmentInsert);
    }
  };

  const handleDelete = async () => {
    if (selectedSegment) {
      await deleteMutation.mutateAsync(selectedSegment.id);
    }
  };

  // Default values for form
  const defaultValues: Partial<IndustrySegmentFormData> = selectedSegment
    ? {
        code: selectedSegment.code,
        name: selectedSegment.name,
        description: selectedSegment.description,
        display_order: selectedSegment.display_order,
        is_active: selectedSegment.is_active,
      }
    : {
        code: "",
        name: "",
        description: "",
        display_order: 0,
        is_active: true,
      };

  return (
    <AdminLayout
      title="Industry Segments"
      description="Manage industry sectors for categorizing solution providers and challenges"
      breadcrumbs={[
        { label: "Master Data", href: "/admin" },
        { label: "Industry Segments" },
      ]}
    >
      <DataTable
        data={segments}
        columns={columns}
        actions={actions}
        searchKey="name"
        searchPlaceholder="Search industry segments..."
        isLoading={isLoading}
        onAdd={handleAdd}
        addButtonLabel="Add Industry Segment"
        emptyMessage="No industry segments found. Add your first industry segment to get started."
      />

      <MasterDataForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title="Industry Segment"
        description="Industry segments categorize providers and challenges by sector."
        fields={formFields}
        schema={industrySegmentSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        mode={selectedSegment ? "edit" : "create"}
      />

      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Deactivate Industry Segment"
        itemName={selectedSegment?.name}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        isSoftDelete={true}
      />
    </AdminLayout>
  );
}
