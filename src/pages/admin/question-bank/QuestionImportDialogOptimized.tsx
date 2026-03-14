import * as React from "react";
// XLSX dynamically imported at point-of-use to reduce initial bundle
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Download, Loader2, RefreshCw, Plus, StopCircle, SkipForward, Clock, Tags } from "lucide-react";

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

import { VirtualizedPreviewTable, type ParsedQuestionRow } from "./VirtualizedPreviewTable";
import { ImportStatisticsDashboard, type ImportStatistics } from "./ImportStatisticsDashboard";

import { 
  useDeleteQuestionsBySpecialities,
  useBulkInsertQuestions,
  getExistingQuestionCount,
  formatQuestionOptions, 
  DIFFICULTY_OPTIONS, 
  QUESTION_TYPE_OPTIONS, 
  USAGE_MODE_OPTIONS,
  type BulkQuestionInput,
} from "@/hooks/queries/useQuestionBank";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useCapabilityTags, 
  useBulkUpsertCapabilityTags,
  useBulkInsertQuestionTags,
  type CapabilityTag,
} from "@/hooks/queries/useCapabilityTags";
import { 
  useHierarchyLookupMaps, 
  resolveHierarchyFast,
  HierarchyLookupMaps,
} from "@/hooks/queries/useHierarchyResolverOptimized";
import { 
  handleMutationError, 
  logWarning, 
  logInfo, 
  generateCorrelationId 
} from "@/lib/errorHandler";
import {
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  PARSE_CHUNK_SIZE,
  BATCH_YIELD_DELAY_MS,
} from "@/constants/import.constants";

// =====================================================
// ENTERPRISE IMPORT CONSTANTS
// =====================================================
const BULK_INSERT_BATCH_SIZE = 100; // Questions per RPC call

interface ParsedQuestion extends ParsedQuestionRow {
  industry_segment: string;
  proficiency_area: string;
  sub_domain: string;
  correct_option: number;
  difficulty: string | null;
  question_type: string;
  usage_mode: string;
  capability_tags: string[];
  expected_answer_guidance: string | null;
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
  phase: 'question_creation' | 'capability_tags' | 'bulk_insert';
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

// Tag summary for pre-import display
interface TagSummary {
  total: number;
  existing: number;
  new: number;
  newTags: string[];
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
  ["capability_tags", "Comma-separated list of capability tag names", "No", "e.g., Problem Solving, Critical Thinking (auto-created if missing)"],
  ["expected_answer_guidance", "Detailed explanation for reviewers/interviewers", "No", "Text up to 2000 characters"],
  [""],
  ["SUPPORTED FILE SIZE: Up to 50MB / ~15,000 questions"],
  ["NEW: Capability tags are auto-created if they don't exist in the system"],
];

// Validate a single question object using O(1) lookup maps
// NOTE: We no longer reject unknown capability tags - they will be auto-created
const validateQuestionFast = (
  data: RawQuestionData,
  lookupMaps: HierarchyLookupMaps | null
): { errors: string[]; specialityId: string | null } => {
  const errors: string[] = [];
  let specialityId: string | null = null;

  // Hierarchy validation
  if (!data.industry_segment) errors.push("Industry segment is required");
  if (!data.expertise_level) errors.push("Expertise level is required");
  if (!data.proficiency_area) errors.push("Proficiency area is required");
  if (!data.sub_domain) errors.push("Sub-domain is required");
  if (!data.speciality) errors.push("Speciality is required");

  // Resolve hierarchy if all fields present - O(1) with lookup maps
  if (data.industry_segment && data.expertise_level && data.proficiency_area && data.sub_domain && data.speciality && lookupMaps) {
    const resolved = resolveHierarchyFast(
      lookupMaps,
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

  // Options validation
  const emptyOptionIndexes = data.options
    .map((opt, i) => opt === "" ? (i + 1) : null)
    .filter((n): n is number => n !== null);

  if (emptyOptionIndexes.length > 0) {
    errors.push(`Empty option(s): option_${emptyOptionIndexes.join(", option_")}`);
  } else if (data.options.length !== 4) {
    errors.push(`Exactly 4 options are required (found ${data.options.length})`);
  }

  // Correct option validation
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

  // NOTE: Capability tags are NOT validated here anymore - they are auto-created

  // Expected answer guidance validation
  if (data.expected_answer_guidance && data.expected_answer_guidance.length > 2000) {
    errors.push("Expected answer guidance must be 2000 characters or less");
  }

  return { errors, specialityId };
};

// Check if file has valid extension
const isValidFileExtension = (filename: string): boolean => {
  const ext = filename.toLowerCase();
  return ext.endsWith(".xlsx") || ext.endsWith(".xls");
};

// Extract error code from Supabase/PostgreSQL errors
const extractErrorCode = (error: unknown): string | undefined => {
  if (error && typeof error === 'object') {
    if ('code' in error) return String((error as { code: string }).code);
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
  const [parseProgress, setParseProgress] = React.useState<number>(0);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState(0);
  const [currentRowInfo, setCurrentRowInfo] = React.useState<string>("");
  const [importResults, setImportResults] = React.useState<{
    success: number;
    failed: number;
    deleted: number;
    tagsCreated: number;
    tagsLinked: number;
    errors: string[];
    failures: ImportFailure[];
    wasCancelled?: boolean;
    durationMs?: number;
  } | null>(null);
  
  // Real-time import counters
  const [importedCount, setImportedCount] = React.useState(0);
  const [successCount, setSuccessCount] = React.useState(0);
  const [failedCount, setFailedCount] = React.useState(0);

  // Import mode
  const [importMode, setImportMode] = React.useState<ImportMode>("replace");
  const [existingQuestionCount, setExistingQuestionCount] = React.useState<number>(0);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  // Tag summary state
  const [tagSummary, setTagSummary] = React.useState<TagSummary | null>(null);

  // Import statistics for dashboard
  const [importStatistics, setImportStatistics] = React.useState<ImportStatistics | null>(null);

  // AbortController for cancellable imports
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const queryClient = useQueryClient();
  const deleteMutation = useDeleteQuestionsBySpecialities();
  const bulkInsertMutation = useBulkInsertQuestions();
  const bulkUpsertTagsMutation = useBulkUpsertCapabilityTags();
  const bulkInsertTagLinksMutation = useBulkInsertQuestionTags();
  const { data: capabilityTags = [] } = useCapabilityTags();
  const { lookupMaps, isLoading: hierarchyLoading } = useHierarchyLookupMaps();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setFile(null);
      setParsedQuestions([]);
      setParseError(null);
      setParseProgress(0);
      setIsParsing(false);
      setIsImporting(false);
      setImportProgress(0);
      setCurrentRowInfo("");
      setImportResults(null);
      setImportMode("replace");
      setExistingQuestionCount(0);
      setShowConfirmDialog(false);
      setTagSummary(null);
      setImportStatistics(null);
    }
  }, [open]);

  // Compute tag summary when parsed questions change
  React.useEffect(() => {
    if (parsedQuestions.length > 0) {
      const allTags = new Set<string>();
      parsedQuestions.forEach(q => {
        q.capability_tags.forEach(tag => {
          allTags.add(tag.toLowerCase().trim());
        });
      });

      const existingTagNames = capabilityTags.map(t => t.name.toLowerCase());
      const newTags = [...allTags].filter(tag => !existingTagNames.includes(tag));

      setTagSummary({
        total: allTags.size,
        existing: allTags.size - newTags.length,
        new: newTags.length,
        newTags,
      });
    } else {
      setTagSummary(null);
    }
  }, [parsedQuestions, capabilityTags]);

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

  // Chunked Excel parsing with progress updates
  const parseExcelChunked = async (file: File): Promise<ParsedQuestion[]> => {
    const XLSX = await import("xlsx");
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    const sheetName = workbook.SheetNames.find(name => name.toLowerCase() === "questions") || workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error("Excel file has no sheets");
    }

    const worksheet = workbook.Sheets[sheetName];
    const data: (string | number | null | undefined)[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
    });

    if (data.length < 2) {
      throw new Error("Excel file must have a header row and at least one data row");
    }

    // Detect option columns
    const headerRow = data[0] as (string | number | null | undefined)[];
    const optionColumnIndexes: number[] = [];
    
    headerRow.forEach((header, idx) => {
      const headerStr = String(header || '').toLowerCase().trim();
      if (headerStr === 'option_1' || headerStr === 'option_2' || 
          headerStr === 'option_3' || headerStr === 'option_4') {
        optionColumnIndexes.push(idx);
      }
    });

    if (optionColumnIndexes.length !== 4) {
      throw new Error(`Excel must have exactly 4 option columns (option_1-option_4). Found ${optionColumnIndexes.length}.`);
    }

    // Calculate dynamic column positions
    const optionCount = optionColumnIndexes.length;
    const firstOptionIndex = optionColumnIndexes[0];
    const correctOptionIndex = firstOptionIndex + optionCount;
    const difficultyIndex = correctOptionIndex + 1;
    const questionTypeIndex = correctOptionIndex + 2;
    const usageModeIndex = correctOptionIndex + 3;
    const capabilityTagsIndex = correctOptionIndex + 4;
    const guidanceIndex = correctOptionIndex + 5;

    const dataRows = data.slice(1);
    const totalRows = dataRows.length;
    const questions: ParsedQuestion[] = [];

    // Process in chunks with progress updates
    for (let chunkStart = 0; chunkStart < totalRows; chunkStart += PARSE_CHUNK_SIZE) {
      const chunkEnd = Math.min(chunkStart + PARSE_CHUNK_SIZE, totalRows);
      
      for (let i = chunkStart; i < chunkEnd; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2;

        // Skip empty rows
        if (row.every(cell => !cell || String(cell).trim() === "")) {
          continue;
        }

        const industry_segment = String(row[0] || "").trim();
        const expertise_level = String(row[1] || "").trim();
        const proficiency_area = String(row[2] || "").trim();
        const sub_domain = String(row[3] || "").trim();
        const speciality = String(row[4] || "").trim();
        const question_text = String(row[5] || "").trim();
        const options = optionColumnIndexes.map(idx => String(row[idx] || "").trim());
        const correct_option = parseInt(String(row[correctOptionIndex] || "1"), 10);
        const difficulty = row[difficultyIndex] ? String(row[difficultyIndex]).trim().toLowerCase() : null;
        const question_type = row[questionTypeIndex] ? String(row[questionTypeIndex]).trim().toLowerCase() : "conceptual";
        const usage_mode = row[usageModeIndex] ? String(row[usageModeIndex]).trim().toLowerCase() : "both";
        
        const capabilityTagsRaw = row[capabilityTagsIndex] ? String(row[capabilityTagsIndex]).trim() : "";
        const capability_tags = capabilityTagsRaw
          ? capabilityTagsRaw.split(",").map(t => t.trim()).filter(Boolean)
          : [];

        const expected_answer_guidance = row[guidanceIndex] ? String(row[guidanceIndex]).trim() : null;

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

        const { errors, specialityId } = validateQuestionFast(rawData, lookupMaps);

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

      // Update progress and yield to browser
      setParseProgress(Math.round((chunkEnd / totalRows) * 100));
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return questions;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const filename = selectedFile.name.toLowerCase();

    if (!isValidFileExtension(filename)) {
      setParseError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setParseError(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setFile(selectedFile);
    setParseError(null);
    setImportResults(null);
    setParseProgress(0);
    setIsParsing(true);

    try {
      const questions = await parseExcelChunked(selectedFile);
      setParsedQuestions(questions);
      logInfo(`Parsed ${questions.length} questions from Excel`, {
        operation: 'parse_excel_complete',
        component: 'QuestionImportDialog',
      });
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Failed to parse file");
      setParsedQuestions([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
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

  const handleImportClick = () => {
    if (importMode === "replace" && existingQuestionCount > 0) {
      setShowConfirmDialog(true);
    } else {
      handleImport();
    }
  };

  const handleCancelImport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      logInfo("Question import cancelled by user", {
        operation: 'import_questions_cancelled',
        component: 'QuestionImportDialog',
      });
    }
  };

  // =====================================================
  // ENTERPRISE BULK IMPORT FLOW
  // =====================================================
  const handleImport = async () => {
    setShowConfirmDialog(false);
    const validQuestions = parsedQuestions.filter((q) => q.isValid && !q.isSkipped);
    if (validQuestions.length === 0) return;

    const importStartTime = Date.now();
    const uniqueSpecialityIds = [...new Set(validQuestions.map(q => q.speciality_id).filter((id): id is string => !!id))];

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    logInfo(`Enterprise import started: ${validQuestions.length} questions`, {
      operation: 'import_questions_start',
      component: 'QuestionImportDialog',
    });

    setIsImporting(true);
    setImportProgress(0);
    setCurrentRowInfo("");
    setImportedCount(0);
    setSuccessCount(0);
    setFailedCount(0);

    await new Promise(resolve => setTimeout(resolve, 50));

    const results = { 
      success: 0, 
      failed: 0, 
      deleted: 0, 
      tagsCreated: 0,
      tagsLinked: 0,
      errors: [] as string[],
      failures: [] as ImportFailure[],
      wasCancelled: false,
      durationMs: 0,
    };

    // Track inserted questions for statistics (declared outside try for finally access)
    const insertedQuestions: { id: string; tags: string[]; rowNumber: number }[] = [];

    try {
      // =====================================================
      // PHASE 1: Auto-create missing capability tags
      // =====================================================
      if (tagSummary && tagSummary.newTags.length > 0) {
        setCurrentRowInfo(`Creating ${tagSummary.newTags.length} new capability tags...`);
        
        try {
          const tagResults = await bulkUpsertTagsMutation.mutateAsync(tagSummary.newTags);
          results.tagsCreated = tagResults.filter(r => r.was_created).length;
          
          // Refresh capability tags cache immediately
          await queryClient.invalidateQueries({ queryKey: ["capability_tags"] });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          results.errors.push(`Failed to create capability tags: ${errorMsg}`);
          // Continue with import - tags just won't be linked
        }
      }

      if (signal.aborted) {
        results.wasCancelled = true;
        throw new Error("Import cancelled");
      }

      // =====================================================
      // PHASE 2: Delete existing questions (Replace mode)
      // =====================================================
      if (importMode === "replace" && uniqueSpecialityIds.length > 0) {
        setCurrentRowInfo("Deleting existing questions...");
        
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
            ? `Pre-import deletion failed: Too many specialities (${uniqueSpecialityIds.length}). Use "Add Only" mode.`
            : `Pre-import deletion failed: ${errorMsg}`;
          
          results.errors.push(`${displayError} [${deleteCorrelationId}]`);
          results.durationMs = Date.now() - importStartTime;
          setImportResults(results);
          setIsImporting(false);
          return;
        }
      }

      if (signal.aborted) {
        results.wasCancelled = true;
        throw new Error("Import cancelled");
      }

      // =====================================================
      // PHASE 3: Bulk insert questions in batches
      // =====================================================
      const totalQuestions = validQuestions.length;
      const totalBatches = Math.ceil(totalQuestions / BULK_INSERT_BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        if (signal.aborted) {
          results.wasCancelled = true;
          break;
        }

        const startIdx = batchIndex * BULK_INSERT_BATCH_SIZE;
        const endIdx = Math.min(startIdx + BULK_INSERT_BATCH_SIZE, totalQuestions);
        const batch = validQuestions.slice(startIdx, endIdx);

        setCurrentRowInfo(`Batch ${batchIndex + 1}/${totalBatches}: Rows ${batch[0].rowNumber}-${batch[batch.length - 1].rowNumber}`);

        try {
          // Prepare batch for bulk insert
          const bulkPayload: BulkQuestionInput[] = batch.map(q => ({
            question_text: q.question_text,
            options: formatQuestionOptions(q.options.map((text, idx) => ({ index: idx + 1, text }))),
            correct_option: q.correct_option,
            difficulty: q.difficulty,
            question_type: q.question_type,
            usage_mode: q.usage_mode,
            expected_answer_guidance: q.expected_answer_guidance,
            speciality_id: q.speciality_id!,
            row_number: q.rowNumber,
          }));

          const insertResults = await bulkInsertMutation.mutateAsync(bulkPayload);

          // Track inserted questions for tag linking
          insertResults.forEach((result, idx) => {
            const originalQuestion = batch[idx];
            insertedQuestions.push({
              id: result.inserted_id,
              tags: originalQuestion.capability_tags,
              rowNumber: originalQuestion.rowNumber,
            });
          });

          results.success += insertResults.length;
          setSuccessCount(prev => prev + insertResults.length);
        } catch (error) {
          // Batch failed - track all questions in batch as failed
          const batchCorrelationId = generateCorrelationId();
          const errorMsg = error instanceof Error ? error.message : "Unknown error";

          batch.forEach(q => {
            results.failures.push({
              rowNumber: q.rowNumber,
              correlationId: batchCorrelationId,
              phase: 'bulk_insert',
              errorMessage: errorMsg,
              errorCode: extractErrorCode(error),
              rowData: {
                question_text: q.question_text.slice(0, 100),
                speciality: q.speciality,
                speciality_id: q.speciality_id,
                options_count: q.options.length,
                capability_tags: q.capability_tags,
              },
              timestamp: new Date().toISOString(),
            });
          });

          results.failed += batch.length;
          setFailedCount(prev => prev + batch.length);
          results.errors.push(`Batch ${batchIndex + 1} failed: ${errorMsg}`);
        }

        const processedCount = Math.min(endIdx, totalQuestions);
        setImportedCount(processedCount);
        setImportProgress(Math.round((processedCount / totalQuestions) * 100));

        await new Promise(resolve => setTimeout(resolve, BATCH_YIELD_DELAY_MS));
      }

      if (signal.aborted) {
        results.wasCancelled = true;
        throw new Error("Import cancelled");
      }

      // =====================================================
      // PHASE 4: Bulk link capability tags
      // =====================================================
      if (insertedQuestions.length > 0) {
        setCurrentRowInfo("Linking capability tags...");
        
        // Fetch refreshed capability tags
        const { data: refreshedTags } = await supabase
          .from("capability_tags")
          .select("id, name")
          .eq("is_active", true);

        const tagLookup = new Map<string, string>();
        (refreshedTags || []).forEach((tag: { id: string; name: string }) => {
          tagLookup.set(tag.name.toLowerCase(), tag.id);
        });

        // Build tag mappings
        const tagMappings: { question_id: string; capability_tag_id: string }[] = [];
        
        for (const q of insertedQuestions) {
          for (const tagName of q.tags) {
            const tagId = tagLookup.get(tagName.toLowerCase());
            if (tagId) {
              tagMappings.push({
                question_id: q.id,
                capability_tag_id: tagId,
              });
            }
          }
        }

        if (tagMappings.length > 0) {
          try {
            const linkedCount = await bulkInsertTagLinksMutation.mutateAsync(tagMappings);
            results.tagsLinked = linkedCount;
          } catch (error) {
            logWarning("Failed to bulk link capability tags", {
              operation: 'bulk_link_capability_tags',
              component: 'QuestionImportDialog',
            });
            results.errors.push("Some capability tags may not be linked");
          }
        }
      }

    } catch (unexpectedError) {
      if (!results.wasCancelled) {
        results.errors.push(`Import crashed: ${unexpectedError instanceof Error ? unexpectedError.message : 'Unknown'}`);
      }
    } finally {
      results.durationMs = Date.now() - importStartTime;
      
      logInfo(results.wasCancelled ? "Import cancelled" : "Import completed", {
        operation: 'import_questions_complete',
        component: 'QuestionImportDialog',
      });

      // Compute import statistics for dashboard
      const importedQuestions = insertedQuestions.map(iq => {
        const matchingQuestion = validQuestions.find(vq => vq.rowNumber === iq.rowNumber);
        return matchingQuestion;
      }).filter(Boolean) as typeof validQuestions;

      // Aggregate by difficulty
      const byDifficulty = Object.entries(
        importedQuestions.reduce((acc, q) => {
          const key = q.difficulty || 'applied';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, count]) => ({ name, count }));

      // Aggregate by question type
      const byQuestionType = Object.entries(
        importedQuestions.reduce((acc, q) => {
          acc[q.question_type] = (acc[q.question_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, count]) => ({ name, count }));

      // Aggregate by usage mode
      const byUsageMode = Object.entries(
        importedQuestions.reduce((acc, q) => {
          acc[q.usage_mode] = (acc[q.usage_mode] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, count]) => ({ name, count }));

      // Aggregate by speciality
      const bySpeciality = Object.entries(
        importedQuestions.reduce((acc, q) => {
          acc[q.speciality] = (acc[q.speciality] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, count]) => ({ name, count }));

      setImportStatistics({
        totalImported: results.success,
        totalFailed: results.failed,
        totalDeleted: results.deleted,
        tagsCreated: results.tagsCreated,
        tagsLinked: results.tagsLinked,
        durationMs: results.durationMs,
        wasCancelled: results.wasCancelled || false,
        byDifficulty,
        byQuestionType,
        byUsageMode,
        bySpeciality,
      });

      abortControllerRef.current = null;
      setCurrentRowInfo("");
      setImportResults(results);
      setIsImporting(false);

      queryClient.invalidateQueries({ queryKey: ["question_bank"] });
      queryClient.invalidateQueries({ queryKey: ["capability_tags"] });
    }
  };

  // Export failed rows
  const downloadFailedRows = () => {
    if (!importResults?.failures.length) return;
    
    const failureData = [
      ["Row", "Correlation ID", "Phase", "Error", "Error Code", "Question (Preview)", "Speciality", "Timestamp"],
      ...importResults.failures.map(f => [
        f.rowNumber,
        f.correlationId,
        f.phase,
        f.errorMessage,
        f.errorCode || '',
        f.rowData.question_text,
        f.rowData.speciality,
        f.timestamp,
      ])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(failureData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Failed Imports");
    XLSX.writeFile(wb, `import_failures_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export invalid preview rows
  const downloadInvalidPreviewRows = async () => {
    const XLSX = await import("xlsx");
    const invalidRows = parsedQuestions.filter(q => !q.isValid || q.isSkipped);
    if (invalidRows.length === 0) return;

    const exportData = [
      ["Row", "Status", "Errors", "Speciality", "Question (Preview)"],
      ...invalidRows.map(q => [
        q.rowNumber,
        q.isSkipped ? "Skipped" : "Invalid",
        q.isSkipped ? q.skipReason : q.errors.join(" | "),
        q.speciality,
        q.question_text.slice(0, 200),
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invalid Rows");
    XLSX.writeFile(wb, `import_issues_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const uniqueSpecialityCount = React.useMemo(() => {
    const validQuestions = parsedQuestions.filter(q => q.isValid && !q.isSkipped && q.speciality_id);
    return new Set(validQuestions.map(q => q.speciality_id)).size;
  }, [parsedQuestions]);

  const downloadExcelTemplate = () => {
    const questionsSheet = XLSX.utils.aoa_to_sheet(EXCEL_TEMPLATE_DATA);
    const instructionsSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS_SHEET_DATA);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, questionsSheet, "Questions");
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

    XLSX.writeFile(workbook, "question_import_template.xlsx");
  };

  const validCount = parsedQuestions.filter((q) => q.isValid && !q.isSkipped).length;
  const invalidCount = parsedQuestions.filter((q) => !q.isValid && !q.isSkipped).length;
  const skippedCount = parsedQuestions.filter((q) => q.isSkipped).length;

  // Format duration for display
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds % 60}s`;
  };

  // Error summary
  const errorSummary = React.useMemo(() => {
    const summary: Record<string, number> = {};
    parsedQuestions
      .filter(q => !q.isValid && !q.isSkipped)
      .forEach(q => {
        q.errors.forEach(err => {
          const key = err.replace(/Row \d+/g, '').replace(/option_\d+/g, 'option_N').trim();
          summary[key] = (summary[key] || 0) + 1;
        });
      });
    return Object.entries(summary)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
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
              <Badge variant="outline" className="ml-2">Enterprise Scale</Badge>
            </DialogTitle>
            <DialogDescription>
              Upload up to {MAX_FILE_SIZE_MB}MB Excel file (~15,000 questions). Auto-creates missing capability tags.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Status Bar */}
        <div className="flex-shrink-0 px-6 py-3 space-y-3 border-b bg-muted/30">
          {hierarchyLoading && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Loading hierarchy data for validation...</AlertDescription>
            </Alert>
          )}

          {isParsing && (
            <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Parsing Excel file... {parseProgress}%
                </span>
              </div>
              <Progress value={parseProgress} className="h-2" />
            </div>
          )}

          {parsedQuestions.length > 0 && !importResults && !isImporting && !isParsing && validCount > 0 && (
            <div className="p-3 border-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  ✅ Ready to import <strong>{validCount.toLocaleString()}</strong> questions
                </p>
                <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  Click "Import Questions" below
                </Badge>
              </div>
            </div>
          )}

          {isImporting && (
            <div className="space-y-3 p-4 border-2 border-primary rounded-lg bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div>
                    <p className="text-lg font-semibold text-primary">
                      {importedCount.toLocaleString()} of {validCount.toLocaleString()} questions
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {importProgress}% complete
                    </p>
                  </div>
                </div>
                
                <Button variant="destructive" size="sm" onClick={handleCancelImport} className="gap-2">
                  <StopCircle className="h-4 w-4" />
                  Cancel
                </Button>
              </div>

              <Progress value={importProgress} className="h-3" />
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 font-medium">{successCount.toLocaleString()} succeeded</span>
                </div>
                {failedCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-600 font-medium">{failedCount.toLocaleString()} failed</span>
                  </div>
                )}
              </div>

              {currentRowInfo && (
                <p className="text-xs text-muted-foreground">{currentRowInfo}</p>
              )}
            </div>
          )}

          {importResults && (
            <Alert variant={importResults.failed === 0 && !importResults.wasCancelled ? "default" : "destructive"}>
              {importResults.wasCancelled ? <StopCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {importResults.wasCancelled 
                    ? `Cancelled: ${importResults.success.toLocaleString()} imported`
                    : `Complete: ${importResults.success.toLocaleString()} imported`}
                  {importResults.deleted > 0 && `, ${importResults.deleted.toLocaleString()} deleted`}
                  {importResults.tagsCreated > 0 && `, ${importResults.tagsCreated} new tags`}
                  {importResults.failed > 0 && `, ${importResults.failed.toLocaleString()} failed`}
                </span>
                {importResults.durationMs && (
                  <Badge variant="outline" className="ml-2">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDuration(importResults.durationMs)}
                  </Badge>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-4">
            {/* Template Download */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="text-sm">
                <strong>Need a template?</strong> Download the Excel template.
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
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {file ? file.name : "Drop your Excel file here or click to browse"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports .xlsx/.xls up to {MAX_FILE_SIZE_MB}MB
                  </p>
                </label>
              </div>
            )}

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
                    {validCount.toLocaleString()} valid
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="destructive">
                      <X className="h-3 w-3 mr-1" />
                      {invalidCount.toLocaleString()} with errors
                    </Badge>
                  )}
                  {skippedCount > 0 && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                      {skippedCount.toLocaleString()} skipped
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {uniqueSpecialityCount.toLocaleString()} specialities
                  </Badge>
                </div>

                {/* Capability Tags Summary */}
                {tagSummary && tagSummary.total > 0 && (
                  <div className={`p-3 border rounded-lg ${
                    tagSummary.new > 0 
                      ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700" 
                      : "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Tags className="h-4 w-4" />
                      <span className="text-sm font-medium">Capability Tags Summary</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total unique:</span>{" "}
                        <strong>{tagSummary.total}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Existing:</span>{" "}
                        <strong className="text-green-600">{tagSummary.existing}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">New to create:</span>{" "}
                        <strong className={tagSummary.new > 0 ? "text-amber-600" : "text-green-600"}>
                          {tagSummary.new}
                        </strong>
                      </div>
                    </div>
                    {tagSummary.newTags.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        New tags: {tagSummary.newTags.slice(0, 5).join(", ")}
                        {tagSummary.newTags.length > 5 && ` +${tagSummary.newTags.length - 5} more`}
                      </div>
                    )}
                  </div>
                )}

                {/* Error Summary */}
                {invalidCount > 0 && (
                  <div className="p-3 border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">
                        Top errors ({invalidCount.toLocaleString()} invalid):
                      </p>
                      <Button variant="outline" size="sm" onClick={downloadInvalidPreviewRows} className="h-7 text-xs">
                        <Download className="h-3 w-3 mr-1" />
                        Download Issues
                      </Button>
                    </div>
                    <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                      {errorSummary.map(([errorType, count]) => (
                        <div key={errorType} className="flex items-center justify-between">
                          <span className="text-red-600 dark:text-red-300 truncate max-w-[85%]">• {errorType}</span>
                          <Badge variant="destructive" className="ml-2">{count}</Badge>
                        </div>
                      ))}
                    </div>
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
                          Delete {existingQuestionCount.toLocaleString()} existing, import {validCount.toLocaleString()} new
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
                          Keep existing, add {validCount.toLocaleString()} new
                        </p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Virtualized Preview Table */}
                <VirtualizedPreviewTable 
                  questions={parsedQuestions} 
                  className="h-[350px]"
                />
              </div>
            )}

            {/* Import Statistics Dashboard */}
            {importResults && importStatistics && importStatistics.totalImported > 0 && (
              <ImportStatisticsDashboard statistics={importStatistics} />
            )}

            {/* Import Failures Detail */}
            {importResults && importResults.failures.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-red-600">
                    {importResults.failures.length.toLocaleString()} failures:
                  </p>
                  <Button variant="outline" size="sm" onClick={downloadFailedRows}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Failed Rows
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Fixed Footer */}
        <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">v2026-01-24.2 • Enterprise Bulk Import</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {importResults ? "Close" : "Cancel"}
            </Button>
            {!importResults && (
              <Button
                onClick={handleImportClick}
                disabled={validCount === 0 || isImporting || hierarchyLoading || isParsing}
                variant={importMode === "replace" && existingQuestionCount > 0 ? "destructive" : "default"}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    {importMode === "replace" ? <RefreshCw className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {importMode === "replace" 
                      ? `Replace & Import ${validCount.toLocaleString()}`
                      : `Add ${validCount.toLocaleString()}`
                    }
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Replace Import</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>This will:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Delete {existingQuestionCount.toLocaleString()} existing questions</li>
                  <li>Import {validCount.toLocaleString()} new questions</li>
                  {tagSummary && tagSummary.new > 0 && (
                    <li>Create {tagSummary.new} new capability tags</li>
                  )}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
