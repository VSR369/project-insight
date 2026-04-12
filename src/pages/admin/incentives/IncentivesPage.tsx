import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";

import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import {
  useNonMonetaryIncentives, useCreateNonMonetaryIncentive, useUpdateNonMonetaryIncentive,
  useDeleteNonMonetaryIncentive, useRestoreNonMonetaryIncentive, useHardDeleteNonMonetaryIncentive,
  NonMonetaryIncentive, NonMonetaryIncentiveInsert,
} from "@/hooks/queries/useNonMonetaryIncentives";

const SOLVER_APPEAL_OPTIONS = [
  { value: "high", label: "High" },
  { value: "very_high", label: "Very High" },
  { value: "exceptional", label: "Exceptional" },
];

const COMPLEXITY_OPTIONS = [
  { value: "L1", label: "L1 — Low" },
  { value: "L2", label: "L2 — Medium" },
  { value: "L3", label: "L3 — High" },
  { value: "L4", label: "L4 — Very High" },
];

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().min(1, "Description is required").max(1000),
  cash_equivalent_min: z.coerce.number().min(0),
  cash_equivalent_max: z.coerce.number().min(0),
  minimum_complexity: z.string().min(1).default("L1"),
  seeker_requirement: z.string().min(1, "Seeker requirement is required").max(500),
  credibility_note: z.string().min(1, "Credibility note is required").max(500),
  solver_appeal: z.string().min(1).default("high"),
  display_order: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

export default function IncentivesPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<NonMonetaryIncentive | null>(null);

  const { data: items = [], isLoading } = useNonMonetaryIncentives(true);
  const createM = useCreateNonMonetaryIncentive();
  const updateM = useUpdateNonMonetaryIncentive();
  const deleteM = useDeleteNonMonetaryIncentive();
  const restoreM = useRestoreNonMonetaryIncentive();
  const hardDeleteM = useHardDeleteNonMonetaryIncentive();

  const formFields: FormFieldConfig<FormData>[] = [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: true },
    { name: "cash_equivalent_min", label: "Cash Equivalent Min ($)", type: "number", min: 0, required: true },
    { name: "cash_equivalent_max", label: "Cash Equivalent Max ($)", type: "number", min: 0, required: true },
    { name: "minimum_complexity", label: "Minimum Complexity", type: "select", options: COMPLEXITY_OPTIONS, required: true },
    { name: "seeker_requirement", label: "Seeker Requirement", type: "textarea", required: true },
    { name: "credibility_note", label: "Credibility Note", type: "textarea", required: true },
    { name: "solver_appeal", label: "Solution Provider Appeal", type: "select", options: SOLVER_APPEAL_OPTIONS, required: true },
    { name: "display_order", label: "Display Order", type: "number", min: 0 },
    { name: "is_active", label: "Active", type: "switch" },
  ];

  const appealBadge = (appeal: string) => {
    const colors: Record<string, string> = {
      high: "bg-blue-100 text-blue-700",
      very_high: "bg-amber-100 text-amber-700",
      exceptional: "bg-emerald-100 text-emerald-700",
    };
    return <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${colors[appeal] ?? ""}`}>{appeal.replace(/_/g, " ")}</span>;
  };

  const columns: DataTableColumn<NonMonetaryIncentive>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "cash_equivalent_min", header: "Min $", cell: (v) => `$${Number(v).toLocaleString()}` },
    { accessorKey: "cash_equivalent_max", header: "Max $", cell: (v) => `$${Number(v).toLocaleString()}` },
    { accessorKey: "minimum_complexity", header: "Min Complexity" },
    { accessorKey: "solver_appeal", header: "Appeal", cell: (v) => appealBadge(v as string) },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<NonMonetaryIncentive>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    const payload = { ...data, applicable_maturity_levels: ['blueprint', 'poc', 'pilot'] };
    if (selected) await updateM.mutateAsync({ id: selected.id, ...payload });
    else await createM.mutateAsync(payload as unknown as NonMonetaryIncentiveInsert);
  };

  const defaults: Partial<FormData> = selected
    ? { name: selected.name, description: selected.description, cash_equivalent_min: selected.cash_equivalent_min, cash_equivalent_max: selected.cash_equivalent_max, minimum_complexity: selected.minimum_complexity, seeker_requirement: selected.seeker_requirement, credibility_note: selected.credibility_note, solver_appeal: selected.solver_appeal, display_order: selected.display_order, is_active: selected.is_active }
    : { name: "", description: "", cash_equivalent_min: 0, cash_equivalent_max: 0, minimum_complexity: "L1", seeker_requirement: "", credibility_note: "", solver_appeal: "high", display_order: 0, is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Name", value: selected.name },
    { label: "Description", value: selected.description },
    { label: "Cash Equivalent", value: `$${Number(selected.cash_equivalent_min).toLocaleString()} – $${Number(selected.cash_equivalent_max).toLocaleString()}` },
    { label: "Applicable Maturity", value: selected.applicable_maturity_levels?.join(", ") ?? "All" },
    { label: "Minimum Complexity", value: selected.minimum_complexity },
    { label: "Seeker Requirement", value: selected.seeker_requirement },
    { label: "Credibility Note", value: selected.credibility_note },
    { label: "Solution Provider Appeal", value: selected.solver_appeal.replace(/_/g, " ") },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
  ] : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Non-Monetary Incentives</h1>
        <p className="text-muted-foreground mt-1">
          Registry of non-monetary rewards with cash-equivalent values. Curators select these when configuring challenge rewards.
        </p>
      </div>
      <DataTable data={items} columns={columns} actions={actions} searchKey="name" searchPlaceholder="Search incentives..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Incentive" emptyMessage="No incentives found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Non-Monetary Incentive" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Incentive Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Incentive" : "Delete Incentive"} itemName={selected?.name ?? "this incentive"} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
