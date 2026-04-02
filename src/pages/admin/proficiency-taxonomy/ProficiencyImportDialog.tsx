import * as React from "react";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import {
  parseProficiencyImportFile,
  ImportValidationResult,
} from "./ProficiencyExcelExport";
import { useBulkImportProficiencyTaxonomy } from "@/hooks/queries/useProficiencyTaxonomyAdmin";
import { PreviewStep, ImportingStep, CompleteStep } from "./ProficiencyImportSteps";

interface ProficiencyImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = "upload" | "preview" | "importing" | "complete";

export function ProficiencyImportDialog({ open, onOpenChange }: ProficiencyImportDialogProps) {
  const [step, setStep] = React.useState<ImportStep>("upload");
  const [file, setFile] = React.useState<File | null>(null);
  const [validationResult, setValidationResult] = React.useState<ImportValidationResult | null>(null);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importResult, setImportResult] = React.useState<{
    areasCreated: number; areasUpdated: number; areasDeleted: number;
    subDomainsCreated: number; subDomainsUpdated: number; subDomainsDeleted: number;
    specialitiesCreated: number; specialitiesUpdated: number; specialitiesDeleted: number;
    errors: string[];
  } | null>(null);
  const [isParsing, setIsParsing] = React.useState(false);
  const [replaceExisting, setReplaceExisting] = React.useState(true);

  const bulkImportMutation = useBulkImportProficiencyTaxonomy();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const hasValidExtension = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
    if (!hasValidExtension) { toast.error("Please upload a valid Excel or CSV file"); return; }
    setFile(selectedFile); setIsParsing(true);
    try {
      const result = await parseProficiencyImportFile(selectedFile);
      setValidationResult(result); setStep("preview");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to parse file");
    } finally { setIsParsing(false); }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const fakeEvent = { target: { files: [droppedFile] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      await handleFileChange(fakeEvent);
    }
  };

  const handleImport = async () => {
    if (!validationResult || validationResult.validRows.length === 0) return;
    setStep("importing"); setImportProgress(0);
    try {
      const result = await bulkImportMutation.mutateAsync({
        rows: validationResult.validRows, replaceExisting,
        onProgress: (progress: number) => setImportProgress(progress),
      });
      setImportResult(result); setStep("complete");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed"); setStep("preview");
    }
  };

  const handleClose = () => {
    setStep("upload"); setFile(null); setValidationResult(null);
    setImportProgress(0); setImportResult(null); setReplaceExisting(true);
    onOpenChange(false);
  };

  const resetToUpload = () => {
    setStep("upload"); setFile(null); setValidationResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Import Proficiency Taxonomy
          </DialogTitle>
          <DialogDescription>Upload an Excel or CSV file to bulk import proficiency areas, sub-domains, and specialities</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {step === "upload" && (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
              {isParsing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Parsing file...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm font-medium mb-1">Drag and drop your file here, or click to browse</p>
                  <p className="text-xs text-muted-foreground">Supports .xlsx, .xls, and .csv files</p>
                </>
              )}
            </div>
          )}

          {step === "preview" && validationResult && (
            <PreviewStep
              validationResult={validationResult}
              fileName={file?.name}
              replaceExisting={replaceExisting}
              onReplaceChange={setReplaceExisting}
              onResetToUpload={resetToUpload}
            />
          )}

          {step === "importing" && <ImportingStep importProgress={importProgress} />}
          {step === "complete" && importResult && <CompleteStep importResult={importResult} />}
        </div>

        <DialogFooter className="flex-shrink-0">
          {step === "upload" && <Button variant="outline" onClick={handleClose}>Cancel</Button>}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleImport} disabled={!validationResult || validationResult.validRows.length === 0}>
                Import {validationResult?.validRows.length || 0} rows
              </Button>
            </>
          )}
          {step === "complete" && <Button onClick={handleClose}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
