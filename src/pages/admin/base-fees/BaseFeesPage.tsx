import * as React from "react";
import { z } from "zod";

import { DataTable, DataTableColumn } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import { PageHeader } from "@/components/admin/PageHeader";
import { createMasterDataActions } from "@/components/admin/MasterDataActions";
import { useMasterDataPage } from "@/hooks/useMasterDataPage";
import {
  useBaseFees, useCreateBaseFee, useUpdateBaseFee,
  useDeleteBaseFee, useRestoreBaseFee, useHardDeleteBaseFee,
  BaseFee, BaseFeeInsert,
} from "@/hooks/queries/useBaseFees";
import { useSubscriptionTiers } from "@/hooks/queries/useSubscriptionTiers";
import { useCountries } from "@/hooks/queries/useCountries";
import { useEngagementModels } from "@/hooks/queries/useEngagementModels";

const schema = z.object({
  country_id: z.string().min(1, "Country is required"),
  tier_id: z.string().min(1, "Subscription tier is required"),
  engagement_model_id: z.string().optional().nullable(),
  consulting_base_fee: z.coerce.number().min(0),
  management_base_fee: z.coerce.number().min(0),
  currency_code: z.string().min(2).max(5).default("USD"),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

type BaseFeeWithJoins = Pick<BaseFee, 'id' | 'country_id' | 'tier_id' | 'engagement_model_id' | 'consulting_base_fee' | 'management_base_fee' | 'currency_code' | 'is_active' | 'created_at'> & {
  countries?: { name: string } | null;
  md_subscription_tiers?: { name: string } | null;
  md_engagement_models?: { name: string } | null;
};

export default function BaseFeesPage() {
  const page = useMasterDataPage<BaseFeeWithJoins>();
  const { selected } = page;

  const { data: items = [], isLoading } = useBaseFees(true);
  const { data: tiers = [] } = useSubscriptionTiers();
  const { data: countries = [] } = useCountries();
  const { data: models = [] } = useEngagementModels();
  const createM = useCreateBaseFee();
  const updateM = useUpdateBaseFee();
  const deleteM = useDeleteBaseFee();
  const restoreM = useRestoreBaseFee();
  const hardDeleteM = useHardDeleteBaseFee();

  const tierOptions = React.useMemo(() => tiers.map((t) => ({ value: t.id, label: t.name })), [tiers]);
  const countryOptions = React.useMemo(() => countries.map((c) => ({ value: c.id, label: c.name })), [countries]);
  const modelOptions = React.useMemo(() => [{ value: "", label: "— All Models —" }, ...models.map((m) => ({ value: m.id, label: m.name }))], [models]);

  const handleFieldChange = React.useCallback((fieldName: string, value: unknown) => {
    if (fieldName === "country_id") {
      const country = countries.find((c) => c.id === value);
      if (country) return { currency_code: country.currency_code ?? "USD" } as Partial<FormData>;
    }
  }, [countries]);

  const formFields: FormFieldConfig<FormData>[] = [
    { name: "country_id", label: "Country", type: "select", options: countryOptions, required: true },
    { name: "tier_id", label: "Subscription Tier", type: "select", options: tierOptions, required: true },
    { name: "engagement_model_id", label: "Engagement Model", type: "select", options: modelOptions },
    { name: "consulting_base_fee", label: "Consulting Base Fee", type: "number", min: 0, required: true },
    { name: "management_base_fee", label: "Management Base Fee", type: "number", min: 0, required: true },
    { name: "currency_code", label: "Currency Code", type: "text", disabled: true },
    { name: "is_active", label: "Active", type: "switch" },
  ];

  const columns: DataTableColumn<BaseFeeWithJoins>[] = [
    { accessorKey: "countries", header: "Country", cell: (v) => (v as { name: string } | null)?.name ?? "—" },
    { accessorKey: "md_subscription_tiers", header: "Tier", cell: (v) => (v as { name: string } | null)?.name ?? "—" },
    { accessorKey: "md_engagement_models", header: "Eng. Model", cell: (v) => (v as { name: string } | null)?.name ?? "All" },
    { accessorKey: "consulting_base_fee", header: "Consulting Fee", cell: (v) => `${v as number}` },
    { accessorKey: "management_base_fee", header: "Management Fee", cell: (v) => `${v as number}` },
    { accessorKey: "currency_code", header: "Currency" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions = React.useMemo(() => createMasterDataActions<BaseFeeWithJoins>({
    onView: page.openView,
    onEdit: page.openEdit,
    onRestore: (id) => restoreM.mutate(id),
    onDelete: page.openDelete,
  }), [page.openView, page.openEdit, page.openDelete, restoreM]);

  const handleSubmit = async (data: FormData) => {
    const country = countries.find((c) => c.id === data.country_id);
    const payload = { ...data, engagement_model_id: data.engagement_model_id || null, currency_code: country?.currency_code ?? data.currency_code };
    if (selected) await updateM.mutateAsync({ id: selected.id, ...payload });
    else await createM.mutateAsync(payload as BaseFeeInsert);
  };

  const defaults: Partial<FormData> = selected
    ? { country_id: selected.country_id, tier_id: selected.tier_id, engagement_model_id: selected.engagement_model_id ?? "", consulting_base_fee: selected.consulting_base_fee, management_base_fee: selected.management_base_fee, currency_code: selected.currency_code, is_active: selected.is_active }
    : { country_id: "", tier_id: "", engagement_model_id: "", consulting_base_fee: 0, management_base_fee: 0, currency_code: "USD", is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Country", value: selected.countries?.name ?? selected.country_id },
    { label: "Subscription Tier", value: selected.md_subscription_tiers?.name ?? selected.tier_id },
    { label: "Engagement Model", value: selected.md_engagement_models?.name ?? "All Models" },
    { label: "Consulting Base Fee", value: selected.consulting_base_fee, type: "number" },
    { label: "Management Base Fee", value: selected.management_base_fee, type: "number" },
    { label: "Currency", value: selected.currency_code },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
  ] : [];

  const displayName = selected ? `${selected.countries?.name ?? ""} / ${selected.md_subscription_tiers?.name ?? ""}` : "";

  return (
    <>
      <PageHeader title="Base Fee Configuration" description="Manage consulting and management base fees per country, subscription tier, and engagement model" />
      <DataTable data={items} columns={columns} actions={actions} searchKey="currency_code" searchPlaceholder="Search by currency..." isLoading={isLoading} onAdd={page.openCreate} addButtonLabel="Add Base Fee" emptyMessage="No base fee configurations found." />
      <MasterDataForm open={page.isFormOpen} onOpenChange={page.setIsFormOpen} title="Base Fee" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} onFieldChange={handleFieldChange} />
      <MasterDataViewDialog open={page.isViewOpen} onOpenChange={page.setIsViewOpen} title="Base Fee Details" fields={viewFields} onEdit={page.switchToEdit} />
      <DeleteConfirmDialog open={page.isDeleteOpen} onOpenChange={page.setIsDeleteOpen} title={selected?.is_active ? "Deactivate Base Fee" : "Delete Base Fee"} itemName={displayName} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
