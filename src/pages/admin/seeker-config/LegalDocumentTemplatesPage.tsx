import * as React from "react";
import { z } from "zod";
import { Eye, Pencil, Trash2, RotateCcw, Trash, FileEdit } from "lucide-react";

import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import {
  useLegalDocumentTemplates, useCreateLegalDocumentTemplate, useUpdateLegalDocumentTemplate,
  useDeleteLegalDocumentTemplate, useRestoreLegalDocumentTemplate,
  LegalDocumentTemplate, LegalDocumentTemplateInsert,
} from "@/hooks/queries/useLegalDocumentTemplates";

const schema = z.object({
  document_name: z.string().min(2, "Name is required").max(255),
  document_type: z.string().min(2, "Type is required").max(100),
  tier: z.string().min(1, "Tier is required"),
  description: z.string().max(500).nullable().optional(),
  trigger_phase: z.number().nullable().optional(),
  is_active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

const TIER_OPTIONS = [
  { value: "TIER_1", label: "Tier 1" },
  { value: "TIER_2", label: "Tier 2" },
];

const formFields: FormFieldConfig<FormData>[] = [
  { name: "document_name", label: "Document Name", type: "text", placeholder: "e.g., Non-Disclosure Agreement", required: true },
  { name: "document_type", label: "Document Type", type: "text", placeholder: "e.g., nda_standard", required: true, description: "Unique snake_case identifier" },
  { name: "tier", label: "Tier", type: "select", options: TIER_OPTIONS, required: true },
  { name: "description", label: "Description", type: "textarea", placeholder: "Short summary of this template" },
  { name: "trigger_phase", label: "Trigger Phase", type: "number", placeholder: "e.g., 3", description: "Phase at which this doc is triggered (Tier 2)" },
  { name: "is_active", label: "Active", type: "switch" },
];

export default function LegalDocumentTemplatesPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isContentEditorOpen, setIsContentEditorOpen] = React.useState(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<LegalDocumentTemplate | null>(null);

  const { data: items = [], isLoading } = useLegalDocumentTemplates(true);
  const createM = useCreateLegalDocumentTemplate();
  const updateM = useUpdateLegalDocumentTemplate();
  const deleteM = useDeleteLegalDocumentTemplate();
  const restoreM = useRestoreLegalDocumentTemplate();

  const columns: DataTableColumn<LegalDocumentTemplate>[] = [
    { accessorKey: "document_name", header: "Document Name" },
    { accessorKey: "document_type", header: "Type" },
    { accessorKey: "tier", header: "Tier" },
    { accessorKey: "trigger_phase", header: "Phase", cell: (v) => (v as number) ?? "—" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const actions: DataTableAction<LegalDocumentTemplate>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsViewOpen(true); } },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsFormOpen(true); } },
    { label: "Edit Content", icon: <FileEdit className="h-4 w-4" />, onClick: (i) => { setSelected(i); setIsContentEditorOpen(true); } },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => restoreM.mutate(i.template_id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: (i) => { setSelected(i); setIsDeleteOpen(true); }, show: (i) => i.is_active },
  ];

  const handleSubmit = async (data: FormData) => {
    if (selected) await updateM.mutateAsync({ template_id: selected.template_id, ...data });
    else await createM.mutateAsync(data as LegalDocumentTemplateInsert);
  };

  const defaults: Partial<FormData> = selected
    ? { document_name: selected.document_name, document_type: selected.document_type, tier: selected.tier, description: selected.description, trigger_phase: selected.trigger_phase, is_active: selected.is_active }
    : { document_name: "", document_type: "", tier: "TIER_1", description: "", trigger_phase: null, is_active: true };

  const viewFields: ViewField[] = selected ? [
    { label: "Document Name", value: selected.document_name },
    { label: "Document Type", value: selected.document_type },
    { label: "Tier", value: selected.tier },
    { label: "Trigger Phase", value: selected.trigger_phase ?? "—" },
    { label: "Description", value: selected.description },
    { label: "Template URL", value: selected.default_template_url ?? "—" },
    { label: "Content Length", value: selected.template_content ? `${selected.template_content.length} chars` : "Not set" },
    { label: "Status", value: selected.is_active, type: "boolean" },
    { label: "Created At", value: selected.created_at, type: "date" },
  ] : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Legal Document Templates</h1>
        <p className="text-muted-foreground mt-1">Manage master legal document templates for governance modes</p>
      </div>
      <DataTable data={items.map(i => ({ ...i, id: i.template_id }))} columns={columns as DataTableColumn<LegalDocumentTemplate & { id: string }>[]} actions={actions as DataTableAction<LegalDocumentTemplate & { id: string }>[]} searchKey="document_name" searchPlaceholder="Search templates..." isLoading={isLoading} onAdd={() => { setSelected(null); setIsFormOpen(true); }} addButtonLabel="Add Template" emptyMessage="No legal document templates found." />
      <MasterDataForm open={isFormOpen} onOpenChange={setIsFormOpen} title="Legal Template" fields={formFields} schema={schema} defaultValues={defaults} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} mode={selected ? "edit" : "create"} />
      <MasterDataViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Legal Template Details" fields={viewFields} onEdit={() => { setIsViewOpen(false); setIsFormOpen(true); }} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Template" : "Delete Template"} itemName={selected?.document_name} onConfirm={() => deleteM.mutateAsync(selected!.template_id)} isLoading={deleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
      <DeleteConfirmDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} title={selected?.is_active ? "Deactivate Template" : "Delete Template"} itemName={selected?.document_name} onConfirm={() => deleteM.mutateAsync(selected!.template_id)} isLoading={deleteM.isPending} isSoftDelete={selected?.is_active ?? true} showHardDelete={false} />
      {selected && <LegalTemplateContentEditor open={isContentEditorOpen} onOpenChange={setIsContentEditorOpen} template={selected} />}
      {selected && <LegalTemplateFileUpload open={isFileUploadOpen} onOpenChange={setIsFileUploadOpen} template={selected} />}
    </>
  );
}

export { LegalDocumentTemplatesPage };
