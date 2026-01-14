import * as React from "react";
import { z } from "zod";
import { Pencil, Trash2, RotateCcw, GraduationCap, BookOpen, FileText } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  DataTable,
  DataTableColumn,
  DataTableAction,
} from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  useAcademicDisciplines,
  useCreateAcademicDiscipline,
  useUpdateAcademicDiscipline,
  useDeleteAcademicDiscipline,
  useRestoreAcademicDiscipline,
  useAcademicStreams,
  useCreateAcademicStream,
  useUpdateAcademicStream,
  useDeleteAcademicStream,
  useRestoreAcademicStream,
  useAcademicSubjects,
  useCreateAcademicSubject,
  useUpdateAcademicSubject,
  useDeleteAcademicSubject,
  useRestoreAcademicSubject,
  AcademicDiscipline,
  AcademicStream,
  AcademicSubject,
} from "@/hooks/queries/useAcademicTaxonomy";

// ============ SCHEMAS ============

const disciplineSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  display_order: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});

const streamSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  discipline_id: z.string().uuid("Please select a discipline"),
  display_order: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});

const subjectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  stream_id: z.string().uuid("Please select a stream"),
  display_order: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});

type DisciplineFormData = z.infer<typeof disciplineSchema>;
type StreamFormData = z.infer<typeof streamSchema>;
type SubjectFormData = z.infer<typeof subjectSchema>;

export default function AcademicTaxonomyPage() {
  const [activeTab, setActiveTab] = React.useState("disciplines");
  
  // Filter states
  const [selectedDisciplineId, setSelectedDisciplineId] = React.useState<string | null>(null);
  const [selectedStreamId, setSelectedStreamId] = React.useState<string | null>(null);

  // Form states
  const [isDisciplineFormOpen, setIsDisciplineFormOpen] = React.useState(false);
  const [isStreamFormOpen, setIsStreamFormOpen] = React.useState(false);
  const [isSubjectFormOpen, setIsSubjectFormOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  // Selected items
  const [selectedDiscipline, setSelectedDiscipline] = React.useState<AcademicDiscipline | null>(null);
  const [selectedStream, setSelectedStream] = React.useState<(AcademicStream & { academic_disciplines: { name: string } | null }) | null>(null);
  const [selectedSubject, setSelectedSubject] = React.useState<(AcademicSubject & { academic_streams: { name: string; academic_disciplines: { name: string } | null } | null }) | null>(null);
  const [deleteType, setDeleteType] = React.useState<"discipline" | "stream" | "subject">("discipline");

  // Queries
  const { data: disciplines = [], isLoading: disciplinesLoading } = useAcademicDisciplines(true);
  const { data: streams = [], isLoading: streamsLoading } = useAcademicStreams(selectedDisciplineId, true);
  const { data: subjects = [], isLoading: subjectsLoading } = useAcademicSubjects(selectedStreamId, true);

  // Mutations
  const createDiscipline = useCreateAcademicDiscipline();
  const updateDiscipline = useUpdateAcademicDiscipline();
  const deleteDiscipline = useDeleteAcademicDiscipline();
  const restoreDiscipline = useRestoreAcademicDiscipline();

  const createStream = useCreateAcademicStream();
  const updateStream = useUpdateAcademicStream();
  const deleteStream = useDeleteAcademicStream();
  const restoreStream = useRestoreAcademicStream();

  const createSubject = useCreateAcademicSubject();
  const updateSubject = useUpdateAcademicSubject();
  const deleteSubject = useDeleteAcademicSubject();
  const restoreSubject = useRestoreAcademicSubject();

  // ============ DISCIPLINE CONFIG ============

  const disciplineColumns: DataTableColumn<AcademicDiscipline>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "display_order", header: "Order", cell: (v) => (v as number) ?? "—" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const disciplineActions: DataTableAction<AcademicDiscipline>[] = [
    {
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: (d) => { setSelectedDiscipline(d); setIsDisciplineFormOpen(true); },
    },
    {
      label: "View Streams",
      icon: <BookOpen className="h-4 w-4" />,
      onClick: (d) => { setSelectedDisciplineId(d.id); setActiveTab("streams"); },
    },
    {
      label: "Restore",
      icon: <RotateCcw className="h-4 w-4" />,
      onClick: (d) => restoreDiscipline.mutate(d.id),
      show: (d) => !d.is_active,
    },
    {
      label: "Deactivate",
      icon: <Trash2 className="h-4 w-4" />,
      variant: "destructive",
      onClick: (d) => { setSelectedDiscipline(d); setDeleteType("discipline"); setIsDeleteOpen(true); },
      show: (d) => d.is_active,
    },
  ];

  const disciplineFields: FormFieldConfig<DisciplineFormData>[] = [
    { name: "name", label: "Discipline Name", type: "text", placeholder: "e.g., Engineering, Arts, Science", required: true },
    { name: "display_order", label: "Display Order", type: "number", placeholder: "0", min: 0 },
    { name: "is_active", label: "Active", type: "switch", description: "Inactive disciplines are hidden" },
  ];

  // ============ STREAM CONFIG ============

  const streamColumns: DataTableColumn<AcademicStream & { academic_disciplines: { name: string } | null }>[] = [
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "academic_disciplines",
      header: "Discipline",
      cell: (v) => {
        const disc = v as { name: string } | null;
        return disc?.name || "—";
      },
    },
    { accessorKey: "display_order", header: "Order", cell: (v) => (v as number) ?? "—" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const streamActions: DataTableAction<AcademicStream & { academic_disciplines: { name: string } | null }>[] = [
    {
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: (s) => { setSelectedStream(s); setIsStreamFormOpen(true); },
    },
    {
      label: "View Subjects",
      icon: <FileText className="h-4 w-4" />,
      onClick: (s) => { setSelectedStreamId(s.id); setActiveTab("subjects"); },
    },
    {
      label: "Restore",
      icon: <RotateCcw className="h-4 w-4" />,
      onClick: (s) => restoreStream.mutate(s.id),
      show: (s) => !s.is_active,
    },
    {
      label: "Deactivate",
      icon: <Trash2 className="h-4 w-4" />,
      variant: "destructive",
      onClick: (s) => { setSelectedStream(s); setDeleteType("stream"); setIsDeleteOpen(true); },
      show: (s) => s.is_active,
    },
  ];

  const streamFields: FormFieldConfig<StreamFormData>[] = [
    {
      name: "discipline_id",
      label: "Parent Discipline",
      type: "select",
      placeholder: "Select a discipline",
      required: true,
      options: disciplines.filter(d => d.is_active).map((d) => ({ value: d.id, label: d.name })),
    },
    { name: "name", label: "Stream Name", type: "text", placeholder: "e.g., Computer Science, Mechanical", required: true },
    { name: "display_order", label: "Display Order", type: "number", placeholder: "0", min: 0 },
    { name: "is_active", label: "Active", type: "switch", description: "Inactive streams are hidden" },
  ];

  // ============ SUBJECT CONFIG ============

  const subjectColumns: DataTableColumn<AcademicSubject & { academic_streams: { name: string; academic_disciplines: { name: string } | null } | null }>[] = [
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "academic_streams",
      header: "Stream / Discipline",
      cell: (v) => {
        const stream = v as { name: string; academic_disciplines: { name: string } | null } | null;
        if (!stream) return "—";
        return (
          <div className="flex flex-col">
            <span>{stream.name}</span>
            <span className="text-xs text-muted-foreground">{stream.academic_disciplines?.name}</span>
          </div>
        );
      },
    },
    { accessorKey: "display_order", header: "Order", cell: (v) => (v as number) ?? "—" },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const subjectActions: DataTableAction<AcademicSubject & { academic_streams: { name: string; academic_disciplines: { name: string } | null } | null }>[] = [
    {
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: (s) => { setSelectedSubject(s); setIsSubjectFormOpen(true); },
    },
    {
      label: "Restore",
      icon: <RotateCcw className="h-4 w-4" />,
      onClick: (s) => restoreSubject.mutate(s.id),
      show: (s) => !s.is_active,
    },
    {
      label: "Deactivate",
      icon: <Trash2 className="h-4 w-4" />,
      variant: "destructive",
      onClick: (s) => { setSelectedSubject(s); setDeleteType("subject"); setIsDeleteOpen(true); },
      show: (s) => s.is_active,
    },
  ];

  // Get available streams for subject form (filter by selected discipline if any)
  const availableStreamsForSubject = React.useMemo(() => {
    return streams.filter(s => s.is_active).map((s) => ({
      value: s.id,
      label: `${s.name} (${(s as typeof s & { academic_disciplines: { name: string } | null }).academic_disciplines?.name || "Unknown"})`,
    }));
  }, [streams]);

  const subjectFields: FormFieldConfig<SubjectFormData>[] = [
    {
      name: "stream_id",
      label: "Parent Stream",
      type: "select",
      placeholder: "Select a stream",
      required: true,
      options: availableStreamsForSubject,
    },
    { name: "name", label: "Subject Name", type: "text", placeholder: "e.g., Data Structures, Thermodynamics", required: true },
    { name: "display_order", label: "Display Order", type: "number", placeholder: "0", min: 0 },
    { name: "is_active", label: "Active", type: "switch", description: "Inactive subjects are hidden" },
  ];

  // ============ HANDLERS ============

  const handleDelete = async () => {
    if (deleteType === "discipline" && selectedDiscipline) {
      await deleteDiscipline.mutateAsync(selectedDiscipline.id);
    } else if (deleteType === "stream" && selectedStream) {
      await deleteStream.mutateAsync(selectedStream.id);
    } else if (deleteType === "subject" && selectedSubject) {
      await deleteSubject.mutateAsync(selectedSubject.id);
    }
  };

  const getDeleteItemName = () => {
    if (deleteType === "discipline") return selectedDiscipline?.name;
    if (deleteType === "stream") return selectedStream?.name;
    return selectedSubject?.name;
  };

  // Summary stats
  const stats = {
    disciplines: disciplines.filter(d => d.is_active).length,
    streams: streams.filter((s: { is_active: boolean }) => s.is_active).length,
    subjects: subjects.filter((s: { is_active: boolean }) => s.is_active).length,
  };

  return (
    <AdminLayout
      title="Academic Taxonomy"
      description="Manage the hierarchical structure of disciplines, streams, and subjects for students"
      breadcrumbs={[
        { label: "Master Data", href: "/admin" },
        { label: "Academic Taxonomy" },
      ]}
    >
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disciplines</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.disciplines}</div>
            <p className="text-xs text-muted-foreground">Top-level categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streams</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.streams}</div>
            <p className="text-xs text-muted-foreground">
              {selectedDisciplineId ? "In selected discipline" : "All streams"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subjects</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.subjects}</div>
            <p className="text-xs text-muted-foreground">
              {selectedStreamId ? "In selected stream" : "All subjects"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="disciplines" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Disciplines
          </TabsTrigger>
          <TabsTrigger value="streams" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Streams
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Subjects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="disciplines" className="mt-6">
          <DataTable
            data={disciplines}
            columns={disciplineColumns}
            actions={disciplineActions}
            searchKey="name"
            searchPlaceholder="Search disciplines..."
            isLoading={disciplinesLoading}
            onAdd={() => { setSelectedDiscipline(null); setIsDisciplineFormOpen(true); }}
            addButtonLabel="Add Discipline"
            emptyMessage="No disciplines found. Add your first discipline to get started."
          />
        </TabsContent>

        <TabsContent value="streams" className="mt-6 space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Filter by Discipline:</span>
            <Select
              value={selectedDisciplineId || "all"}
              onValueChange={(v) => setSelectedDisciplineId(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="All disciplines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Disciplines</SelectItem>
                {disciplines.filter(d => d.is_active).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDisciplineId && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedDisciplineId(null)}>
                Clear filter ×
              </Badge>
            )}
          </div>

          <DataTable
            data={streams as (AcademicStream & { academic_disciplines: { name: string } | null })[]}
            columns={streamColumns}
            actions={streamActions}
            searchKey="name"
            searchPlaceholder="Search streams..."
            isLoading={streamsLoading}
            onAdd={() => { setSelectedStream(null); setIsStreamFormOpen(true); }}
            addButtonLabel="Add Stream"
            emptyMessage={selectedDisciplineId ? "No streams found for this discipline." : "No streams found."}
          />
        </TabsContent>

        <TabsContent value="subjects" className="mt-6 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium">Filter by Stream:</span>
            <Select
              value={selectedStreamId || "all"}
              onValueChange={(v) => setSelectedStreamId(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="All streams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Streams</SelectItem>
                {streams.filter((s: { is_active: boolean }) => s.is_active).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({(s as typeof s & { academic_disciplines: { name: string } | null }).academic_disciplines?.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStreamId && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedStreamId(null)}>
                Clear filter ×
              </Badge>
            )}
          </div>

          <DataTable
            data={subjects as (AcademicSubject & { academic_streams: { name: string; academic_disciplines: { name: string } | null } | null })[]}
            columns={subjectColumns}
            actions={subjectActions}
            searchKey="name"
            searchPlaceholder="Search subjects..."
            isLoading={subjectsLoading}
            onAdd={() => { setSelectedSubject(null); setIsSubjectFormOpen(true); }}
            addButtonLabel="Add Subject"
            emptyMessage={selectedStreamId ? "No subjects found for this stream." : "No subjects found."}
          />
        </TabsContent>
      </Tabs>

      {/* Forms */}
      <MasterDataForm
        open={isDisciplineFormOpen}
        onOpenChange={setIsDisciplineFormOpen}
        title="Discipline"
        description="Disciplines are the top-level academic categories."
        fields={disciplineFields}
        schema={disciplineSchema}
        defaultValues={selectedDiscipline ? {
          name: selectedDiscipline.name,
          display_order: selectedDiscipline.display_order,
          is_active: selectedDiscipline.is_active,
        } : { name: "", display_order: 0, is_active: true }}
        onSubmit={async (data) => {
          if (selectedDiscipline) {
            await updateDiscipline.mutateAsync({ id: selectedDiscipline.id, ...data });
          } else {
            await createDiscipline.mutateAsync({ name: data.name, display_order: data.display_order, is_active: data.is_active });
          }
        }}
        isLoading={createDiscipline.isPending || updateDiscipline.isPending}
        mode={selectedDiscipline ? "edit" : "create"}
      />

      <MasterDataForm
        open={isStreamFormOpen}
        onOpenChange={setIsStreamFormOpen}
        title="Stream"
        description="Streams belong to a discipline and contain subjects."
        fields={streamFields}
        schema={streamSchema}
        defaultValues={selectedStream ? {
          name: selectedStream.name,
          discipline_id: selectedStream.discipline_id,
          display_order: selectedStream.display_order,
          is_active: selectedStream.is_active,
        } : { name: "", discipline_id: selectedDisciplineId || "", display_order: 0, is_active: true }}
        onSubmit={async (data) => {
          if (selectedStream) {
            await updateStream.mutateAsync({ id: selectedStream.id, ...data });
          } else {
            await createStream.mutateAsync({ name: data.name, discipline_id: data.discipline_id, display_order: data.display_order, is_active: data.is_active });
          }
        }}
        isLoading={createStream.isPending || updateStream.isPending}
        mode={selectedStream ? "edit" : "create"}
      />

      <MasterDataForm
        open={isSubjectFormOpen}
        onOpenChange={setIsSubjectFormOpen}
        title="Subject"
        description="Subjects are the lowest level in the academic hierarchy."
        fields={subjectFields}
        schema={subjectSchema}
        defaultValues={selectedSubject ? {
          name: selectedSubject.name,
          stream_id: selectedSubject.stream_id,
          display_order: selectedSubject.display_order,
          is_active: selectedSubject.is_active,
        } : { name: "", stream_id: selectedStreamId || "", display_order: 0, is_active: true }}
        onSubmit={async (data) => {
          if (selectedSubject) {
            await updateSubject.mutateAsync({ id: selectedSubject.id, ...data });
          } else {
            await createSubject.mutateAsync({ name: data.name, stream_id: data.stream_id, display_order: data.display_order, is_active: data.is_active });
          }
        }}
        isLoading={createSubject.isPending || updateSubject.isPending}
        mode={selectedSubject ? "edit" : "create"}
      />

      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={`Deactivate ${deleteType.charAt(0).toUpperCase() + deleteType.slice(1)}`}
        itemName={getDeleteItemName()}
        onConfirm={handleDelete}
        isLoading={deleteDiscipline.isPending || deleteStream.isPending || deleteSubject.isPending}
        isSoftDelete={true}
      />
    </AdminLayout>
  );
}
