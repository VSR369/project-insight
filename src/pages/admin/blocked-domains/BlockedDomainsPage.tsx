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
  useBlockedDomains, useCreateBlockedDomain, useUpdateBlockedDomain,
  useDeleteBlockedDomain, useRestoreBlockedDomain, useHardDeleteBlockedDomain,
  BlockedDomain, BlockedDomainInsert,
} from "@/hooks/queries/useBlockedDomains";

const schema = z.object({
  domain: z.string().min(3, "Domain must be at least 3 characters").max(255),
  reason: z.string().max(500).nullable().optional(),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

const formFields: FormFieldConfig<FormData>[] = [
  { name: "domain", label: "Domain", type: "text", placeholder: "e.g., gmail.com, yahoo.com", required: true, description: "Email domain to block from registration" },
  { name: "reason", label: "Reason", type: "textarea", placeholder: "e.g., Free email provider" },
  { name: "is_active", label: "Active", type: "switch" },
];

export default function BlockedDomainsPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<BlockedDomain | null>(null);

  const { data: items = [], isLoading } = useBlockedDomains(true);
  const createM = useCreateBlockedDomain();
  const updateM = useUpdateBlockedDomain();
  const deleteM = useDeleteBlockedDomain();
  const restoreM = useRestoreBlockedDomain();
  const hardDeleteM = useHardDeleteBlockedDomain();

  const columns: DataTableColumn<BlockedDomain>[] = [
    { accessorKey: "domain", header: "Domain" },
    { accessorKey: "reason", header: "Reason", cell: (v) => (v as string) || "—" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<BlockedDomain>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    if (selected) await updateM.mutateAsync({ id: selected.id, ...data });
    else await createM.mutateAsync(data as BlockedDomainInsert);
  };

  const defaults: Partial<FormData> = selected
    ? { domain: selected.domain, reason: selected.reason, is_active: selected.is_active }
    : { domain: "", reason: "", is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Domain", value: selected.domain },
    { label: "Reason", value: selected.reason },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
  ] : [];

  return (
    <AdminLayout title="Blocked Email Domains" description="Manage email domains blocked from registration" breadcrumbs={[{ label: "Seeker Config", href: "/admin" }, { label: "Blocked Domains" }]}>
      <DataTable data={items} columns={columns} actions={actions} searchKey="domain" searchPlaceholder="Search domains..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Domain" emptyMessage="No blocked domains found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Blocked Domain" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Blocked Domain Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Domain" : "Delete Domain"} itemName={selected?.domain} onConfirm={selected?.is_active ? () => deleteM.mutateAsync(selected!.id) : () => hardDeleteM.mutateAsync(selected!.id)} onHardDelete={() => hardDeleteM.mutateAsync(selected!.id)} isLoading={deleteM.isPending || hardDeleteM.isPending} hardDeleteLoading={hardDeleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
    </AdminLayout>
  );
}
