import * as React from "react";
import { z } from "zod";
import { Layers, ChevronRight, Building2, Target, Boxes, Sparkles, Download, Upload, Eye, Database, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { seedManufacturingAutoComponentsTaxonomy } from "@/services/taxonomySeeder";

import { AdminLayout } from "@/components/admin";
import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { MasterDataForm, FormFieldConfig } from "@/components/admin/MasterDataForm";
import { MasterDataViewDialog, ViewField } from "@/components/admin/MasterDataViewDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DisplayOrderCell } from "@/components/admin/DisplayOrderCell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  useIndustrySegments,
  IndustrySegment,
} from "@/hooks/queries/useIndustrySegments";

import {
  useExpertiseLevels,
  ExpertiseLevel,
} from "@/hooks/queries/useExpertiseLevels";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useProficiencyAreasAdmin,
  useCreateProficiencyArea,
  useUpdateProficiencyArea,
  useDeleteProficiencyArea,
  useRestoreProficiencyArea,
  useCheckProficiencyAreaChildren,
  useSubDomainsAdmin,
  useCreateSubDomain,
  useUpdateSubDomain,
  useDeleteSubDomain,
  useRestoreSubDomain,
  useCheckSubDomainChildren,
  useSpecialitiesAdmin,
  useCreateSpeciality,
  useUpdateSpeciality,
  useDeleteSpeciality,
  useRestoreSpeciality,
  ProficiencyArea,
  SubDomain,
  Speciality,
} from "@/hooks/queries/useProficiencyTaxonomyAdmin";

import { downloadProficiencyTemplate, exportProficiencyData } from "./ProficiencyExcelExport";
import { ProficiencyImportDialog } from "./ProficiencyImportDialog";

// ===================== SCHEMAS =====================

const proficiencyAreaSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional().nullable(),
  display_order: z.coerce.number().int().min(0).optional().nullable(),
  is_active: z.boolean().default(true),
});

const subDomainSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional().nullable(),
  display_order: z.coerce.number().int().min(0).optional().nullable(),
  is_active: z.boolean().default(true),
});

const specialitySchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional().nullable(),
  display_order: z.coerce.number().int().min(0).optional().nullable(),
  is_active: z.boolean().default(true),
});

// ===================== FORM FIELD CONFIGS =====================

const proficiencyAreaFields: FormFieldConfig[] = [
  { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g., Data Analytics" },
  { name: "description", label: "Description", type: "textarea", placeholder: "Brief description of this proficiency area" },
  { name: "display_order", label: "Display Order", type: "number", placeholder: "0" },
  { name: "is_active", label: "Active", type: "switch", defaultValue: true },
];

const subDomainFields: FormFieldConfig[] = [
  { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g., Business Intelligence" },
  { name: "description", label: "Description", type: "textarea", placeholder: "Brief description of this sub-domain" },
  { name: "display_order", label: "Display Order", type: "number", placeholder: "0" },
  { name: "is_active", label: "Active", type: "switch", defaultValue: true },
];

const specialityFields: FormFieldConfig[] = [
  { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g., Power BI Development" },
  { name: "description", label: "Description", type: "textarea", placeholder: "Brief description of this speciality" },
  { name: "display_order", label: "Display Order", type: "number", placeholder: "0" },
  { name: "is_active", label: "Active", type: "switch", defaultValue: true },
];

// ===================== MAIN COMPONENT =====================

export function ProficiencyTaxonomyPage() {
  const [activeTab, setActiveTab] = React.useState("proficiency-areas");
  const [showInactive, setShowInactive] = React.useState(true);

  // Selected parent IDs for filtering
  const [selectedExpertiseLevelId, setSelectedExpertiseLevelId] = React.useState<string | undefined>();
  const [selectedIndustrySegmentId, setSelectedIndustrySegmentId] = React.useState<string | undefined>();
  const [selectedProficiencyAreaId, setSelectedProficiencyAreaId] = React.useState<string | undefined>();
  const [selectedSubDomainId, setSelectedSubDomainId] = React.useState<string | undefined>();

  // Form states
  const [areaFormOpen, setAreaFormOpen] = React.useState(false);
  const [areaFormMode, setAreaFormMode] = React.useState<"create" | "edit">("create");
  const [editingArea, setEditingArea] = React.useState<ProficiencyArea | null>(null);

  const [subDomainFormOpen, setSubDomainFormOpen] = React.useState(false);
  const [subDomainFormMode, setSubDomainFormMode] = React.useState<"create" | "edit">("create");
  const [editingSubDomain, setEditingSubDomain] = React.useState<SubDomain | null>(null);

  const [specialityFormOpen, setSpecialityFormOpen] = React.useState(false);
  const [specialityFormMode, setSpecialityFormMode] = React.useState<"create" | "edit">("create");
  const [editingSpeciality, setEditingSpeciality] = React.useState<Speciality | null>(null);

  // View dialog states
  const [viewAreaOpen, setViewAreaOpen] = React.useState(false);
  const [viewingArea, setViewingArea] = React.useState<ProficiencyArea | null>(null);
  const [viewSubDomainOpen, setViewSubDomainOpen] = React.useState(false);
  const [viewingSubDomain, setViewingSubDomain] = React.useState<SubDomain | null>(null);
  const [viewSpecialityOpen, setViewSpecialityOpen] = React.useState(false);
  const [viewingSpeciality, setViewingSpeciality] = React.useState<Speciality | null>(null);

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [isSeeding, setIsSeeding] = React.useState(false);

  const queryClient = React.useMemo(() => {
    return null; // We'll use invalidation via the hooks
  }, []);

  const handleSeedTaxonomy = async () => {
    setIsSeeding(true);
    try {
      const result = await seedManufacturingAutoComponentsTaxonomy();
      if (result.errors.length > 0) {
        toast.warning(`Seeding completed with ${result.errors.length} errors. Created ${result.subDomainsCreated} sub-domains, ${result.specialitiesCreated} specialities.`);
        console.error("Seeding errors:", result.errors);
      } else {
        toast.success(`Successfully created ${result.subDomainsCreated} sub-domains and ${result.specialitiesCreated} specialities!`);
      }
      // Force refresh - user should refresh the page to see new data
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Seeding failed");
    } finally {
      setIsSeeding(false);
    }
  };

  // Delete states
  const [deleteAreaOpen, setDeleteAreaOpen] = React.useState(false);
  const [deletingArea, setDeletingArea] = React.useState<ProficiencyArea | null>(null);
  const [areaHasChildren, setAreaHasChildren] = React.useState(false);

  const [deleteSubDomainOpen, setDeleteSubDomainOpen] = React.useState(false);
  const [deletingSubDomain, setDeletingSubDomain] = React.useState<SubDomain | null>(null);
  const [subDomainHasChildren, setSubDomainHasChildren] = React.useState(false);

  const [deleteSpecialityOpen, setDeleteSpecialityOpen] = React.useState(false);
  const [deletingSpeciality, setDeletingSpeciality] = React.useState<Speciality | null>(null);

  // Queries
  const { data: expertiseLevels = [] } = useExpertiseLevels(showInactive);
  const { data: industrySegments = [], isLoading: segmentsLoading } = useIndustrySegments(showInactive);
  const { data: proficiencyAreas = [], isLoading: areasLoading } = useProficiencyAreasAdmin(selectedIndustrySegmentId, selectedExpertiseLevelId, showInactive);
  const { data: subDomains = [], isLoading: subDomainsLoading } = useSubDomainsAdmin(selectedProficiencyAreaId, showInactive);
  const { data: specialities = [], isLoading: specialitiesLoading } = useSpecialitiesAdmin(selectedSubDomainId, showInactive);

  // Proficiency Area mutations
  const createAreaMutation = useCreateProficiencyArea();
  const updateAreaMutation = useUpdateProficiencyArea();
  const deleteAreaMutation = useDeleteProficiencyArea();
  const restoreAreaMutation = useRestoreProficiencyArea();
  const checkAreaChildrenMutation = useCheckProficiencyAreaChildren();

  // Sub-domain mutations
  const createSubDomainMutation = useCreateSubDomain();
  const updateSubDomainMutation = useUpdateSubDomain();
  const deleteSubDomainMutation = useDeleteSubDomain();
  const restoreSubDomainMutation = useRestoreSubDomain();
  const checkSubDomainChildrenMutation = useCheckSubDomainChildren();

  // Speciality mutations
  const createSpecialityMutation = useCreateSpeciality();
  const updateSpecialityMutation = useUpdateSpeciality();
  const deleteSpecialityMutation = useDeleteSpeciality();
  const restoreSpecialityMutation = useRestoreSpeciality();

  // Reset child selections when parent changes
  React.useEffect(() => {
    setSelectedExpertiseLevelId(undefined);
    setSelectedProficiencyAreaId(undefined);
    setSelectedSubDomainId(undefined);
  }, [selectedIndustrySegmentId]);

  React.useEffect(() => {
    setSelectedProficiencyAreaId(undefined);
    setSelectedSubDomainId(undefined);
  }, [selectedExpertiseLevelId]);

  React.useEffect(() => {
    setSelectedSubDomainId(undefined);
  }, [selectedProficiencyAreaId]);

  // Get selected items for display
  const selectedLevel = expertiseLevels.find(l => l.id === selectedExpertiseLevelId);

  // ===================== PROFICIENCY AREAS =====================
  const areaColumns: DataTableColumn<ProficiencyArea>[] = [
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "description",
      header: "Description",
      cell: (_value, row) => (
        <span className="text-muted-foreground line-clamp-2">{row.description || "-"}</span>
      ),
    },
    {
      accessorKey: "display_order",
      header: "Order",
      cell: (_value, row) => <DisplayOrderCell order={row.display_order} />,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: (_value, row) => <StatusBadge isActive={row.is_active} />,
    },
  ];

  const areaActions: DataTableAction<ProficiencyArea>[] = [
    {
      label: "View",
      onClick: (area) => {
        setViewingArea(area);
        setViewAreaOpen(true);
      },
    },
    {
      label: "View Sub-domains",
      onClick: (area) => {
        setSelectedProficiencyAreaId(area.id);
        setActiveTab("sub-domains");
      },
    },
    {
      label: "Edit",
      onClick: (area) => {
        setEditingArea(area);
        setAreaFormMode("edit");
        setAreaFormOpen(true);
      },
    },
    {
      label: "Restore",
      onClick: (area) => restoreAreaMutation.mutate(area.id),
      show: (area) => !area.is_active,
    },
    {
      label: "Deactivate",
      onClick: async (area) => {
        const hasChildren = await checkAreaChildrenMutation.mutateAsync(area.id);
        setAreaHasChildren(hasChildren);
        setDeletingArea(area);
        setDeleteAreaOpen(true);
      },
      show: (area) => area.is_active,
      variant: "destructive",
    },
  ];

  const handleAreaSubmit = async (data: z.infer<typeof proficiencyAreaSchema>) => {
    if (areaFormMode === "create" && selectedIndustrySegmentId && selectedExpertiseLevelId) {
      await createAreaMutation.mutateAsync({
        name: data.name,
        description: data.description,
        display_order: data.display_order,
        is_active: data.is_active,
        industry_segment_id: selectedIndustrySegmentId,
        expertise_level_id: selectedExpertiseLevelId,
      });
    } else if (areaFormMode === "edit" && editingArea) {
      await updateAreaMutation.mutateAsync({
        id: editingArea.id,
        name: data.name,
        description: data.description,
        display_order: data.display_order,
        is_active: data.is_active,
      });
    }
  };

  // ===================== SUB-DOMAINS =====================
  const subDomainColumns: DataTableColumn<SubDomain>[] = [
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "description",
      header: "Description",
      cell: (_value, row) => (
        <span className="text-muted-foreground line-clamp-2">{row.description || "-"}</span>
      ),
    },
    {
      accessorKey: "display_order",
      header: "Order",
      cell: (_value, row) => <DisplayOrderCell order={row.display_order} />,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: (_value, row) => <StatusBadge isActive={row.is_active} />,
    },
  ];

  const subDomainActions: DataTableAction<SubDomain>[] = [
    {
      label: "View",
      onClick: (subDomain) => {
        setViewingSubDomain(subDomain);
        setViewSubDomainOpen(true);
      },
    },
    {
      label: "View Specialities",
      onClick: (subDomain) => {
        setSelectedSubDomainId(subDomain.id);
        setActiveTab("specialities");
      },
    },
    {
      label: "Edit",
      onClick: (subDomain) => {
        setEditingSubDomain(subDomain);
        setSubDomainFormMode("edit");
        setSubDomainFormOpen(true);
      },
    },
    {
      label: "Restore",
      onClick: (subDomain) => restoreSubDomainMutation.mutate(subDomain.id),
      show: (subDomain) => !subDomain.is_active,
    },
    {
      label: "Deactivate",
      onClick: async (subDomain) => {
        const hasChildren = await checkSubDomainChildrenMutation.mutateAsync(subDomain.id);
        setSubDomainHasChildren(hasChildren);
        setDeletingSubDomain(subDomain);
        setDeleteSubDomainOpen(true);
      },
      show: (subDomain) => subDomain.is_active,
      variant: "destructive",
    },
  ];

  const handleSubDomainSubmit = async (data: z.infer<typeof subDomainSchema>) => {
    if (subDomainFormMode === "create" && selectedProficiencyAreaId) {
      await createSubDomainMutation.mutateAsync({
        name: data.name,
        description: data.description,
        display_order: data.display_order,
        is_active: data.is_active,
        proficiency_area_id: selectedProficiencyAreaId,
      });
    } else if (subDomainFormMode === "edit" && editingSubDomain) {
      await updateSubDomainMutation.mutateAsync({
        id: editingSubDomain.id,
        name: data.name,
        description: data.description,
        display_order: data.display_order,
        is_active: data.is_active,
      });
    }
  };

  // ===================== SPECIALITIES =====================
  const specialityColumns: DataTableColumn<Speciality>[] = [
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "description",
      header: "Description",
      cell: (_value, row) => (
        <span className="text-muted-foreground line-clamp-2">{row.description || "-"}</span>
      ),
    },
    {
      accessorKey: "display_order",
      header: "Order",
      cell: (_value, row) => <DisplayOrderCell order={row.display_order} />,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: (_value, row) => <StatusBadge isActive={row.is_active} />,
    },
  ];

  const specialityActions: DataTableAction<Speciality>[] = [
    {
      label: "View",
      onClick: (speciality) => {
        setViewingSpeciality(speciality);
        setViewSpecialityOpen(true);
      },
    },
    {
      label: "Edit",
      onClick: (speciality) => {
        setEditingSpeciality(speciality);
        setSpecialityFormMode("edit");
        setSpecialityFormOpen(true);
      },
    },
    {
      label: "Restore",
      onClick: (speciality) => restoreSpecialityMutation.mutate(speciality.id),
      show: (speciality) => !speciality.is_active,
    },
    {
      label: "Deactivate",
      onClick: (speciality) => {
        setDeletingSpeciality(speciality);
        setDeleteSpecialityOpen(true);
      },
      show: (speciality) => speciality.is_active,
      variant: "destructive",
    },
  ];

  const handleSpecialitySubmit = async (data: z.infer<typeof specialitySchema>) => {
    if (specialityFormMode === "create" && selectedSubDomainId) {
      await createSpecialityMutation.mutateAsync({
        name: data.name,
        description: data.description,
        display_order: data.display_order,
        is_active: data.is_active,
        sub_domain_id: selectedSubDomainId,
      });
    } else if (specialityFormMode === "edit" && editingSpeciality) {
      await updateSpecialityMutation.mutateAsync({
        id: editingSpeciality.id,
        name: data.name,
        description: data.description,
        display_order: data.display_order,
        is_active: data.is_active,
      });
    }
  };

  // ===================== HELPERS =====================
  const selectedSegment = industrySegments.find((s) => s.id === selectedIndustrySegmentId);
  const selectedArea = proficiencyAreas.find((a) => a.id === selectedProficiencyAreaId);
  const selectedSubDomain = subDomains.find((sd) => sd.id === selectedSubDomainId);

  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Master Data" },
    { label: "Proficiency Taxonomy" },
  ];

  return (
    <AdminLayout
      title="Proficiency Taxonomy"
      description="Manage the 4-level hierarchy: Industry Segments → Proficiency Areas → Sub-domains → Specialities"
      breadcrumbs={breadcrumbs}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <CardTitle>Proficiency Taxonomy</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background">
                  <DropdownMenuItem onClick={() => {
                    downloadProficiencyTemplate();
                    toast.success("Template downloaded");
                  }}>
                    Download Template
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => {
                    try {
                      await exportProficiencyData();
                      toast.success("Data exported");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Export failed");
                    }
                  }}>
                    Export Current Data
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSeedTaxonomy}
                disabled={isSeeding}
              >
                {isSeeding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                Seed Manufacturing
              </Button>
              <div className="flex items-center gap-2 ml-2">
                <Label className="text-sm text-muted-foreground">Show inactive</Label>
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="h-4 w-4"
                />
              </div>
            </div>
          </div>
          <CardDescription>
            Navigate through the hierarchy to manage proficiency areas, sub-domains, and specialities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Hierarchy Filters: Industry Segment → Level */}
          <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">1. Industry Segment:</Label>
              <Select
                value={selectedIndustrySegmentId || ""}
                onValueChange={(value) => setSelectedIndustrySegmentId(value || undefined)}
              >
                <SelectTrigger className="w-[200px] bg-background">
                  <SelectValue placeholder="Select segment..." />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {industrySegments.map((segment) => (
                    <SelectItem key={segment.id} value={segment.id}>
                      {segment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedIndustrySegmentId && (
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">2. Expertise Level:</Label>
                <Select
                  value={selectedExpertiseLevelId || ""}
                  onValueChange={(value) => {
                    setSelectedExpertiseLevelId(value || undefined);
                    if (value) setActiveTab("proficiency-areas");
                  }}
                >
                  <SelectTrigger className="w-[200px] bg-background">
                    <SelectValue placeholder="Select level..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {expertiseLevels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Breadcrumb Navigation - shows current hierarchy selection */}
          {(selectedSegment || selectedLevel || selectedArea || selectedSubDomain) && (
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {selectedSegment && (
                <Badge variant="secondary">
                  <Building2 className="h-3 w-3 mr-1" />
                  {selectedSegment.name}
                </Badge>
              )}
              {selectedLevel && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">
                    {selectedLevel.name}
                  </Badge>
                </>
              )}
              {selectedArea && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Badge
                    variant={!selectedSubDomainId ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedSubDomainId(undefined);
                      setActiveTab("sub-domains");
                    }}
                  >
                    <Boxes className="h-3 w-3 mr-1" />
                    {selectedArea.name}
                  </Badge>
                </>
              )}
              {selectedSubDomain && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="default">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {selectedSubDomain.name}
                  </Badge>
                </>
              )}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger
                value="proficiency-areas"
                disabled={!selectedIndustrySegmentId || !selectedExpertiseLevelId}
                className="flex items-center gap-1"
              >
                <Target className="h-4 w-4" />
                Proficiency Areas
              </TabsTrigger>
              <TabsTrigger
                value="sub-domains"
                disabled={!selectedProficiencyAreaId}
                className="flex items-center gap-1"
              >
                <Boxes className="h-4 w-4" />
                Sub-domains
              </TabsTrigger>
              <TabsTrigger
                value="specialities"
                disabled={!selectedSubDomainId}
                className="flex items-center gap-1"
              >
                <Sparkles className="h-4 w-4" />
                Specialities
              </TabsTrigger>
            </TabsList>

            {/* Proficiency Areas Tab */}
            <TabsContent value="proficiency-areas">
              {selectedIndustrySegmentId && selectedExpertiseLevelId ? (
                <DataTable
                  data={proficiencyAreas}
                  columns={areaColumns}
                  actions={areaActions}
                  searchPlaceholder="Search proficiency areas..."
                  searchKey="name"
                  isLoading={areasLoading}
                  onAdd={() => {
                    setEditingArea(null);
                    setAreaFormMode("create");
                    setAreaFormOpen(true);
                  }}
                  addButtonLabel="Add Proficiency Area"
                />
              ) : (
                <Alert>
                  <AlertDescription>
                    {!selectedExpertiseLevelId
                      ? "Select an expertise level first, then an industry segment to view proficiency areas."
                      : "Select an industry segment to view its proficiency areas."}
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* Sub-domains Tab */}
            <TabsContent value="sub-domains">
              {selectedProficiencyAreaId ? (
                <DataTable
                  data={subDomains}
                  columns={subDomainColumns}
                  actions={subDomainActions}
                  searchPlaceholder="Search sub-domains..."
                  searchKey="name"
                  isLoading={subDomainsLoading}
                  onAdd={() => {
                    setEditingSubDomain(null);
                    setSubDomainFormMode("create");
                    setSubDomainFormOpen(true);
                  }}
                  addButtonLabel="Add Sub-domain"
                />
              ) : (
                <Alert>
                  <AlertDescription>
                    Select a proficiency area to view its sub-domains.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* Specialities Tab */}
            <TabsContent value="specialities">
              {selectedSubDomainId ? (
                <DataTable
                  data={specialities}
                  columns={specialityColumns}
                  actions={specialityActions}
                  searchPlaceholder="Search specialities..."
                  searchKey="name"
                  isLoading={specialitiesLoading}
                  onAdd={() => {
                    setEditingSpeciality(null);
                    setSpecialityFormMode("create");
                    setSpecialityFormOpen(true);
                  }}
                  addButtonLabel="Add Speciality"
                />
              ) : (
                <Alert>
                  <AlertDescription>
                    Select a sub-domain to view its specialities.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Proficiency Area Form */}
      <MasterDataForm
        open={areaFormOpen}
        onOpenChange={setAreaFormOpen}
        title={areaFormMode === "create" ? "Add Proficiency Area" : "Edit Proficiency Area"}
        fields={proficiencyAreaFields}
        schema={proficiencyAreaSchema}
        defaultValues={
          editingArea
            ? {
                name: editingArea.name,
                description: editingArea.description,
                display_order: editingArea.display_order,
                is_active: editingArea.is_active,
              }
            : undefined
        }
        onSubmit={handleAreaSubmit}
        isLoading={createAreaMutation.isPending || updateAreaMutation.isPending}
      />

      {/* Sub-domain Form */}
      <MasterDataForm
        open={subDomainFormOpen}
        onOpenChange={setSubDomainFormOpen}
        title={subDomainFormMode === "create" ? "Add Sub-domain" : "Edit Sub-domain"}
        fields={subDomainFields}
        schema={subDomainSchema}
        defaultValues={
          editingSubDomain
            ? {
                name: editingSubDomain.name,
                description: editingSubDomain.description,
                display_order: editingSubDomain.display_order,
                is_active: editingSubDomain.is_active,
              }
            : undefined
        }
        onSubmit={handleSubDomainSubmit}
        isLoading={createSubDomainMutation.isPending || updateSubDomainMutation.isPending}
      />

      {/* Speciality Form */}
      <MasterDataForm
        open={specialityFormOpen}
        onOpenChange={setSpecialityFormOpen}
        title={specialityFormMode === "create" ? "Add Speciality" : "Edit Speciality"}
        fields={specialityFields}
        schema={specialitySchema}
        defaultValues={
          editingSpeciality
            ? {
                name: editingSpeciality.name,
                description: editingSpeciality.description,
                display_order: editingSpeciality.display_order,
                is_active: editingSpeciality.is_active,
              }
            : undefined
        }
        onSubmit={handleSpecialitySubmit}
        isLoading={createSpecialityMutation.isPending || updateSpecialityMutation.isPending}
      />

      {/* Delete Dialogs */}
      <DeleteConfirmDialog
        open={deleteAreaOpen}
        onOpenChange={setDeleteAreaOpen}
        title="Deactivate Proficiency Area"
        itemName={deletingArea?.name}
        onConfirm={async () => {
          if (deletingArea) {
            await deleteAreaMutation.mutateAsync(deletingArea.id);
          }
        }}
        isLoading={deleteAreaMutation.isPending}
        isSoftDelete
        hasChildren={areaHasChildren}
        childrenMessage="This proficiency area has active sub-domains. Please deactivate or reassign them first."
      />

      <DeleteConfirmDialog
        open={deleteSubDomainOpen}
        onOpenChange={setDeleteSubDomainOpen}
        title="Deactivate Sub-domain"
        itemName={deletingSubDomain?.name}
        onConfirm={async () => {
          if (deletingSubDomain) {
            await deleteSubDomainMutation.mutateAsync(deletingSubDomain.id);
          }
        }}
        isLoading={deleteSubDomainMutation.isPending}
        isSoftDelete
        hasChildren={subDomainHasChildren}
        childrenMessage="This sub-domain has active specialities. Please deactivate or reassign them first."
      />

      <DeleteConfirmDialog
        open={deleteSpecialityOpen}
        onOpenChange={setDeleteSpecialityOpen}
        title="Deactivate Speciality"
        itemName={deletingSpeciality?.name}
        onConfirm={async () => {
          if (deletingSpeciality) {
            await deleteSpecialityMutation.mutateAsync(deletingSpeciality.id);
          }
        }}
        isLoading={deleteSpecialityMutation.isPending}
        isSoftDelete
      />

      {/* View Dialogs */}
      <MasterDataViewDialog
        open={viewAreaOpen}
        onOpenChange={setViewAreaOpen}
        title="Proficiency Area Details"
        fields={[
          { label: "Name", value: viewingArea?.name },
          { label: "Description", value: viewingArea?.description, type: "textarea" },
          { label: "Industry Segment", value: selectedSegment?.name, type: "badge" },
          { label: "Display Order", value: viewingArea?.display_order, type: "number" },
          { label: "Status", value: viewingArea?.is_active, type: "boolean" },
          { label: "Created At", value: viewingArea?.created_at, type: "date" },
          { label: "Updated At", value: viewingArea?.updated_at, type: "date" },
        ]}
        onEdit={() => {
          setViewAreaOpen(false);
          setEditingArea(viewingArea);
          setAreaFormMode("edit");
          setAreaFormOpen(true);
        }}
      />

      <MasterDataViewDialog
        open={viewSubDomainOpen}
        onOpenChange={setViewSubDomainOpen}
        title="Sub-Domain Details"
        fields={[
          { label: "Name", value: viewingSubDomain?.name },
          { label: "Description", value: viewingSubDomain?.description, type: "textarea" },
          { label: "Proficiency Area", value: selectedArea?.name, type: "badge" },
          { label: "Display Order", value: viewingSubDomain?.display_order, type: "number" },
          { label: "Status", value: viewingSubDomain?.is_active, type: "boolean" },
          { label: "Created At", value: viewingSubDomain?.created_at, type: "date" },
          { label: "Updated At", value: viewingSubDomain?.updated_at, type: "date" },
        ]}
        onEdit={() => {
          setViewSubDomainOpen(false);
          setEditingSubDomain(viewingSubDomain);
          setSubDomainFormMode("edit");
          setSubDomainFormOpen(true);
        }}
      />

      <MasterDataViewDialog
        open={viewSpecialityOpen}
        onOpenChange={setViewSpecialityOpen}
        title="Speciality Details"
        fields={[
          { label: "Name", value: viewingSpeciality?.name },
          { label: "Description", value: viewingSpeciality?.description, type: "textarea" },
          { label: "Sub-Domain", value: selectedSubDomain?.name, type: "badge" },
          { label: "Display Order", value: viewingSpeciality?.display_order, type: "number" },
          { label: "Status", value: viewingSpeciality?.is_active, type: "boolean" },
          { label: "Created At", value: viewingSpeciality?.created_at, type: "date" },
          { label: "Updated At", value: viewingSpeciality?.updated_at, type: "date" },
        ]}
        onEdit={() => {
          setViewSpecialityOpen(false);
          setEditingSpeciality(viewingSpeciality);
          setSpecialityFormMode("edit");
          setSpecialityFormOpen(true);
        }}
      />

      {/* Import Dialog */}
      <ProficiencyImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </AdminLayout>
  );
}
