import * as React from "react";
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

const CSV_TEMPLATE = `question_text,option_1,option_2,option_3,option_4,correct_option,difficulty_level
"What is the primary purpose of React hooks?","To add state to functional components","To create class components","To style components","To handle routing",1,3
"Which hook is used for side effects in React?","useState","useEffect","useContext","useReducer",2,2`;

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
      const errors: string[] = [];

      // Extract values
      const question_text = values[0]?.trim() || "";
      const options = [
        values[1]?.trim(),
        values[2]?.trim(),
        values[3]?.trim(),
        values[4]?.trim(),
      ].filter((opt): opt is string => !!opt);
      const correct_option = parseInt(values[5] || "0", 10);
      const difficulty_level = values[6] ? parseInt(values[6], 10) : null;

      // Validate
      if (!question_text) {
        errors.push("Question text is required");
      } else if (question_text.length < 10) {
        errors.push("Question must be at least 10 characters");
      } else if (question_text.length > 2000) {
        errors.push("Question must be 2000 characters or less");
      }

      if (options.length < 2) {
        errors.push("At least 2 options are required");
      } else if (options.length > 6) {
        errors.push("Maximum 6 options allowed");
      }

      if (!correct_option || correct_option < 1) {
        errors.push("Valid correct option (1-based) is required");
      } else if (correct_option > options.length) {
        errors.push(`Correct option ${correct_option} exceeds number of options (${options.length})`);
      }

      if (difficulty_level !== null && (difficulty_level < 1 || difficulty_level > 5)) {
        errors.push("Difficulty level must be between 1 and 5");
      }

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      setParseError("Please upload a CSV file");
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
      const content = await selectedFile.text();
      const questions = parseCSV(content);
      setParsedQuestions(questions);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Failed to parse CSV");
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

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "question_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedQuestions.filter((q) => q.isValid).length;
  const invalidCount = parsedQuestions.filter((q) => !q.isValid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Questions from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import questions into{" "}
            <strong>{specialityName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="text-sm">
              <p className="font-medium">CSV Format</p>
              <p className="text-muted-foreground">
                question_text, option_1, option_2, option_3, option_4, correct_option, difficulty_level
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" />
              Template
            </Button>
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
                Drop your CSV file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum file size: 5MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
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
