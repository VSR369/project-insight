import * as React from "react";
import { Tags, RotateCcw } from "lucide-react";
import { z } from "zod";


import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import {
  useCapabilityTags,
  useCreateCapabilityTag,
  useUpdateCapabilityTag,
  useDeleteCapabilityTag,
  useRestoreCapabilityTag,
  CapabilityTag,
} from "@/hooks/queries/useCapabilityTags";

const capabilityTagSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500).optional().nullable(),
  display_order: z.coerce.number().int().min(0).optional().nullable(),
  is_active: z.boolean().default(true),
});

type CapabilityTagFormData = z.infer<typeof capabilityTagSchema>;

const formFields: FormFieldConfig[] = [
  {
    name: "name",
    label: "Name",
    type: "text",
    placeholder: "e.g., analytical_thinking",
    description: "Unique identifier for the capability (use snake_case)",
    required: true,
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Describe what this capability measures...",
    description: "Detailed explanation of the capability",
    required: false,
  },
  {
    name: "display_order",
    label: "Display Order",
    type: "number",
    placeholder: "0",
    description: "Order in which this appears in lists",
    required: false,
  },
  {
    name: "is_active",
    label: "Active",
    type: "switch",
    description: "Inactive tags won't appear in selection lists",
    required: false,
  },
];

export function CapabilityTagsPage() {
  const [showInactive, setShowInactive] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editingTag, setEditingTag] = React.useState<CapabilityTag | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingTag, setDeletingTag] = React.useState<CapabilityTag | null>(null);

  const { data: tags = [], isLoading } = useCapabilityTags(showInactive);
  const createMutation = useCreateCapabilityTag();
  const updateMutation = useUpdateCapabilityTag();
  const deleteMutation = useDeleteCapabilityTag();
  const restoreMutation = useRestoreCapabilityTag();

  const columns: DataTableColumn<CapabilityTag>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: (value) => (
        <code className="px-2 py-1 bg-muted rounded text-sm">{value as string}</code>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: (value) => (
        <span className="text-muted-foreground line-clamp-2 max-w-md">
          {(value as string) || "—"}
        </span>
      ),
    },
    {
      accessorKey: "display_order",
      header: "Order",
      cell: (value) => (
        <span className="text-muted-foreground">{(value as number | null) ?? "—"}</span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: (value) => <StatusBadge isActive={value as boolean} />,
    },
  ];

  const actions: DataTableAction<CapabilityTag>[] = [
    {
      label: "Edit",
      onClick: (tag) => {
        setEditingTag(tag);
        setFormMode("edit");
        setFormOpen(true);
      },
    },
    {
      label: "Restore",
      onClick: (tag) => restoreMutation.mutate(tag.id),
      show: (tag) => !tag.is_active,
    },
    {
      label: "Deactivate",
      onClick: (tag) => {
        setDeletingTag(tag);
        setDeleteOpen(true);
      },
      show: (tag) => tag.is_active,
      variant: "destructive",
    },
  ];

  const handleSubmit = async (data: CapabilityTagFormData) => {
    if (formMode === "create") {
      await createMutation.mutateAsync({
        name: data.name,
        description: data.description,
        display_order: data.display_order,
        is_active: data.is_active,
      });
    } else if (editingTag) {
      await updateMutation.mutateAsync({ id: editingTag.id, ...data });
    }
  };

  const getDefaultValues = (): Partial<CapabilityTagFormData> => {
    if (!editingTag) {
      return { is_active: true, display_order: 0 };
    }
    return {
      name: editingTag.name,
      description: editingTag.description,
      display_order: editingTag.display_order,
      is_active: editingTag.is_active,
    };
  };

  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Capability Tags" },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tags className="h-5 w-5 text-primary" />
              <CardTitle>Capability Tags</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                Show inactive
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="h-4 w-4"
                />
              </label>
            </div>
          </div>
          <CardDescription>
            Capabilities describe what each question validates (e.g., analytical thinking, process design)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={tags}
            columns={columns}
            actions={actions}
            isLoading={isLoading}
            searchKey="name"
            searchPlaceholder="Search capability tags..."
            emptyMessage="No capability tags found"
            onAdd={() => {
              setEditingTag(null);
              setFormMode("create");
              setFormOpen(true);
            }}
            addButtonLabel="Add Capability Tag"
          />
        </CardContent>
      </Card>

      <MasterDataForm<CapabilityTagFormData>
        open={formOpen}
        onOpenChange={setFormOpen}
        title={formMode === "create" ? "Add Capability Tag" : "Edit Capability Tag"}
        fields={formFields}
        schema={capabilityTagSchema}
        defaultValues={getDefaultValues()}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Deactivate Capability Tag"
        description={`Are you sure you want to deactivate "${deletingTag?.name}"? This will hide it from selection lists but won't remove it from existing questions.`}
        onConfirm={async () => {
          if (deletingTag) {
            await deleteMutation.mutateAsync(deletingTag.id);
          }
          setDeleteOpen(false);
        }}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
