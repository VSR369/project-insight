/**
 * InterviewKitImportPreview — Preview table and summary for interview kit import.
 * Extracted from InterviewKitImportDialog.tsx.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  XCircle,
} from "lucide-react";
import {
  exportValidationErrors,
  type ParsedQuestion,
} from "./InterviewKitExcelExport";

interface InterviewKitImportPreviewProps {
  parsedQuestions: ParsedQuestion[];
  validCount: number;
  errorCount: number;
  error: string | null;
}

export function InterviewKitImportPreview({
  parsedQuestions,
  validCount,
  errorCount,
  error,
}: InterviewKitImportPreviewProps) {
  return (
    <div className="space-y-4 py-4">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="text-sm">
          {parsedQuestions.length} rows found
        </Badge>
        <Badge
          variant="secondary"
          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          {validCount} valid
        </Badge>
        {errorCount > 0 && (
          <Badge
            variant="secondary"
            className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
          >
            <XCircle className="mr-1 h-3 w-3" />
            {errorCount} errors
          </Badge>
        )}
        {errorCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportValidationErrors(parsedQuestions)}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Issues
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Preview Table */}
      <ScrollArea className="h-[350px] border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Row</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Competency</TableHead>
              <TableHead className="w-[40%]">Question</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parsedQuestions.slice(0, 100).map((q) => (
              <TableRow
                key={q.rowNumber}
                className={q.errors.length > 0 ? "bg-red-50 dark:bg-red-950/20" : ""}
              >
                <TableCell className="text-muted-foreground">{q.rowNumber}</TableCell>
                <TableCell className="text-sm">{q.industry_segment || "—"}</TableCell>
                <TableCell className="text-sm">{q.expertise_level || "—"}</TableCell>
                <TableCell className="text-sm">{q.competency || "—"}</TableCell>
                <TableCell className="text-sm">
                  {q.question_text.length > 60
                    ? q.question_text.substring(0, 60) + "..."
                    : q.question_text}
                </TableCell>
                <TableCell>
                  {q.errors.length > 0 ? (
                    <span
                      className="text-destructive text-xs cursor-help"
                      title={q.errors.join("\n")}
                    >
                      <XCircle className="h-4 w-4 inline mr-1" />
                      Error
                    </span>
                  ) : (
                    <span className="text-green-600 text-xs">
                      <CheckCircle2 className="h-4 w-4 inline mr-1" />
                      Valid
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {parsedQuestions.length > 100 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  ... and {parsedQuestions.length - 100} more rows
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
