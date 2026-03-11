/**
 * RoleManagementDashboard — SCR-08: Role Management for Seeking Org
 * Readiness widget, Core/Challenge role tabs, MSME toggle
 * All role data from master data tables — zero hardcoded values
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";
import { RoleReadinessWidget } from "@/components/rbac/RoleReadinessWidget";
import { RoleTable } from "@/components/rbac/roles/RoleTable";
import { AssignRoleModal } from "@/components/rbac/roles/AssignRoleModal";
import { MsmeToggle } from "@/components/rbac/MsmeToggle";
import { MsmeQuickAssignModal } from "@/components/rbac/MsmeQuickAssignModal";
import { useCoreRoleCodes, useChallengeRoleCodes, useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { useRoleAssignments, useDeactivateRoleAssignment } from "@/hooks/queries/useRoleAssignments";
import { useEngagementModels } from "@/hooks/queries/useEngagementModels";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Demo org ID — in production, this would come from auth context
const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

export default function RoleManagementDashboard() {
  // ══════════════════════════════════════
  // SECTION 1: useState hooks
  // ══════════════════════════════════════
  const [selectedModel, setSelectedModel] = useState("mp");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignRoleCode, setAssignRoleCode] = useState<string | undefined>();
  const [assignContext, setAssignContext] = useState<"core" | "challenge">("core");
  const [quickAssignOpen, setQuickAssignOpen] = useState(false);

  // ══════════════════════════════════════
  // SECTION 2: Query/Mutation hooks
  // ══════════════════════════════════════
  const { data: coreRoles, isLoading: coreLoading } = useCoreRoleCodes();
  const { data: challengeRoles, isLoading: challengeLoading } = useChallengeRoleCodes(selectedModel);
  const { data: allRoles } = useSlmRoleCodes();
  const { data: assignments, isLoading: assignmentsLoading } = useRoleAssignments(DEMO_ORG_ID);
  const { data: engagementModels } = useEngagementModels();
  const deactivate = useDeactivateRoleAssignment();

  // ══════════════════════════════════════
  // SECTION 3: Conditional returns (AFTER ALL HOOKS)
  // ══════════════════════════════════════
  const isLoading = coreLoading || challengeLoading || assignmentsLoading;

  // ══════════════════════════════════════
  // SECTION 4: Event handlers
  // ══════════════════════════════════════
  const handleInvite = (roleCode: string, context: "core" | "challenge") => {
    setAssignRoleCode(roleCode);
    setAssignContext(context);
    setAssignModalOpen(true);
  };

  const handleDeactivate = (assignmentId: string) => {
    deactivate.mutate({ id: assignmentId, orgId: DEMO_ORG_ID });
  };

  // Get roles for the assign modal based on context
  const availableRolesForModal = assignContext === "core" ? coreRoles : challengeRoles;

  // ══════════════════════════════════════
  // SECTION 5: Render
  // ══════════════════════════════════════
  return (
    <ErrorBoundary componentName="RoleManagementDashboard">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <nav className="text-xs text-muted-foreground mb-1">
            Organization &gt; Role Management
          </nav>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Role Management
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage core and challenge roles for your organization.
              </p>
            </div>
            {/* Model Selector */}
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {engagementModels?.map((m) => (
                  <SelectItem key={m.id} value={m.code}>
                    {m.name}
                  </SelectItem>
                )) ?? (
                  <>
                    <SelectItem value="mp">Marketplace</SelectItem>
                    <SelectItem value="agg">Aggregator</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Role Readiness Widget */}
        <RoleReadinessWidget orgId={DEMO_ORG_ID} model={selectedModel} />

        {/* MSME Toggle */}
        <MsmeToggle orgId={DEMO_ORG_ID} onQuickAssign={() => setQuickAssignOpen(true)} />

        {/* Role Tabs: Core / Challenge */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Role Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Tabs defaultValue="core">
                <TabsList className="mb-4">
                  <TabsTrigger value="core">Core Roles</TabsTrigger>
                  <TabsTrigger value="challenge">Challenge Roles</TabsTrigger>
                </TabsList>

                <TabsContent value="core">
                  <RoleTable
                    roles={coreRoles}
                    assignments={assignments ?? []}
                    onInvite={(code) => handleInvite(code, "core")}
                    onDeactivate={handleDeactivate}
                    isDeactivating={deactivate.isPending}
                  />
                </TabsContent>

                <TabsContent value="challenge">
                  <RoleTable
                    roles={challengeRoles}
                    assignments={assignments ?? []}
                    onInvite={(code) => handleInvite(code, "challenge")}
                    onDeactivate={handleDeactivate}
                    isDeactivating={deactivate.isPending}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Assign Role Modal */}
        <AssignRoleModal
          open={assignModalOpen}
          onOpenChange={setAssignModalOpen}
          orgId={DEMO_ORG_ID}
          preSelectedRoleCode={assignRoleCode}
          availableRoles={availableRolesForModal}
        />

        {/* MSME Quick Assign Modal */}
        <MsmeQuickAssignModal
          open={quickAssignOpen}
          onOpenChange={setQuickAssignOpen}
          orgId={DEMO_ORG_ID}
          assignments={assignments ?? []}
        />
      </div>
    </ErrorBoundary>
  );
}
