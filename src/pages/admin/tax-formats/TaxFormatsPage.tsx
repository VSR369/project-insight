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
  useTaxFormats, useCreateTaxFormat, useUpdateTaxFormat,
  useDeleteTaxFormat, useRestoreTaxFormat, useHardDeleteTaxFormat,
  TaxFormat,
} from "@/hooks/queries/useTaxFormatsAdmin";

const schema = z.object({
  country_id: z.string().min(1, "Country is required"),
  tax_name: z.string().min(1).max(100),
  format_regex: z.string().max(500).nullable().optional(),
  example: z.string().max(100).nullable().optional(),
  is_required: z.boolean().default(false),
  display_order: z.number().int().min(0).nullable().optional(),
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

export default function TaxFormatsPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<TaxFormat | null>(null);

  const { data: items = [], isLoading } = useTaxFormats(true);
  const { data: countryOptions = [] } = useCountryOptions();
  const createM = useCreateTaxFormat();
  const updateM = useUpdateTaxFormat();
  const deleteM = useDeleteTaxFormat();
  const restoreM = useRestoreTaxFormat();
  const hardDeleteM = useHardDeleteTaxFormat();

  const formFields: FormFieldConfig<FormData>[] = [
    { name: "country_id", label: "Country", type: "select", options: countryOptions, required: true },
    { name: "tax_name", label: "Tax Name", type: "text", placeholder: "e.g., EIN, GST", required: true },
    { name: "format_regex", label: "Format Regex", type: "text", placeholder: "e.g., ^\\d{2}-\\d{7}$" },
    { name: "example", label: "Example", type: "text", placeholder: "e.g., 12-3456789" },
    { name: "is_required", label: "Required", type: "switch" },
    { name: "display_order", label: "Display Order", type: "number", placeholder: "0", min: 0 },
    { name: "is_active", label: "Active", type: "switch" },
  ];

  const columns: DataTableColumn<TaxFormat>[] = [
    { accessorKey: "country", header: "Country", cell: (v) => { const c = v as TaxFormat["country"]; return c ? `${c.name} (${c.code})` : "—"; } },
    { accessorKey: "tax_name", header: "Tax Name" },
    { accessorKey: "example", header: "Example", cell: (v) => (v as string) || "—" },
    { accessorKey: "is_required", header: "Required", cell: (v) => (v as boolean) ? "Yes" : "No" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<TaxFormat>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    if (selected) await updateM.mutateAsync({ id: selected.id, ...data });
    else await createM.mutateAsync(data);
  };

  const defaults: Partial<FormData> = selected
    ? { country_id: selected.country_id, tax_name: selected.tax_name, format_regex: selected.format_regex, example: selected.example, is_required: selected.is_required, display_order: selected.display_order, is_active: selected.is_active }
    : { country_id: "", tax_name: "", is_required: false, display_order: 0, is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Country", value: selected.country ? `${selected.country.name} (${selected.country.code})` : "—" },
    { label: "Tax Name", value: selected.tax_name },
    { label: "Format Regex", value: selected.format_regex },
    { label: "Example", value: selected.example },
    { label: "Required", value: selected.is_required, type: "boolean" },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
    { label: "Updated At", value: selected.updated_at, type: "date" },
  ] : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tax Formats</h1>
        <p className="text-muted-foreground mt-1">Manage country-specific tax identification formats</p>
      </div>
      <DataTable data={items} columns={columns} actions={actions} searchKey="tax_name" searchPlaceholder="Search tax formats..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Tax Format" emptyMessage="No tax formats found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Tax Format" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Tax Format Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Tax Format" : "Delete Tax Format"} itemName={selected?.tax_name} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </>
  );
}
