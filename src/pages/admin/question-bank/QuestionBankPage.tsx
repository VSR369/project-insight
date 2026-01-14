import * as React from "react";
import { HelpCircle, ChevronRight, Building2, Target, Boxes, Sparkles, Filter } from "lucide-react";

import { AdminLayout } from "@/components/admin";
import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import {
  useProficiencyAreasAdmin,
  useSubDomainsAdmin,
  useSpecialitiesAdmin,
} from "@/hooks/queries/useProficiencyTaxonomyAdmin";
import {
  useQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useRestoreQuestion,
  parseQuestionOptions,
  formatQuestionOptions,
  Question,
  QuestionOption,
} from "@/hooks/queries/useQuestionBank";

import { QuestionForm } from "./QuestionForm";

// ===================== MAIN COMPONENT =====================

export function QuestionBankPage() {
  const [showInactive, setShowInactive] = React.useState(true);

  // Hierarchy filters
  const [selectedIndustrySegmentId, setSelectedIndustrySegmentId] = React.useState<string>("");
  const [selectedProficiencyAreaId, setSelectedProficiencyAreaId] = React.useState<string>("");
  const [selectedSubDomainId, setSelectedSubDomainId] = React.useState<string>("");
  const [selectedSpecialityId, setSelectedSpecialityId] = React.useState<string>("");

  // Form states
  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editingQuestion, setEditingQuestion] = React.useState<Question | null>(null);

  // Delete state
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingQuestion, setDeletingQuestion] = React.useState<Question | null>(null);

  // Queries for hierarchy
  const { data: industrySegments = [] } = useIndustrySegments(false);
  const { data: proficiencyAreas = [] } = useProficiencyAreasAdmin(
    selectedIndustrySegmentId || undefined,
    false
  );
  const { data: subDomains = [] } = useSubDomainsAdmin(
    selectedProficiencyAreaId || undefined,
    false
  );
  const { data: specialities = [] } = useSpecialitiesAdmin(
    selectedSubDomainId || undefined,
    false
  );

  // Questions query
  const { data: questions = [], isLoading: questionsLoading } = useQuestions(
    selectedSpecialityId || undefined,
    showInactive
  );

  // Mutations
  const createMutation = useCreateQuestion();
  const updateMutation = useUpdateQuestion();
  const deleteMutation = useDeleteQuestion();
  const restoreMutation = useRestoreQuestion();

  // Reset child selections when parent changes
  React.useEffect(() => {
    setSelectedProficiencyAreaId("");
    setSelectedSubDomainId("");
    setSelectedSpecialityId("");
  }, [selectedIndustrySegmentId]);

  React.useEffect(() => {
    setSelectedSubDomainId("");
    setSelectedSpecialityId("");
  }, [selectedProficiencyAreaId]);

  React.useEffect(() => {
    setSelectedSpecialityId("");
  }, [selectedSubDomainId]);

  // ===================== TABLE CONFIG =====================
  const columns: DataTableColumn<Question>[] = [
    {
      accessorKey: "question_text",
      header: "Question",
      cell: (_value, row) => (
        <div className="max-w-md">
          <p className="line-clamp-2">{row.question_text}</p>
        </div>
      ),
    },
    {
      accessorKey: "options",
      header: "Options",
      cell: (_value, row) => {
        const options = parseQuestionOptions(row.options);
        return (
          <div className="flex items-center gap-1">
            <Badge variant="secondary">{options.length} options</Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "correct_option",
      header: "Answer",
      cell: (_value, row) => (
        <Badge variant="outline">Option {row.correct_option}</Badge>
      ),
    },
    {
      accessorKey: "difficulty_level",
      header: "Difficulty",
      cell: (_value, row) => {
        const level = row.difficulty_level;
        if (!level) return <span className="text-muted-foreground">—</span>;
        const labels = ["Very Easy", "Easy", "Medium", "Hard", "Very Hard"];
        const colors = [
          "bg-green-100 text-green-800",
          "bg-lime-100 text-lime-800",
          "bg-yellow-100 text-yellow-800",
          "bg-orange-100 text-orange-800",
          "bg-red-100 text-red-800",
        ];
        return (
          <Badge className={colors[level - 1]} variant="secondary">
            {labels[level - 1]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: (_value, row) => <StatusBadge isActive={row.is_active} />,
    },
  ];

  const actions: DataTableAction<Question>[] = [
    {
      label: "Edit",
      onClick: (question) => {
        setEditingQuestion(question);
        setFormMode("edit");
        setFormOpen(true);
      },
    },
    {
      label: "Restore",
      onClick: (question) => restoreMutation.mutate(question.id),
      show: (question) => !question.is_active,
    },
    {
      label: "Deactivate",
      onClick: (question) => {
        setDeletingQuestion(question);
        setDeleteOpen(true);
      },
      show: (question) => question.is_active,
      variant: "destructive",
    },
  ];

  // ===================== HANDLERS =====================
  const handleSubmit = async (data: {
    question_text: string;
    options: { text: string }[];
    correct_option: number;
    difficulty_level?: number | null;
    is_active: boolean;
  }) => {
    const formattedOptions = formatQuestionOptions(
      data.options.map((opt, idx) => ({ index: idx + 1, text: opt.text }))
    );

    // Cast to Json type for Supabase
    const optionsJson = formattedOptions as unknown as { index: number; text: string }[];

    if (formMode === "create" && selectedSpecialityId) {
      await createMutation.mutateAsync({
        question_text: data.question_text,
        options: optionsJson,
        correct_option: data.correct_option,
        difficulty_level: data.difficulty_level,
        is_active: data.is_active,
        speciality_id: selectedSpecialityId,
      });
    } else if (formMode === "edit" && editingQuestion) {
      await updateMutation.mutateAsync({
        id: editingQuestion.id,
        question_text: data.question_text,
        options: optionsJson,
        correct_option: data.correct_option,
        difficulty_level: data.difficulty_level,
        is_active: data.is_active,
      });
    }
  };

  const getDefaultValues = () => {
    if (!editingQuestion) return undefined;

    const options = parseQuestionOptions(editingQuestion.options);
    return {
      question_text: editingQuestion.question_text,
      options: options.map((opt) => ({ text: opt.text })),
      correct_option: editingQuestion.correct_option,
      difficulty_level: editingQuestion.difficulty_level,
      is_active: editingQuestion.is_active,
    };
  };

  // ===================== HELPERS =====================
  const selectedSegment = industrySegments.find((s) => s.id === selectedIndustrySegmentId);
  const selectedArea = proficiencyAreas.find((a) => a.id === selectedProficiencyAreaId);
  const selectedSubDomain = subDomains.find((sd) => sd.id === selectedSubDomainId);
  const selectedSpeciality = specialities.find((sp) => sp.id === selectedSpecialityId);

  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Question Bank" },
  ];

  return (
    <AdminLayout
      title="Question Bank"
      description="Manage assessment questions organized by speciality"
      breadcrumbs={breadcrumbs}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <CardTitle>Question Bank</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <Label className="text-sm text-muted-foreground">Show inactive</Label>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4"
              />
            </div>
          </div>
          <CardDescription>
            Select a speciality to view and manage its assessment questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hierarchy Filters */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4" />
              Filter by Speciality
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Industry Segment */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Industry Segment
                </Label>
                <Select
                  value={selectedIndustrySegmentId}
                  onValueChange={setSelectedIndustrySegmentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select segment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {industrySegments.map((segment) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Proficiency Area */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Proficiency Area
                </Label>
                <Select
                  value={selectedProficiencyAreaId}
                  onValueChange={setSelectedProficiencyAreaId}
                  disabled={!selectedIndustrySegmentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area..." />
                  </SelectTrigger>
                  <SelectContent>
                    {proficiencyAreas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sub-domain */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Boxes className="h-3 w-3" />
                  Sub-domain
                </Label>
                <Select
                  value={selectedSubDomainId}
                  onValueChange={setSelectedSubDomainId}
                  disabled={!selectedProficiencyAreaId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-domain..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subDomains.map((sd) => (
                      <SelectItem key={sd.id} value={sd.id}>
                        {sd.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Speciality */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Speciality
                </Label>
                <Select
                  value={selectedSpecialityId}
                  onValueChange={setSelectedSpecialityId}
                  disabled={!selectedSubDomainId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select speciality..." />
                  </SelectTrigger>
                  <SelectContent>
                    {specialities.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        {sp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Breadcrumb Trail */}
            {selectedSpecialityId && (
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
                <span className="text-xs text-muted-foreground">Selected:</span>
                {selectedSegment && (
                  <Badge variant="outline" className="text-xs">
                    {selectedSegment.name}
                  </Badge>
                )}
                {selectedArea && (
                  <>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">
                      {selectedArea.name}
                    </Badge>
                  </>
                )}
                {selectedSubDomain && (
                  <>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">
                      {selectedSubDomain.name}
                    </Badge>
                  </>
                )}
                {selectedSpeciality && (
                  <>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="default" className="text-xs">
                      {selectedSpeciality.name}
                    </Badge>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Questions Table */}
          {selectedSpecialityId ? (
            <DataTable
              data={questions}
              columns={columns}
              actions={actions}
              searchPlaceholder="Search questions..."
              searchKey="question_text"
              isLoading={questionsLoading}
              onAdd={() => {
                setEditingQuestion(null);
                setFormMode("create");
                setFormOpen(true);
              }}
              addButtonLabel="Add Question"
            />
          ) : (
            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertDescription>
                Select an industry segment, proficiency area, sub-domain, and speciality to view and manage questions.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Question Form */}
      <QuestionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        title={formMode === "create" ? "Add Question" : "Edit Question"}
        defaultValues={getDefaultValues()}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Deactivate Question"
        itemName="this question"
        onConfirm={async () => {
          if (deletingQuestion) {
            await deleteMutation.mutateAsync(deletingQuestion.id);
          }
        }}
        isLoading={deleteMutation.isPending}
        isSoftDelete
      />
    </AdminLayout>
  );
}
