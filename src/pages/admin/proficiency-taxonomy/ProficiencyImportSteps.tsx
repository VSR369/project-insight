/**
 * ProficiencyImportSteps — Preview and complete step UI for proficiency import.
 * Extracted from ProficiencyImportDialog.tsx.
 */

import * as React from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ImportValidationResult } from "./ProficiencyExcelExport";

interface ImportResult {
  areasCreated: number;
  areasUpdated: number;
  areasDeleted: number;
  subDomainsCreated: number;
  subDomainsUpdated: number;
  subDomainsDeleted: number;
  specialitiesCreated: number;
  specialitiesUpdated: number;
  specialitiesDeleted: number;
  errors: string[];
}

interface PreviewStepProps {
  validationResult: ImportValidationResult;
  fileName: string | undefined;
  replaceExisting: boolean;
  onReplaceChange: (checked: boolean) => void;
  onResetToUpload: () => void;
}

export function PreviewStep({
  validationResult,
  fileName,
  replaceExisting,
  onReplaceChange,
  onResetToUpload,
}: PreviewStepProps) {
  return (
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
          <span className="text-sm font-medium">{fileName}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onResetToUpload}>
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

      {/* Replace existing option */}
      <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/50 border">
        <Checkbox
          id="replaceExisting"
          checked={replaceExisting}
          onCheckedChange={(checked) => onReplaceChange(checked === true)}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="replaceExisting"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Replace all existing data
          </label>
          <p className="text-xs text-muted-foreground">
            When checked, proficiency areas, sub-domains, and specialities not in this file will be deleted.
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
  );
}

interface ImportingStepProps {
  importProgress: number;
}

export function ImportingStep({ importProgress }: ImportingStepProps) {
  return (
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
  );
}

interface CompleteStepProps {
  importResult: ImportResult;
}

export function CompleteStep({ importResult }: CompleteStepProps) {
  return (
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
            {importResult.areasDeleted > 0 && (
              <>, <span className="text-red-600">{importResult.areasDeleted} deleted</span></>
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
            {importResult.subDomainsDeleted > 0 && (
              <>, <span className="text-red-600">{importResult.subDomainsDeleted} deleted</span></>
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
            {importResult.specialitiesDeleted > 0 && (
              <>, <span className="text-red-600">{importResult.specialitiesDeleted} deleted</span></>
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
  );
}
