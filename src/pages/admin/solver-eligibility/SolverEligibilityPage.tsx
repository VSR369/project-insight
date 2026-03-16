import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";

import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  useSolverEligibilityList, useCreateSolverEligibility, useUpdateSolverEligibility,
  useDeleteSolverEligibility, useRestoreSolverEligibility, useHardDeleteSolverEligibility,
  SolverEligibility, SolverEligibilityInsert,
} from "@/hooks/queries/useSolverEligibilityAdmin";

const schema = z.object({
  code: z.string().min(2, "Code is required").max(50),
  label: z.string().min(2, "Label is required").max(100),
  description: z.string().max(500).nullable().optional(),
  requires_auth: z.boolean().default(false),
  requires_provider_record: z.boolean().default(false),
  requires_certification: z.boolean().default(false),
  min_star_rating: z.number().int().min(0).max(3).nullable().optional(),
  display_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

const formFields: FormFieldConfig<FormData>[] = [
  { name: "code", label: "Code", type: "text", placeholder: "e.g., certified_basic", required: true },
  { name: "label", label: "Label", type: "text", placeholder: "e.g., Certified Basic", required: true },
  { name: "description", label: "Description", type: "textarea", placeholder: "Brief description of this eligibility category" },
  { name: "requires_auth", label: "Requires Authentication", type: "switch", description: "Must be logged in to participate" },
  { name: "requires_provider_record", label: "Requires Provider Record", type: "switch", description: "Must have a solution_providers record" },
  { name: "requires_certification", label: "Requires Certification", type: "switch", description: "Must be certified to participate" },
  { name: "min_star_rating", label: "Min Star Rating", type: "number", min: 0, max: 3, description: "Minimum star rating (0–3, leave empty if N/A)" },
  { name: "display_order", label: "Display Order", type: "number", min: 0 },
  { name: "is_active", label: "Active", type: "switch" },
];

function BoolBadge({ value }: { value: boolean }) {
  return <Badge variant={value ? "default" : "outline"}>{value ? "Yes" : "No"}</Badge>;
}

export default function SolverEligibilityPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<SolverEligibility | null>(null);

  const { data: items = [], isLoading } = useSolverEligibilityList(true);
  const createM = useCreateSolverEligibility();
  const updateM = useUpdateSolverEligibility();
  const deleteM = useDeleteSolverEligibility();
  const restoreM = useRestoreSolverEligibility();
  const hardDeleteM = useHardDeleteSolverEligibility();

  const columns: DataTableColumn<SolverEligibility>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "label", header: "Label" },
    { accessorKey: "requires_auth", header: "Auth?", cell: (v) => <BoolBadge value={v as boolean} /> },
    { accessorKey: "requires_certification", header: "Cert?", cell: (v) => <BoolBadge value={v as boolean} /> },
    { accessorKey: "min_star_rating", header: "Min ⭐", cell: (v) => v != null ? `${v}` : "—" },
    { accessorKey: "display_order", header: "Order" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<SolverEligibility>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    if (selected) await updateM.mutateAsync({ id: selected.id, ...data });
    else await createM.mutateAsync(data as SolverEligibilityInsert);
  };

  const defaults: Partial<FormData> = selected
    ? {
        code: selected.code,
        label: selected.label,
        description: selected.description,
        requires_auth: selected.requires_auth,
        requires_provider_record: selected.requires_provider_record,
        requires_certification: selected.requires_certification,
        min_star_rating: selected.min_star_rating,
        display_order: selected.display_order,
        is_active: selected.is_active,
      }
    : { code: "", label: "", display_order: 0, is_active: true, requires_auth: false, requires_provider_record: false, requires_certification: false };

  const viewFields: ViewField[] = selected ? [
    { label: "Code", value: selected.code },
    { label: "Label", value: selected.label },
    { label: "Description", value: selected.description, type: "textarea" },
    { label: "Requires Authentication", value: selected.requires_auth, type: "boolean" },
    { label: "Requires Provider Record", value: selected.requires_provider_record, type: "boolean" },
    { label: "Requires Certification", value: selected.requires_certification, type: "boolean" },
    { label: "Min Star Rating", value: selected.min_star_rating, type: "number" },
    { label: "Display Order", value: selected.display_order, type: "number" },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
    { label: "Updated At", value: selected.updated_at, type: "date" },
  ] : [];

  return (
    <>
      <PageHeader title="Solver Eligibility" description="Manage the 8 solver eligibility categories that determine who can participate in challenges" />
      <DataTable
        data={items}
        columns={columns}
        actions={actions}
        searchKey="label"
        searchPlaceholder="Search eligibility..."
        isLoading={isLoading}
        onAdd={() => { setSelected(null); setIsFormOpen(true); }}
        addButtonLabel="Add Eligibility"
        emptyMessage="No solver eligibility categories found."
      />
      <MasterDataForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title="Solver Eligibility"
        fields={formFields}
        schema={schema}
        defaultValues={defaults}
        onSubmit={handleSubmit}
        isLoading={createM.isPending || updateM.isPending}
        mode={selected ? "edit" : "create"}
      />
      <MasterDataViewDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        title="Solver Eligibility Details"
        fields={viewFields}
        onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }}
      />
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={selected?.is_active ? "Deactivate Eligibility" : "Delete Eligibility"}
        itemName={selected?.label}
        onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)}
        onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)}
        isLoading={deleteM.isPending || hardDeleteM.isPending}
        hardDeleteLoading={hardDeleteM.isPending}
        isSoftDelete={selected?.is_active ?? true}
        showHardDelete={false}
      />
    </>
  );
}
