/**
 * BriefIndustrySegmentField — Industry segment selector for Extended Brief.
 * Extracted from ExtendedBriefDisplay for ≤200 line compliance.
 */

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

interface IndustrySegment {
  id: string;
  name: string;
}

interface BriefIndustrySegmentFieldProps {
  industrySegmentId?: string | null;
  industrySegmentFromIntake?: boolean;
  readOnly: boolean;
  resolvedSegmentName: string | null | undefined;
  industrySegments: IndustrySegment[];
  onIndustrySegmentChange?: (segmentId: string) => void;
}

export function BriefIndustrySegmentField({
  industrySegmentId, industrySegmentFromIntake, readOnly,
  resolvedSegmentName, industrySegments, onIndustrySegmentChange,
}: BriefIndustrySegmentFieldProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industry Segment</p>
        {industrySegmentFromIntake && industrySegmentId && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground">from Intake</Badge>
        )}
        {!industrySegmentId && !readOnly && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-normal">
            <AlertCircle className="h-2.5 w-2.5 mr-0.5" />Required
          </Badge>
        )}
      </div>

      {industrySegmentId && (industrySegmentFromIntake || readOnly) && (
        <Badge variant="secondary" className="text-xs">{resolvedSegmentName ?? "Loading…"}</Badge>
      )}

      {industrySegmentId && !industrySegmentFromIntake && !readOnly && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{resolvedSegmentName ?? "Loading…"}</Badge>
          <Select value={industrySegmentId} onValueChange={(val) => onIndustrySegmentChange?.(val)}>
            <SelectTrigger className="w-auto max-w-[220px] h-7 text-xs border-dashed"><span className="text-muted-foreground">Change</span></SelectTrigger>
            <SelectContent>{industrySegments.map(seg => <SelectItem key={seg.id} value={seg.id}>{seg.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {!industrySegmentId && !readOnly && (
        <Select onValueChange={(val) => onIndustrySegmentChange?.(val)}>
          <SelectTrigger className="w-full max-w-sm h-8 text-sm border-destructive/50"><SelectValue placeholder="Select industry segment…" /></SelectTrigger>
          <SelectContent>{industrySegments.map(seg => <SelectItem key={seg.id} value={seg.id}>{seg.name}</SelectItem>)}</SelectContent>
        </Select>
      )}

      {!industrySegmentId && readOnly && (
        <p className="text-sm text-destructive italic">No industry segment specified — required before review.</p>
      )}
    </div>
  );
}
