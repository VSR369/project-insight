import * as React from "react";
import { z } from "zod";
import { Pencil, Trash2, RotateCcw, Trash } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  DataTable,
  DataTableColumn,
  DataTableAction,
} from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
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

// Zod schema for form validation
const countrySchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(3, "Code must be at most 3 characters").toUpperCase(),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
  phone_code: z.string().max(10, "Phone code must be at most 10 characters").nullable().optional(),
  display_order: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});

type CountryFormData = z.infer<typeof countrySchema>;

const formFields: FormFieldConfig<CountryFormData>[] = [
  { name: "code", label: "Country Code", type: "text", placeholder: "e.g., US, GB, IN", description: "ISO 3166-1 alpha-2 or alpha-3 code", required: true },
  { name: "name", label: "Country Name", type: "text", placeholder: "e.g., United States", required: true },
  { name: "phone_code", label: "Phone Code", type: "text", placeholder: "e.g., +1, +44, +91", description: "International dialing code" },
  { name: "display_order", label: "Display Order", type: "number", placeholder: "0", description: "Lower numbers appear first", min: 0 },
  { name: "is_active", label: "Active", type: "switch", description: "Inactive countries are hidden from users" },
];

export default function CountriesPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
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
    { accessorKey: "phone_code", header: "Phone Code", cell: (value) => (value as string) || "—" },
    { accessorKey: "display_order", header: "Order", cell: (value) => (value as number) ?? "—" },
    { accessorKey: "is_active", header: "Status", cell: (value) => <StatusBadge isActive={value as boolean} /> },
  ];

  const actions: DataTableAction<Country>[] = [
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (country) => { setSelectedCountry(country); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (country) => { restoreMutation.mutate(country.id); }, show: (country) => !country.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (country) => { setSelectedCountry(country); setIsDeleteOpen(true); }, show: (country) => !country.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (country) => { setSelectedCountry(country); setIsDeleteOpen(true); }, show: (country) => country.is_active },
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
    ? { code: selectedCountry.code, name: selectedCountry.name, phone_code: selectedCountry.phone_code, display_order: selectedCountry.display_order, is_active: selectedCountry.is_active }
    : { code: "", name: "", phone_code: "", display_order: 0, is_active: true };

  return (
    <AdminLayout title="Countries" description="Manage countries available in the platform" breadcrumbs={[{ label: "Master Data", href: "/admin" }, { label: "Countries" }]}>
      <DataTable data={countries} columns={columns} actions={actions} searchKey="name" searchPlaceholder="Search countries..." isLoading={isLoading} onAdd={() => { setSelectedCountry(null); setIsFormOpen(true); }} addButtonLabel="Add Country" emptyMessage="No countries found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Country" description="Countries are used for provider location and compliance." fields={formFields} schema={countrySchema} defaultValues={defaultValues} onSubmit={handleSubmit} isLoading={createMutation.isPending || updateMutation.isPending} mode={selectedCountry ? "edit" : "create"} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selectedCountry?.is_active ? "Deactivate Country" : "Delete Country"} itemName={selectedCountry?.name} onConfirm={selectedCountry?.is_active ? handleDelete : handleHardDelete} onHardDelete={handleHardDelete} isLoading={selectedCountry?.is_active ? deleteMutation.isPending : hardDeleteMutation.isPending} hardDeleteLoading={hardDeleteMutation.isPending} isSoftDelete={selectedCountry?.is_active ?? true} showHardDelete={false} />
    </AdminLayout>
  );
}
