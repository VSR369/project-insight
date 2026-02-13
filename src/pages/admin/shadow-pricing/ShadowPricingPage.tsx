import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";

import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import {
  useShadowPricing, useCreateShadowPricing, useUpdateShadowPricing,
  useDeleteShadowPricing, useRestoreShadowPricing, useHardDeleteShadowPricing,
  ShadowPricing, ShadowPricingInsert,
} from "@/hooks/queries/useShadowPricing";
import { useSubscriptionTiers } from "@/hooks/queries/useSubscriptionTiers";
import { useCountries } from "@/hooks/queries/useCountries";

const schema = z.object({
  country_id: z.string().min(1, "Country is required"),
  tier_id: z.string().min(1, "Subscription tier is required"),
  shadow_charge_per_challenge: z.coerce.number().min(0),
  currency_code: z.string().min(2).max(5).default("USD"),
  currency_symbol: z.string().min(1).max(5).default("$"),
  description: z.string().max(500).nullable().optional(),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

type ShadowPricingWithJoins = ShadowPricing & {
  md_subscription_tiers?: { name: string } | null;
  countries?: { name: string; currency_code: string; currency_symbol: string } | null;
};

export default function ShadowPricingPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ShadowPricingWithJoins | null>(null);

  const { data: items = [], isLoading } = useShadowPricing(true);
  const { data: tiers = [] } = useSubscriptionTiers();
  const { data: countries = [] } = useCountries();
  const createM = useCreateShadowPricing();
  const updateM = useUpdateShadowPricing();
  const deleteM = useDeleteShadowPricing();
  const restoreM = useRestoreShadowPricing();
  const hardDeleteM = useHardDeleteShadowPricing();

  const tierOptions = tiers.map((t) => ({ value: t.id, label: t.name }));
  const countryOptions = countries.map((c) => ({ value: c.id, label: c.name }));

  const handleFieldChange = React.useCallback((fieldName: string, value: unknown) => {
    if (fieldName === "country_id") {
      const country = countries.find((c) => c.id === value);
      if (country) return { currency_code: country.currency_code ?? "USD", currency_symbol: country.currency_symbol ?? "$" } as Partial<FormData>;
    }
  }, [countries]);

  const formFields: FormFieldConfig<FormData>[] = [
    { name: "country_id", label: "Country", type: "select", options: countryOptions, required: true },
    { name: "tier_id", label: "Subscription Tier", type: "select", options: tierOptions, required: true },
    { name: "shadow_charge_per_challenge", label: "Shadow Charge per Challenge", type: "number", min: 0, required: true },
    { name: "currency_code", label: "Currency Code", type: "text", disabled: true },
    { name: "currency_symbol", label: "Currency Symbol", type: "text", disabled: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "is_active", label: "Active", type: "switch" },
  ];

  const columns: DataTableColumn<ShadowPricingWithJoins>[] = [
    { accessorKey: "countries", header: "Country", cell: (v) => (v as { name: string } | null)?.name ?? "—" },
    { accessorKey: "md_subscription_tiers", header: "Tier", cell: (v) => (v as { name: string } | null)?.name ?? "—" },
    { accessorKey: "shadow_charge_per_challenge", header: "Charge/Challenge", cell: (v) => `${v as number}` },
    { accessorKey: "currency_code", header: "Currency" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<ShadowPricingWithJoins>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    const country = countries.find((c) => c.id === data.country_id);
    const payload = {
      ...data,
      currency_code: country?.currency_code ?? data.currency_code,
      currency_symbol: country?.currency_symbol ?? data.currency_symbol,
    };
    if (selected) await updateM.mutateAsync({ id: selected.id, ...payload });
    else await createM.mutateAsync(payload as ShadowPricingInsert);
  };

  const defaults: Partial<FormData> = selected
    ? { country_id: (selected as any).country_id ?? "", tier_id: selected.tier_id, shadow_charge_per_challenge: selected.shadow_charge_per_challenge, currency_code: selected.currency_code, currency_symbol: selected.currency_symbol, description: selected.description, is_active: selected.is_active }
    : { country_id: "", tier_id: "", shadow_charge_per_challenge: 0, currency_code: "USD", currency_symbol: "$", is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Country", value: selected.countries?.name ?? "—" },
    { label: "Subscription Tier", value: selected.md_subscription_tiers?.name ?? selected.tier_id },
    { label: "Shadow Charge per Challenge", value: selected.shadow_charge_per_challenge, type: "number" },
    { label: "Currency", value: `${selected.currency_symbol} (${selected.currency_code})` },
    { label: "Description", value: selected.description },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
  ] : [];

  return (
    <><div className="mb-6"><h1 className="text-2xl font-bold tracking-tight">Shadow Pricing</h1><p className="text-muted-foreground mt-1">Manage shadow billing charges per country and subscription tier for internal departments</p></div>
      <DataTable data={items} columns={columns} actions={actions} searchKey="currency_code" searchPlaceholder="Search by currency..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Shadow Pricing" emptyMessage="No shadow pricing configurations found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Shadow Pricing" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} onFieldChange={handleFieldChange} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Shadow Pricing Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Shadow Pricing" : "Delete Shadow Pricing"} itemName={selected?.countries?.name ?? selected?.md_subscription_tiers?.name ?? "this entry"} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
