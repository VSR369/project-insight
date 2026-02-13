import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  usePaymentMethods, useCreatePaymentMethod, useUpdatePaymentMethod,
  useDeletePaymentMethod, useRestorePaymentMethod, useHardDeletePaymentMethod,
  PaymentMethodAvailability, PAYMENT_METHOD_OPTIONS,
} from "@/hooks/queries/usePaymentMethodsAdmin";

const schema = z.object({
  country_id: z.string().min(1, "Country is required"),
  tier_id: z.string().nullable().optional(),
  payment_method: z.string().min(1, "Payment method is required"),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

function useCountryOptions() {
  return useQuery({
    queryKey: ["country-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("countries").select("id, name, code").eq("is_active", true).order("name");
      if (error) throw new Error(error.message);
      return data.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }));
    },
    staleTime: 10 * 60 * 1000,
  });
}

function useTierOptions() {
  return useQuery({
    queryKey: ["tier-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("md_subscription_tiers").select("id, name").eq("is_active", true).order("display_order");
      if (error) throw new Error(error.message);
      return data.map((t) => ({ value: t.id, label: t.name }));
    },
    staleTime: 10 * 60 * 1000,
  });
}

export default function PaymentMethodsPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<PaymentMethodAvailability | null>(null);

  const { data: items = [], isLoading } = usePaymentMethods(true);
  const { data: countryOptions = [] } = useCountryOptions();
  const { data: tierOptions = [] } = useTierOptions();
  const createM = useCreatePaymentMethod();
  const updateM = useUpdatePaymentMethod();
  const deleteM = useDeletePaymentMethod();
  const restoreM = useRestorePaymentMethod();
  const hardDeleteM = useHardDeletePaymentMethod();

  const formFields: FormFieldConfig<FormData>[] = [
    { name: "country_id", label: "Country", type: "select", options: countryOptions, required: true },
    { name: "tier_id", label: "Subscription Tier", type: "select", options: [{ value: "", label: "All Tiers" }, ...tierOptions] },
    { name: "payment_method", label: "Payment Method", type: "select", options: PAYMENT_METHOD_OPTIONS, required: true },
    { name: "is_active", label: "Active", type: "switch" },
  ];

  const getPaymentLabel = (method: string) => PAYMENT_METHOD_OPTIONS.find((o) => o.value === method)?.label || method;

  const columns: DataTableColumn<PaymentMethodAvailability>[] = [
    { accessorKey: "country", header: "Country", cell: (v) => { const c = v as PaymentMethodAvailability["country"]; return c ? `${c.name} (${c.code})` : "—"; } },
    { accessorKey: "tier", header: "Tier", cell: (v) => { const t = v as PaymentMethodAvailability["tier"]; return t ? t.name : "All"; } },
    { accessorKey: "payment_method", header: "Payment Method", cell: (v) => getPaymentLabel(v as string) },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<PaymentMethodAvailability>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    const payload = { ...data, tier_id: data.tier_id || null };
    if (selected) await updateM.mutateAsync({ id: selected.id, ...payload });
    else await createM.mutateAsync(payload);
  };

  const defaults: Partial<FormData> = selected
    ? { country_id: selected.country_id, tier_id: selected.tier_id, payment_method: selected.payment_method, is_active: selected.is_active }
    : { country_id: "", tier_id: "", payment_method: "", is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Country", value: selected.country ? `${selected.country.name} (${selected.country.code})` : "—" },
    { label: "Tier", value: selected.tier ? selected.tier.name : "All Tiers" },
    { label: "Payment Method", value: getPaymentLabel(selected.payment_method) },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
    { label: "Updated At", value: selected.updated_at, type: "date" },
  ] : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Payment Methods</h1>
        <p className="text-muted-foreground mt-1">Manage payment method availability by country and tier</p>
      </div>
      <DataTable data={items} columns={columns} actions={actions} searchKey="payment_method" searchPlaceholder="Search payment methods..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Payment Method" emptyMessage="No payment methods found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Payment Method" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Payment Method Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Payment Method" : "Delete Payment Method"} itemName={selected ? getPaymentLabel(selected.payment_method) : undefined} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
