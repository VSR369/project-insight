import * as React from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Download, Loader2, RefreshCw, Plus, StopCircle, SkipForward } from "lucide-react";

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
  useCreateQuestionBulk, 
  useDeleteQuestionsBySpecialities,
  getExistingQuestionCount,
  formatQuestionOptions, 
  DIFFICULTY_OPTIONS, 
  QUESTION_TYPE_OPTIONS, 
  USAGE_MODE_OPTIONS 
} from "@/hooks/queries/useQuestionBank";
import { useQueryClient } from "@tanstack/react-query";
import { useCapabilityTags, useUpdateQuestionCapabilityTags } from "@/hooks/queries/useCapabilityTags";
import { useHierarchyData, resolveHierarchy, HierarchyData } from "@/hooks/queries/useHierarchyResolver";
import { 
  handleMutationError, 
  logWarning, 
  logInfo, 
  generateCorrelationId 
} from "@/lib/errorHandler";

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
  isSkipped: boolean;
  skipReason: string | null;
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

// Detailed failure tracking for debugging
interface ImportFailure {
  rowNumber: number;
  correlationId: string;
  phase: 'question_creation' | 'capability_tags';
  errorMessage: string;
  errorCode?: string;
  rowData: {
    question_text: string;
    speciality: string;
    speciality_id: string | null;
    options_count: number;
    capability_tags: string[];
  };
  timestamp: string;
}

const VALID_DIFFICULTIES: readonly string[] = DIFFICULTY_OPTIONS.map(d => d.value);
const VALID_QUESTION_TYPES: readonly string[] = QUESTION_TYPE_OPTIONS.map(t => t.value);
const VALID_USAGE_MODES: readonly string[] = USAGE_MODE_OPTIONS.map(m => m.value);

const EXCEL_TEMPLATE_DATA = [
  [
    "industry_segment", "expertise_level", "proficiency_area", "sub_domain", "speciality",
    "question_text", "option_1", "option_2", "option_3", "option_4", 
    "correct_option", "difficulty", "question_type", "usage_mode", "capability_tags", "expected_answer_guidance"
  ],
  [
    "Manufacturing (Auto Components)", "Senior Consultant – Domain Specialist & Workstream Lead", 
    "Digital & Technology Blueprint", "Governance Basics", "Data ownership & stewardship setup",
    "What is the primary purpose of data stewardship?",
    "Data backup", "Data governance", "Data deletion", "Data encryption",
    2, "applied", "conceptual", "both", "Data Management",
    "Data stewardship focuses on governance and quality, not just backup."
  ],
  [
    "Manufacturing (Auto Components)", "Senior Consultant – Domain Specialist & Workstream Lead", 
    "Digital & Technology Blueprint", "Governance Basics", "Data ownership & stewardship setup",
    "Which stakeholder typically owns business data?",
    "IT Department", "Business Unit Head", "External Vendor", "Database Admin",
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
  ["option_1 to option_4", "Answer options for the question (exactly 4 required)", "Yes", "All 4 options must be provided"],
  ["correct_option", "Which option number is the correct answer", "Yes", "1, 2, 3, or 4"],
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
  ["4. All 4 options (option_1 through option_4) must be provided for each question"],
  ["5. The correct_option must be 1, 2, 3, or 4"],
  ["6. Enter your questions in the 'Questions' sheet, starting from row 2"],
  ["7. Do not modify the header row in the Questions sheet"],
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

// Validate a single question object
const validateQuestion = (
  data: RawQuestionData,
  validTagNames: string[],
  hierarchyData: HierarchyData | undefined
): { errors: string[]; specialityId: string | null } => {
  const errors: string[] = [];
  let specialityId: string | null = null;

  // Hierarchy validation
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

  // Resolve hierarchy if all fields present
  if (data.industry_segment && data.expertise_level && data.proficiency_area && data.sub_domain && data.speciality && hierarchyData) {
    const resolved = resolveHierarchy(
      hierarchyData,
      data.industry_segment,
      data.expertise_level,
      data.proficiency_area,
      data.sub_domain,
      data.speciality
    );

    if (resolved.errors.length > 0) {
      errors.push(...resolved.errors);
    } else if (resolved.specialityId) {
      specialityId = resolved.specialityId;
    }
  }

  // Question text validation
  if (!data.question_text) {
    errors.push("Question text is required");
  } else if (data.question_text.length < 10) {
    errors.push("Question text must be at least 10 characters");
  } else if (data.question_text.length > 2000) {
    errors.push("Question text must be 2000 characters or less");
  }

  // Options validation - exactly 4 options required, check for empty slots
  const emptyOptionIndexes = data.options
    .map((opt, i) => opt === "" ? (i + 1) : null)
    .filter((n): n is number => n !== null);

  if (emptyOptionIndexes.length > 0) {
    errors.push(`Empty option(s): option_${emptyOptionIndexes.join(", option_")}`);
  } else if (data.options.length !== 4) {
    errors.push(`Exactly 4 options are required (found ${data.options.length})`);
  }

  // Correct option validation - must be 1, 2, 3, or 4
  if (data.correct_option < 1 || data.correct_option > 4) {
    errors.push("Correct option must be 1, 2, 3, or 4");
  }

  // Difficulty validation
  if (data.difficulty && !VALID_DIFFICULTIES.includes(data.difficulty)) {
    errors.push(`Invalid difficulty. Valid: ${VALID_DIFFICULTIES.join(", ")}`);
  }

  // Question type validation
  if (!VALID_QUESTION_TYPES.includes(data.question_type)) {
    errors.push(`Invalid question_type. Valid: ${VALID_QUESTION_TYPES.join(", ")}`);
  }

  // Usage mode validation
  if (!VALID_USAGE_MODES.includes(data.usage_mode)) {
    errors.push(`Invalid usage_mode. Valid: ${VALID_USAGE_MODES.join(", ")}`);
  }

  // Capability tags validation (optional but must match if provided)
  if (data.capability_tags.length > 0) {
    const normalizedValidTags = validTagNames.map(t => t.toLowerCase());
    data.capability_tags.forEach(tag => {
      if (!normalizedValidTags.includes(tag.toLowerCase())) {
        errors.push(`Unknown capability tag: "${tag}"`);
      }
    });
  }

  // Expected answer guidance validation
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

// Extract error code from Supabase/PostgreSQL errors
const extractErrorCode = (error: unknown): string | undefined => {
  if (error && typeof error === 'object') {
    // Supabase error structure
    if ('code' in error) return String((error as { code: string }).code);
    // PostgreSQL error via details
    if ('details' in error && typeof (error as { details: unknown }).details === 'object') {
      const details = (error as { details: { code?: string } }).details;
      if (details && 'code' in details) return String(details.code);
    }
  }
  return undefined;
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
  const [currentRowInfo, setCurrentRowInfo] = React.useState<string>("");
  const [importResults, setImportResults] = React.useState<{
    success: number;
    failed: number;
    deleted: number;
    errors: string[];
    failures: ImportFailure[];
    wasCancelled?: boolean;
  } | null>(null);
  
  // Real-time import counters for enhanced progress display
  const [importedCount, setImportedCount] = React.useState(0);
  const [successCount, setSuccessCount] = React.useState(0);
  const [failedCount, setFailedCount] = React.useState(0);

  // Import mode: "add" = add new questions, "replace" = deactivate existing and add new
  const [importMode, setImportMode] = React.useState<ImportMode>("replace");
  const [existingQuestionCount, setExistingQuestionCount] = React.useState<number>(0);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  // AbortController for cancellable imports
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const queryClient = useQueryClient();
  const createMutation = useCreateQuestionBulk();
  const deleteMutation = useDeleteQuestionsBySpecialities();
  const updateCapabilityTagsMutation = useUpdateQuestionCapabilityTags();
  const { data: capabilityTags = [] } = useCapabilityTags();
  const { data: hierarchyData, isLoading: hierarchyLoading } = useHierarchyData();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Debug: Log isImporting state transitions
  React.useEffect(() => {
    console.log('[QuestionImportDialog] isImporting changed to:', isImporting);
  }, [isImporting]);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      // Cancel any ongoing import when dialog closes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setFile(null);
      setParsedQuestions([]);
      setParseError(null);
      setIsImporting(false);
      setImportProgress(0);
      setCurrentRowInfo("");
      setImportResults(null);
      setImportMode("replace");
      setExistingQuestionCount(0);
      setShowConfirmDialog(false);
    }
  }, [open]);

  // Fetch existing question count when parsed questions change
  React.useEffect(() => {
    const fetchExistingCount = async () => {
      const validQuestions = parsedQuestions.filter(q => q.isValid && !q.isSkipped && q.speciality_id);
      const uniqueSpecialityIds = [...new Set(validQuestions.map(q => q.speciality_id).filter((id): id is string => !!id))];
      
      if (uniqueSpecialityIds.length > 0) {
        try {
          const count = await getExistingQuestionCount(uniqueSpecialityIds);
          setExistingQuestionCount(count);
        } catch {
          logWarning("Failed to fetch existing question count", {
            operation: 'fetch_existing_question_count',
            component: 'QuestionImportDialog',
          });
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

    // DYNAMIC COLUMN DETECTION: Detect option columns from header row
    const headerRow = data[0] as (string | number | null | undefined)[];
    const optionColumnIndexes: number[] = [];
    
    // Find option_1 through option_4 columns only (ignore option_5, option_6 for legacy compatibility)
    headerRow.forEach((header, idx) => {
      const headerStr = String(header || '').toLowerCase().trim();
      if (headerStr === 'option_1' || headerStr === 'option_2' || 
          headerStr === 'option_3' || headerStr === 'option_4') {
        optionColumnIndexes.push(idx);
      }
    });

    // Validate exactly 4 option columns required
    const optionCount = optionColumnIndexes.length;
    if (optionCount !== 4) {
      throw new Error(`Excel must have exactly 4 option columns (option_1, option_2, option_3, option_4). Found ${optionCount} valid option columns.`);
    }

    // Calculate dynamic column positions after options
    // Fixed columns: 0=industry, 1=expertise, 2=proficiency, 3=sub_domain, 4=speciality, 5=question_text
    // Then options (variable count), then: correct_option, difficulty, question_type, usage_mode, capability_tags, expected_answer_guidance
    const firstOptionIndex = optionColumnIndexes.length > 0 ? optionColumnIndexes[0] : 6;
    const correctOptionIndex = firstOptionIndex + optionCount;
    const difficultyIndex = correctOptionIndex + 1;
    const questionTypeIndex = correctOptionIndex + 2;
    const usageModeIndex = correctOptionIndex + 3;
    const capabilityTagsIndex = correctOptionIndex + 4;
    const guidanceIndex = correctOptionIndex + 5;

    logInfo(`Detected ${optionCount} option columns at indexes ${optionColumnIndexes.join(', ')}`, {
      operation: 'parse_excel_columns',
      component: 'QuestionImportDialog',
    });

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

      // Extract question text (column 5)
      const question_text = String(row[5] || "").trim();

      // Extract options dynamically - DO NOT filter(Boolean) to catch empty cells as validation errors
      const options = optionColumnIndexes.map(idx => String(row[idx] || "").trim());

      // Extract remaining fields using dynamic indexes
      const correct_option = parseInt(String(row[correctOptionIndex] || "1"), 10);
      const difficulty = row[difficultyIndex] ? String(row[difficultyIndex]).trim().toLowerCase() : null;
      const question_type = row[questionTypeIndex] ? String(row[questionTypeIndex]).trim().toLowerCase() : "conceptual";
      const usage_mode = row[usageModeIndex] ? String(row[usageModeIndex]).trim().toLowerCase() : "both";
      
      // Parse capability tags (comma-separated)
      const capabilityTagsRaw = row[capabilityTagsIndex] ? String(row[capabilityTagsIndex]).trim() : "";
      const capability_tags = capabilityTagsRaw
        ? capabilityTagsRaw.split(",").map(t => t.trim()).filter(Boolean)
        : [];

      // Parse expected_answer_guidance
      const expected_answer_guidance = row[guidanceIndex] ? String(row[guidanceIndex]).trim() : null;

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
        isSkipped: false,
        skipReason: null,
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

  // Cancel the current import
  const handleCancelImport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      logInfo("Question import cancelled by user", {
        operation: 'import_questions_cancelled',
        component: 'QuestionImportDialog',
      });
    }
  };

  const handleImport = async () => {
    setShowConfirmDialog(false);
    const validQuestions = parsedQuestions.filter((q) => q.isValid && !q.isSkipped);
    if (validQuestions.length === 0) return;

    const importStartTime = Date.now();
    const uniqueSpecialityIds = [...new Set(validQuestions.map(q => q.speciality_id).filter((id): id is string => !!id))];

    // Create new AbortController for this import
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Log import start
    logInfo("Question import started", {
      operation: 'import_questions_start',
      component: 'QuestionImportDialog',
    });

    setIsImporting(true);
    setImportProgress(0);
    setCurrentRowInfo("");
    setImportedCount(0);
    setSuccessCount(0);
    setFailedCount(0);

    // Force browser to render progress bar before heavy processing begins
    await new Promise(resolve => setTimeout(resolve, 50));

    const results = { 
      success: 0, 
      failed: 0, 
      deleted: 0, 
      errors: [] as string[],
      failures: [] as ImportFailure[],
      wasCancelled: false
    };

    // If replace mode, permanently delete existing questions for affected specialities first
    if (importMode === "replace") {
      if (uniqueSpecialityIds.length > 0) {
        try {
          const deleteResult = await deleteMutation.mutateAsync(uniqueSpecialityIds);
          results.deleted = deleteResult.count;
        } catch (error) {
          const deleteCorrelationId = generateCorrelationId();
          handleMutationError(error, {
            operation: 'delete_existing_questions',
            component: 'QuestionImportDialog',
          }, false);
          
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          const isUrlLimit = errorMsg.toLowerCase().includes('bad request') || errorMsg.includes('400');
          const displayError = isUrlLimit 
            ? `Pre-import deletion failed: Too many specialities to delete at once (${uniqueSpecialityIds.length}). Try importing a smaller file or use "Add Only" mode.`
            : `Pre-import deletion failed: ${errorMsg}. Ensure you have Platform Admin access.`;
          
          results.errors.push(`${displayError} [${deleteCorrelationId}]`);
          results.failures.push({
            rowNumber: 0,
            correlationId: deleteCorrelationId,
            phase: 'question_creation',
            errorMessage: displayError,
            errorCode: extractErrorCode(error),
            rowData: {
              question_text: "(Deletion step)",
              speciality: `${uniqueSpecialityIds.length} specialities`,
              speciality_id: null,
              options_count: 0,
              capability_tags: [],
            },
            timestamp: new Date().toISOString(),
          });
          
          setImportResults(results);
          setIsImporting(false);
          return;
        }
      }
    }

    // Batch processing configuration
    const BATCH_SIZE = 15; // Process 15 questions per batch for optimal performance
    const totalQuestions = validQuestions.length;
    const totalBatches = Math.ceil(totalQuestions / BATCH_SIZE);

    // Process a single question and return result
    const processQuestion = async (q: ParsedQuestion): Promise<{
      success: boolean;
      failure?: ImportFailure;
      errorMessage?: string;
    }> => {
      const rowCorrelationId = generateCorrelationId();

      try {
        if (!q.speciality_id) {
          throw new Error("Speciality ID not resolved");
        }

        const formattedOptions = formatQuestionOptions(
          q.options.map((text, idx) => ({ index: idx + 1, text }))
        );

        // Phase 1: Create Question
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

        // Phase 2: Link capability tags if any
        if (createdQuestion?.id && q.capability_tags.length > 0) {
          try {
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
          } catch (tagError) {
            logWarning("Capability tag linking failed (question created successfully)", {
              operation: 'link_capability_tags',
              component: 'QuestionImportDialog',
            });
            
            // Record as a tag-phase failure for visibility (but question still succeeded)
            return {
              success: true,
              failure: {
                rowNumber: q.rowNumber,
                correlationId: rowCorrelationId,
                phase: 'capability_tags',
                errorMessage: tagError instanceof Error ? tagError.message : "Unknown error",
                errorCode: extractErrorCode(tagError),
                rowData: {
                  question_text: q.question_text.slice(0, 100),
                  speciality: q.speciality,
                  speciality_id: q.speciality_id,
                  options_count: q.options.length,
                  capability_tags: q.capability_tags,
                },
                timestamp: new Date().toISOString(),
              }
            };
          }
        }

        return { success: true };
      } catch (error) {
        const failure: ImportFailure = {
          rowNumber: q.rowNumber,
          correlationId: rowCorrelationId,
          phase: 'question_creation',
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          errorCode: extractErrorCode(error),
          rowData: {
            question_text: q.question_text.slice(0, 100),
            speciality: q.speciality,
            speciality_id: q.speciality_id,
            options_count: q.options.length,
            capability_tags: q.capability_tags,
          },
          timestamp: new Date().toISOString(),
        };

        handleMutationError(error, {
          operation: 'import_question',
          component: 'QuestionImportDialog',
        }, false);

        return {
          success: false,
          failure,
          errorMessage: `Row ${q.rowNumber}: ${failure.errorMessage} [${rowCorrelationId}]`
        };
      }
    };

    // Process questions in batches - wrapped in try/finally for guaranteed cleanup
    try {
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // Check cancellation at batch boundary (more responsive)
      if (signal.aborted) {
        results.wasCancelled = true;
        logInfo("Question import stopped due to cancellation", {
          operation: 'import_questions_stopped',
          component: 'QuestionImportDialog',
        });
        break;
      }

      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, totalQuestions);
      const batch = validQuestions.slice(startIdx, endIdx);

      // Update UI with batch info
      setCurrentRowInfo(`Batch ${batchIndex + 1}/${totalBatches}: Processing rows ${batch[0].rowNumber}-${batch[batch.length - 1].rowNumber}...`);

      // Process batch concurrently with Promise.allSettled for resilience
      const batchPromises = batch.map(q => processQuestion(q));
      const batchResults = await Promise.allSettled(batchPromises);

      // Aggregate batch results with real-time counter updates
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const { success, failure, errorMessage } = result.value;
          if (success) {
            results.success++;
            setSuccessCount(prev => prev + 1);
          } else {
            results.failed++;
            setFailedCount(prev => prev + 1);
          }
          if (failure) {
            results.failures.push(failure);
          }
          if (errorMessage) {
            results.errors.push(errorMessage);
          }
        } else {
          // Promise rejected unexpectedly
          results.failed++;
          setFailedCount(prev => prev + 1);
          results.errors.push(`Unexpected batch error: ${result.reason}`);
        }
      }

      // Update progress after each batch with exact count
      const processedCount = Math.min(endIdx, totalQuestions);
      setImportedCount(processedCount);
      setImportProgress(Math.round((processedCount / totalQuestions) * 100));

      // Yield to browser event loop between batches to prevent UI freeze
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  } catch (unexpectedError) {
    // Catch any unexpected crash during import
    results.errors.push(`Import crashed unexpectedly: ${unexpectedError instanceof Error ? unexpectedError.message : 'Unknown error'}`);
    results.wasCancelled = true;
    handleMutationError(unexpectedError, {
      operation: 'import_questions_crash',
      component: 'QuestionImportDialog',
    }, false);
  } finally {
    // ALWAYS execute cleanup and show results
    const importDuration = Date.now() - importStartTime;
    logInfo(results.wasCancelled ? "Question import cancelled/crashed" : "Question import completed", {
      operation: results.wasCancelled ? 'import_questions_cancelled' : 'import_questions_complete',
      component: 'QuestionImportDialog',
    });

    // Clean up abort controller
    abortControllerRef.current = null;
    setCurrentRowInfo("");
    setImportResults(results);
    setIsImporting(false);

    // Single cache invalidation at the very end (instead of per-row)
    queryClient.invalidateQueries({ queryKey: ["question_bank"] });
  }
  };

  // Export failed rows as Excel for debugging (post-import failures)
  const downloadFailedRows = () => {
    if (!importResults?.failures.length) return;
    
    const failureData = [
      ["Row", "Correlation ID", "Phase", "Error", "Error Code", "Question (Preview)", "Speciality", "Speciality ID", "Options Count", "Capability Tags", "Timestamp"],
      ...importResults.failures.map(f => [
        f.rowNumber,
        f.correlationId,
        f.phase,
        f.errorMessage,
        f.errorCode || '',
        f.rowData.question_text,
        f.rowData.speciality,
        f.rowData.speciality_id || '',
        f.rowData.options_count,
        f.rowData.capability_tags.join(', '),
        f.timestamp,
      ])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(failureData);
    ws["!cols"] = [
      { wch: 6 },   // Row
      { wch: 25 },  // Correlation ID
      { wch: 18 },  // Phase
      { wch: 50 },  // Error
      { wch: 12 },  // Error Code
      { wch: 40 },  // Question
      { wch: 30 },  // Speciality
      { wch: 40 },  // Speciality ID
      { wch: 10 },  // Options Count
      { wch: 30 },  // Capability Tags
      { wch: 25 },  // Timestamp
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Failed Imports");
    XLSX.writeFile(wb, `question_import_failures_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export invalid/skipped rows from preview (before import) for debugging
  const downloadInvalidPreviewRows = () => {
    const invalidRows = parsedQuestions.filter(q => !q.isValid || q.isSkipped);
    if (invalidRows.length === 0) return;

    const exportData = [
      [
        "Row", "Status", "Reason/Errors", 
        "Industry Segment", "Expertise Level", "Proficiency Area", "Sub-Domain", "Speciality",
        "Question Text (Preview)", "Option 1", "Option 2", "Option 3", "Option 4",
        "Correct Option", "Difficulty", "Question Type", "Usage Mode", "Capability Tags"
      ],
      ...invalidRows.map(q => [
        q.rowNumber,
        q.isSkipped ? "Skipped" : "Invalid",
        q.isSkipped ? q.skipReason : q.errors.join(" | "),
        q.industry_segment,
        q.expertise_level,
        q.proficiency_area,
        q.sub_domain,
        q.speciality,
        q.question_text.slice(0, 200),
        q.options[0] || "(empty)",
        q.options[1] || "(empty)",
        q.options[2] || "(empty)",
        q.options[3] || "(empty)",
        q.correct_option,
        q.difficulty || "",
        q.question_type,
        q.usage_mode,
        q.capability_tags.join(", "),
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    ws["!cols"] = [
      { wch: 6 },   // Row
      { wch: 10 },  // Status
      { wch: 60 },  // Reason/Errors
      { wch: 35 },  // Industry
      { wch: 50 },  // Expertise
      { wch: 30 },  // Proficiency
      { wch: 25 },  // Sub-Domain
      { wch: 35 },  // Speciality
      { wch: 50 },  // Question
      { wch: 25 },  // Opt 1
      { wch: 25 },  // Opt 2
      { wch: 25 },  // Opt 3
      { wch: 25 },  // Opt 4
      { wch: 12 },  // Correct
      { wch: 15 },  // Difficulty
      { wch: 15 },  // Type
      { wch: 15 },  // Mode
      { wch: 30 },  // Tags
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invalid & Skipped Rows");
    XLSX.writeFile(wb, `question_import_issues_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Get unique speciality count for display
  const uniqueSpecialityCount = React.useMemo(() => {
    const validQuestions = parsedQuestions.filter(q => q.isValid && !q.isSkipped && q.speciality_id);
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

  const validCount = parsedQuestions.filter((q) => q.isValid && !q.isSkipped).length;
  const invalidCount = parsedQuestions.filter((q) => !q.isValid && !q.isSkipped).length;
  const skippedCount = parsedQuestions.filter((q) => q.isSkipped).length;

  // Group errors by type for error summary panel
  const errorSummary = React.useMemo(() => {
    const summary: Record<string, number> = {};
    parsedQuestions
      .filter(q => !q.isValid && !q.isSkipped)
      .forEach(q => {
        q.errors.forEach(err => {
          // Normalize similar errors for grouping
          const key = err.replace(/Row \d+/g, '').replace(/option_\d+/g, 'option_N').trim();
          summary[key] = (summary[key] || 0) + 1;
        });
      });
    return Object.entries(summary)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 error types
  }, [parsedQuestions]);

  // Group by speciality for summary
  const specialitySummary = React.useMemo(() => {
    const summary: Record<string, { valid: number; invalid: number; skipped: number; path: string }> = {};
    parsedQuestions.forEach((q) => {
      if (q.isSkipped) {
        const key = "(Skipped)";
        if (!summary[key]) {
          summary[key] = { valid: 0, invalid: 0, skipped: 0, path: q.skipReason || "Skipped by rule" };
        }
        summary[key].skipped++;
        return;
      }
      
      const key = q.speciality || "(No speciality)";
      const path = q.speciality_id 
        ? `${q.industry_segment} → ${q.proficiency_area} → ${q.sub_domain} → ${q.speciality}`
        : q.speciality || "(Invalid path)";
      if (!summary[key]) {
        summary[key] = { valid: 0, invalid: 0, skipped: 0, path };
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
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 pb-4 border-b">
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
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            FIXED STATUS BAR - Always visible above scroll area
            Shows current state: loading, ready, importing, or complete
        ══════════════════════════════════════════════════════════════════ */}
        <div className="flex-shrink-0 px-6 py-3 space-y-3 border-b bg-muted/30">
          {/* Hierarchy Loading State */}
          {hierarchyLoading && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Loading hierarchy data for validation...
              </AlertDescription>
            </Alert>
          )}

          {/* Ready to Import Status - FIXED at top, always visible when parsed */}
          {parsedQuestions.length > 0 && !importResults && !isImporting && validCount > 0 && (
            <div className="p-3 border-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  ✅ Ready to import <strong>{validCount}</strong> questions
                </p>
                <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  Click "Import Questions" below
                </Badge>
              </div>
            </div>
          )}

          {/* Import Progress - FIXED at top during import */}
          {isImporting && (
            <div className="space-y-3 p-4 border-2 border-primary rounded-lg bg-primary/5">
              {/* Main Progress Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div>
                    <p className="text-lg font-semibold text-primary">
                      {importedCount.toLocaleString()} of {parsedQuestions.filter(q => q.isValid && !q.isSkipped).length.toLocaleString()} questions imported
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {importProgress}% complete • Processing batch...
                    </p>
                  </div>
                </div>
                
                {/* Cancel Button */}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancelImport}
                  className="gap-2"
                >
                  <StopCircle className="h-4 w-4" />
                  Cancel
                </Button>
              </div>

              {/* Progress Bar - Prominent */}
              <Progress value={importProgress} className="h-3" />
              
              {/* Live Success/Failure Counters */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400 font-medium">{successCount} succeeded</span>
                </div>
                {failedCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-600 dark:text-red-400 font-medium">{failedCount} failed</span>
                  </div>
                )}
              </div>

              {/* Current Batch Info */}
              {currentRowInfo && (
                <p className="text-xs text-muted-foreground truncate" title={currentRowInfo}>
                  {currentRowInfo}
                </p>
              )}
            </div>
          )}

          {/* Import Results Summary - FIXED at top when complete */}
          {importResults && (
            <Alert variant={importResults.failed === 0 && !importResults.wasCancelled ? "default" : "destructive"}>
              {importResults.wasCancelled ? (
                <StopCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <AlertDescription>
                {importResults.wasCancelled 
                  ? `Import cancelled: ${importResults.success} questions imported before cancellation`
                  : `Import complete: ${importResults.success} questions imported successfully`}
                {importResults.deleted > 0 && `, ${importResults.deleted} existing deleted`}
                {importResults.failed > 0 && `, ${importResults.failed} failed`}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SCROLLABLE CONTENT AREA - Using ScrollArea for proper scrolling
        ══════════════════════════════════════════════════════════════════ */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-4">

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
              {/* Summary Badges */}
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
                {skippedCount > 0 && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    {skippedCount} skipped (by rule)
                  </Badge>
                )}
                {existingQuestionCount > 0 && (
                  <Badge variant="secondary">
                    {existingQuestionCount} existing in DB (affected specialities)
                  </Badge>
                )}
              </div>

              {/* Error Summary Panel - Top Error Types */}
              {(invalidCount > 0 || skippedCount > 0) && (
                <div className="p-3 border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      {invalidCount > 0 ? `Error Summary (${invalidCount} invalid` : 'Rows Summary ('}
                      {skippedCount > 0 && invalidCount > 0 && ', '}
                      {skippedCount > 0 && `${skippedCount} skipped`}):
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadInvalidPreviewRows}
                      className="h-7 text-xs"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download Issues
                    </Button>
                  </div>
                  {errorSummary.length > 0 && (
                    <div className="space-y-1 text-sm">
                      {errorSummary.map(([errorType, count]) => (
                        <div key={errorType} className="flex items-center justify-between">
                          <span className="text-red-600 dark:text-red-300 truncate max-w-[85%]" title={errorType}>
                            • {errorType}
                          </span>
                          <Badge variant="destructive" className="ml-2">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                      {Object.entries(specialitySummary).map(([key, { valid, invalid, skipped, path }]) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground truncate max-w-[70%]" title={path}>
                            {path}
                          </span>
                          <div className="flex items-center gap-2">
                            {valid > 0 && <span className="text-green-600">{valid} valid</span>}
                            {invalid > 0 && <span className="text-red-600">{invalid} errors</span>}
                            {skipped > 0 && <span className="text-amber-600">{skipped} skipped</span>}
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
                      <TableRow 
                        key={q.rowNumber} 
                        className={
                          q.isSkipped 
                            ? "bg-amber-50 dark:bg-amber-950/20" 
                            : !q.isValid 
                              ? "bg-red-50 dark:bg-red-950/20" 
                              : ""
                        }
                      >
                        <TableCell className="font-mono">{q.rowNumber}</TableCell>
                        <TableCell>
                          {q.isSkipped ? (
                            <SkipForward className="h-4 w-4 text-amber-500" />
                          ) : q.isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {q.isSkipped ? (
                            <span className="text-amber-600">{q.expertise_level || "(blank)"}</span>
                          ) : q.speciality_id ? (
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
                        <TableCell>
                          {q.isSkipped ? "-" : `${q.options.length} options`}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {q.isSkipped ? (
                            <span className="text-xs text-amber-600">{q.skipReason}</span>
                          ) : q.errors.length > 0 && (
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

          {/* Import Results - Detailed Failure List (status alert is now in fixed area above) */}
          {importResults && importResults.failures.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-red-600">
                  {importResults.failures.filter(f => f.phase === 'question_creation').length} question creation failures, {importResults.failures.filter(f => f.phase === 'capability_tags').length} tag linking warnings:
                </p>
                <Button variant="outline" size="sm" onClick={downloadFailedRows}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Failed Rows
                </Button>
              </div>
              
              <ScrollArea className="h-[200px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Row</TableHead>
                      <TableHead className="w-24">Phase</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead className="w-20">Code</TableHead>
                      <TableHead className="w-40">Correlation ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResults.failures.map((f, i) => (
                      <TableRow key={i} className={f.phase === 'question_creation' ? "bg-red-50 dark:bg-red-950/20" : "bg-yellow-50 dark:bg-yellow-950/20"}>
                        <TableCell className="font-mono">{f.rowNumber}</TableCell>
                        <TableCell>
                          <Badge variant={f.phase === 'question_creation' ? 'destructive' : 'secondary'}>
                            {f.phase === 'question_creation' ? 'Question' : 'Tags'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate" title={f.errorMessage}>
                          {f.errorMessage}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {f.errorCode || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {f.correlationId}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
          </div>
        </ScrollArea>

        {/* Fixed Footer */}
        <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">v2026-01-23.3</span>
          <div className="flex gap-2">
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
          </div>
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
