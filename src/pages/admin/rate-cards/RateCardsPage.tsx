import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";

import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import {
  useRateCards, useCreateRateCard, useUpdateRateCard,
  useDeleteRateCard, useRestoreRateCard, useHardDeleteRateCard,
  RateCardWithOrgType, RateCardInsert,
} from "@/hooks/queries/useRateCards";
import { useOrganizationTypes } from "@/hooks/queries/useOrganizationTypes";

const MATURITY_OPTIONS = [
  { value: "blueprint", label: "Blueprint" },
  { value: "poc", label: "POC" },
  { value: "pilot", label: "Pilot" },
];

const schema = z.object({
  organization_type_id: z.string().min(1, "Organization type is required"),
  maturity_level: z.string().min(1, "Maturity level is required"),
  effort_rate_floor: z.coerce.number().positive("Must be > 0"),
  reward_floor_amount: z.coerce.number().positive("Must be > 0"),
  reward_ceiling: z.coerce.number().positive().nullable().optional(),
  big4_benchmark_multiplier: z.coerce.number().min(0.01).max(1.0, "Max 1.0"),
  non_monetary_weight: z.coerce.number().min(0).max(1.0, "Max 1.0"),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

export default function RateCardsPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<RateCardWithOrgType | null>(null);

  const { data: items = [], isLoading } = useRateCards(true);
  const { data: orgTypes = [] } = useOrganizationTypes();
  const createM = useCreateRateCard();
  const updateM = useUpdateRateCard();
  const deleteM = useDeleteRateCard();
  const restoreM = useRestoreRateCard();
  const hardDeleteM = useHardDeleteRateCard();

  const orgTypeOptions = React.useMemo(
    () => orgTypes.map((o) => ({ value: o.id, label: o.name })),
    [orgTypes],
  );

  const formFields: FormFieldConfig<FormData>[] = [
    { name: "organization_type_id", label: "Organization Type", type: "select", options: orgTypeOptions, required: true },
    { name: "maturity_level", label: "Maturity Level", type: "select", options: MATURITY_OPTIONS, required: true },
    { name: "effort_rate_floor", label: "Effort Rate Floor ($/hr)", type: "number", min: 1, required: true },
    { name: "reward_floor_amount", label: "Reward Floor ($)", type: "number", min: 1, required: true },
    { name: "reward_ceiling", label: "Reward Ceiling ($)", type: "number", min: 0 },
    { name: "big4_benchmark_multiplier", label: "Big-4 Benchmark Multiplier", type: "number", min: 0.01, required: true },
    { name: "non_monetary_weight", label: "Non-Monetary Weight", type: "number", min: 0, required: true },
    { name: "is_active", label: "Active", type: "switch" },
  ];

  const columns: DataTableColumn<RateCardWithOrgType>[] = [
    { accessorKey: "organization_types", header: "Org Type", cell: (v) => (v as { name: string } | null)?.name ?? "—" },
    { accessorKey: "maturity_level", header: "Maturity", cell: (v) => String(v).charAt(0).toUpperCase() + String(v).slice(1) },
    { accessorKey: "effort_rate_floor", header: "Rate Floor", cell: (v) => `$${v}/hr` },
    { accessorKey: "reward_floor_amount", header: "Reward Floor", cell: (v) => `$${Number(v).toLocaleString()}` },
    { accessorKey: "reward_ceiling", header: "Reward Ceiling", cell: (v) => v ? `$${Number(v).toLocaleString()}` : "No cap" },
    { accessorKey: "big4_benchmark_multiplier", header: "Big-4 ×", cell: (v) => `${(Number(v) * 100).toFixed(0)}%` },
    { accessorKey: "non_monetary_weight", header: "Non-Mon %", cell: (v) => `${(Number(v) * 100).toFixed(0)}%` },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<RateCardWithOrgType>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    const payload = { ...data, reward_ceiling: data.reward_ceiling || null };
    if (selected) await updateM.mutateAsync({ id: selected.id, ...payload });
    else await createM.mutateAsync(payload as RateCardInsert);
  };

  const defaults: Partial<FormData> = selected
    ? {
        organization_type_id: selected.organization_type_id,
        maturity_level: selected.maturity_level,
        effort_rate_floor: selected.effort_rate_floor,
        reward_floor_amount: selected.reward_floor_amount,
        reward_ceiling: selected.reward_ceiling,
        big4_benchmark_multiplier: selected.big4_benchmark_multiplier,
        non_monetary_weight: selected.non_monetary_weight,
        is_active: selected.is_active,
      }
    : { organization_type_id: "", maturity_level: "", effort_rate_floor: 50, reward_floor_amount: 5000, reward_ceiling: null, big4_benchmark_multiplier: 0.4, non_monetary_weight: 0.25, is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Organization Type", value: selected.organization_types?.name ?? "—" },
    { label: "Maturity Level", value: selected.maturity_level },
    { label: "Effort Rate Floor", value: `$${selected.effort_rate_floor}/hr` },
    { label: "Reward Floor", value: `$${Number(selected.reward_floor_amount).toLocaleString()}` },
    { label: "Reward Ceiling", value: selected.reward_ceiling ? `$${Number(selected.reward_ceiling).toLocaleString()}` : "No cap" },
    { label: "Big-4 Benchmark", value: `${(Number(selected.big4_benchmark_multiplier) * 100).toFixed(0)}%` },
    { label: "Non-Monetary Weight", value: `${(Number(selected.non_monetary_weight) * 100).toFixed(0)}%` },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
  ] : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Rate Cards</h1>
        <p className="text-muted-foreground mt-1">
          Configurable economics per organization type × maturity level. Defines reward floors, ceilings, and non-monetary weights.
        </p>
      </div>
      <DataTable data={items} columns={columns} actions={actions} searchKey="maturity_level" searchPlaceholder="Search by maturity..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Rate Card" emptyMessage="No rate cards found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Rate Card" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Rate Card Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Rate Card" : "Delete Rate Card"} itemName={`${selected?.organization_types?.name ?? ""} × ${selected?.maturity_level ?? ""}`} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
