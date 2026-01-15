import * as React from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  parseAcademicImportFile,
  ParsedAcademicRow,
  AcademicImportValidationResult,
} from "./AcademicExcelExport";
import { useBulkImportAcademicTaxonomy } from "@/hooks/queries/useAcademicTaxonomy";

interface AcademicImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = "upload" | "preview" | "importing" | "complete";

export function AcademicImportDialog({
  open,
  onOpenChange,
}: AcademicImportDialogProps) {
  const [step, setStep] = React.useState<ImportStep>("upload");
  const [file, setFile] = React.useState<File | null>(null);
  const [validationResult, setValidationResult] = React.useState<AcademicImportValidationResult | null>(null);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importResult, setImportResult] = React.useState<{
    disciplinesCreated: number;
    disciplinesUpdated: number;
    disciplinesDeleted: number;
    streamsCreated: number;
    streamsUpdated: number;
    streamsDeleted: number;
    subjectsCreated: number;
    subjectsUpdated: number;
    subjectsDeleted: number;
    errors: string[];
  } | null>(null);
  const [isParsing, setIsParsing] = React.useState(false);
  const [replaceExisting, setReplaceExisting] = React.useState(true);

  const bulkImportMutation = useBulkImportAcademicTaxonomy();

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const hasValidExtension = validExtensions.some(ext => 
      selectedFile.name.toLowerCase().endsWith(ext)
    );

    if (!validTypes.includes(selectedFile.type) && !hasValidExtension) {
      toast.error("Please upload a valid Excel or CSV file");
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);

    try {
      const result = await parseAcademicImportFile(selectedFile);
      setValidationResult(result);
      setStep("preview");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to parse file");
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const fakeEvent = {
        target: { files: [droppedFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      await handleFileChange(fakeEvent);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    if (!validationResult || validationResult.validRows.length === 0) return;

    setStep("importing");
    setImportProgress(0);

    try {
      const result = await bulkImportMutation.mutateAsync({
        rows: validationResult.validRows,
        replaceExisting,
        onProgress: (progress: number) => setImportProgress(progress),
      });

      setImportResult(result);
      setStep("complete");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
      setStep("preview");
    }
  };

  const handleClose = () => {
    setStep("upload");
    setFile(null);
    setValidationResult(null);
    setImportProgress(0);
    setImportResult(null);
    setReplaceExisting(true);
    onOpenChange(false);
  };

  const resetToUpload = () => {
    setStep("upload");
    setFile(null);
    setValidationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Academic Taxonomy
          </DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file to bulk import disciplines, streams, and subjects
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {step === "upload" && (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {isParsing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Parsing file...</p>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-1">
                  Drag and drop your file here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports .xlsx, .xls, and .csv files
                </p>
              </>
            )}
          </div>
        )}

        {step === "preview" && validationResult && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4">
              <div className="flex-1 p-4 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-primary">
                  {validationResult.validRows.length}
                </div>
                <div className="text-sm text-muted-foreground">Valid rows</div>
              </div>
              <div className="flex-1 p-4 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-destructive">
                  {validationResult.invalidRows.length}
                </div>
                <div className="text-sm text-muted-foreground">Invalid rows</div>
              </div>
            </div>

            {/* File info */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="text-sm font-medium">{file?.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={resetToUpload}>
                Change file
              </Button>
            </div>

            {/* Invalid rows */}
            {validationResult.invalidRows.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Errors</AlertTitle>
                <AlertDescription>
                  The following rows have errors and will be skipped:
                </AlertDescription>
              </Alert>
            )}

            {validationResult.invalidRows.length > 0 && (
              <ScrollArea className="h-48 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationResult.invalidRows.map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell className="font-mono">{row.rowNumber}</TableCell>
                        <TableCell className="text-xs">
                          {[row.discipline, row.stream, row.subject]
                            .filter(Boolean)
                            .join(" → ") || "(empty)"}
                        </TableCell>
                        <TableCell>
                          {row.errors.map((error, i) => (
                            <Badge key={i} variant="destructive" className="mr-1 mb-1 text-xs">
                              {error}
                            </Badge>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}

            {/* Replace existing option */}
            <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/50 border">
              <Checkbox
                id="replaceExisting"
                checked={replaceExisting}
                onCheckedChange={(checked) => setReplaceExisting(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="replaceExisting"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Replace all existing data
                </label>
                <p className="text-xs text-muted-foreground">
                  When checked, disciplines, streams, and subjects not in this file will be deleted.
                  When unchecked, new data will be added and existing data will be updated, but nothing will be deleted.
                </p>
              </div>
            </div>

            {/* Valid rows preview */}
            {validationResult.validRows.length > 0 && (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {validationResult.validRows.length} rows ready to import
                </div>
                <ScrollArea className="h-48 rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead>Discipline</TableHead>
                        <TableHead>Stream</TableHead>
                        <TableHead>Subject</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {validationResult.validRows.slice(0, 50).map((row) => (
                          <TableRow key={row.rowNumber}>
                            <TableCell className="font-mono">{row.rowNumber}</TableCell>
                            <TableCell className="text-xs">{row.discipline}</TableCell>
                            <TableCell className="text-xs">{row.stream}</TableCell>
                            <TableCell className="text-xs">{row.subject}</TableCell>
                          </TableRow>
                        ))}
                        {validationResult.validRows.length > 50 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground text-xs">
                              ... and {validationResult.validRows.length - 50} more rows
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </>
            )}
          </div>
        )}

        {step === "importing" && (
          <div className="py-8 space-y-4">
            <div className="text-center">
              <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin mb-4" />
              <p className="font-medium">Importing data...</p>
              <p className="text-sm text-muted-foreground">
                Please wait while we process your file
              </p>
            </div>
            <Progress value={importProgress} />
            <p className="text-center text-sm text-muted-foreground">
              {importProgress}% complete
            </p>
          </div>
        )}

        {step === "complete" && importResult && (
          <div className="py-4 space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Import Complete!</AlertTitle>
              <AlertDescription>
                Your academic taxonomy data has been imported successfully.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted text-center">
                <div className="text-xl font-bold text-primary">
                  {importResult.disciplinesCreated + importResult.disciplinesUpdated}
                </div>
                <div className="text-xs text-muted-foreground">
                  Disciplines
                  <br />
                  <span className="text-green-600">{importResult.disciplinesCreated} new</span>
                  {importResult.disciplinesUpdated > 0 && (
                    <>, <span className="text-blue-600">{importResult.disciplinesUpdated} updated</span></>
                  )}
                  {importResult.disciplinesDeleted > 0 && (
                    <>, <span className="text-red-600">{importResult.disciplinesDeleted} deleted</span></>
                  )}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <div className="text-xl font-bold text-primary">
                  {importResult.streamsCreated + importResult.streamsUpdated}
                </div>
                <div className="text-xs text-muted-foreground">
                  Streams
                  <br />
                  <span className="text-green-600">{importResult.streamsCreated} new</span>
                  {importResult.streamsUpdated > 0 && (
                    <>, <span className="text-blue-600">{importResult.streamsUpdated} updated</span></>
                  )}
                  {importResult.streamsDeleted > 0 && (
                    <>, <span className="text-red-600">{importResult.streamsDeleted} deleted</span></>
                  )}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <div className="text-xl font-bold text-primary">
                  {importResult.subjectsCreated + importResult.subjectsUpdated}
                </div>
                <div className="text-xs text-muted-foreground">
                  Subjects
                  <br />
                  <span className="text-green-600">{importResult.subjectsCreated} new</span>
                  {importResult.subjectsUpdated > 0 && (
                    <>, <span className="text-blue-600">{importResult.subjectsUpdated} updated</span></>
                  )}
                  {importResult.subjectsDeleted > 0 && (
                    <>, <span className="text-red-600">{importResult.subjectsDeleted} deleted</span></>
                  )}
                </div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Some rows had errors</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 text-xs">
                    {importResult.errors.slice(0, 5).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>... and {importResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        </div>

        <DialogFooter className="flex-shrink-0">
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!validationResult || validationResult.validRows.length === 0}
              >
                Import {validationResult?.validRows.length || 0} rows
              </Button>
            </>
          )}
          {step === "complete" && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
