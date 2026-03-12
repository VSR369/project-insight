import * as React from "react";
import { z } from "zod";
import { Pencil, Trash2, RotateCcw, GraduationCap, BookOpen, FileText, Eye, Download, Upload, ChevronDown } from "lucide-react";
import { toast } from "sonner";


import {
  DataTable,
  DataTableColumn,
  DataTableAction,
} from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DisplayOrderCell } from "@/components/admin/DisplayOrderCell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  useCheckDisciplineChildren,
  useCheckStreamChildren,
  AcademicDiscipline,
  AcademicStream,
  AcademicSubject,
} from "@/hooks/queries/useAcademicTaxonomy";

import { downloadAcademicTemplate, exportAcademicData } from "./AcademicExcelExport";
import { AcademicTreePreview } from "./AcademicTreePreview";
import { AcademicImportDialog } from "./AcademicImportDialog";

// ============ SCHEMAS ============

const disciplineSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500, "Description must be 500 characters or less").optional().nullable(),
  display_order: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});

const streamSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500, "Description must be 500 characters or less").optional().nullable(),
  discipline_id: z.string().uuid("Please select a discipline"),
  display_order: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});

const subjectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500, "Description must be 500 characters or less").optional().nullable(),
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

  // View dialog states
  const [viewDisciplineOpen, setViewDisciplineOpen] = React.useState(false);
  const [viewingDiscipline, setViewingDiscipline] = React.useState<AcademicDiscipline | null>(null);
  const [viewStreamOpen, setViewStreamOpen] = React.useState(false);
  const [viewingStream, setViewingStream] = React.useState<(AcademicStream & { academic_disciplines: { name: string } | null }) | null>(null);
  const [viewSubjectOpen, setViewSubjectOpen] = React.useState(false);
  const [viewingSubject, setViewingSubject] = React.useState<(AcademicSubject & { academic_streams: { name: string; academic_disciplines: { name: string } | null } | null }) | null>(null);

  // Import and Preview dialog states
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [treePreviewOpen, setTreePreviewOpen] = React.useState(false);

  // Delete states with children check
  const [hasChildren, setHasChildren] = React.useState(false);

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
  const checkDisciplineChildren = useCheckDisciplineChildren();

  const createStream = useCreateAcademicStream();
  const updateStream = useUpdateAcademicStream();
  const deleteStream = useDeleteAcademicStream();
  const restoreStream = useRestoreAcademicStream();
  const checkStreamChildren = useCheckStreamChildren();

  const createSubject = useCreateAcademicSubject();
  const updateSubject = useUpdateAcademicSubject();
  const deleteSubject = useDeleteAcademicSubject();
  const restoreSubject = useRestoreAcademicSubject();

  // ============ DISCIPLINE CONFIG ============

  const disciplineColumns: DataTableColumn<AcademicDiscipline>[] = [
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "description",
      header: "Description",
      cell: (v) => <span className="text-muted-foreground line-clamp-2">{(v as string) || "—"}</span>,
    },
    { accessorKey: "display_order", header: "Order", cell: (v) => <DisplayOrderCell order={v as number | null} /> },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const disciplineActions: DataTableAction<AcademicDiscipline>[] = [
    {
      label: "View",
      icon: <Eye className="h-4 w-4" />,
      onClick: (d) => { setViewingDiscipline(d); setViewDisciplineOpen(true); },
    },
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
      onClick: async (d) => {
        const childCheck = await checkDisciplineChildren.mutateAsync(d.id);
        setHasChildren(childCheck);
        setSelectedDiscipline(d);
        setDeleteType("discipline");
        setIsDeleteOpen(true);
      },
      show: (d) => d.is_active,
    },
  ];

  const disciplineFields: FormFieldConfig<DisciplineFormData>[] = [
    { name: "name", label: "Discipline Name", type: "text", placeholder: "e.g., Engineering, Arts, Science", required: true },
    { name: "description", label: "Description", type: "textarea", placeholder: "Brief description of this discipline" },
    { name: "display_order", label: "Display Order", type: "number", placeholder: "0", min: 0 },
    { name: "is_active", label: "Active", type: "switch", description: "Inactive disciplines are hidden" },
  ];

  // ============ STREAM CONFIG ============

  const streamColumns: DataTableColumn<AcademicStream & { academic_disciplines: { name: string } | null }>[] = [
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "description",
      header: "Description",
      cell: (v) => <span className="text-muted-foreground line-clamp-2">{(v as string) || "—"}</span>,
    },
    {
      accessorKey: "academic_disciplines",
      header: "Discipline",
      cell: (v) => {
        const disc = v as { name: string } | null;
        return disc?.name || "—";
      },
    },
    { accessorKey: "display_order", header: "Order", cell: (v) => <DisplayOrderCell order={v as number | null} /> },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const streamActions: DataTableAction<AcademicStream & { academic_disciplines: { name: string } | null }>[] = [
    {
      label: "View",
      icon: <Eye className="h-4 w-4" />,
      onClick: (s) => { setViewingStream(s); setViewStreamOpen(true); },
    },
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
      onClick: async (s) => {
        const childCheck = await checkStreamChildren.mutateAsync(s.id);
        setHasChildren(childCheck);
        setSelectedStream(s);
        setDeleteType("stream");
        setIsDeleteOpen(true);
      },
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
    { name: "description", label: "Description", type: "textarea", placeholder: "Brief description of this stream" },
    { name: "display_order", label: "Display Order", type: "number", placeholder: "0", min: 0 },
    { name: "is_active", label: "Active", type: "switch", description: "Inactive streams are hidden" },
  ];

  // ============ SUBJECT CONFIG ============

  const subjectColumns: DataTableColumn<AcademicSubject & { academic_streams: { name: string; academic_disciplines: { name: string } | null } | null }>[] = [
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "description",
      header: "Description",
      cell: (v) => <span className="text-muted-foreground line-clamp-2">{(v as string) || "—"}</span>,
    },
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
    { accessorKey: "display_order", header: "Order", cell: (v) => <DisplayOrderCell order={v as number | null} /> },
    { accessorKey: "is_active", header: "Status", cell: (v) => <StatusBadge isActive={v as boolean} /> },
  ];

  const subjectActions: DataTableAction<AcademicSubject & { academic_streams: { name: string; academic_disciplines: { name: string } | null } | null }>[] = [
    {
      label: "View",
      icon: <Eye className="h-4 w-4" />,
      onClick: (s) => { setViewingSubject(s); setViewSubjectOpen(true); },
    },
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
      onClick: (s) => { 
        setHasChildren(false);
        setSelectedSubject(s); 
        setDeleteType("subject"); 
        setIsDeleteOpen(true); 
      },
      show: (s) => s.is_active,
    },
  ];

  // Get available streams for subject form (filter by selected discipline if any)
  const availableStreamsForSubject = React.useMemo(() => {
    return streams.filter((s: { is_active: boolean }) => s.is_active).map((s) => ({
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
    { name: "description", label: "Description", type: "textarea", placeholder: "Brief description of this subject" },
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

  const handleDownloadTemplate = async () => {
    try {
      await downloadAcademicTemplate();
      toast.success("Template downloaded successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download template");
    }
  };

  const handleExportData = async () => {
    try {
      await exportAcademicData();
      toast.success("Data exported successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export data");
    }
  };

  // View dialog fields
  const getDisciplineViewFields = (disc: AcademicDiscipline): ViewField[] => [
    { label: "Name", value: disc.name },
    { label: "Description", value: disc.description, type: "textarea" },
    { label: "Display Order", value: disc.display_order, type: "number" },
    { label: "Status", value: disc.is_active, type: "boolean" },
    { label: "Created At", value: disc.created_at, type: "date" },
    { label: "Updated At", value: disc.updated_at, type: "date" },
  ];

  const getStreamViewFields = (stream: AcademicStream & { academic_disciplines: { name: string } | null }): ViewField[] => [
    { label: "Name", value: stream.name },
    { label: "Description", value: stream.description, type: "textarea" },
    { label: "Discipline", value: stream.academic_disciplines?.name, type: "badge" },
    { label: "Display Order", value: stream.display_order, type: "number" },
    { label: "Status", value: stream.is_active, type: "boolean" },
    { label: "Created At", value: stream.created_at, type: "date" },
    { label: "Updated At", value: stream.updated_at, type: "date" },
  ];

  const getSubjectViewFields = (subject: AcademicSubject & { academic_streams: { name: string; academic_disciplines: { name: string } | null } | null }): ViewField[] => [
    { label: "Name", value: subject.name },
    { label: "Description", value: subject.description, type: "textarea" },
    { label: "Stream", value: subject.academic_streams?.name, type: "badge" },
    { label: "Discipline", value: subject.academic_streams?.academic_disciplines?.name, type: "badge" },
    { label: "Display Order", value: subject.display_order, type: "number" },
    { label: "Status", value: subject.is_active, type: "boolean" },
    { label: "Created At", value: subject.created_at, type: "date" },
    { label: "Updated At", value: subject.updated_at, type: "date" },
  ];

  // Summary stats
  const stats = {
    disciplines: disciplines.filter(d => d.is_active).length,
    streams: streams.filter((s: { is_active: boolean }) => s.is_active).length,
    subjects: subjects.filter((s: { is_active: boolean }) => s.is_active).length,
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Academic Taxonomy</h1>
        <p className="text-muted-foreground mt-1">Manage the hierarchical structure of disciplines, streams, and subjects for students</p>
      </div>
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Academia</Badge>
          <Badge variant="outline">Level 0: Aspiring Industry Problem Solver</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTreePreviewOpen(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview Tree
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Import / Export
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 lg:grid-cols-3 mb-6">
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
          <p className="text-sm text-muted-foreground mb-4">Click a row to view its streams</p>
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
            onRowClick={(discipline) => {
              setSelectedDisciplineId(discipline.id);
              setActiveTab("streams");
            }}
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

          <p className="text-sm text-muted-foreground mb-4">Click a row to view its subjects</p>
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
            onRowClick={(stream) => {
              setSelectedStreamId(stream.id);
              setActiveTab("subjects");
            }}
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
          description: selectedDiscipline.description,
          display_order: selectedDiscipline.display_order,
          is_active: selectedDiscipline.is_active,
        } : { name: "", description: "", display_order: 0, is_active: true }}
        onSubmit={async (data) => {
          if (selectedDiscipline) {
            await updateDiscipline.mutateAsync({ id: selectedDiscipline.id, ...data });
          } else {
            await createDiscipline.mutateAsync({ name: data.name, description: data.description, display_order: data.display_order, is_active: data.is_active });
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
          description: selectedStream.description,
          discipline_id: selectedStream.discipline_id,
          display_order: selectedStream.display_order,
          is_active: selectedStream.is_active,
        } : { name: "", description: "", discipline_id: selectedDisciplineId || "", display_order: 0, is_active: true }}
        onSubmit={async (data) => {
          if (selectedStream) {
            await updateStream.mutateAsync({ id: selectedStream.id, ...data });
          } else {
            await createStream.mutateAsync({ name: data.name, description: data.description, discipline_id: data.discipline_id, display_order: data.display_order, is_active: data.is_active });
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
          description: selectedSubject.description,
          stream_id: selectedSubject.stream_id,
          display_order: selectedSubject.display_order,
          is_active: selectedSubject.is_active,
        } : { name: "", description: "", stream_id: selectedStreamId || "", display_order: 0, is_active: true }}
        onSubmit={async (data) => {
          if (selectedSubject) {
            await updateSubject.mutateAsync({ id: selectedSubject.id, ...data });
          } else {
            await createSubject.mutateAsync({ name: data.name, description: data.description, stream_id: data.stream_id, display_order: data.display_order, is_active: data.is_active });
          }
        }}
        isLoading={createSubject.isPending || updateSubject.isPending}
        mode={selectedSubject ? "edit" : "create"}
      />

      {/* View Dialogs */}
      {viewingDiscipline && (
        <MasterDataViewDialog
          open={viewDisciplineOpen}
          onOpenChange={setViewDisciplineOpen}
          title={`Discipline: ${viewingDiscipline.name}`}
          fields={getDisciplineViewFields(viewingDiscipline)}
          onEdit={() => {
            setViewDisciplineOpen(false);
            setSelectedDiscipline(viewingDiscipline);
            setIsDisciplineFormOpen(true);
          }}
        />
      )}

      {viewingStream && (
        <MasterDataViewDialog
          open={viewStreamOpen}
          onOpenChange={setViewStreamOpen}
          title={`Stream: ${viewingStream.name}`}
          fields={getStreamViewFields(viewingStream)}
          onEdit={() => {
            setViewStreamOpen(false);
            setSelectedStream(viewingStream);
            setIsStreamFormOpen(true);
          }}
        />
      )}

      {viewingSubject && (
        <MasterDataViewDialog
          open={viewSubjectOpen}
          onOpenChange={setViewSubjectOpen}
          title={`Subject: ${viewingSubject.name}`}
          fields={getSubjectViewFields(viewingSubject)}
          onEdit={() => {
            setViewSubjectOpen(false);
            setSelectedSubject(viewingSubject);
            setIsSubjectFormOpen(true);
          }}
        />
      )}

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={`Deactivate ${deleteType.charAt(0).toUpperCase() + deleteType.slice(1)}${hasChildren ? " (Has Children)" : ""}`}
        itemName={getDeleteItemName()}
        onConfirm={handleDelete}
        isLoading={deleteDiscipline.isPending || deleteStream.isPending || deleteSubject.isPending}
        isSoftDelete={true}
      />

      {/* Tree Preview Dialog */}
      <AcademicTreePreview
        open={treePreviewOpen}
        onOpenChange={setTreePreviewOpen}
      />

      {/* Import Dialog */}
      <AcademicImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </>
  );
}
