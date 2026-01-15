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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  parseProficiencyImportFile,
  ParsedTaxonomyRow,
  ImportValidationResult,
} from "./ProficiencyExcelExport";
import { useBulkImportProficiencyTaxonomy } from "@/hooks/queries/useProficiencyTaxonomyAdmin";

interface ProficiencyImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = "upload" | "preview" | "importing" | "complete";

export function ProficiencyImportDialog({
  open,
  onOpenChange,
}: ProficiencyImportDialogProps) {
  const [step, setStep] = React.useState<ImportStep>("upload");
  const [file, setFile] = React.useState<File | null>(null);
  const [validationResult, setValidationResult] = React.useState<ImportValidationResult | null>(null);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importResult, setImportResult] = React.useState<{
    areasCreated: number;
    areasUpdated: number;
    subDomainsCreated: number;
    subDomainsUpdated: number;
    specialitiesCreated: number;
    specialitiesUpdated: number;
    errors: string[];
  } | null>(null);
  const [isParsing, setIsParsing] = React.useState(false);

  const bulkImportMutation = useBulkImportProficiencyTaxonomy();

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
      const result = await parseProficiencyImportFile(selectedFile);
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Proficiency Taxonomy
          </DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file to bulk import proficiency areas, sub-domains, and specialities
          </DialogDescription>
        </DialogHeader>

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
                          {[row.industrySegment, row.expertiseLevel, row.proficiencyArea, row.subDomain, row.speciality]
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
                        <TableHead>Industry Segment</TableHead>
                        <TableHead>Expertise Level</TableHead>
                        <TableHead>Proficiency Area</TableHead>
                        <TableHead>Sub-Domain</TableHead>
                        <TableHead>Speciality</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {validationResult.validRows.slice(0, 50).map((row) => (
                          <TableRow key={row.rowNumber}>
                            <TableCell className="font-mono">{row.rowNumber}</TableCell>
                            <TableCell className="text-xs">{row.industrySegment}</TableCell>
                            <TableCell className="text-xs">{row.expertiseLevel}</TableCell>
                            <TableCell className="text-xs">{row.proficiencyArea}</TableCell>
                            <TableCell className="text-xs">{row.subDomain}</TableCell>
                            <TableCell className="text-xs">{row.speciality}</TableCell>
                          </TableRow>
                        ))}
                        {validationResult.validRows.length > 50 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground text-xs">
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
                Your proficiency taxonomy data has been imported successfully.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted text-center">
                <div className="text-xl font-bold text-primary">
                  {importResult.areasCreated + importResult.areasUpdated}
                </div>
                <div className="text-xs text-muted-foreground">
                  Proficiency Areas
                  <br />
                  <span className="text-green-600">{importResult.areasCreated} new</span>
                  {importResult.areasUpdated > 0 && (
                    <>, <span className="text-blue-600">{importResult.areasUpdated} updated</span></>
                  )}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <div className="text-xl font-bold text-primary">
                  {importResult.subDomainsCreated + importResult.subDomainsUpdated}
                </div>
                <div className="text-xs text-muted-foreground">
                  Sub-Domains
                  <br />
                  <span className="text-green-600">{importResult.subDomainsCreated} new</span>
                  {importResult.subDomainsUpdated > 0 && (
                    <>, <span className="text-blue-600">{importResult.subDomainsUpdated} updated</span></>
                  )}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <div className="text-xl font-bold text-primary">
                  {importResult.specialitiesCreated + importResult.specialitiesUpdated}
                </div>
                <div className="text-xs text-muted-foreground">
                  Specialities
                  <br />
                  <span className="text-green-600">{importResult.specialitiesCreated} new</span>
                  {importResult.specialitiesUpdated > 0 && (
                    <>, <span className="text-blue-600">{importResult.specialitiesUpdated} updated</span></>
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

        <DialogFooter>
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
