import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { PanelReviewer } from "@/hooks/queries/usePanelReviewers";
import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ApprovalHistoryTableProps {
  reviewers: PanelReviewer[];
  type: "approved" | "rejected";
}

export function ApprovalHistoryTable({ reviewers, type }: ApprovalHistoryTableProps) {
  const { data: expertiseLevels } = useExpertiseLevels();
  const { data: industrySegments } = useIndustrySegments();

  // Build lookup maps
  const levelMap = new Map(expertiseLevels?.map((l) => [l.id, l.name]) || []);
  const segmentMap = new Map(industrySegments?.map((s) => [s.id, s.name]) || []);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Industries</TableHead>
            <TableHead>Levels</TableHead>
            <TableHead>{type === "approved" ? "Approved At" : "Rejected At"}</TableHead>
            {type === "rejected" && <TableHead>Reason</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviewers.map((reviewer) => {
            const industryNames = reviewer.industry_segment_ids
              ?.map((id) => segmentMap.get(id))
              .filter(Boolean) || [];

            const levelNames = reviewer.expertise_level_ids
              ?.map((id) => levelMap.get(id))
              .filter(Boolean) || [];

            return (
              <TableRow key={reviewer.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {type === "approved" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    {reviewer.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {reviewer.email}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {industryNames.slice(0, 2).map((name) => (
                      <Badge key={name} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                    {industryNames.length > 2 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-xs">
                              +{industryNames.length - 2}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {industryNames.slice(2).join(", ")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {levelNames.slice(0, 2).map((name) => (
                      <Badge key={name} variant="outline" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                    {levelNames.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{levelNames.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {reviewer.approved_at
                    ? format(new Date(reviewer.approved_at), "MMM d, yyyy")
                    : "-"}
                </TableCell>
                {type === "rejected" && (
                  <TableCell className="max-w-[200px]">
                    {reviewer.approval_notes ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm text-muted-foreground truncate block cursor-help">
                              {reviewer.approval_notes.slice(0, 40)}
                              {reviewer.approval_notes.length > 40 && "..."}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            {reviewer.approval_notes}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
