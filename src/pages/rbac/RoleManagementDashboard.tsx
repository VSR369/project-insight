/**
 * RoleManagementDashboard — SCR-08: Role Management for Seeking Org Admin
 * Layout: Readiness Widget → Contact Details → MSME Toggle → Quick Links → Role Tabs
 * Portal-aware: Only accessible from /org portal. Shows Core + Aggregator tabs.
 * BR-CORE-004: SO Admin manages Aggregator + Core roles only.
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleReadinessWidget } from "@/components/rbac/RoleReadinessWidget";
import { SoaContactDetailsPanel } from "@/components/rbac/SoaContactDetailsPanel";
import { RoleTable } from "@/components/rbac/roles/RoleTable";
import { AggRoleManagement } from "@/components/rbac/AggRoleManagement";
import { AssignRoleSheet } from "@/components/rbac/roles/AssignRoleSheet";
import { MsmeToggle } from "@/components/rbac/MsmeToggle";
import { MsmeQuickAssignModal } from "@/components/rbac/MsmeQuickAssignModal";

import { DelegatedAdminListTab } from "@/components/rbac/DelegatedAdminListTab";
import { useCoreRoleCodes, useAggChallengeRoles } from "@/hooks/queries/useSlmRoleCodes";
import { useRoleAssignments, useDeactivateRoleAssignment } from "@/hooks/queries/useRoleAssignments";
import { useMsmeConfig } from "@/hooks/queries/useMsmeConfig";
import { useOrgContext } from "@/contexts/OrgContext";
import { FeatureErrorBoundary } from "@/components/ErrorBoundary";

export default function RoleManagementDashboard() {
  // ══════════════════════════════════════
  // SECTION 1: useState hooks
  // ══════════════════════════════════════
  const [assignSheetOpen, setAssignSheetOpen] = useState(false);
  const [assignRoleCode, setAssignRoleCode] = useState<string | undefined>();
  const [assignContext, setAssignContext] = useState<"core" | "agg">("core");
  const [quickAssignOpen, setQuickAssignOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("org-core");

  // ══════════════════════════════════════
  // SECTION 2: Context hooks
  // ══════════════════════════════════════
  const { organizationId } = useOrgContext();
  const [searchParams, setSearchParams] = useSearchParams();

  // ══════════════════════════════════════
  // SECTION 3: Query/Mutation hooks
  // ══════════════════════════════════════
  const { data: orgCoreRoles, isLoading: orgCoreLoading } = useCoreRoleCodes();
  const { data: aggChallengeRoles, isLoading: aggLoading } = useAggChallengeRoles();
  const { data: assignments, isLoading: assignmentsLoading } = useRoleAssignments(organizationId);
  const { data: msmeConfig } = useMsmeConfig(organizationId);
  const deactivate = useDeactivateRoleAssignment();

  // ══════════════════════════════════════
  // SECTION 4a: Derived state (needed before useEffect)
  // ══════════════════════════════════════
  const isLoading = orgCoreLoading || aggLoading || assignmentsLoading;
  const challengeRequestorEnabled = msmeConfig?.challenge_requestor_enabled ?? false;

  // Filter R10_CR out of core roles when Challenge Requestor toggle is off
  const filteredCoreRoles = orgCoreRoles?.filter(
    (r) => r.code !== "R10_CR" || challengeRequestorEnabled
  ) ?? [];

  // ══════════════════════════════════════
  // SECTION 5: useEffect hooks
  // ══════════════════════════════════════
  useEffect(() => {
    const assignParam = searchParams.get("assign");
    if (assignParam && !isLoading) {
      setAssignRoleCode(assignParam);
      const isAggRole = aggChallengeRoles?.some((r) => r.code === assignParam);
      setAssignContext(isAggRole ? "agg" : "core");
      setAssignSheetOpen(true);
      searchParams.delete("assign");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, aggChallengeRoles, isLoading, setSearchParams]);

  // ══════════════════════════════════════
  // SECTION 5a: Remaining derived state
  // ══════════════════════════════════════
  const availableRolesForSheet = assignContext === "core" ? orgCoreRoles : aggChallengeRoles;

  // ══════════════════════════════════════
  // SECTION 6: Event handlers
  // ══════════════════════════════════════
  const handleInvite = (roleCode: string, context: "core" | "agg") => {
    setAssignRoleCode(roleCode);
    setAssignContext(context);
    setAssignSheetOpen(true);
  };

  const handleDeactivate = (assignmentId: string) => {
    deactivate.mutate({ id: assignmentId, orgId: organizationId });
  };

  // ══════════════════════════════════════
  // SECTION 7: Render
  // ══════════════════════════════════════
  return (
    <FeatureErrorBoundary featureName="RoleManagementDashboard">
      <div className="space-y-5 p-6">
        {/* Header */}
        <div>
          <nav className="text-xs text-muted-foreground mb-1">
            Organization Portal
          </nav>
          <h1 className="text-2xl font-bold text-foreground">
            Role Management Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage core and aggregator roles for your organization's challenge lifecycle.
          </p>
        </div>

        {/* Role Readiness Widget — Aggregator model per BR-CORE-004 */}
        <RoleReadinessWidget orgId={organizationId} model="agg" />

        {/* Contact Details Accordion */}
        <SoaContactDetailsPanel />

        {/* MSME Toggle */}
        <MsmeToggle orgId={organizationId} onQuickAssign={() => setQuickAssignOpen(true)} />

        {/* Challenge Requestor Toggle */}
        <ChallengeRequestorToggle orgId={organizationId} />

        {/* Role Tabs — Core + Aggregator only (BR-CORE-004: no Marketplace) */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="org-core">Core Roles</TabsTrigger>
              <TabsTrigger value="agg-challenge">Aggregator Roles</TabsTrigger>
              <TabsTrigger value="delegated-admins">Delegated Admins</TabsTrigger>
            </TabsList>

            <TabsContent value="org-core">
              <RoleTable
                roles={filteredCoreRoles}
                assignments={assignments ?? []}
                onInvite={(code) => handleInvite(code, "core")}
                onDeactivate={handleDeactivate}
                isDeactivating={deactivate.isPending}
              />
            </TabsContent>

            <TabsContent value="agg-challenge">
              {activeTab === "agg-challenge" && (
                <AggRoleManagement
                  orgId={organizationId}
                  onInvite={(code) => handleInvite(code, "agg")}
                />
              )}
            </TabsContent>

            <TabsContent value="delegated-admins">
              {activeTab === "delegated-admins" && (
                <DelegatedAdminListTab orgId={organizationId} />
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Single AssignRoleSheet instance — prevents duplicate conflicts */}
        <AssignRoleSheet
          open={assignSheetOpen}
          onOpenChange={setAssignSheetOpen}
          orgId={organizationId}
          preSelectedRoleCode={assignRoleCode}
          availableRoles={availableRolesForSheet ?? []}
        />

        {/* MSME Quick Assign Modal */}
        <MsmeQuickAssignModal
          open={quickAssignOpen}
          onOpenChange={setQuickAssignOpen}
          orgId={organizationId}
          assignments={assignments ?? []}
        />
      </div>
    </FeatureErrorBoundary>
  );
}
