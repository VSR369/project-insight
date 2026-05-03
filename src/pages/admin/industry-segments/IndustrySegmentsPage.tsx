import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";


import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import { useIndustrySegments, useCreateIndustrySegment, useUpdateIndustrySegment, useDeleteIndustrySegment, useRestoreIndustrySegment, useHardDeleteIndustrySegment, IndustrySegment, IndustrySegmentInsert } from "@/hooks/queries/useIndustrySegments";
import { useOrganizationTypes } from "@/hooks/queries/useOrganizationTypes";
import { useOrgTypeIndustryMappings, useOrgTypesForIndustry, useSetIndustryOrgTypes } from "@/hooks/queries/useOrgTypeIndustryMap";

const industrySegmentSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(20, "Code must be at most 20 characters").toUpperCase(),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
  description: z.string().max(500, "Description must be at most 500 characters").nullable().optional(),
  display_order: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
  organization_type_ids: z.array(z.string().uuid()).default([]),
});

type IndustrySegmentFormData = z.infer<typeof industrySegmentSchema>;

export default function IndustrySegmentsPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selectedSegment, setSelectedSegment] = React.useState<IndustrySegment | null>(null);

  const { data: segments = [], isLoading } = useIndustrySegments(true);
  const { data: orgTypes = [] } = useOrganizationTypes(true);
  const { data: mappings = [] } = useOrgTypeIndustryMappings();
  const { data: mappedOrgTypeIds = [] } = useOrgTypesForIndustry(selectedSegment?.id);

  const createMutation = useCreateIndustrySegment();
  const updateMutation = useUpdateIndustrySegment();
  const deleteMutation = useDeleteIndustrySegment();
  const restoreMutation = useRestoreIndustrySegment();
  const hardDeleteMutation = useHardDeleteIndustrySegment();
  const setMappingsMutation = useSetIndustryOrgTypes();

  // industryId -> [orgTypeName, ...]
  const orgTypesByIndustry = React.useMemo(() => {
    const nameById = new Map(orgTypes.map((o) => [o.id, o.name]));
    const acc = new Map<string, string[]>();
    mappings.forEach((m) => {
      const name = nameById.get(m.org_type_id);
      if (!name) return;
      const list = acc.get(m.industry_id) ?? [];
      list.push(name);
      acc.set(m.industry_id, list);
    });
    return acc;
  }, [mappings, orgTypes]);

  const orgTypeOptions = React.useMemo(
    () => orgTypes.filter((o) => o.is_active).map((o) => ({ value: o.id, label: o.name })),
    [orgTypes],
  );

  const formFields: FormFieldConfig<IndustrySegmentFormData>[] = [
    { name: "code", label: "Segment Code", type: "text", placeholder: "e.g., TECH, HEALTH, FIN", description: "Unique identifier code", required: true },
    { name: "name", label: "Segment Name", type: "text", placeholder: "e.g., Technology, Healthcare", required: true },
    { name: "description", label: "Description", type: "textarea", placeholder: "Brief description...", description: "Optional description" },
    { name: "display_order", label: "Display Order", type: "number", placeholder: "0", description: "Lower numbers appear first", min: 0 },
    { name: "is_active", label: "Active", type: "switch", description: "Inactive segments are hidden" },
    {
      name: "organization_type_ids",
      label: "Organization Types",
      type: "multiselect",
      placeholder: "Add an organization type...",
      description: "Organization types this segment is offered to in registration. Empty = not shown to anyone.",
      options: orgTypeOptions,
    },
  ];

  const columns: DataTableColumn<IndustrySegment>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "id",
      header: "Organization Types",
      cell: (value) => {
        const list = orgTypesByIndustry.get(value as string) ?? [];
        if (list.length === 0) return <span className="text-muted-foreground">—</span>;
        const display = list.slice(0, 3).join(", ");
        const more = list.length > 3 ? ` +${list.length - 3}` : "";
        return <span title={list.join(", ")}>{display}{more}</span>;
      },
    },
    { accessorKey: "display_order", header: "Order", cell: (value) => (value as number) ?? "—" },
    { accessorKey: "is_active", header: "Status", cell: (value) => <StatusBadge isActive={value as boolean} /> },
  ];

  const actions: DataTableAction<IndustrySegment>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (segment) => { setSelectedSegment(segment); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (segment) => { setSelectedSegment(segment); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (segment) => { restoreMutation.mutate(segment.id); }, show: (segment) => !segment.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (segment) => { setSelectedSegment(segment); setIsDeleteOpen(true); }, show: (segment) => !segment.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (segment) => { setSelectedSegment(segment); setIsDeleteOpen(true); }, show: (segment) => segment.is_active },
  ];

  const handleSubmit = async (data: IndustrySegmentFormData) => {
    const { organization_type_ids, ...segmentFields } = data;
    let targetId = selectedSegment?.id;
    if (selectedSegment) {
      await updateMutation.mutateAsync({ id: selectedSegment.id, ...segmentFields });
    } else {
      const created = await createMutation.mutateAsync(segmentFields as IndustrySegmentInsert);
      targetId = (created as { id?: string } | undefined)?.id;
    }
    if (targetId) {
      await setMappingsMutation.mutateAsync({ industryId: targetId, orgTypeIds: organization_type_ids });
    }
  };

  const handleDelete = async () => { if (selectedSegment) await deleteMutation.mutateAsync(selectedSegment.id); };
  const handleHardDelete = async () => { if (selectedSegment) await hardDeleteMutation.mutateAsync(selectedSegment.id); };

  const defaultValues: Partial<IndustrySegmentFormData> = selectedSegment
    ? {
        code: selectedSegment.code,
        name: selectedSegment.name,
        description: selectedSegment.description,
        display_order: selectedSegment.display_order,
        is_active: selectedSegment.is_active,
        organization_type_ids: mappedOrgTypeIds,
      }
    : { code: "", name: "", description: "", display_order: 0, is_active: true, organization_type_ids: [] };

  const viewFields: ViewField[] = selectedSegment
    ? [
        { label: "Segment Code", value: selectedSegment.code },
        { label: "Segment Name", value: selectedSegment.name },
        { label: "Description", value: selectedSegment.description, type: "textarea" },
        { label: "Display Order", value: selectedSegment.display_order, type: "number" },
        { label: "Status", value: selectedSegment.is_active, type: "boolean" },
        { label: "Organization Types", value: (orgTypesByIndustry.get(selectedSegment.id) ?? []).join(", ") || "—" },
        { label: "Created At", value: selectedSegment.created_at, type: "date" },
        { label: "Updated At", value: selectedSegment.updated_at, type: "date" },
      ]
    : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Industry Segments</h1>
        <p className="text-muted-foreground mt-1">Manage industry sectors and the organization types they apply to in registration.</p>
      </div>
      <DataTable data={segments} columns={columns} actions={actions} searchKey="name" searchPlaceholder="Search industry segments..." isLoading={isLoading} onAdd={() => { setSelectedSegment(null); setIsFormOpen(true); }} addButtonLabel="Add Industry Segment" emptyMessage="No industry segments found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Industry Segment" description="Industry segments categorize providers and challenges by sector." fields={formFields} schema={industrySegmentSchema} defaultValues={defaultValues} onSubmit={handleSubmit} isLoading={createMutation.isPending || updateMutation.isPending || setMappingsMutation.isPending} mode={selectedSegment ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Industry Segment Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selectedSegment?.is_active ? "Deactivate Industry Segment" : "Delete Industry Segment"} itemName={selectedSegment?.name} onConfirm={selectedSegment?.is_active ? handleDelete : handleHardDelete} onHardDelete={handleHardDelete} isLoading={selectedSegment?.is_active ? deleteMutation.isPending : hardDeleteMutation.isPending} hardDeleteLoading={hardDeleteMutation.isPending} isSoftDelete={selectedSegment?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
