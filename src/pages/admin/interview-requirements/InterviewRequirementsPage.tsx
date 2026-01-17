import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";
import {
  useInterviewQuorumConfigs,
  useUpsertQuorumConfigs,
} from "@/hooks/queries/useInterviewQuorumAdmin";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, Minus, Plus, RotateCcw, Save, Users } from "lucide-react";
import { toast } from "sonner";

interface LocalQuorum {
  levelId: string;
  levelName: string;
  levelNumber: number;
  description: string | null;
  originalValue: number;
  currentValue: number;
  defaultValue: number;
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
  const [localQuorums, setLocalQuorums] = useState<LocalQuorum[]>([]);

  // Fetch data
  const { data: levels, isLoading: levelsLoading } = useExpertiseLevels(false);
  const { data: quorumConfigs, isLoading: configsLoading } = useInterviewQuorumConfigs();
  const upsertMutation = useUpsertQuorumConfigs();

  // Initialize local state when data loads
  useEffect(() => {
    if (levels && quorumConfigs !== undefined) {
      const quorumMap = new Map(
        quorumConfigs?.map((q) => [q.expertise_level_id, q.required_quorum_count]) || []
      );

      const initialState: LocalQuorum[] = levels.map((level) => {
        const configuredValue = quorumMap.get(level.id);
        // Use configured value, or default_quorum_count from level, or fallback
        const defaultVal = (level as any).default_quorum_count ?? DEFAULT_QUORUM;
        const currentVal = configuredValue ?? defaultVal;

        return {
          levelId: level.id,
          levelName: level.name,
          levelNumber: level.level_number,
          description: level.description,
          originalValue: currentVal,
          currentValue: currentVal,
          defaultValue: defaultVal,
        };
      });

      setLocalQuorums(initialState);
    }
  }, [levels, quorumConfigs]);

  // Check if there are changes
  const hasChanges = useMemo(() => {
    return localQuorums.some((q) => q.currentValue !== q.originalValue);
  }, [localQuorums]);

  // Handlers
  const handleIncrement = (levelId: string) => {
    setLocalQuorums((prev) =>
      prev.map((q) =>
        q.levelId === levelId && q.currentValue < MAX_QUORUM
          ? { ...q, currentValue: q.currentValue + 1 }
          : q
      )
    );
  };

  const handleDecrement = (levelId: string) => {
    setLocalQuorums((prev) =>
      prev.map((q) =>
        q.levelId === levelId && q.currentValue > MIN_QUORUM
          ? { ...q, currentValue: q.currentValue - 1 }
          : q
      )
    );
  };

  const handleReset = () => {
    setLocalQuorums((prev) =>
      prev.map((q) => ({
        ...q,
        currentValue: q.defaultValue,
      }))
    );
    toast.info("Values reset to defaults. Click Save to apply.");
  };

  const handleSave = async () => {
    const changedConfigs = localQuorums
      .filter((q) => q.currentValue !== q.originalValue)
      .map((q) => ({
        expertise_level_id: q.levelId,
        required_quorum_count: q.currentValue,
      }));

    if (changedConfigs.length === 0) {
      toast.info("No changes to save");
      return;
    }

    await upsertMutation.mutateAsync(changedConfigs);

    // Update original values after successful save
    setLocalQuorums((prev) =>
      prev.map((q) => ({
        ...q,
        originalValue: q.currentValue,
      }))
    );
  };

  const isLoading = levelsLoading || configsLoading;

  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Interview Requirements" },
  ];

  return (
    <AdminLayout
      title="Platform Admin"
      description="Manage interview panel quorum requirements and panel member invitations"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        {/* Tabs */}
        <Tabs defaultValue="requirements" className="w-full">
          <TabsList>
            <TabsTrigger value="requirements" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Configure Interview Requirements
            </TabsTrigger>
            <TabsTrigger value="reviewers" disabled className="flex items-center gap-2">
              Invite Panel Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requirements" className="space-y-6 mt-6">
            {/* Info Banner */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>How booking works:</strong> Providers only see composite slots that already
                have full panel quorum available. No quorum = slot not shown.
              </AlertDescription>
            </Alert>

            {/* Level Cards */}
            <div className="space-y-4">
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-6 w-20" />
                          <div>
                            <Skeleton className="h-5 w-48 mb-2" />
                            <Skeleton className="h-4 w-64" />
                          </div>
                        </div>
                        <Skeleton className="h-10 w-32" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : localQuorums.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No active expertise levels found. Please configure expertise levels first.
                  </CardContent>
                </Card>
              ) : (
                localQuorums.map((quorum) => (
                  <Card
                    key={quorum.levelId}
                    className={
                      quorum.currentValue !== quorum.originalValue
                        ? "ring-2 ring-primary ring-offset-2"
                        : ""
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        {/* Level Info */}
                        <div className="flex items-center gap-4">
                          <Badge
                            variant="outline"
                            className={
                              LEVEL_BADGE_COLORS[quorum.levelNumber] ||
                              "bg-gray-100 text-gray-800 border-gray-200"
                            }
                          >
                            Level {quorum.levelNumber}
                          </Badge>
                          <div>
                            <h3 className="font-medium text-foreground">{quorum.levelName}</h3>
                            {quorum.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {quorum.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Stepper Control */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground mr-2">Interviewers:</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDecrement(quorum.levelId)}
                            disabled={quorum.currentValue <= MIN_QUORUM}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-semibold text-lg">
                            {quorum.currentValue}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleIncrement(quorum.levelId)}
                            disabled={quorum.currentValue >= MAX_QUORUM}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Action Buttons */}
            {!isLoading && localQuorums.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={handleReset}
                  className="text-muted-foreground"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Defaults
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || upsertMutation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {upsertMutation.isPending ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviewers">
            <div className="text-center py-12 text-muted-foreground">
              Panel member invitations coming soon.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
