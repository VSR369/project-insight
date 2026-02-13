import { useState, useEffect, useMemo } from "react";

import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import {
  useAllQuorumConfigs,
  useSaveQuorumConfigs,
  QuorumUpdatePayload,
} from "@/hooks/queries/useInterviewQuorumAdmin";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, RotateCcw, Save, Globe } from "lucide-react";
import { toast } from "sonner";
import { QuorumMatrixCell } from "./QuorumMatrixCell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LocalQuorumCell {
  levelId: string;
  levelName: string;
  levelNumber: number;
  industryId: string | null;
  industryName: string;
  originalValue: number;
  currentValue: number;
  defaultValue: number;
  configId: string | null;
}

const LEVEL_BADGE_COLORS: Record<number, string> = {
  0: "bg-purple-100 text-purple-800 border-purple-200",
  1: "bg-blue-100 text-blue-800 border-blue-200",
  2: "bg-orange-100 text-orange-800 border-orange-200",
  3: "bg-red-100 text-red-800 border-red-200",
  4: "bg-green-100 text-green-800 border-green-200",
};

const MIN_QUORUM = 1;
const MAX_QUORUM = 20;
const DEFAULT_QUORUM = 3;

export default function InterviewRequirementsPage() {
  const [matrix, setMatrix] = useState<LocalQuorumCell[][]>([]);

  // Fetch data
  const { data: levels, isLoading: levelsLoading } = useExpertiseLevels(false);
  const { data: industries, isLoading: industriesLoading } = useIndustrySegments(false);
  const { data: allConfigs, isLoading: configsLoading } = useAllQuorumConfigs();
  const saveMutation = useSaveQuorumConfigs();

  // Build columns: Global + all industries
  const columns = useMemo(() => {
    if (!industries) return [];
    return [
      { id: null, name: "Global Default", code: "GLOBAL" },
      ...industries.map((i) => ({ id: i.id, name: i.name, code: i.code })),
    ];
  }, [industries]);

  // Initialize matrix when data loads
  useEffect(() => {
    if (levels && columns.length > 0 && allConfigs !== undefined) {
      const newMatrix: LocalQuorumCell[][] = levels
        .sort((a, b) => a.level_number - b.level_number)
        .map((level) => {
          return columns.map((col) => {
            // Find existing config for this level + industry combination
            const existing = allConfigs?.find(
              (c) =>
                c.expertise_level_id === level.id &&
                (col.id === null
                  ? c.industry_segment_id === null
                  : c.industry_segment_id === col.id)
            );

            const defaultVal = level.default_quorum_count ?? DEFAULT_QUORUM;
            const currentVal = existing?.required_quorum_count ?? defaultVal;

            return {
              levelId: level.id,
              levelName: level.name,
              levelNumber: level.level_number,
              industryId: col.id,
              industryName: col.name,
              originalValue: currentVal,
              currentValue: currentVal,
              defaultValue: defaultVal,
              configId: existing?.id ?? null,
            };
          });
        });

      setMatrix(newMatrix);
    }
  }, [levels, columns, allConfigs]);

  // Count changes
  const changesCount = useMemo(() => {
    return matrix.flat().filter((cell) => cell.currentValue !== cell.originalValue).length;
  }, [matrix]);

  const hasChanges = changesCount > 0;

  // Handlers
  const handleCellChange = (
    levelId: string,
    industryId: string | null,
    delta: number
  ) => {
    setMatrix((prev) =>
      prev.map((row) =>
        row.map((cell) => {
          if (cell.levelId === levelId && cell.industryId === industryId) {
            const newValue = Math.max(
              MIN_QUORUM,
              Math.min(MAX_QUORUM, cell.currentValue + delta)
            );
            return { ...cell, currentValue: newValue };
          }
          return cell;
        })
      )
    );
  };

  const handleReset = () => {
    setMatrix((prev) =>
      prev.map((row) =>
        row.map((cell) => ({
          ...cell,
          currentValue: cell.defaultValue,
        }))
      )
    );
    toast.info("Values reset to defaults. Click Save to apply.");
  };

  const handleSave = async () => {
    const changedCells = matrix.flat().filter(
      (cell) => cell.currentValue !== cell.originalValue
    );

    if (changedCells.length === 0) {
      toast.info("No changes to save");
      return;
    }

    const updates: QuorumUpdatePayload[] = changedCells.map((cell) => ({
      expertise_level_id: cell.levelId,
      industry_segment_id: cell.industryId,
      required_quorum_count: cell.currentValue,
      configId: cell.configId,
    }));

    await saveMutation.mutateAsync(updates);

    // Update original values and configIds after save
    setMatrix((prev) =>
      prev.map((row) =>
        row.map((cell) => ({
          ...cell,
          originalValue: cell.currentValue,
        }))
      )
    );
  };

  const isLoading = levelsLoading || industriesLoading || configsLoading;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Quorum Requirements</h1>
        <p className="text-muted-foreground mt-1">Configure the required number of interviewers per expertise level and industry segment</p>
      </div>
      <div className="space-y-6">
        {/* Info Banner */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>How booking works:</strong> Providers only see composite slots that already
            have full panel quorum available. Configure the required number of interviewers per
            expertise level and industry segment below.
          </AlertDescription>
        </Alert>

        {/* Matrix Table */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : matrix.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            No active expertise levels found. Please configure expertise levels first.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[140px]">
                        Expertise Level
                      </TableHead>
                      {columns.map((col, index) => (
                        <TableHead
                          key={col.id ?? "global"}
                          className={`text-center min-w-[100px] ${
                            index === 0 ? "bg-primary/5" : ""
                          }`}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-center gap-1">
                                {index === 0 && (
                                  <Globe className="h-3 w-3 text-primary" />
                                )}
                                <span className="truncate max-w-[90px] text-xs font-medium">
                                  {col.code === "GLOBAL" ? "Global" : col.code}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{col.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matrix.map((row) => {
                      const level = row[0];
                      const rowChanges = row.filter(
                        (c) => c.currentValue !== c.originalValue
                      ).length;

                      return (
                        <TableRow key={level.levelId}>
                          <TableCell className="sticky left-0 bg-background z-10 border-r">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  LEVEL_BADGE_COLORS[level.levelNumber] ||
                                  "bg-gray-100 text-gray-800 border-gray-200"
                                }
                              >
                                L{level.levelNumber}
                              </Badge>
                              <span className="font-medium text-sm truncate max-w-[100px]">
                                {level.levelName}
                              </span>
                              {rowChanges > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {rowChanges}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          {row.map((cell, colIndex) => (
                            <TableCell
                              key={`${cell.levelId}-${cell.industryId ?? "global"}`}
                              className={`text-center p-1 ${
                                colIndex === 0 ? "bg-primary/5" : ""
                              }`}
                            >
                              <QuorumMatrixCell
                                value={cell.currentValue}
                                originalValue={cell.originalValue}
                                minValue={MIN_QUORUM}
                                maxValue={MAX_QUORUM}
                                onIncrement={() =>
                                  handleCellChange(cell.levelId, cell.industryId, 1)
                                }
                                onDecrement={() =>
                                  handleCellChange(cell.levelId, cell.industryId, -1)
                                }
                                disabled={saveMutation.isPending}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isLoading && matrix.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={handleReset}
                className="text-muted-foreground"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Defaults
              </Button>
              {hasChanges && (
                <Badge variant="outline" className="text-primary border-primary">
                  {changesCount} unsaved change{changesCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saveMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
