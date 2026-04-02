/**
 * Interview KIT Import Dialog
 * Excel import with validation and progress tracking
 */

import { useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";
import {
  useInterviewKitCompetencies, useBulkCreateInterviewKitQuestions,
  useBulkDeleteInterviewKitQuestions, InterviewKitQuestionInsert,
} from "@/hooks/queries/useInterviewKitQuestions";
import {
  parseInterviewKitExcel, downloadInterviewKitTemplate, type ParsedQuestion,
} from "./InterviewKitExcelExport";
import { InterviewKitImportPreview } from "./InterviewKitImportPreview";

type ImportMode = "add" | "replace";
type ImportPhase = "upload" | "validating" | "preview" | "importing" | "complete";

interface InterviewKitImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InterviewKitImportDialog({ open, onOpenChange }: InterviewKitImportDialogProps) {
  const [phase, setPhase] = useState<ImportPhase>("upload");
  const [mode, setMode] = useState<ImportMode>("add");
  const [file, setFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [validQuestions, setValidQuestions] = useState<InterviewKitQuestionInsert[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null);

  const { data: industrySegments = [] } = useIndustrySegments();
  const { data: expertiseLevels = [] } = useExpertiseLevels();
  const { data: competencies = [] } = useInterviewKitCompetencies();
  const createMutation = useBulkCreateInterviewKitQuestions();
  const deleteMutation = useBulkDeleteInterviewKitQuestions();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPhase("upload"); setMode("add"); setFile(null);
      setParsedQuestions([]); setValidQuestions([]); setProgress(0);
      setError(null); setResult(null);
    }
    onOpenChange(open);
  };

  const normalize = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, " ");

  const resolveIndustrySegment = useCallback(
    (name: string) => industrySegments.find((s) => normalize(s.name) === normalize(name)),
    [industrySegments]
  );
  const resolveExpertiseLevel = useCallback(
    (name: string) => expertiseLevels.find((l) => normalize(l.name) === normalize(name)),
    [expertiseLevels]
  );
  const resolveCompetency = useCallback(
    (codeOrName: string) => {
      const normalized = normalize(codeOrName);
      return competencies.find((c) => normalize(c.code) === normalized || normalize(c.name) === normalized);
    },
    [competencies]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) { setError("Please upload an Excel file (.xlsx or .xls)"); return; }
    if (selectedFile.size > 50 * 1024 * 1024) { setError("File size must be less than 50MB"); return; }

    setFile(selectedFile); setError(null); setPhase("validating"); setProgress(10);
    try {
      const parsed = await parseInterviewKitExcel(selectedFile);
      setProgress(50);
      const validated: ParsedQuestion[] = [];
      const validInserts: InterviewKitQuestionInsert[] = [];

      for (const q of parsed) {
        const errors = [...q.errors];
        const industry = resolveIndustrySegment(q.industry_segment);
        const level = resolveExpertiseLevel(q.expertise_level);
        const competency = resolveCompetency(q.competency);
        if (!industry && q.industry_segment) errors.push(`Industry segment "${q.industry_segment}" not found`);
        if (!level && q.expertise_level) errors.push(`Expertise level "${q.expertise_level}" not found`);
        if (!competency && q.competency) errors.push(`Competency "${q.competency}" not found`);
        validated.push({ ...q, errors });
        if (errors.length === 0 && industry && level && competency) {
          validInserts.push({ industry_segment_id: industry.id, expertise_level_id: level.id, competency_id: competency.id, question_text: q.question_text, expected_answer: q.expected_answer || null });
        }
      }
      setParsedQuestions(validated); setValidQuestions(validInserts); setProgress(100); setPhase("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse Excel file"); setPhase("upload");
    }
  };

  const handleImport = async () => {
    if (validQuestions.length === 0) return;
    setPhase("importing"); setProgress(0);
    try {
      if (mode === "replace") {
        const affectedCompetencyIds = [...new Set(validQuestions.map((q) => q.competency_id))];
        setProgress(10); await deleteMutation.mutateAsync(affectedCompetencyIds); setProgress(30);
      }
      await createMutation.mutateAsync(validQuestions); setProgress(100);
      setResult({ imported: validQuestions.length, errors: parsedQuestions.filter((q) => q.errors.length > 0).length });
      setPhase("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed"); setPhase("preview");
    }
  };

  const errorCount = parsedQuestions.filter((q) => q.errors.length > 0).length;
  const validCount = parsedQuestions.length - errorCount;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Import Interview KIT Questions
          </DialogTitle>
          <DialogDescription>Upload an Excel file to import questions. Use the template for the correct format.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {phase === "upload" && (
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label>Import Mode</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as ImportMode)} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="add" id="mode-add" />
                    <Label htmlFor="mode-add" className="font-normal cursor-pointer">Add Only — Insert new questions, keep existing</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="mode-replace" />
                    <Label htmlFor="mode-replace" className="font-normal cursor-pointer">Replace — Delete existing questions for imported competencies</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <Label>Select File</Label>
                <div className="flex items-center gap-4">
                  <Input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="flex-1" />
                  <Button variant="outline" size="sm" onClick={downloadInterviewKitTemplate}>
                    <Download className="mr-2 h-4 w-4" /> Download Template
                  </Button>
                </div>
              </div>
              {error && <div className="flex items-center gap-2 text-destructive text-sm"><AlertCircle className="h-4 w-4" />{error}</div>}
            </div>
          )}

          {phase === "validating" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Validating file...</p>
              <Progress value={progress} className="w-64" />
            </div>
          )}

          {phase === "preview" && (
            <InterviewKitImportPreview parsedQuestions={parsedQuestions} validCount={validCount} errorCount={errorCount} error={error} />
          )}

          {phase === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Importing {validQuestions.length} questions...</p>
              <Progress value={progress} className="w-64" />
            </div>
          )}

          {phase === "complete" && result && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h3 className="text-xl font-semibold">Import Complete</h3>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-sm">{result.imported} questions imported</Badge>
                {result.errors > 0 && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 text-sm">{result.errors} rows skipped due to errors</Badge>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {phase === "upload" && <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>}
          {phase === "preview" && (
            <>
              <Button variant="outline" onClick={() => { setPhase("upload"); setFile(null); setParsedQuestions([]); setValidQuestions([]); }}>Back</Button>
              <Button onClick={handleImport} disabled={validQuestions.length === 0}><Upload className="mr-2 h-4 w-4" />Import {validQuestions.length} Questions</Button>
            </>
          )}
          {phase === "complete" && <Button onClick={() => handleOpenChange(false)}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
