import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CheckCircle2, AlertCircle, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ParsedQuestionRow {
  rowNumber: number;
  speciality: string;
  speciality_id: string | null;
  expertise_level: string;
  question_text: string;
  options: string[];
  isValid: boolean;
  isSkipped: boolean;
  skipReason: string | null;
  errors: string[];
}

interface VirtualizedPreviewTableProps {
  questions: ParsedQuestionRow[];
  className?: string;
}

const ROW_HEIGHT = 52; // Fixed row height for virtualization
const OVERSCAN = 10; // Render extra rows above/below viewport

export function VirtualizedPreviewTable({
  questions,
  className,
}: VirtualizedPreviewTableProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: questions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] border rounded-lg text-muted-foreground">
        No questions to preview
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg", className)}>
      {/* Fixed Header */}
      <div className="grid grid-cols-[60px_60px_180px_1fr_80px_1fr] gap-2 px-3 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground sticky top-0 z-10">
        <div>Row</div>
        <div>Status</div>
        <div>Hierarchy</div>
        <div>Question (Preview)</div>
        <div>Options</div>
        <div>Errors</div>
      </div>

      {/* Virtualized Body */}
      <div
        ref={parentRef}
        className="h-[300px] overflow-auto"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const q = questions[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className={cn(
                  "absolute top-0 left-0 w-full grid grid-cols-[60px_60px_180px_1fr_80px_1fr] gap-2 px-3 py-2 border-b text-sm items-center",
                  q.isSkipped
                    ? "bg-amber-50 dark:bg-amber-950/20"
                    : !q.isValid
                    ? "bg-red-50 dark:bg-red-950/20"
                    : "hover:bg-muted/30"
                )}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${ROW_HEIGHT}px`,
                }}
              >
                {/* Row Number */}
                <div className="font-mono text-xs">{q.rowNumber}</div>

                {/* Status Icon */}
                <div>
                  {q.isSkipped ? (
                    <SkipForward className="h-4 w-4 text-amber-500" />
                  ) : q.isValid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>

                {/* Hierarchy Path */}
                <div className="text-xs text-muted-foreground truncate">
                  {q.isSkipped ? (
                    <span className="text-amber-600">{q.expertise_level || "(blank)"}</span>
                  ) : q.speciality_id ? (
                    <span className="text-green-700 dark:text-green-400">{q.speciality}</span>
                  ) : (
                    <span className="text-red-600">{q.speciality || "(missing)"}</span>
                  )}
                </div>

                {/* Question Preview */}
                <div className="truncate text-xs" title={q.question_text}>
                  {q.question_text.slice(0, 80)}
                  {q.question_text.length > 80 && "..."}
                </div>

                {/* Options Count */}
                <div className="text-xs">
                  {q.isSkipped ? "-" : `${q.options.length} opts`}
                </div>

                {/* Errors */}
                <div className="text-xs truncate">
                  {q.isSkipped ? (
                    <span className="text-amber-600">{q.skipReason}</span>
                  ) : q.errors.length > 0 ? (
                    <span className="text-red-600" title={q.errors.join(" | ")}>
                      {q.errors[0]}
                      {q.errors.length > 1 && ` (+${q.errors.length - 1})`}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with stats */}
      <div className="px-3 py-2 bg-muted/30 border-t text-xs text-muted-foreground">
        Showing {questions.length.toLocaleString()} rows (virtualized)
      </div>
    </div>
  );
}
