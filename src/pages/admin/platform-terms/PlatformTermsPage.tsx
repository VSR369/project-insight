import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import {
  usePlatformTerms, useCreatePlatformTerm, useUpdatePlatformTerm,
  useDeletePlatformTerm, useRestorePlatformTerm, useHardDeletePlatformTerm,
  PlatformTerm, PlatformTermInsert,
} from "@/hooks/queries/usePlatformTerms";

const schema = z.object({
  version: z.string().min(1, "Version is required").max(20),
  title: z.string().min(2).max(200),
  content: z.string().min(10, "Content must be at least 10 characters"),
  effective_date: z.string().min(1, "Effective date is required"),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

const formFields: FormFieldConfig<FormData>[] = [
  { name: "version", label: "Version", type: "text", placeholder: "e.g., 1.0, 2.1", required: true },
  { name: "title", label: "Title", type: "text", placeholder: "e.g., Platform Terms & Conditions", required: true },
  { name: "content", label: "Content", type: "textarea", placeholder: "Full terms content...", required: true },
  { name: "effective_date", label: "Effective Date", type: "text", placeholder: "YYYY-MM-DD", required: true, description: "Date when these terms take effect" },
  { name: "is_active", label: "Active", type: "switch", description: "Only one version should be active at a time" },
];

export default function PlatformTermsPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<PlatformTerm | null>(null);

  const { data: items = [], isLoading } = usePlatformTerms(true);
  const createM = useCreatePlatformTerm();
  const updateM = useUpdatePlatformTerm();
  const deleteM = useDeletePlatformTerm();
  const restoreM = useRestorePlatformTerm();
  const hardDeleteM = useHardDeletePlatformTerm();

  const columns: DataTableColumn<PlatformTerm>[] = [
    { accessorKey: "version", header: "Version" },
    { accessorKey: "title", header: "Title" },
    { accessorKey: "effective_date", header: "Effective Date" },
    { accessorKey: "published_at", header: "Published", cell: (v) => (v as string) ? new Date(v as string).toLocaleDateString() : "Draft" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<PlatformTerm>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    if (selected) await updateM.mutateAsync({ id: selected.id, ...data });
    else await createM.mutateAsync(data as PlatformTermInsert);
  };

  const defaults: Partial<FormData> = selected
    ? { version: selected.version, title: selected.title, content: selected.content, effective_date: selected.effective_date, is_active: selected.is_active }
    : { version: "", title: "", content: "", effective_date: "", is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Version", value: selected.version },
    { label: "Title", value: selected.title },
    { label: "Content", value: selected.content?.substring(0, 200) + (selected.content?.length > 200 ? "..." : "") },
    { label: "Effective Date", value: selected.effective_date, type: "date" },
    { label: "Published At", value: selected.published_at, type: "date" },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
  ] : [];

  return (
    <AdminLayout title="Platform Terms" description="Manage platform terms & conditions versions" breadcrumbs={[{ label: "Seeker Config", href: "/admin" }, { label: "Platform Terms" }]}>
      <DataTable data={items} columns={columns} actions={actions} searchKey="title" searchPlaceholder="Search terms..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Version" emptyMessage="No platform terms found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Platform Terms" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Platform Terms Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Terms" : "Delete Terms"} itemName={`${selected?.title} v${selected?.version}`} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </AdminLayout>
  );
}
