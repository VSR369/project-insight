/**
 * Org Shadow Pricing Page
 * 
 * Allows Seeking Org Admins to manage org-level shadow pricing overrides.
 * Platform defaults are shown as fallback; org can add custom overrides.
 */

import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";

import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import { Badge } from "@/components/ui/badge";
import { FeatureErrorBoundary } from "@/components/ErrorBoundary";
import { useOrgContext } from "@/contexts/OrgContext";
import {
  useOrgShadowPricing, useCreateOrgShadowPricing, useUpdateOrgShadowPricing,
  useDeleteOrgShadowPricing, useRestoreOrgShadowPricing, useHardDeleteOrgShadowPricing,
  OrgShadowPricingInsert,
} from "@/hooks/queries/useOrgShadowPricing";
import { useSubscriptionTiers } from "@/hooks/queries/useSubscriptionTiers";
import { useCountries } from "@/hooks/queries/useCountries";
import { useShadowPricing } from "@/hooks/queries/useShadowPricing";

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

type OrgShadowPricingRow = {
  id: string;
  tier_id: string;
  country_id: string | null;
  shadow_charge_per_challenge: number;
  currency_code: string;
  currency_symbol: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  source: "org" | "platform";
  md_subscription_tiers?: { name: string } | null;
  countries?: { name: string; currency_code: string; currency_symbol: string } | null;
};

function OrgShadowPricingContent() {
  const { organizationId, tenantId } = useOrgContext();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<OrgShadowPricingRow | null>(null);

  const { data: orgItems = [], isLoading: orgLoading } = useOrgShadowPricing(organizationId, true);
  const { data: platformItems = [], isLoading: platformLoading } = useShadowPricing(false);
  const { data: tiers = [] } = useSubscriptionTiers();
  const { data: countries = [] } = useCountries();
  const createM = useCreateOrgShadowPricing();
  const updateM = useUpdateOrgShadowPricing();
  const deleteM = useDeleteOrgShadowPricing();
  const restoreM = useRestoreOrgShadowPricing();
  const hardDeleteM = useHardDeleteOrgShadowPricing();

  const isLoading = orgLoading || platformLoading;

  // Merge org overrides + platform defaults (org wins by tier+country key)
  const mergedItems: OrgShadowPricingRow[] = React.useMemo(() => {
    const orgMap = new Map<string, boolean>();
    const result: OrgShadowPricingRow[] = [];

    // Add org overrides first
    for (const item of orgItems) {
      const key = `${item.tier_id}|${item.country_id ?? ""}`;
      orgMap.set(key, true);
      result.push({ ...item, source: "org" as const });
    }

    // Add platform defaults only if no org override exists
    for (const item of platformItems) {
      const key = `${(item as any).tier_id}|${(item as any).country_id ?? ""}`;
      if (!orgMap.has(key)) {
        result.push({
          id: (item as any).id,
          tier_id: (item as any).tier_id,
          country_id: (item as any).country_id,
          shadow_charge_per_challenge: (item as any).shadow_charge_per_challenge,
          currency_code: (item as any).currency_code,
          currency_symbol: (item as any).currency_symbol,
          description: (item as any).description ?? null,
          is_active: (item as any).is_active,
          created_at: (item as any).created_at,
          source: "platform" as const,
          md_subscription_tiers: (item as any).md_subscription_tiers,
          countries: (item as any).countries,
        });
      }
    }

    return result;
  }, [orgItems, platformItems]);

  const tierOptions = React.useMemo(() => tiers.map((t) => ({ value: t.id, label: t.name })), [tiers]);
  const countryOptions = React.useMemo(() => countries.map((c) => ({ value: c.id, label: c.name })), [countries]);

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

  const columns: DataTableColumn<OrgShadowPricingRow>[] = [
    { accessorKey: "countries", header: "Country", cell: (v) => (v as { name: string } | null)?.name ?? "—" },
    { accessorKey: "md_subscription_tiers", header: "Tier", cell: (v) => (v as { name: string } | null)?.name ?? "—" },
    { accessorKey: "shadow_charge_per_challenge", header: "Charge/Challenge", cell: (v) => `${v as number}` },
    { accessorKey: "currency_code", header: "Currency" },
    {
      accessorKey: "source",
      header: "Source",
      cell: (v) => (
        <Badge variant={v === "org" ? "default" : "secondary"}>
          {v === "org" ? "Custom" : "Platform Default"}
        </Badge>
      ),
    },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<OrgShadowPricingRow>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); }, show: (i) => i.source === "org" },
    { label: "Override", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); }, show: (i) => i.source === "platform" },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => i.source === "org" && !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.source === "org" && !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.source === "org" && i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    const country = countries.find((c) => c.id === data.country_id);
    const payload = {
      ...data,
      currency_code: country?.currency_code ?? data.currency_code,
      currency_symbol: country?.currency_symbol ?? data.currency_symbol,
    };

    if (selected?.source === "org") {
      // Editing existing org override
      await updateM.mutateAsync({ id: selected.id, ...payload });
    } else {
      // Creating new org override (either brand new or overriding platform default)
      await createM.mutateAsync({
        ...payload,
        organization_id: organizationId,
        tenant_id: tenantId,
      } as OrgShadowPricingInsert);
    }
  };

  const defaults: Partial<FormData> = selected
    ? {
        country_id: selected.country_id ?? "",
        tier_id: selected.tier_id,
        shadow_charge_per_challenge: selected.shadow_charge_per_challenge,
        currency_code: selected.currency_code,
        currency_symbol: selected.currency_symbol,
        description: selected.description,
        is_active: selected.is_active,
      }
    : { country_id: "", tier_id: "", shadow_charge_per_challenge: 0, currency_code: "USD", currency_symbol: "$", is_active: true };

  const viewFields: ViewField[] = selected
    ? [
        { label: "Country", value: selected.countries?.name ?? "—" },
        { label: "Subscription Tier", value: selected.md_subscription_tiers?.name ?? selected.tier_id },
        { label: "Shadow Charge per Challenge", value: selected.shadow_charge_per_challenge, type: "number" },
        { label: "Currency", value: `${selected.currency_symbol} (${selected.currency_code})` },
        { label: "Source", value: selected.source === "org" ? "Custom Override" : "Platform Default" },
        { label: "Description", value: selected.description },
        { label: "Status", value: selected.is_active, type: "boolean" },
      ]
    : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Shadow Pricing</h1>
        <p className="text-muted-foreground mt-1">
          Manage shadow billing charges for your internal departments. Override platform defaults with custom rates per tier and country.
        </p>
      </div>

      <DataTable
        data={mergedItems}
        columns={columns}
        actions={actions}
        searchKey="currency_code"
        searchPlaceholder="Search by currency..."
        isLoading={isLoading}
        onAdd={() => { setSelected(null); setIsFormOpen(true); }}
        addButtonLabel="Add Override"
        emptyMessage="No shadow pricing configurations found."
      />

      <MasterDataForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title={selected?.source === "platform" ? "Override Platform Default" : "Shadow Pricing Override"}
        fields={formFields}
        schema={schema}
        defaultValues={defaults}
        onSubmit={handleSubmit}
        isLoading={createM.isPending || updateM.isPending}
        mode={selected?.source === "org" ? "edit" : "create"}
        onFieldChange={handleFieldChange}
      />

      <MasterDataViewDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        title="Shadow Pricing Details"
        fields={viewFields}
        onEdit={selected?.source === "org" ? () => { setIsViewOpen(false); setIsFormOpen(true); } : undefined}
      />

      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={selected?.is_active ? "Deactivate Shadow Pricing Override" : "Delete Shadow Pricing Override"}
        itemName={selected?.countries?.name ?? selected?.md_subscription_tiers?.name ?? "this entry"}
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

export default function OrgShadowPricingPage() {
  return (
    <FeatureErrorBoundary featureName="Org Shadow Pricing">
      <OrgShadowPricingContent />
    </FeatureErrorBoundary>
  );
}
