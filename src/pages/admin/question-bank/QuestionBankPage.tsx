import * as React from "react";
import { HelpCircle, ChevronRight, Building2, Target, Boxes, Sparkles, Filter, Upload, Download, Copy, Trash2, SlidersHorizontal, X, RotateCcw, BarChart3, CheckCircle, XCircle, ChevronDown, ChevronUp, Printer, FileDown, Eye, Loader2, AlertCircle, ExternalLink, FileSpreadsheet } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import html2pdf from "html2pdf.js";
import * as XLSX from "xlsx";

import { AdminLayout } from "@/components/admin";
import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";
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
  useHardDeleteQuestion,
  parseQuestionOptions,
  formatQuestionOptions,
  Question,
  QuestionOption,
} from "@/hooks/queries/useQuestionBank";
import {
  useQuestionCapabilityTags,
  useUpdateQuestionCapabilityTags,
} from "@/hooks/queries/useCapabilityTags";

import { QuestionForm } from "./QuestionForm";
import { QuestionImportDialog } from "./QuestionImportDialog";
import { QuestionDuplicateDialog } from "./QuestionDuplicateDialog";
import { QuestionPreviewDialog } from "./QuestionPreviewDialog";
import { QuestionBulkPreviewDialog } from "./QuestionBulkPreviewDialog";

// ===================== MAIN COMPONENT =====================

export function QuestionBankPage() {
  const [showInactive, setShowInactive] = React.useState(true);

  // Hierarchy filters
  const [selectedIndustrySegmentId, setSelectedIndustrySegmentId] = React.useState<string>("");
  const [selectedExpertiseLevelId, setSelectedExpertiseLevelId] = React.useState<string>("");
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

  // Hard delete state
  const [hardDeleteOpen, setHardDeleteOpen] = React.useState(false);
  const [hardDeletingQuestion, setHardDeletingQuestion] = React.useState<Question | null>(null);

  // Bulk delete state
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);

  // Bulk restore state
  const [bulkRestoreOpen, setBulkRestoreOpen] = React.useState(false);

  // Bulk hard delete state
  const [bulkHardDeleteOpen, setBulkHardDeleteOpen] = React.useState(false);

  // Import state
  const [importOpen, setImportOpen] = React.useState(false);

  // Duplicate state
  const [duplicateOpen, setDuplicateOpen] = React.useState(false);
  const [duplicatingQuestions, setDuplicatingQuestions] = React.useState<Question[]>([]);

  // Preview state
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewingQuestion, setPreviewingQuestion] = React.useState<Question | null>(null);

  // Bulk preview state
  const [bulkPreviewOpen, setBulkPreviewOpen] = React.useState(false);

  // Selection state
  const [selectedQuestions, setSelectedQuestions] = React.useState<Question[]>([]);

  // Question filters
  const [difficultyFilter, setDifficultyFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Stats dashboard collapsed state (persisted in localStorage)
  const [statsOpen, setStatsOpen] = React.useState(() => {
    const stored = localStorage.getItem("questionBank.statsOpen");
    return stored !== null ? stored === "true" : true;
  });

  // Persist stats open state
  React.useEffect(() => {
    localStorage.setItem("questionBank.statsOpen", String(statsOpen));
  }, [statsOpen]);

  // Queries for hierarchy - admin should see all items including inactive
  const { data: industrySegments = [], isLoading: industryLoading, isError: industryError } = useIndustrySegments(true);
  const { data: expertiseLevels = [], isLoading: levelsLoading } = useExpertiseLevels(true);
  const { 
    data: proficiencyAreas = [], 
    isLoading: areasLoading, 
    isError: areasError,
    error: areasErrorObj 
  } = useProficiencyAreasAdmin(
    selectedIndustrySegmentId || undefined,
    selectedExpertiseLevelId || undefined,
    true
  );
  const { 
    data: subDomains = [], 
    isLoading: subDomainsLoading, 
    isError: subDomainsError,
    error: subDomainsErrorObj 
  } = useSubDomainsAdmin(
    selectedProficiencyAreaId || undefined,
    true
  );
  const { 
    data: specialities = [], 
    isLoading: specialitiesLoading, 
    isError: specialitiesError,
    error: specialitiesErrorObj 
  } = useSpecialitiesAdmin(
    selectedSubDomainId || undefined,
    true
  );

  // Check for any taxonomy errors
  const hasTaxonomyError = industryError || areasError || subDomainsError || specialitiesError;
  const taxonomyErrorMessage = areasErrorObj?.message || subDomainsErrorObj?.message || specialitiesErrorObj?.message || "Failed to load taxonomy data";

  // Questions query
  const { data: questions = [], isLoading: questionsLoading } = useQuestions(
    selectedSpecialityId || undefined,
    showInactive
  );

  // Filtered questions
  const filteredQuestions = React.useMemo(() => {
    return questions.filter((q) => {
      // Difficulty filter
      if (difficultyFilter !== "all") {
        if (difficultyFilter === "none") {
          if (q.difficulty !== null) return false;
        } else {
          if (q.difficulty !== difficultyFilter) return false;
        }
      }
      
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "active" && !q.is_active) return false;
        if (statusFilter === "inactive" && q.is_active) return false;
      }
      
      return true;
    });
  }, [questions, difficultyFilter, statusFilter]);

  // Mutations
  const createMutation = useCreateQuestion();
  const updateMutation = useUpdateQuestion();
  const deleteMutation = useDeleteQuestion();
  const restoreMutation = useRestoreQuestion();
  const hardDeleteMutation = useHardDeleteQuestion();

  // Reset child selections when parent changes
  React.useEffect(() => {
    setSelectedExpertiseLevelId("");
    setSelectedProficiencyAreaId("");
    setSelectedSubDomainId("");
    setSelectedSpecialityId("");
  }, [selectedIndustrySegmentId]);

  React.useEffect(() => {
    setSelectedProficiencyAreaId("");
    setSelectedSubDomainId("");
    setSelectedSpecialityId("");
  }, [selectedExpertiseLevelId]);

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
      accessorKey: "difficulty",
      header: "Difficulty",
      cell: (_value, row) => {
        const difficulty = row.difficulty;
        if (!difficulty) return <span className="text-muted-foreground">—</span>;
        const config: Record<string, { label: string; className: string }> = {
          introductory: { label: "Introductory", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
          applied: { label: "Applied", className: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200" },
          advanced: { label: "Advanced", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
          strategic: { label: "Strategic", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
        };
        const info = config[difficulty];
        return (
          <Badge className={info?.className} variant="secondary">
            {info?.label || difficulty}
          </Badge>
        );
      },
    },
    {
      accessorKey: "question_type",
      header: "Type",
      cell: (_value, row) => {
        const questionType = row.question_type;
        const config: Record<string, { label: string; className: string }> = {
          conceptual: { label: "Conceptual", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
          scenario: { label: "Scenario", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
          experience: { label: "Experience", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
          decision: { label: "Decision", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
          proof: { label: "Proof", className: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200" },
        };
        const info = config[questionType];
        return (
          <Badge className={info?.className} variant="secondary">
            {info?.label || questionType}
          </Badge>
        );
      },
    },
    {
      accessorKey: "usage_mode",
      header: "Usage",
      cell: (_value, row) => {
        const usageMode = row.usage_mode;
        const config: Record<string, { label: string; className: string }> = {
          self_assessment: { label: "Self-Assess", className: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
          interview: { label: "Interview", className: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200" },
          both: { label: "Both", className: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200" },
        };
        const info = config[usageMode];
        return (
          <Badge className={info?.className} variant="secondary">
            {info?.label || usageMode}
          </Badge>
        );
      },
    },
    {
      accessorKey: "question_capability_tags",
      header: "Capability Tags",
      cell: (_value, row) => {
        const tags = row.question_capability_tags || [];
        if (tags.length === 0) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const displayTags = tags.slice(0, 2);
        const remaining = tags.length - 2;
        return (
          <div className="flex flex-wrap gap-1 max-w-[150px]">
            {displayTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {tag.capability_tags?.name || "Unknown"}
              </Badge>
            ))}
            {remaining > 0 && (
              <Badge variant="outline" className="text-xs">
                +{remaining}
              </Badge>
            )}
          </div>
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
      label: "Preview",
      onClick: (question) => {
        setPreviewingQuestion(question);
        setPreviewOpen(true);
      },
      icon: <Eye className="h-4 w-4" />,
    },
    {
      label: "Edit",
      onClick: (question) => {
        setEditingQuestion(question);
        setFormMode("edit");
        setFormOpen(true);
      },
    },
    {
      label: "Duplicate",
      onClick: (question) => {
        setDuplicatingQuestions([question]);
        setDuplicateOpen(true);
      },
      icon: <Copy className="h-4 w-4" />,
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
    {
      label: "Permanently Delete",
      onClick: (question) => {
        setHardDeletingQuestion(question);
        setHardDeleteOpen(true);
      },
      show: (question) => !question.is_active,
      icon: <Trash2 className="h-4 w-4" />,
      variant: "destructive",
    },
  ];

  // ===================== HANDLERS =====================
  // Capability tags hooks
  const { data: editingQuestionTags } = useQuestionCapabilityTags(editingQuestion?.id);
  const updateCapabilityTagsMutation = useUpdateQuestionCapabilityTags();

  const handleSubmit = async (data: {
    question_text: string;
    options: { text: string }[];
    correct_option: number;
    difficulty?: "introductory" | "applied" | "advanced" | "strategic" | null;
    question_type?: "conceptual" | "scenario" | "experience" | "decision" | "proof";
    usage_mode?: "self_assessment" | "interview" | "both";
    expected_answer_guidance?: string | null;
    is_active: boolean;
    capability_tag_ids?: string[];
  }) => {
    const formattedOptions = formatQuestionOptions(
      data.options.map((opt, idx) => ({ index: idx + 1, text: opt.text }))
    );

    // Cast to Json type for Supabase
    const optionsJson = formattedOptions as unknown as { index: number; text: string }[];

    let questionId: string | undefined;

    if (formMode === "create" && selectedSpecialityId) {
      const result = await createMutation.mutateAsync({
        question_text: data.question_text,
        options: optionsJson,
        correct_option: data.correct_option,
        difficulty: data.difficulty,
        question_type: data.question_type || "conceptual",
        usage_mode: data.usage_mode || "both",
        expected_answer_guidance: data.expected_answer_guidance,
        is_active: data.is_active,
        speciality_id: selectedSpecialityId,
      });
      questionId = result?.id;
    } else if (formMode === "edit" && editingQuestion) {
      await updateMutation.mutateAsync({
        id: editingQuestion.id,
        question_text: data.question_text,
        options: optionsJson,
        correct_option: data.correct_option,
        difficulty: data.difficulty,
        question_type: data.question_type,
        usage_mode: data.usage_mode,
        expected_answer_guidance: data.expected_answer_guidance,
        is_active: data.is_active,
      });
      questionId = editingQuestion.id;
    }

    // Update capability tags if we have a question ID
    if (questionId && data.capability_tag_ids) {
      await updateCapabilityTagsMutation.mutateAsync({
        questionId,
        tagIds: data.capability_tag_ids,
      });
    }
  };

  const getDefaultValues = () => {
    if (!editingQuestion) return undefined;

    const options = parseQuestionOptions(editingQuestion.options);
    const existingTagIds = editingQuestionTags?.map(t => t.capability_tag_id) || [];
    
    return {
      question_text: editingQuestion.question_text,
      options: options.map((opt) => ({ text: opt.text })),
      correct_option: editingQuestion.correct_option,
      difficulty: editingQuestion.difficulty,
      question_type: editingQuestion.question_type,
      usage_mode: editingQuestion.usage_mode,
      expected_answer_guidance: editingQuestion.expected_answer_guidance,
      is_active: editingQuestion.is_active,
      capability_tag_ids: existingTagIds,
    };
  };

  // ===================== HELPERS =====================
  const selectedSegment = industrySegments.find((s) => s.id === selectedIndustrySegmentId);
  const selectedLevel = expertiseLevels.find((l) => l.id === selectedExpertiseLevelId);
  const selectedArea = proficiencyAreas.find((a) => a.id === selectedProficiencyAreaId);
  const selectedSubDomain = subDomains.find((sd) => sd.id === selectedSubDomainId);
  const selectedSpeciality = specialities.find((sp) => sp.id === selectedSpecialityId);

  // ===================== EXPORT EXCEL =====================
  const handleExportExcel = () => {
    if (questions.length === 0) return;

    const headers = ["question_text", "option_1", "option_2", "option_3", "option_4", "option_5", "option_6", "correct_option", "difficulty_level", "is_active"];
    
    const dataRows = questions.map((q) => {
      const options = parseQuestionOptions(q.options);
      return [
        q.question_text,
        options[0]?.text || "",
        options[1]?.text || "",
        options[2]?.text || "",
        options[3]?.text || "",
        options[4]?.text || "",
        options[5]?.text || "",
        q.correct_option,
        q.difficulty ?? "",
        q.is_active ? "Active" : "Inactive",
      ];
    });

    // Create worksheet with headers and data
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws["!cols"] = [
      { wch: 50 }, // question_text
      { wch: 25 }, // option_1
      { wch: 25 }, // option_2
      { wch: 25 }, // option_3
      { wch: 25 }, // option_4
      { wch: 20 }, // option_5
      { wch: 20 }, // option_6
      { wch: 15 }, // correct_option
      { wch: 15 }, // difficulty_level
      { wch: 10 }, // is_active
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");

    const safeName = (selectedSpeciality?.name || "questions").replace(/[^a-z0-9]/gi, "_");
    XLSX.writeFile(wb, `questions_${safeName}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // ===================== DOWNLOAD TEMPLATE =====================
  const handleDownloadTemplate = () => {
    const templateData = [
      ["question_text", "option_1", "option_2", "option_3", "option_4", "option_5", "option_6", "correct_option", "difficulty_level"],
      ["What is the capital of France?", "Berlin", "Madrid", "Paris", "Rome", "", "", 3, 2],
      ["Which planet is known as the Red Planet?", "Venus", "Mars", "Jupiter", "Saturn", "", "", 2, 1],
      ["What is 15 + 27?", "32", "42", "52", "62", "", "", 2, 1],
      ["Which of the following is a primary color?", "Green", "Orange", "Purple", "Blue", "", "", 4, 3],
    ];

    const instructionsData = [
      ["Question Bank Import Template - Instructions"],
      [""],
      ["COLUMN DESCRIPTIONS:"],
      ["Column", "Description", "Required", "Valid Values"],
      ["question_text", "The full question text", "Yes", "10-2000 characters"],
      ["option_1 to option_6", "Answer options for the question", "Min 2 required", "Any text (leave unused options empty)"],
      ["correct_option", "Which option number is the correct answer", "Yes", "1, 2, 3, 4, 5, or 6"],
      ["difficulty_level", "Question difficulty rating", "No", "1=Very Easy, 2=Easy, 3=Medium, 4=Hard, 5=Very Hard"],
      [""],
      ["IMPORTANT NOTES:"],
      ["1. You must provide at least 2 options and maximum 6 options"],
      ["2. Leave unused option columns empty (do not delete them)"],
      ["3. The correct_option number must match an option that exists"],
      ["4. If difficulty_level is not specified, it will be left blank"],
      ["5. Enter your questions in the 'Questions' sheet, starting from row 2"],
      ["6. Do not modify the header row in the Questions sheet"],
      [""],
      ["DIFFICULTY LEVEL GUIDE:"],
      ["Level", "Description"],
      ["1", "Very Easy - Basic recall, simple facts"],
      ["2", "Easy - Straightforward concepts"],
      ["3", "Medium - Requires understanding and application"],
      ["4", "Hard - Complex analysis or synthesis"],
      ["5", "Very Hard - Expert-level critical thinking"],
    ];

    const wb = XLSX.utils.book_new();

    // Questions sheet
    const questionsWs = XLSX.utils.aoa_to_sheet(templateData);
    questionsWs["!cols"] = [
      { wch: 50 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, questionsWs, "Questions");

    // Instructions sheet
    const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsWs["!cols"] = [{ wch: 30 }, { wch: 50 }, { wch: 15 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, instructionsWs, "Instructions");

    XLSX.writeFile(wb, "question_bank_import_template.xlsx");
  };

  // ===================== EXPORT PDF =====================
  const pdfContentRef = React.useRef<HTMLDivElement>(null);
  
  const handleExportPDF = async () => {
    if (filteredQuestions.length === 0) return;
    
    const safeName = (selectedSpeciality?.name || "questions").replace(/[^a-z0-9]/gi, "_");
    const filename = `question_bank_${safeName}_${new Date().toISOString().split("T")[0]}.pdf`;
    
    // Create a temporary container for PDF generation
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.width = "210mm"; // A4 width
    container.style.padding = "20px";
    container.style.background = "white";
    container.style.fontFamily = "Arial, sans-serif";
    
    const diffLabels = ["", "Very Easy", "Easy", "Medium", "Hard", "Very Hard"];
    
    container.innerHTML = `
      <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #000;">
        <h1 style="font-size: 24px; font-weight: bold; margin: 0;">Question Bank Report</h1>
        <p style="font-size: 14px; color: #666; margin-top: 4px;">
          ${selectedSegment?.name || ""} → ${selectedArea?.name || ""} → ${selectedSubDomain?.name || ""} → ${selectedSpeciality?.name || ""}
        </p>
        <p style="font-size: 12px; color: #888; margin-top: 4px;">Generated on ${new Date().toLocaleString()}</p>
      </div>
      
      <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #ddd; border-radius: 4px;">
        <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">Statistics Summary</h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; font-size: 14px;">
          <div><strong>Total:</strong> ${questions.length}</div>
          <div><strong style="color: #15803d;">Active:</strong> ${questions.filter(q => q.is_active).length}</div>
          <div><strong style="color: #b91c1c;">Inactive:</strong> ${questions.filter(q => !q.is_active).length}</div>
          <div><strong>Filtered:</strong> ${filteredQuestions.length}</div>
        </div>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd;">
          <strong style="font-size: 14px;">By Difficulty:</strong>
          <div style="display: flex; gap: 16px; margin-top: 4px; font-size: 12px;">
            <span>Introductory: ${questions.filter(q => q.difficulty === 'introductory').length}</span>
            <span>Applied: ${questions.filter(q => q.difficulty === 'applied').length}</span>
            <span>Advanced: ${questions.filter(q => q.difficulty === 'advanced').length}</span>
            <span>Strategic: ${questions.filter(q => q.difficulty === 'strategic').length}</span>
          </div>
        </div>
      </div>
      
      <div>
        <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">Questions (${filteredQuestions.length})</h2>
        <ol style="margin: 0; padding: 0; list-style: none;">
          ${filteredQuestions.map((q, idx) => {
            const options = parseQuestionOptions(q.options);
            return `
              <li style="padding: 12px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px; font-size: 13px; page-break-inside: avoid;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <strong>${idx + 1}. ${q.question_text}</strong>
                  <div style="font-size: 11px; margin-left: 16px; white-space: nowrap;">
                    <span style="color: ${q.is_active ? '#15803d' : '#b91c1c'};">${q.is_active ? 'Active' : 'Inactive'}</span>
                    ${q.difficulty ? `<span style="color: #666; margin-left: 8px;">${q.difficulty}</span>` : ''}
                  </div>
                </div>
                <div style="margin-left: 16px;">
                  ${options.map((opt) => `
                    <div style="${opt.index === q.correct_option ? 'font-weight: bold; color: #166534;' : ''}">
                      ${String.fromCharCode(64 + opt.index)}. ${opt.text}${opt.index === q.correct_option ? ' ✓' : ''}
                    </div>
                  `).join('')}
                </div>
              </li>
            `;
          }).join('')}
        </ol>
      </div>
    `;
    
    document.body.appendChild(container);
    
    try {
      const opt = {
        margin: [15, 10, 20, 10], // top, left, bottom, right in mm
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };
      
      await html2pdf().set(opt).from(container).save();
    } finally {
      document.body.removeChild(container);
    }
  };

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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Industry Segment */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Industry Segment
                </Label>
                <Select
                  value={selectedIndustrySegmentId}
                  onValueChange={setSelectedIndustrySegmentId}
                  disabled={industryLoading}
                >
                  <SelectTrigger>
                    {industryLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      <SelectValue placeholder="Select segment..." />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {industrySegments.map((segment) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name}
                        {!segment.is_active && (
                          <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Expertise Level */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  Expertise Level
                </Label>
                <Select
                  value={selectedExpertiseLevelId}
                  onValueChange={setSelectedExpertiseLevelId}
                  disabled={!selectedIndustrySegmentId || levelsLoading}
                >
                  <SelectTrigger>
                    {levelsLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      <SelectValue placeholder={!selectedIndustrySegmentId ? "Select segment first..." : "Select level..."} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {expertiseLevels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name}
                        {!level.is_active && (
                          <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>
                        )}
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
                  disabled={!selectedExpertiseLevelId || areasLoading}
                >
                  <SelectTrigger>
                    {areasLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      <SelectValue placeholder={!selectedExpertiseLevelId ? "Select level first..." : "Select area..."} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {proficiencyAreas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                        {!area.is_active && (
                          <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>
                        )}
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
                  disabled={!selectedProficiencyAreaId || subDomainsLoading}
                >
                  <SelectTrigger>
                    {subDomainsLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      <SelectValue placeholder={!selectedProficiencyAreaId ? "Select area first..." : "Select sub-domain..."} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {subDomains.length === 0 && selectedProficiencyAreaId && !subDomainsLoading ? (
                      <div className="py-2 px-3 text-sm text-muted-foreground text-center">
                        No sub-domains available
                      </div>
                    ) : (
                      subDomains.map((sd) => (
                        <SelectItem key={sd.id} value={sd.id}>
                          {sd.name}
                          {!sd.is_active && (
                            <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {/* Empty state message */}
                {selectedProficiencyAreaId && !subDomainsLoading && subDomains.length === 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    No sub-domains found for this area.
                    <a href="/admin/proficiency-taxonomy" className="underline inline-flex items-center gap-0.5 hover:text-amber-700">
                      Add in Taxonomy <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                )}
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
                  disabled={!selectedSubDomainId || specialitiesLoading}
                >
                  <SelectTrigger>
                    {specialitiesLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      <SelectValue placeholder={!selectedSubDomainId ? "Select sub-domain first..." : "Select speciality..."} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {specialities.length === 0 && selectedSubDomainId && !specialitiesLoading ? (
                      <div className="py-2 px-3 text-sm text-muted-foreground text-center">
                        No specialities available
                      </div>
                    ) : (
                      specialities.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>
                          {sp.name}
                          {!sp.is_active && (
                            <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {/* Empty state message */}
                {selectedSubDomainId && !specialitiesLoading && specialities.length === 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    No specialities found for this sub-domain.
                    <a href="/admin/proficiency-taxonomy" className="underline inline-flex items-center gap-0.5 hover:text-amber-700">
                      Add in Taxonomy <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                )}
              </div>
            </div>

            {/* Taxonomy Error Alert */}
            {hasTaxonomyError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Failed to load taxonomy:</strong> {taxonomyErrorMessage}. 
                  Please check RLS policies or contact support.
                </AlertDescription>
              </Alert>
            )}

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
            <>
              {/* Statistics Dashboard */}
              <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2 flex-wrap">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Statistics Dashboard</span>
                    <Badge variant="secondary" className="text-xs">
                      {questions.length} questions
                    </Badge>
                    {/* Quick stats when collapsed */}
                    {!statsOpen && questions.length > 0 && (
                      <>
                        {/* Status summary */}
                        <div className="flex items-center gap-2 ml-2 pl-2 border-l">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                              {questions.filter(q => q.is_active).length}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-600" />
                            <span className="text-xs text-red-700 dark:text-red-400 font-medium">
                              {questions.filter(q => !q.is_active).length}
                            </span>
                          </div>
                        </div>
                        {/* Difficulty distribution */}
                        <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-2 border-l">
                          {[
                            { level: "introductory", color: "bg-green-500", label: "I" },
                            { level: "applied", color: "bg-lime-500", label: "A" },
                            { level: "advanced", color: "bg-yellow-500", label: "D" },
                            { level: "strategic", color: "bg-red-500", label: "S" },
                          ].map(({ level, color, label }) => {
                            const count = questions.filter(q => q.difficulty === level).length;
                            if (count === 0) return null;
                            return (
                              <div
                                key={level}
                                className="flex items-center gap-0.5"
                                title={`${label === "I" ? "Introductory" : label === "A" ? "Applied" : label === "D" ? "Advanced" : "Strategic"}: ${count}`}
                              >
                                <div className={`w-2 h-2 rounded-full ${color}`} />
                                <span className="text-xs font-medium">{count}</span>
                              </div>
                            );
                          })}
                          {(() => {
                            const notSet = questions.filter(q => q.difficulty === null).length;
                            if (notSet === 0) return null;
                            return (
                              <div className="flex items-center gap-0.5" title={`Not Set: ${notSet}`}>
                                <div className="w-2 h-2 rounded-full bg-slate-400" />
                                <span className="text-xs font-medium text-muted-foreground">{notSet}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {statsOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="sr-only">Toggle statistics</span>
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <div className="pt-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Left: Summary Stats */}
                <div className="space-y-3">
                  {/* Total */}
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">Total</span>
                      </div>
                      <p className="text-3xl font-bold text-primary">{questions.length}</p>
                    </div>
                  </div>

                  {/* Status Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                        statusFilter === "active" 
                          ? "bg-green-100 dark:bg-green-900/50 border-green-500" 
                          : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50"
                      }`}
                      onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")}
                    >
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-400">Active</span>
                      </div>
                      <p className="text-xl font-bold text-green-700 dark:text-green-400 mt-1">
                        {questions.filter(q => q.is_active).length}
                      </p>
                    </div>

                    <div 
                      className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                        statusFilter === "inactive" 
                          ? "bg-red-100 dark:bg-red-900/50 border-red-500" 
                          : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/50"
                      }`}
                      onClick={() => setStatusFilter(statusFilter === "inactive" ? "all" : "inactive")}
                    >
                      <div className="flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-red-600" />
                        <span className="text-xs font-medium text-red-700 dark:text-red-400">Inactive</span>
                      </div>
                      <p className="text-xl font-bold text-red-700 dark:text-red-400 mt-1">
                        {questions.filter(q => !q.is_active).length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Pie Chart */}
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Status Distribution</h4>
                  {questions.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Active", value: questions.filter(q => q.is_active).length, color: "#22c55e" },
                            { name: "Inactive", value: questions.filter(q => !q.is_active).length, color: "#ef4444" },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={60}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {[
                            { name: "Active", value: questions.filter(q => q.is_active).length, color: "#22c55e" },
                            { name: "Inactive", value: questions.filter(q => !q.is_active).length, color: "#ef4444" },
                          ].filter(d => d.value > 0).map((entry, index) => (
                            <Cell key={`status-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${value} questions`, ""]}
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--background))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px"
                          }}
                        />
                        <Legend 
                          layout="horizontal" 
                          align="center" 
                          verticalAlign="bottom"
                          iconSize={8}
                          wrapperStyle={{ fontSize: "11px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
                      No data
                    </div>
                  )}
                </div>

                {/* Difficulty Pie Chart */}
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Difficulty Distribution</h4>
                  {questions.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Introductory", value: questions.filter(q => q.difficulty === "introductory").length, color: "#22c55e" },
                            { name: "Applied", value: questions.filter(q => q.difficulty === "applied").length, color: "#84cc16" },
                            { name: "Advanced", value: questions.filter(q => q.difficulty === "advanced").length, color: "#eab308" },
                            { name: "Strategic", value: questions.filter(q => q.difficulty === "strategic").length, color: "#ef4444" },
                            { name: "Not Set", value: questions.filter(q => q.difficulty === null).length, color: "#94a3b8" },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {[
                            { name: "Introductory", value: questions.filter(q => q.difficulty === "introductory").length, color: "#22c55e" },
                            { name: "Applied", value: questions.filter(q => q.difficulty === "applied").length, color: "#84cc16" },
                            { name: "Advanced", value: questions.filter(q => q.difficulty === "advanced").length, color: "#eab308" },
                            { name: "Strategic", value: questions.filter(q => q.difficulty === "strategic").length, color: "#ef4444" },
                            { name: "Not Set", value: questions.filter(q => q.difficulty === null).length, color: "#94a3b8" },
                          ].filter(d => d.value > 0).map((entry, index) => (
                            <Cell key={`diff-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${value} questions`, ""]}
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--background))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
                      No data
                    </div>
                  )}
                </div>

                {/* Right: Difficulty Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">By Difficulty</h4>
                  {[
                    { level: "introductory", label: "Introductory", color: "bg-green-500" },
                    { level: "applied", label: "Applied", color: "bg-lime-500" },
                    { level: "advanced", label: "Advanced", color: "bg-yellow-500" },
                    { level: "strategic", label: "Strategic", color: "bg-red-500" },
                    { level: null, label: "Not Set", color: "bg-slate-400" },
                  ].map(({ level, label, color }) => {
                    const count = questions.filter(q => q.difficulty === level).length;
                    const percentage = questions.length > 0 ? (count / questions.length) * 100 : 0;
                    const filterValue = level === null ? "none" : String(level);
                    const isSelected = difficultyFilter === filterValue;
                    
                    return (
                      <div
                        key={label}
                        className={`p-2 rounded-lg cursor-pointer transition-colors border ${
                          isSelected 
                            ? "bg-primary/10 border-primary" 
                            : "bg-muted/20 border-transparent hover:bg-muted/40"
                        }`}
                        onClick={() => setDifficultyFilter(isSelected ? "all" : filterValue)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${color}`} />
                            <span className="text-xs font-medium">{label}</span>
                          </div>
                          <span className="text-xs font-bold">{count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${color} transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              {/* Question Filters Bar */}
              <div className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Filters:</span>
                  </div>
                  
                  {/* Difficulty Filter */}
                  <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="1">Very Easy</SelectItem>
                      <SelectItem value="2">Easy</SelectItem>
                      <SelectItem value="3">Medium</SelectItem>
                      <SelectItem value="4">Hard</SelectItem>
                      <SelectItem value="5">Very Hard</SelectItem>
                      <SelectItem value="none">Not Set</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Clear Filters */}
                  {(difficultyFilter !== "all" || statusFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDifficultyFilter("all");
                        setStatusFilter("all");
                      }}
                      className="h-8 px-2"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Filter Summary */}
                <div className="text-sm text-muted-foreground">
                  {filteredQuestions.length} of {questions.length} questions
                </div>
              </div>

              {/* Bulk Actions Bar */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {selectedQuestions.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setBulkPreviewOpen(true)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview {selectedQuestions.length} Selected
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setDuplicatingQuestions(selectedQuestions);
                          setDuplicateOpen(true);
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate {selectedQuestions.length} Selected
                      </Button>
                      {/* Show restore if any selected are inactive */}
                      {selectedQuestions.some(q => !q.is_active) && (
                        <Button
                          variant="outline"
                          onClick={() => setBulkRestoreOpen(true)}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restore {selectedQuestions.filter(q => !q.is_active).length} Inactive
                        </Button>
                      )}
                      {/* Show deactivate if any selected are active */}
                      {selectedQuestions.some(q => q.is_active) && (
                        <Button
                          variant="destructive"
                          onClick={() => setBulkDeleteOpen(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deactivate {selectedQuestions.filter(q => q.is_active).length} Active
                        </Button>
                      )}
                      {/* Show permanently delete if any selected are inactive */}
                      {selectedQuestions.some(q => !q.is_active) && (
                        <Button
                          variant="destructive"
                          onClick={() => setBulkHardDeleteOpen(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Permanently Delete {selectedQuestions.filter(q => !q.is_active).length} Inactive
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.print()}
                    disabled={questions.length === 0}
                    className="print:hidden"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportPDF}
                    disabled={filteredQuestions.length === 0}
                    className="print:hidden"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportExcel}
                    disabled={questions.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setImportOpen(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Excel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadTemplate}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>

              {/* Print-friendly content (hidden on screen, shown when printing) */}
              <div className="hidden print:block print-content" data-print-date={new Date().toLocaleDateString()}>
                {/* Print Header - First Page Only */}
                <div className="mb-6 pb-4 border-b-2 border-black">
                  <h1 className="text-2xl font-bold">Question Bank Report</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedSegment?.name} → {selectedArea?.name} → {selectedSubDomain?.name} → {selectedSpeciality?.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Generated on {new Date().toLocaleString()}</p>
                </div>

                {/* Print Statistics */}
                <div className="mb-6 p-4 border rounded break-inside-avoid">
                  <h2 className="text-lg font-semibold mb-3">Statistics Summary</h2>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total:</span> {questions.length}
                    </div>
                    <div>
                      <span className="font-medium text-green-700">Active:</span> {questions.filter(q => q.is_active).length}
                    </div>
                    <div>
                      <span className="font-medium text-red-700">Inactive:</span> {questions.filter(q => !q.is_active).length}
                    </div>
                    <div>
                      <span className="font-medium">Filtered:</span> {filteredQuestions.length}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <span className="font-medium text-sm">By Difficulty:</span>
                    <div className="flex gap-4 mt-1 text-xs">
                      <span>Introductory: {questions.filter(q => q.difficulty === "introductory").length}</span>
                      <span>Applied: {questions.filter(q => q.difficulty === "applied").length}</span>
                      <span>Advanced: {questions.filter(q => q.difficulty === "advanced").length}</span>
                      <span>Strategic: {questions.filter(q => q.difficulty === "strategic").length}</span>
                      <span>Not Set: {questions.filter(q => q.difficulty === null).length}</span>
                    </div>
                  </div>
                </div>

                {/* Running header for subsequent pages (CSS will handle visibility) */}
                <div className="hidden print-header-repeat">
                  Question Bank Report — {selectedSpeciality?.name || "All Specialities"}
                </div>

                {/* Print Questions List */}
                <div>
                  <h2 className="text-lg font-semibold mb-3">Questions ({filteredQuestions.length})</h2>
                  <ol className="space-y-4">
                    {filteredQuestions.map((q, idx) => {
                      const options = parseQuestionOptions(q.options);
                      const diffLabels: Record<string, string> = { introductory: "Introductory", applied: "Applied", advanced: "Advanced", strategic: "Strategic" };
                      return (
                        <li key={q.id} className="p-3 border rounded text-sm break-inside-avoid">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold">{idx + 1}. {q.question_text}</span>
                            <div className="flex gap-2 text-xs ml-4 shrink-0">
                              <span className={q.is_active ? "text-green-700" : "text-red-700"}>
                                {q.is_active ? "Active" : "Inactive"}
                              </span>
                              {q.difficulty && (
                                <span className="text-gray-600">{diffLabels[q.difficulty] || q.difficulty}</span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 space-y-1">
                            {options.map((opt) => (
                              <div 
                                key={opt.index} 
                                className={`${opt.index === q.correct_option ? "font-semibold text-green-800" : ""}`}
                              >
                                {String.fromCharCode(64 + opt.index)}. {opt.text}
                                {opt.index === q.correct_option && " ✓"}
                              </div>
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {/* Print Footer */}
                <div className="hidden print-page-number mt-8">
                  Question Bank Report — {selectedSpeciality?.name || "All Specialities"} — Generated {new Date().toLocaleDateString()}
                </div>
              </div>
              <DataTable
                data={filteredQuestions}
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
                enableRowSelection
                onSelectedRowsChange={setSelectedQuestions}
              />
            </>
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

      {/* Hard Delete Dialog */}
      <DeleteConfirmDialog
        open={hardDeleteOpen}
        onOpenChange={setHardDeleteOpen}
        title="Permanently Delete Question"
        itemName="this question"
        onConfirm={async () => {
          if (hardDeletingQuestion) {
            await hardDeleteMutation.mutateAsync(hardDeletingQuestion.id);
          }
        }}
        isLoading={hardDeleteMutation.isPending}
        isSoftDelete={false}
      />

      {/* Bulk Delete Dialog */}
      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Deactivate ${selectedQuestions.filter(q => q.is_active).length} Questions`}
        itemName={`${selectedQuestions.filter(q => q.is_active).length} active questions`}
        onConfirm={async () => {
          const activeQuestions = selectedQuestions.filter(q => q.is_active);
          for (const question of activeQuestions) {
            await deleteMutation.mutateAsync(question.id);
          }
          setSelectedQuestions([]);
        }}
        isLoading={deleteMutation.isPending}
        isSoftDelete
      />

      {/* Bulk Restore Dialog */}
      <DeleteConfirmDialog
        open={bulkRestoreOpen}
        onOpenChange={setBulkRestoreOpen}
        title={`Restore ${selectedQuestions.filter(q => !q.is_active).length} Questions`}
        itemName={`${selectedQuestions.filter(q => !q.is_active).length} inactive questions`}
        onConfirm={async () => {
          const inactiveQuestions = selectedQuestions.filter(q => !q.is_active);
          for (const question of inactiveQuestions) {
            await restoreMutation.mutateAsync(question.id);
          }
          setSelectedQuestions([]);
        }}
        isLoading={restoreMutation.isPending}
      />

      {/* Bulk Hard Delete Dialog */}
      <DeleteConfirmDialog
        open={bulkHardDeleteOpen}
        onOpenChange={setBulkHardDeleteOpen}
        title={`Permanently Delete ${selectedQuestions.filter(q => !q.is_active).length} Questions`}
        itemName={`${selectedQuestions.filter(q => !q.is_active).length} inactive questions`}
        onConfirm={async () => {
          const inactiveQuestions = selectedQuestions.filter(q => !q.is_active);
          for (const question of inactiveQuestions) {
            await hardDeleteMutation.mutateAsync(question.id);
          }
          setSelectedQuestions([]);
        }}
        isLoading={hardDeleteMutation.isPending}
        isSoftDelete={false}
      />

      {/* Import Dialog */}
      <QuestionImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        specialityId={selectedSpecialityId}
        specialityName={selectedSpeciality?.name || ""}
      />

      {/* Duplicate Dialog */}
      <QuestionDuplicateDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        questions={duplicatingQuestions}
        currentSpecialityId={selectedSpecialityId}
        onComplete={() => setSelectedQuestions([])}
      />

      {/* Preview Dialog */}
      <QuestionPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        question={previewingQuestion}
        specialityName={selectedSpeciality?.name}
        onEdit={(question) => {
          setEditingQuestion(question);
          setFormMode("edit");
          setFormOpen(true);
        }}
        onDuplicate={(question) => {
          setDuplicatingQuestions([question]);
          setDuplicateOpen(true);
        }}
      />

      {/* Bulk Preview Dialog */}
      <QuestionBulkPreviewDialog
        open={bulkPreviewOpen}
        onOpenChange={setBulkPreviewOpen}
        questions={selectedQuestions}
        specialityName={selectedSpeciality?.name}
      />
    </AdminLayout>
  );
}
