import * as React from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Download } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useCreateQuestion, formatQuestionOptions } from "@/hooks/queries/useQuestionBank";

interface ParsedQuestion {
  rowNumber: number;
  question_text: string;
  options: string[];
  correct_option: number;
  difficulty_level: number | null;
  isValid: boolean;
  errors: string[];
}

interface QuestionImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specialityId: string;
  specialityName: string;
}

interface RawQuestionData {
  question_text: string;
  options: string[];
  correct_option: number;
  difficulty_level: number | null;
}

const CSV_TEMPLATE = `question_text,option_1,option_2,option_3,option_4,option_5,option_6,correct_option,difficulty_level
"What is the capital of France?","Berlin","Madrid","Paris","Rome","","",3,2
"Which planet is known as the Red Planet?","Venus","Mars","Jupiter","Saturn","","",2,1
"What is 15 + 27?","32","42","52","62","","",2,1
"Which of the following is a primary color?","Green","Orange","Purple","Blue","","",4,3`;

const EXCEL_TEMPLATE_DATA = [
  ["question_text", "option_1", "option_2", "option_3", "option_4", "option_5", "option_6", "correct_option", "difficulty_level"],
  ["What is the capital of France?", "Berlin", "Madrid", "Paris", "Rome", "", "", 3, 2],
  ["Which planet is known as the Red Planet?", "Venus", "Mars", "Jupiter", "Saturn", "", "", 2, 1],
  ["What is 15 + 27?", "32", "42", "52", "62", "", "", 2, 1],
  ["Which of the following is a primary color?", "Green", "Orange", "Purple", "Blue", "", "", 4, 3],
];

const INSTRUCTIONS_SHEET_DATA = [
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

// Shared validation logic for both CSV and Excel
const validateQuestion = (data: RawQuestionData): string[] => {
  const errors: string[] = [];

  if (!data.question_text) {
    errors.push("Question text is required");
  } else if (data.question_text.length < 10) {
    errors.push("Question must be at least 10 characters");
  } else if (data.question_text.length > 2000) {
    errors.push("Question must be 2000 characters or less");
  }

  if (data.options.length < 2) {
    errors.push("At least 2 options are required");
  } else if (data.options.length > 6) {
    errors.push("Maximum 6 options allowed");
  }

  if (!data.correct_option || data.correct_option < 1) {
    errors.push("Valid correct option (1-based) is required");
  } else if (data.correct_option > data.options.length) {
    errors.push(`Correct option ${data.correct_option} exceeds number of options (${data.options.length})`);
  }

  if (data.difficulty_level !== null && (data.difficulty_level < 1 || data.difficulty_level > 5)) {
    errors.push("Difficulty level must be between 1 and 5");
  }

  return errors;
};

// Check if file has valid extension
const isValidFileExtension = (filename: string): boolean => {
  const ext = filename.toLowerCase();
  return ext.endsWith(".csv") || ext.endsWith(".xlsx") || ext.endsWith(".xls");
};

export function QuestionImportDialog({
  open,
  onOpenChange,
  specialityId,
  specialityName,
}: QuestionImportDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = React.useState<ParsedQuestion[]>([]);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importResults, setImportResults] = React.useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const createMutation = useCreateQuestion();
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
    }
  }, [open]);

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current);

    return values;
  };

  const parseCSV = (content: string): ParsedQuestion[] => {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error("CSV must have a header row and at least one data row");
    }

    // Skip header row
    const dataLines = lines.slice(1);
    const questions: ParsedQuestion[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const rowNumber = i + 2; // 1-indexed, accounting for header

      // Parse CSV line (handling quoted values)
      const values = parseCSVLine(line);

      // Extract values
      const question_text = values[0]?.trim() || "";
      const options = [
          values[1]?.trim(),
          values[2]?.trim(),
          values[3]?.trim(),
          values[4]?.trim(),
          values[5]?.trim(),
          values[6]?.trim(),
        ].filter((opt): opt is string => !!opt);
      const correct_option = parseInt(values[7] || "0", 10);
      const difficulty_level = values[8] ? parseInt(values[8], 10) : null;

      // Validate using shared function
      const errors = validateQuestion({
        question_text,
        options,
        correct_option,
        difficulty_level,
      });

      questions.push({
        rowNumber,
        question_text,
        options,
        correct_option,
        difficulty_level,
        isValid: errors.length === 0,
        errors,
      });
    }

    return questions;
  };

  const parseExcel = async (file: File): Promise<ParsedQuestion[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // Use the first sheet
    const sheetName = workbook.SheetNames[0];
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

    // Skip header row, parse data rows
    const dataRows = data.slice(1);
    const questions: ParsedQuestion[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // Account for header

      // Extract values
      const question_text = String(row[0] || "").trim();
        const options = [
          String(row[1] || "").trim(),
          String(row[2] || "").trim(),
          String(row[3] || "").trim(),
          String(row[4] || "").trim(),
          String(row[5] || "").trim(),
          String(row[6] || "").trim(),
        ].filter(Boolean);
      const correct_option = parseInt(String(row[7] || "0"), 10);
      const difficulty_level = row[8] ? parseInt(String(row[8]), 10) : null;

      // Validate using shared function
      const errors = validateQuestion({
        question_text,
        options,
        correct_option,
        difficulty_level,
      });

      questions.push({
        rowNumber,
        question_text,
        options,
        correct_option,
        difficulty_level,
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
      setParseError("Please upload a CSV or Excel (.xlsx, .xls) file");
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
      let questions: ParsedQuestion[];

      if (filename.endsWith(".csv")) {
        const content = await selectedFile.text();
        questions = parseCSV(content);
      } else {
        // Excel file (.xlsx or .xls)
        questions = await parseExcel(selectedFile);
      }

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

  const handleImport = async () => {
    const validQuestions = parsedQuestions.filter((q) => q.isValid);
    if (validQuestions.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < validQuestions.length; i++) {
      const q = validQuestions[i];

      try {
        const formattedOptions = formatQuestionOptions(
          q.options.map((text, idx) => ({ index: idx + 1, text }))
        );

        await createMutation.mutateAsync({
          question_text: q.question_text,
          options: formattedOptions as unknown as { index: number; text: string }[],
          correct_option: q.correct_option,
          difficulty_level: q.difficulty_level,
          is_active: true,
          speciality_id: specialityId,
        });

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

  const downloadCSVTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "question_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcelTemplate = () => {
    // Create Questions sheet
    const questionsSheet = XLSX.utils.aoa_to_sheet(EXCEL_TEMPLATE_DATA);
    questionsSheet["!cols"] = [
      { wch: 50 }, // question_text
      { wch: 30 }, // option_1
      { wch: 30 }, // option_2
      { wch: 30 }, // option_3
      { wch: 30 }, // option_4
      { wch: 20 }, // option_5
      { wch: 20 }, // option_6
      { wch: 15 }, // correct_option
      { wch: 15 }, // difficulty_level
    ];

    // Create Instructions sheet
    const instructionsSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS_SHEET_DATA);
    instructionsSheet["!cols"] = [
      { wch: 25 },
      { wch: 50 },
      { wch: 15 },
      { wch: 45 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, questionsSheet, "Questions");
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

    XLSX.writeFile(workbook, "question_import_template.xlsx");
  };

  const validCount = parsedQuestions.filter((q) => q.isValid).length;
  const invalidCount = parsedQuestions.filter((q) => !q.isValid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Questions
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to bulk import questions into{" "}
            <strong>{specialityName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="text-sm">
              <p className="font-medium">Download template with instructions (supports up to 6 options)</p>
              <p className="text-muted-foreground">
                question_text, option_1-6, correct_option (1-6), difficulty_level (1-5)
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadCSVTemplate}>
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={downloadExcelTemplate}>
                <Download className="h-4 w-4 mr-1" />
                Excel
              </Button>
            </div>
          </div>

          {/* File Upload */}
          {!file && !importResults && (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm font-medium">
                Drop your CSV or Excel file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports .csv, .xlsx, .xls (max 5MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Parsed Preview */}
          {file && parsedQuestions.length > 0 && !importResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{file.name}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      setParsedQuestions([]);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {validCount} valid
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {invalidCount} invalid
                    </Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="h-[300px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead className="w-20">Options</TableHead>
                      <TableHead className="w-20">Answer</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedQuestions.map((q) => (
                      <TableRow
                        key={q.rowNumber}
                        className={!q.isValid ? "bg-destructive/5" : ""}
                      >
                        <TableCell>{q.rowNumber}</TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="line-clamp-2 text-sm">{q.question_text}</p>
                            {!q.isValid && (
                              <p className="text-xs text-destructive mt-1">
                                {q.errors.join("; ")}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{q.options.length}</TableCell>
                        <TableCell>Option {q.correct_option}</TableCell>
                        <TableCell>
                          {q.isValid ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Invalid</Badge>
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
              <div className="flex items-center justify-between text-sm">
                <span>Importing questions...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} />
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-4">
              <Alert variant={importResults.failed === 0 ? "default" : "destructive"}>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Import completed: {importResults.success} questions imported successfully
                  {importResults.failed > 0 && `, ${importResults.failed} failed`}
                </AlertDescription>
              </Alert>

              {importResults.errors.length > 0 && (
                <ScrollArea className="h-[150px] border rounded-md p-3">
                  <div className="space-y-1 text-sm text-destructive">
                    {importResults.errors.map((err, idx) => (
                      <p key={idx}>{err}</p>
                    ))}
                  </div>
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
              onClick={handleImport}
              disabled={isImporting || validCount === 0}
            >
              {isImporting ? "Importing..." : `Import ${validCount} Questions`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
