import * as React from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Download, Loader2, RefreshCw, Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  useCreateQuestion, 
  useDeactivateQuestionsBySpecialities,
  getExistingQuestionCount,
  formatQuestionOptions, 
  DIFFICULTY_OPTIONS, 
  QUESTION_TYPE_OPTIONS, 
  USAGE_MODE_OPTIONS 
} from "@/hooks/queries/useQuestionBank";
import { useCapabilityTags, useUpdateQuestionCapabilityTags } from "@/hooks/queries/useCapabilityTags";
import { useHierarchyData, resolveHierarchy, HierarchyData } from "@/hooks/queries/useHierarchyResolver";

interface ParsedQuestion {
  rowNumber: number;
  industry_segment: string;
  expertise_level: string;
  proficiency_area: string;
  sub_domain: string;
  speciality: string;
  speciality_id: string | null;
  question_text: string;
  options: string[];
  correct_option: number;
  difficulty: string | null;
  question_type: string;
  usage_mode: string;
  capability_tags: string[];
  expected_answer_guidance: string | null;
  isValid: boolean;
  errors: string[];
}

interface QuestionImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RawQuestionData {
  industry_segment: string;
  expertise_level: string;
  proficiency_area: string;
  sub_domain: string;
  speciality: string;
  question_text: string;
  options: string[];
  correct_option: number;
  difficulty: string | null;
  question_type: string;
  usage_mode: string;
  capability_tags: string[];
  expected_answer_guidance: string | null;
}

const VALID_DIFFICULTIES: readonly string[] = DIFFICULTY_OPTIONS.map(d => d.value);
const VALID_QUESTION_TYPES: readonly string[] = QUESTION_TYPE_OPTIONS.map(t => t.value);
const VALID_USAGE_MODES: readonly string[] = USAGE_MODE_OPTIONS.map(m => m.value);

const EXCEL_TEMPLATE_DATA = [
  [
    "industry_segment", "expertise_level", "proficiency_area", "sub_domain", "speciality",
    "question_text", "option_1", "option_2", "option_3", "option_4", "option_5", "option_6", 
    "correct_option", "difficulty", "question_type", "usage_mode", "capability_tags", "expected_answer_guidance"
  ],
  [
    "Manufacturing (Auto Components)", "Senior Consultant – Domain Specialist & Workstream Lead", 
    "Digital & Technology Blueprint", "Governance Basics", "Data ownership & stewardship setup",
    "What is the primary purpose of data stewardship?",
    "Data backup", "Data governance", "Data deletion", "Data encryption", "", "",
    2, "applied", "conceptual", "both", "Data Management",
    "Data stewardship focuses on governance and quality, not just backup."
  ],
  [
    "Manufacturing (Auto Components)", "Senior Consultant – Domain Specialist & Workstream Lead", 
    "Digital & Technology Blueprint", "Governance Basics", "Data ownership & stewardship setup",
    "Which stakeholder typically owns business data?",
    "IT Department", "Business Unit Head", "External Vendor", "Database Admin", "", "",
    2, "introductory", "conceptual", "self_assessment", "",
    "Business data ownership should reside with the business unit that creates and uses the data."
  ],
];

const INSTRUCTIONS_SHEET_DATA = [
  ["Question Bank Import Template - Instructions"],
  [""],
  ["COLUMN DESCRIPTIONS:"],
  ["Column", "Description", "Required", "Valid Values"],
  ["industry_segment", "The industry segment name", "Yes", "Must match an existing industry segment exactly"],
  ["expertise_level", "The expertise level name", "Yes", "Must match an existing expertise level exactly"],
  ["proficiency_area", "The proficiency area name", "Yes", "Must match an area under the specified industry + level"],
  ["sub_domain", "The sub-domain name", "Yes", "Must match a sub-domain under the specified proficiency area"],
  ["speciality", "The speciality name", "Yes", "Must match a speciality under the specified sub-domain"],
  ["question_text", "The full question text", "Yes", "10-2000 characters"],
  ["option_1 to option_6", "Answer options for the question", "Min 2 required", "Any text (leave unused options empty)"],
  ["correct_option", "Which option number is the correct answer", "Yes", "1, 2, 3, 4, 5, or 6"],
  ["difficulty", "Question difficulty level", "No", "introductory, applied, advanced, strategic"],
  ["question_type", "Type of question", "No", "conceptual, scenario, experience, decision, proof (default: conceptual)"],
  ["usage_mode", "Where this question can be used", "No", "self_assessment, interview, both (default: both)"],
  ["capability_tags", "Comma-separated list of capability tag names", "No", "e.g., Problem Solving, Critical Thinking"],
  ["expected_answer_guidance", "Detailed explanation for reviewers/interviewers", "No", "Text up to 2000 characters"],
  [""],
  ["IMPORTANT NOTES:"],
  ["1. All hierarchy fields (industry_segment through speciality) must match existing data exactly (case-insensitive)"],
  ["2. Questions will be automatically linked to the specified speciality"],
  ["3. You can import questions for multiple specialities in the same file"],
  ["4. You must provide at least 2 options and maximum 6 options"],
  ["5. Leave unused option columns empty (do not delete them)"],
  ["6. The correct_option number must match an option that exists"],
  ["7. Enter your questions in the 'Questions' sheet, starting from row 2"],
  ["8. Do not modify the header row in the Questions sheet"],
  [""],
  ["DIFFICULTY LEVEL GUIDE:"],
  ["Level", "Description"],
  ["introductory", "Basic recall, simple facts"],
  ["applied", "Straightforward concepts and application"],
  ["advanced", "Analysis and synthesis required"],
  ["strategic", "Expert-level critical thinking"],
  [""],
  ["QUESTION TYPE GUIDE:"],
  ["Type", "Description", "Typical Use"],
  ["conceptual", "Basic understanding", "Self-assessment (20%)"],
  ["scenario", "Applied situations", "Both modes (30%)"],
  ["experience", "Past experience validation", "Interview (25%)"],
  ["decision", "Trade-off/judgment", "Interview (15%)"],
  ["proof", "Evidence-based", "Senior interview (10%)"],
  [""],
  ["USAGE MODE GUIDE:"],
  ["Mode", "Description"],
  ["self_assessment", "Provider self-reflection only"],
  ["interview", "Reviewer interview only"],
  ["both", "Can be used in either mode"],
];

// Validation logic for Excel import
const validateQuestion = (
  data: RawQuestionData, 
  validTagNames: string[],
  hierarchyData: HierarchyData | undefined
): { errors: string[]; specialityId: string | null } => {
  const errors: string[] = [];
  let specialityId: string | null = null;

  // Validate hierarchy fields
  if (!data.industry_segment) {
    errors.push("Industry segment is required");
  }
  if (!data.expertise_level) {
    errors.push("Expertise level is required");
  }
  if (!data.proficiency_area) {
    errors.push("Proficiency area is required");
  }
  if (!data.sub_domain) {
    errors.push("Sub-domain is required");
  }
  if (!data.speciality) {
    errors.push("Speciality is required");
  }

  // Resolve hierarchy if all fields present and hierarchy data loaded
  if (
    hierarchyData &&
    data.industry_segment &&
    data.expertise_level &&
    data.proficiency_area &&
    data.sub_domain &&
    data.speciality
  ) {
    const resolution = resolveHierarchy(
      hierarchyData,
      data.industry_segment,
      data.expertise_level,
      data.proficiency_area,
      data.sub_domain,
      data.speciality
    );
    if (resolution.errors.length > 0) {
      errors.push(...resolution.errors);
    } else {
      specialityId = resolution.specialityId;
    }
  }

  // Validate question text
  if (!data.question_text) {
    errors.push("Question text is required");
  } else if (data.question_text.length < 10) {
    errors.push("Question must be at least 10 characters");
  } else if (data.question_text.length > 2000) {
    errors.push("Question must be 2000 characters or less");
  }

  // Validate options
  if (data.options.length < 2) {
    errors.push("At least 2 options are required");
  } else if (data.options.length > 6) {
    errors.push("Maximum 6 options allowed");
  }

  // Validate correct option
  if (!data.correct_option || data.correct_option < 1) {
    errors.push("Valid correct option (1-based) is required");
  } else if (data.correct_option > data.options.length) {
    errors.push(`Correct option ${data.correct_option} exceeds number of options (${data.options.length})`);
  }

  // Validate enums
  if (data.difficulty && !VALID_DIFFICULTIES.includes(data.difficulty)) {
    errors.push(`Invalid difficulty: ${data.difficulty}. Valid: ${VALID_DIFFICULTIES.join(", ")}`);
  }

  if (data.question_type && !VALID_QUESTION_TYPES.includes(data.question_type)) {
    errors.push(`Invalid question_type: ${data.question_type}. Valid: ${VALID_QUESTION_TYPES.join(", ")}`);
  }

  if (data.usage_mode && !VALID_USAGE_MODES.includes(data.usage_mode)) {
    errors.push(`Invalid usage_mode: ${data.usage_mode}. Valid: ${VALID_USAGE_MODES.join(", ")}`);
  }

  // Validate capability tags
  if (data.capability_tags.length > 0) {
    const lowerValidTags = validTagNames.map(t => t.toLowerCase());
    const invalidTags = data.capability_tags.filter(tag => !lowerValidTags.includes(tag.toLowerCase()));
    if (invalidTags.length > 0) {
      errors.push(`Unknown capability tags: ${invalidTags.join(", ")}`);
    }
  }

  // Validate expected_answer_guidance length
  if (data.expected_answer_guidance && data.expected_answer_guidance.length > 2000) {
    errors.push("Expected answer guidance must be 2000 characters or less");
  }

  return { errors, specialityId };
};

// Check if file has valid extension (Excel only)
const isValidFileExtension = (filename: string): boolean => {
  const ext = filename.toLowerCase();
  return ext.endsWith(".xlsx") || ext.endsWith(".xls");
};

export type ImportMode = "add" | "replace";

export function QuestionImportDialog({
  open,
  onOpenChange,
}: QuestionImportDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = React.useState<ParsedQuestion[]>([]);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importResults, setImportResults] = React.useState<{
    success: number;
    failed: number;
    deactivated: number;
    errors: string[];
  } | null>(null);

  // Import mode: "add" = add new questions, "replace" = deactivate existing and add new
  const [importMode, setImportMode] = React.useState<ImportMode>("replace");
  const [existingQuestionCount, setExistingQuestionCount] = React.useState<number>(0);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  const createMutation = useCreateQuestion();
  const deactivateMutation = useDeactivateQuestionsBySpecialities();
  const updateCapabilityTagsMutation = useUpdateQuestionCapabilityTags();
  const { data: capabilityTags = [] } = useCapabilityTags();
  const { data: hierarchyData, isLoading: hierarchyLoading } = useHierarchyData();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setFile(null);
      setParsedQuestions([]);
      setParseError(null);
      setIsImporting(false);
      setImportProgress(0);
      setImportResults(null);
      setImportMode("replace");
      setExistingQuestionCount(0);
      setShowConfirmDialog(false);
    }
  }, [open]);

  // Fetch existing question count when parsed questions change
  React.useEffect(() => {
    const fetchExistingCount = async () => {
      const validQuestions = parsedQuestions.filter(q => q.isValid && q.speciality_id);
      const uniqueSpecialityIds = [...new Set(validQuestions.map(q => q.speciality_id).filter((id): id is string => !!id))];
      
      if (uniqueSpecialityIds.length > 0) {
        try {
          const count = await getExistingQuestionCount(uniqueSpecialityIds);
          setExistingQuestionCount(count);
        } catch (error) {
          console.error("Failed to fetch existing question count:", error);
          setExistingQuestionCount(0);
        }
      } else {
        setExistingQuestionCount(0);
      }
    };

    fetchExistingCount();
  }, [parsedQuestions]);

  const parseExcel = async (file: File): Promise<ParsedQuestion[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // Use the first sheet (or "Questions" sheet if available)
    const sheetName = workbook.SheetNames.find(name => name.toLowerCase() === "questions") || workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error("Excel file has no sheets");
    }

    const worksheet = workbook.Sheets[sheetName];

    // Convert to array of arrays (with header)
    const data: (string | number | null | undefined)[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
    });

    if (data.length < 2) {
      throw new Error("Excel file must have a header row and at least one data row");
    }

    // Get valid tag names for validation
    const validTagNames = capabilityTags.map(t => t.name);

    // Skip header row, parse data rows
    const dataRows = data.slice(1);
    const questions: ParsedQuestion[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // Account for header

      // Skip completely empty rows
      if (row.every(cell => !cell || String(cell).trim() === "")) {
        continue;
      }

      // Extract hierarchy values (columns 0-4)
      const industry_segment = String(row[0] || "").trim();
      const expertise_level = String(row[1] || "").trim();
      const proficiency_area = String(row[2] || "").trim();
      const sub_domain = String(row[3] || "").trim();
      const speciality = String(row[4] || "").trim();

      // Extract question values (columns 5+)
      const question_text = String(row[5] || "").trim();
      const options = [
        String(row[6] || "").trim(),
        String(row[7] || "").trim(),
        String(row[8] || "").trim(),
        String(row[9] || "").trim(),
        String(row[10] || "").trim(),
        String(row[11] || "").trim(),
      ].filter(Boolean);
      const correct_option = parseInt(String(row[12] || "0"), 10);
      const difficulty = row[13] ? String(row[13]).trim().toLowerCase() : null;
      const question_type = row[14] ? String(row[14]).trim().toLowerCase() : "conceptual";
      const usage_mode = row[15] ? String(row[15]).trim().toLowerCase() : "both";
      
      // Parse capability tags (comma-separated)
      const capabilityTagsRaw = row[16] ? String(row[16]).trim() : "";
      const capability_tags = capabilityTagsRaw
        ? capabilityTagsRaw.split(",").map(t => t.trim()).filter(Boolean)
        : [];

      // Parse expected_answer_guidance (column 17)
      const expected_answer_guidance = row[17] ? String(row[17]).trim() : null;

      // Validate using shared function
      const rawData: RawQuestionData = {
        industry_segment,
        expertise_level,
        proficiency_area,
        sub_domain,
        speciality,
        question_text,
        options,
        correct_option,
        difficulty,
        question_type,
        usage_mode,
        capability_tags,
        expected_answer_guidance,
      };

      const { errors, specialityId } = validateQuestion(rawData, validTagNames, hierarchyData);

      questions.push({
        rowNumber,
        industry_segment,
        expertise_level,
        proficiency_area,
        sub_domain,
        speciality,
        speciality_id: specialityId,
        question_text,
        options,
        correct_option,
        difficulty,
        question_type,
        usage_mode,
        capability_tags,
        expected_answer_guidance,
        isValid: errors.length === 0,
        errors,
      });
    }

    return questions;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const filename = selectedFile.name.toLowerCase();

    // Validate file extension
    if (!isValidFileExtension(filename)) {
      setParseError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setParseError("File size must be less than 5MB");
      return;
    }

    setFile(selectedFile);
    setParseError(null);
    setImportResults(null);

    try {
      const questions = await parseExcel(selectedFile);
      setParsedQuestions(questions);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Failed to parse file");
      setParsedQuestions([]);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      // Simulate file input change
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  // Handler to show confirmation dialog before import
  const handleImportClick = () => {
    if (importMode === "replace" && existingQuestionCount > 0) {
      setShowConfirmDialog(true);
    } else {
      handleImport();
    }
  };

  const handleImport = async () => {
    setShowConfirmDialog(false);
    const validQuestions = parsedQuestions.filter((q) => q.isValid);
    if (validQuestions.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);

    const results = { success: 0, failed: 0, deactivated: 0, errors: [] as string[] };

    // If replace mode, deactivate existing questions for affected specialities first
    if (importMode === "replace") {
      const uniqueSpecialityIds = [...new Set(validQuestions.map(q => q.speciality_id).filter((id): id is string => !!id))];
      
      if (uniqueSpecialityIds.length > 0) {
        try {
          const deactivateResult = await deactivateMutation.mutateAsync(uniqueSpecialityIds);
          results.deactivated = deactivateResult.count;
        } catch (error) {
          results.errors.push(`Failed to deactivate existing questions: ${error instanceof Error ? error.message : "Unknown error"}`);
          setImportResults(results);
          setIsImporting(false);
          return;
        }
      }
    }

    for (let i = 0; i < validQuestions.length; i++) {
      const q = validQuestions[i];

      try {
        if (!q.speciality_id) {
          throw new Error("Speciality ID not resolved");
        }

        const formattedOptions = formatQuestionOptions(
          q.options.map((text, idx) => ({ index: idx + 1, text }))
        );

        const createdQuestion = await createMutation.mutateAsync({
          question_text: q.question_text,
          options: formattedOptions as unknown as { index: number; text: string }[],
          correct_option: q.correct_option,
          difficulty: q.difficulty as "introductory" | "applied" | "advanced" | "strategic" | null,
          question_type: q.question_type as "conceptual" | "scenario" | "experience" | "decision" | "proof",
          usage_mode: q.usage_mode as "self_assessment" | "interview" | "both",
          expected_answer_guidance: q.expected_answer_guidance,
          is_active: true,
          speciality_id: q.speciality_id,
        });

        // Link capability tags if any
        if (createdQuestion?.id && q.capability_tags.length > 0) {
          // Find matching tag IDs (case-insensitive)
          const tagIds = q.capability_tags
            .map(tagName => {
              const found = capabilityTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
              return found?.id;
            })
            .filter((id): id is string => !!id);

          if (tagIds.length > 0) {
            await updateCapabilityTagsMutation.mutateAsync({
              questionId: createdQuestion.id,
              tagIds,
            });
          }
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Row ${q.rowNumber}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }

      setImportProgress(Math.round(((i + 1) / validQuestions.length) * 100));
    }

    setImportResults(results);
    setIsImporting(false);
  };

  // Get unique speciality count for display
  const uniqueSpecialityCount = React.useMemo(() => {
    const validQuestions = parsedQuestions.filter(q => q.isValid && q.speciality_id);
    return new Set(validQuestions.map(q => q.speciality_id)).size;
  }, [parsedQuestions]);

  const downloadExcelTemplate = () => {
    // Create Questions sheet
    const questionsSheet = XLSX.utils.aoa_to_sheet(EXCEL_TEMPLATE_DATA);
    questionsSheet["!cols"] = [
      { wch: 35 }, // industry_segment
      { wch: 50 }, // expertise_level
      { wch: 30 }, // proficiency_area
      { wch: 25 }, // sub_domain
      { wch: 35 }, // speciality
      { wch: 50 }, // question_text
      { wch: 25 }, // option_1
      { wch: 25 }, // option_2
      { wch: 25 }, // option_3
      { wch: 25 }, // option_4
      { wch: 20 }, // option_5
      { wch: 20 }, // option_6
      { wch: 15 }, // correct_option
      { wch: 15 }, // difficulty
      { wch: 15 }, // question_type
      { wch: 15 }, // usage_mode
      { wch: 30 }, // capability_tags
      { wch: 50 }, // expected_answer_guidance
    ];

    // Create Instructions sheet
    const instructionsSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS_SHEET_DATA);
    instructionsSheet["!cols"] = [
      { wch: 25 },
      { wch: 60 },
      { wch: 15 },
      { wch: 50 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, questionsSheet, "Questions");
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

    XLSX.writeFile(workbook, "question_import_template.xlsx");
  };

  const validCount = parsedQuestions.filter((q) => q.isValid).length;
  const invalidCount = parsedQuestions.filter((q) => !q.isValid).length;

  // Group by speciality for summary
  const specialitySummary = React.useMemo(() => {
    const summary: Record<string, { valid: number; invalid: number; path: string }> = {};
    parsedQuestions.forEach((q) => {
      const key = q.speciality || "(No speciality)";
      const path = q.speciality_id 
        ? `${q.industry_segment} → ${q.proficiency_area} → ${q.sub_domain} → ${q.speciality}`
        : q.speciality || "(Invalid path)";
      if (!summary[key]) {
        summary[key] = { valid: 0, invalid: 0, path };
      }
      if (q.isValid) {
        summary[key].valid++;
      } else {
        summary[key].invalid++;
      }
    });
    return summary;
  }, [parsedQuestions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Questions
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file to bulk import questions. The file must include hierarchy columns
            (industry segment, expertise level, proficiency area, sub-domain, speciality) for each question.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Hierarchy Loading State */}
          {hierarchyLoading && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Loading hierarchy data for validation...
              </AlertDescription>
            </Alert>
          )}

          {/* Template Download */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="text-sm">
              <strong>Need a template?</strong> Download the Excel template with hierarchy columns.
            </div>
            <Button variant="outline" size="sm" onClick={downloadExcelTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          {!importResults && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                file ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : "Drop your Excel file here or click to browse"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports .xlsx and .xls files (max 5MB)
                </p>
              </label>
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Parsed Questions Preview */}
          {parsedQuestions.length > 0 && !importResults && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {validCount} valid in file
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive">
                    <X className="h-3 w-3 mr-1" />
                    {invalidCount} with errors
                  </Badge>
                )}
                {existingQuestionCount > 0 && (
                  <Badge variant="secondary">
                    {existingQuestionCount} existing in DB (affected specialities)
                  </Badge>
                )}
              </div>

              {/* Import Mode Selection */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <p className="text-sm font-medium mb-3">Import Mode:</p>
                <RadioGroup 
                  value={importMode} 
                  onValueChange={(value) => setImportMode(value as ImportMode)}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="replace" id="replace" className="mt-1" />
                    <Label htmlFor="replace" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2 font-medium">
                        <RefreshCw className="h-4 w-4 text-orange-500" />
                        Replace Existing
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Deactivate {existingQuestionCount} existing questions for affected specialities, then import {validCount} new.
                        <br />
                        <strong>Result: {validCount} active questions</strong>
                      </p>
                    </Label>
                  </div>
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="add" id="add" className="mt-1" />
                    <Label htmlFor="add" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2 font-medium">
                        <Plus className="h-4 w-4 text-green-500" />
                        Add Only
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Keep existing {existingQuestionCount} questions, add {validCount} new.
                        <br />
                        <strong>Result: {existingQuestionCount + validCount} active questions</strong>
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Speciality Summary */}
              {Object.keys(specialitySummary).length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Questions by Speciality ({uniqueSpecialityCount} specialities):</p>
                  <ScrollArea className="max-h-[120px]">
                    <div className="space-y-1">
                      {Object.entries(specialitySummary).map(([key, { valid, invalid, path }]) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground truncate max-w-[70%]" title={path}>
                            {path}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">{valid} valid</span>
                            {invalid > 0 && (
                              <span className="text-red-600">{invalid} errors</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Questions Table */}
              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Row</TableHead>
                      <TableHead className="w-16">Status</TableHead>
                      <TableHead className="w-48">Hierarchy Path</TableHead>
                      <TableHead>Question (Preview)</TableHead>
                      <TableHead className="w-24">Options</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedQuestions.map((q) => (
                      <TableRow key={q.rowNumber} className={!q.isValid ? "bg-red-50 dark:bg-red-950/20" : ""}>
                        <TableCell className="font-mono">{q.rowNumber}</TableCell>
                        <TableCell>
                          {q.isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {q.speciality_id ? (
                            <span className="text-green-700 dark:text-green-400">
                              {q.speciality}
                            </span>
                          ) : (
                            <span className="text-red-600">{q.speciality || "(missing)"}</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={q.question_text}>
                          {q.question_text.slice(0, 60)}
                          {q.question_text.length > 60 && "..."}
                        </TableCell>
                        <TableCell>{q.options.length} options</TableCell>
                        <TableCell className="max-w-xs">
                          {q.errors.length > 0 && (
                            <ul className="text-xs text-red-600 space-y-0.5">
                              {q.errors.slice(0, 2).map((err, i) => (
                                <li key={i}>• {err}</li>
                              ))}
                              {q.errors.length > 2 && (
                                <li className="text-muted-foreground">
                                  +{q.errors.length - 2} more...
                                </li>
                              )}
                            </ul>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Import Progress */}
          {isImporting && (
            <div className="space-y-2">
              <Progress value={importProgress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                Importing... {importProgress}%
              </p>
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-4">
              <Alert variant={importResults.failed === 0 ? "default" : "destructive"}>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Import complete: {importResults.success} questions imported successfully
                  {importResults.deactivated > 0 && `, ${importResults.deactivated} existing deactivated`}
                  {importResults.failed > 0 && `, ${importResults.failed} failed`}
                </AlertDescription>
              </Alert>

              {importResults.errors.length > 0 && (
                <ScrollArea className="h-[150px] border rounded-lg p-3">
                  <ul className="text-sm text-red-600 space-y-1">
                    {importResults.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {importResults ? "Close" : "Cancel"}
          </Button>
          {!importResults && (
            <Button
              onClick={handleImportClick}
              disabled={validCount === 0 || isImporting || hierarchyLoading}
              variant={importMode === "replace" && existingQuestionCount > 0 ? "destructive" : "default"}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  {importMode === "replace" ? (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {importMode === "replace" 
                    ? `Replace & Import ${validCount} Questions`
                    : `Add ${validCount} Questions`
                  }
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Confirmation Dialog for Replace Mode */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Replace Import</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are about to perform a <strong>Replace Import</strong>. This will:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>Deactivate</strong> {existingQuestionCount} existing questions for {uniqueSpecialityCount} affected specialities</li>
                  <li><strong>Import</strong> {validCount} new questions from the Excel file</li>
                </ul>
                <p className="text-sm mt-4">
                  <strong>After import:</strong> {validCount} active questions for these specialities
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Note: Deactivated questions are not deleted and can be restored if needed.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Replace Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
