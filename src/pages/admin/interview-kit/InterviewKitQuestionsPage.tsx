/**
 * Interview KIT Questions Page
 * Main question bank page with filters, table, and actions
 * 
 * This page persists dialog state to sessionStorage to survive component
 * remounts caused by auth token refresh or guard state changes (Alt+Tab fix).
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileUp,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { MasterDataViewDialog } from "@/components/admin/MasterDataViewDialog";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";
import {
  useInterviewKitCompetencies,
  useInterviewKitQuestions,
  useDeleteInterviewKitQuestion,
  useRestoreInterviewKitQuestion,
  useHardDeleteInterviewKitQuestion,
  InterviewKitQuestionWithRelations,
} from "@/hooks/queries/useInterviewKitQuestions";
import { COMPETENCY_CONFIG, type CompetencyCode } from "@/constants";
import { InterviewKitQuestionForm } from "./InterviewKitQuestionForm";
import { InterviewKitImportDialog } from "./InterviewKitImportDialog";
import { downloadInterviewKitTemplate, exportInterviewKitQuestions } from "./InterviewKitExcelExport";
import {
  getDialogSession,
  saveDialogSession,
  clearDialogSession,
  clearAllDialogData,
} from "@/hooks/useDialogPersistence";
import { logInfo } from "@/lib/errorHandler";

const PAGE_SIZES = [10, 25, 50, 100];

export function InterviewKitQuestionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state from URL params
  const industryFilter = searchParams.get("industry") || "";
  const levelFilter = searchParams.get("level") || "";
  const competencyFilter = searchParams.get("competency") || "";
  const includeInactive = searchParams.get("inactive") === "true";

  // UI state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [formOpen, setFormOpen] = useState(false);
  const [formSessionId, setFormSessionId] = useState(0); // Stable key for form component
  const [importOpen, setImportOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<InterviewKitQuestionWithRelations | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<InterviewKitQuestionWithRelations | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<InterviewKitQuestionWithRelations | null>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");

  // Data hooks
  const { data: industrySegments = [] } = useIndustrySegments();
  const { data: expertiseLevels = [] } = useExpertiseLevels();
  const { data: competencies = [], isLoading: loadingCompetencies } = useInterviewKitCompetencies();
  
  // Questions data hook
  const { data: allQuestions = [], isLoading: loadingQuestions } = useInterviewKitQuestions({
    includeInactive,
  });

  // Get competency ID from filter (now using ID directly)
  const competencyId = useMemo(() => {
    if (!competencyFilter || competencyFilter === "all") return undefined;
    // Check if it's a valid ID in the list
    const byId = competencies.find((c) => c.id === competencyFilter);
    return byId?.id;
  }, [competencyFilter, competencies]);

  // Filtered questions (filter client-side for better restore behavior)
  const questions = useMemo(() => {
    return allQuestions.filter((q) => {
      if (industryFilter && q.industry_segment_id !== industryFilter) return false;
      if (levelFilter && q.expertise_level_id !== levelFilter) return false;
      if (competencyId && q.competency_id !== competencyId) return false;
      return true;
    });
  }, [allQuestions, industryFilter, levelFilter, competencyId]);

  // Mutations
  const deleteMutation = useDeleteInterviewKitQuestion();
  const restoreMutation = useRestoreInterviewKitQuestion();
  const hardDeleteMutation = useHardDeleteInterviewKitQuestion();

  // Pagination
  const totalPages = Math.ceil(questions.length / pageSize);
  const paginatedQuestions = questions.slice(page * pageSize, (page + 1) * pageSize);

  // ============================================
  // Dialog session persistence (Alt+Tab fix)
  // ============================================
  
  // Restore dialog state on mount if there's a saved session
  useEffect(() => {
    const savedSession = getDialogSession();
    if (savedSession && savedSession.isOpen) {
      logInfo("Restoring dialog session on mount", {
        operation: "restore_dialog_session",
        component: "InterviewKitQuestionsPage",
      });
      
      // Restore editing question if in edit mode
      if (savedSession.mode === "edit" && savedSession.editingQuestionId) {
        // Find the question in our data
        const questionToEdit = allQuestions.find(q => q.id === savedSession.editingQuestionId);
        if (questionToEdit) {
          setEditingQuestion(questionToEdit);
        }
      } else {
        setEditingQuestion(null);
      }
      
      setFormOpen(true);
      setFormSessionId((id) => id + 1);
    }
    
    // Log mount for debugging
    logInfo("InterviewKitQuestionsPage mounted", {
      operation: "page_mount",
      component: "InterviewKitQuestionsPage",
    });
    
    return () => {
      logInfo("InterviewKitQuestionsPage unmounting", {
        operation: "page_unmount",
        component: "InterviewKitQuestionsPage",
      });
    };
  }, []); // Only on initial mount
  
  // Re-check for editing question when questions data loads
  useEffect(() => {
    const savedSession = getDialogSession();
    if (
      savedSession?.isOpen &&
      savedSession.mode === "edit" &&
      savedSession.editingQuestionId &&
      !editingQuestion &&
      allQuestions.length > 0
    ) {
      const questionToEdit = allQuestions.find(q => q.id === savedSession.editingQuestionId);
      if (questionToEdit) {
        setEditingQuestion(questionToEdit);
      }
    }
  }, [allQuestions, editingQuestion]);

  // Filter handlers
  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
    setPage(0);
  };

  // Open dialog for adding new question
  const handleOpenAddDialog = useCallback(() => {
    setEditingQuestion(null);
    setFormSessionId((id) => id + 1);
    setFormOpen(true);
    
    // Save dialog session
    saveDialogSession({
      isOpen: true,
      mode: "new",
      editingQuestionId: null,
      defaultCompetencyId: competencyId || null,
    });
  }, [competencyId]);

  // Open dialog for editing
  const handleEdit = useCallback((question: InterviewKitQuestionWithRelations) => {
    setEditingQuestion(question);
    setFormSessionId((id) => id + 1);
    setFormOpen(true);
    
    // Save dialog session
    saveDialogSession({
      isOpen: true,
      mode: "edit",
      editingQuestionId: question.id,
      defaultCompetencyId: null,
    });
  }, []);

  // Handle dialog close (called by child form)
  const handleFormOpenChange = useCallback((open: boolean) => {
    if (!open) {
      // Dialog is closing - clear session
      clearDialogSession();
      setEditingQuestion(null);
    }
    setFormOpen(open);
  }, []);

  const handleView = (question: InterviewKitQuestionWithRelations) => {
    setViewingQuestion(question);
  };

  const handleToggleActive = async (question: InterviewKitQuestionWithRelations) => {
    if (question.is_active) {
      await deleteMutation.mutateAsync(question.id);
    } else {
      await restoreMutation.mutateAsync(question.id);
    }
  };

  const handleDelete = (question: InterviewKitQuestionWithRelations, mode: "soft" | "hard") => {
    setDeletingQuestion(question);
    setDeleteMode(mode);
  };

  const confirmDelete = async () => {
    if (!deletingQuestion) return;
    if (deleteMode === "hard") {
      await hardDeleteMutation.mutateAsync(deletingQuestion.id);
    } else {
      await deleteMutation.mutateAsync(deletingQuestion.id);
    }
    setDeletingQuestion(null);
  };

  const handleExport = () => {
    exportInterviewKitQuestions(questions, competencies);
  };

  const getCompetencyConfig = (code: string | undefined) => {
    if (!code) return null;
    return COMPETENCY_CONFIG[code as CompetencyCode] || null;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link to="/admin/interview/kit" className="hover:text-foreground">
                Interview KIT
              </Link>
              <span>/</span>
              <span>Questions</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>
              <Badge variant="secondary" className="text-sm">
                {questions.length} questions
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadInterviewKitTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <FileUp className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={questions.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm" onClick={handleOpenAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Industry:</Label>
            <Select value={industryFilter || "all"} onValueChange={(v) => updateFilter("industry", v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="All industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All industries</SelectItem>
                {industrySegments.map((seg) => (
                  <SelectItem key={seg.id} value={seg.id}>
                    {seg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Level:</Label>
            <Select value={levelFilter || "all"} onValueChange={(v) => updateFilter("level", v === "all" ? "" : v)}>
              <SelectTrigger className="w-[150px] bg-background">
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {expertiseLevels.map((lvl) => (
                  <SelectItem key={lvl.id} value={lvl.id}>
                    {lvl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Competency:</Label>
            <Select value={competencyFilter || "all"} onValueChange={(v) => updateFilter("competency", v === "all" ? "" : v)}>
              <SelectTrigger className="w-[250px] bg-background">
                <SelectValue placeholder="All competencies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All competencies</SelectItem>
                {competencies.map((comp) => (
                  <SelectItem key={comp.id} value={comp.id}>
                    {comp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Switch
              id="show-inactive"
              checked={includeInactive}
              onCheckedChange={(v) => updateFilter("inactive", v ? "true" : "")}
            />
            <Label htmlFor="show-inactive" className="text-sm">
              Show inactive
            </Label>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Question</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Competency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingQuestions || loadingCompetencies ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No questions found. {!industryFilter && !levelFilter && !competencyFilter && "Add your first question to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedQuestions.map((question) => {
                  const compConfig = getCompetencyConfig(question.interview_kit_competencies?.code);
                  return (
                    <TableRow key={question.id} className={!question.is_active ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="font-medium">
                          {truncateText(question.question_text, 80)}
                        </div>
                        {question.expected_answer && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {truncateText(question.expected_answer, 60)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {question.industry_segments?.name || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {question.expertise_levels?.name || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {compConfig ? (
                          <Badge className={`${compConfig.bgColor} ${compConfig.color} border ${compConfig.borderColor}`}>
                            {question.interview_kit_competencies?.name || "—"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            {question.interview_kit_competencies?.name || "—"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge isActive={question.is_active} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(question)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(question)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleActive(question)}>
                              {question.is_active ? (
                                <>
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Power className="mr-2 h-4 w-4" />
                                  Restore
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(question, "hard")}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {questions.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(v) => {
                  setPageSize(parseInt(v));
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[70px] h-8 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>
                of {questions.length} results
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page + 1} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Question Form Dialog - stable key prevents remounts on parent re-renders */}
      <InterviewKitQuestionForm
        key={`form-${formSessionId}-${editingQuestion?.id || 'new'}`}
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        question={editingQuestion}
        defaultCompetencyId={competencyId}
      />

      {/* Import Dialog */}
      <InterviewKitImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      {/* View Dialog */}
      {viewingQuestion && (
        <MasterDataViewDialog
          open={!!viewingQuestion}
          onOpenChange={() => setViewingQuestion(null)}
          title="Question Details"
          fields={[
            { label: "Question", value: viewingQuestion.question_text, type: "textarea" },
            { label: "Expected Answer", value: viewingQuestion.expected_answer || "—", type: "textarea" },
            { label: "Industry Segment", value: viewingQuestion.industry_segments?.name || "—" },
            { label: "Expertise Level", value: viewingQuestion.expertise_levels?.name || "—" },
            { label: "Competency", value: viewingQuestion.interview_kit_competencies?.name || "—" },
            { label: "Display Order", value: viewingQuestion.display_order, type: "number" },
            { label: "Status", value: viewingQuestion.is_active, type: "boolean" },
            { label: "Created At", value: viewingQuestion.created_at, type: "date" },
            { label: "Updated At", value: viewingQuestion.updated_at, type: "date" },
          ]}
        />
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deletingQuestion}
        onOpenChange={() => setDeletingQuestion(null)}
        onConfirm={confirmDelete}
        title={deleteMode === "hard" ? "Delete Question Permanently" : "Deactivate Question"}
        description={
          deleteMode === "hard"
            ? "This action cannot be undone. The question will be permanently deleted."
            : "The question will be deactivated and hidden from active lists. You can restore it later."
        }
        isLoading={hardDeleteMutation.isPending || deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
