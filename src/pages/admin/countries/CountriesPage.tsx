import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  DataTable,
  DataTableColumn,
  DataTableAction,
} from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import {
  useCountries,
  useCreateCountry,
  useUpdateCountry,
  useDeleteCountry,
  useRestoreCountry,
  useHardDeleteCountry,
  Country,
  CountryInsert,
} from "@/hooks/queries/useCountries";

const countrySchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(3, "Code must be at most 3 characters").toUpperCase(),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
  iso_alpha3: z.string().max(3).nullable().optional(),
  phone_code: z.string().max(10).nullable().optional(),
  phone_code_display: z.string().max(20).nullable().optional(),
  currency_code: z.string().max(3).nullable().optional(),
  currency_symbol: z.string().max(5).default("$"),
  date_format: z.string().max(20).default("MM/DD/YYYY"),
  number_format: z.string().max(20).default("en-US"),
  is_ofac_restricted: z.boolean().default(false),
  description: z.string().max(500).nullable().optional(),
  display_order: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});

type CountryFormData = z.infer<typeof countrySchema>;

const formFields: FormFieldConfig<CountryFormData>[] = [
  { name: "code", label: "Country Code (Alpha-2)", type: "text", placeholder: "e.g., US, GB, IN", description: "ISO 3166-1 alpha-2 code", required: true },
  { name: "iso_alpha3", label: "Alpha-3 Code", type: "text", placeholder: "e.g., USA, GBR, IND", description: "ISO 3166-1 alpha-3 code" },
  { name: "name", label: "Country Name", type: "text", placeholder: "e.g., United States", required: true },
  { name: "phone_code", label: "Phone Code", type: "text", placeholder: "e.g., +1, +44, +91", description: "International dialing code" },
  { name: "phone_code_display", label: "Phone Code Display", type: "text", placeholder: "e.g., +1 (US)", description: "Formatted display for UI" },
  { name: "currency_code", label: "Currency Code", type: "text", placeholder: "e.g., USD, GBP, INR", description: "ISO 4217 currency code" },
  { name: "currency_symbol", label: "Currency Symbol", type: "text", placeholder: "e.g., $, £, ₹" },
  { name: "date_format", label: "Date Format", type: "text", placeholder: "e.g., MM/DD/YYYY", description: "Locale date format" },
  { name: "number_format", label: "Number Format", type: "text", placeholder: "e.g., en-US", description: "Locale number format" },
  { name: "is_ofac_restricted", label: "OFAC Restricted", type: "switch", description: "Country is under OFAC sanctions" },
  { name: "description", label: "Description", type: "textarea", placeholder: "Optional notes" },
  { name: "display_order", label: "Display Order", type: "number", placeholder: "0", min: 0 },
  { name: "is_active", label: "Active", type: "switch", description: "Inactive countries are hidden from users" },
];

export default function CountriesPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selectedCountry, setSelectedCountry] = React.useState<Country | null>(null);

  const { data: countries = [], isLoading } = useCountries(true);
  const createMutation = useCreateCountry();
  const updateMutation = useUpdateCountry();
  const deleteMutation = useDeleteCountry();
  const restoreMutation = useRestoreCountry();
  const hardDeleteMutation = useHardDeleteCountry();

  const columns: DataTableColumn<Country>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "iso_alpha3", header: "Alpha-3", cell: (value) => (value as string) || "—" },
    { accessorKey: "currency_code", header: "Currency", cell: (value) => (value as string) || "—" },
    { accessorKey: "phone_code", header: "Phone", cell: (value) => (value as string) || "—" },
    { accessorKey: "is_ofac_restricted", header: "OFAC", cell: (value) => (value as boolean) ? "⚠️ Yes" : "No" },
    { accessorKey: "display_order", header: "Order", cell: (value) => (value as number) ?? "—" },
    { accessorKey: "is_active", header: "Status", cell: (value) => <StatusBadge isActive={value as boolean} /> },
  ];

  const actions: DataTableAction<Country>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (c) => { setSelectedCountry(c); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (c) => { setSelectedCountry(c); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (c) => restoreMutation.mutate(c.id), show: (c) => !c.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (c) => { setSelectedCountry(c); setIsDeleteOpen(true); }, show: (c) => !c.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (c) => { setSelectedCountry(c); setIsDeleteOpen(true); }, show: (c) => c.is_active },
  ];

  const handleSubmit = async (data: CountryFormData) => {
    if (selectedCountry) {
      await updateMutation.mutateAsync({ id: selectedCountry.id, ...data });
    } else {
      await createMutation.mutateAsync(data as CountryInsert);
    }
  };

  const handleDelete = async () => {
    if (selectedCountry) await deleteMutation.mutateAsync(selectedCountry.id);
  };

  const handleHardDelete = async () => {
    if (selectedCountry) await hardDeleteMutation.mutateAsync(selectedCountry.id);
  };

  const defaultValues: Partial<CountryFormData> = selectedCountry
    ? {
        code: selectedCountry.code,
        name: selectedCountry.name,
        iso_alpha3: selectedCountry.iso_alpha3,
        phone_code: selectedCountry.phone_code,
        phone_code_display: selectedCountry.phone_code_display,
        currency_code: selectedCountry.currency_code,
        currency_symbol: selectedCountry.currency_symbol,
        date_format: selectedCountry.date_format,
        number_format: selectedCountry.number_format,
        is_ofac_restricted: selectedCountry.is_ofac_restricted,
        description: selectedCountry.description,
        display_order: selectedCountry.display_order,
        is_active: selectedCountry.is_active,
      }
    : { code: "", name: "", currency_symbol: "$", date_format: "MM/DD/YYYY", number_format: "en-US", is_ofac_restricted: false, display_order: 0, is_active: true };

  const viewFields: ViewField[] = selectedCountry
    ? [
        { label: "Country Code", value: selectedCountry.code },
        { label: "Alpha-3", value: selectedCountry.iso_alpha3 },
        { label: "Country Name", value: selectedCountry.name },
        { label: "Phone Code", value: selectedCountry.phone_code },
        { label: "Phone Display", value: selectedCountry.phone_code_display },
        { label: "Currency Code", value: selectedCountry.currency_code },
        { label: "Currency Symbol", value: selectedCountry.currency_symbol },
        { label: "Date Format", value: selectedCountry.date_format },
        { label: "Number Format", value: selectedCountry.number_format },
        { label: "OFAC Restricted", value: selectedCountry.is_ofac_restricted, type: "boolean" },
        { label: "Description", value: selectedCountry.description },
        { label: "Display Order", value: selectedCountry.display_order, type: "number" },
        { label: "Status", value: selectedCountry.is_active, type: "boolean" },
        { label: "Created At", value: selectedCountry.created_at, type: "date" },
        { label: "Updated At", value: selectedCountry.updated_at, type: "date" },
      ]
    : [];

  return (
    <AdminLayout title="Countries" description="Manage countries available in the platform" breadcrumbs={[{ label: "Master Data", href: "/admin" }, { label: "Countries" }]}>
      <DataTable data={countries} columns={columns} actions={actions} searchKey="name" searchPlaceholder="Search countries..." isLoading={isLoading} onAdd={() => { setSelectedCountry(null); setIsFormOpen(true); }} addButtonLabel="Add Country" emptyMessage="No countries found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Country" description="Countries are used for provider location and compliance." fields={formFields} schema={countrySchema} defaultValues={defaultValues} onSubmit={handleSubmit} isLoading={createMutation.isPending || updateMutation.isPending} mode={selectedCountry ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Country Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selectedCountry?.is_active ? "Deactivate Country" : "Delete Country"} itemName={selectedCountry?.name} onConfirm={selectedCountry?.is_active ? handleDelete : handleHardDelete} onHardDelete={handleHardDelete} isLoading={selectedCountry?.is_active ? deleteMutation.isPending : hardDeleteMutation.isPending} hardDeleteLoading={hardDeleteMutation.isPending} isSoftDelete={selectedCountry?.is_active ?? true} showHardDelete={false} />
    </AdminLayout>
  );
}
