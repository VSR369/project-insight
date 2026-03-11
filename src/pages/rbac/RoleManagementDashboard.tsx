/**
 * RoleManagementDashboard — SCR-08: Role Management for Seeking Org
 * Layout: Readiness Widget → Contact Details → MSME Toggle → Quick Links → Role Tabs
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Mail } from "lucide-react";
import { RoleReadinessWidget } from "@/components/rbac/RoleReadinessWidget";
import { SoaContactDetailsPanel } from "@/components/rbac/SoaContactDetailsPanel";
import { RoleTable } from "@/components/rbac/roles/RoleTable";
import { AssignRoleSheet } from "@/components/rbac/roles/AssignRoleSheet";
import { MsmeToggle } from "@/components/rbac/MsmeToggle";
import { MsmeQuickAssignModal } from "@/components/rbac/MsmeQuickAssignModal";
import { useSlmPoolRoles, useOrgCoreRoles } from "@/hooks/queries/useSlmRoleCodes";
import { useRoleAssignments, useDeactivateRoleAssignment } from "@/hooks/queries/useRoleAssignments";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Demo org ID — in production, this would come from auth context
const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

export default function RoleManagementDashboard() {
  // ══════════════════════════════════════
  // SECTION 1: useState hooks
  // ══════════════════════════════════════
  const [assignSheetOpen, setAssignSheetOpen] = useState(false);
  const [assignRoleCode, setAssignRoleCode] = useState<string | undefined>();
  const [assignContext, setAssignContext] = useState<"core" | "challenge">("core");
  const [quickAssignOpen, setQuickAssignOpen] = useState(false);

  // ══════════════════════════════════════
  // SECTION 2: Navigation hooks
  // ══════════════════════════════════════
  const navigate = useNavigate();

  // ══════════════════════════════════════
  // SECTION 3: Query/Mutation hooks
  // ══════════════════════════════════════
  const { data: slmPoolRoles, isLoading: poolLoading } = useSlmPoolRoles();
  const { data: orgCoreRoles, isLoading: orgCoreLoading } = useOrgCoreRoles();
  const { data: assignments, isLoading: assignmentsLoading } = useRoleAssignments(DEMO_ORG_ID);
  const deactivate = useDeactivateRoleAssignment();

  // ══════════════════════════════════════
  // SECTION 4: Derived state
  // ══════════════════════════════════════
  const isLoading = poolLoading || orgCoreLoading || assignmentsLoading;
  const availableRolesForSheet = assignContext === "core" ? orgCoreRoles : slmPoolRoles;

  // ══════════════════════════════════════
  // SECTION 5: Event handlers
  // ══════════════════════════════════════
  const handleInvite = (roleCode: string, context: "core" | "challenge") => {
    setAssignRoleCode(roleCode);
    setAssignContext(context);
    setAssignSheetOpen(true);
  };

  const handleDeactivate = (assignmentId: string) => {
    deactivate.mutate({ id: assignmentId, orgId: DEMO_ORG_ID });
  };

  // ══════════════════════════════════════
  // SECTION 6: Render
  // ══════════════════════════════════════
  return (
    <ErrorBoundary componentName="RoleManagementDashboard">
      <div className="space-y-5 p-6">
        {/* Header */}
        <div>
          <nav className="text-xs text-muted-foreground mb-1">
            CogibleND Platform
          </nav>
          <h1 className="text-2xl font-bold text-foreground">
            Role Management Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage core and challenge roles for your organization.
          </p>
        </div>

        {/* Role Readiness Widget */}
        <RoleReadinessWidget orgId={DEMO_ORG_ID} model="mp" />

        {/* Contact Details Accordion */}
        <SoaContactDetailsPanel />

        {/* MSME Toggle */}
        <MsmeToggle orgId={DEMO_ORG_ID} onQuickAssign={() => setQuickAssignOpen(true)} />

        {/* Quick Links */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate("/admin/marketplace/admin-contact")}
          >
            <User className="h-3.5 w-3.5" />
            Platform Admin Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate("/admin/marketplace/email-templates")}
          >
            <Mail className="h-3.5 w-3.5" />
            Email Templates
          </Button>
        </div>

        {/* Role Tabs (bare — no Card wrapper) */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="slm-pool">
            <TabsList className="mb-4">
              <TabsTrigger value="slm-pool">SLM Roles (Marketplace)</TabsTrigger>
              <TabsTrigger value="org-core">Org Core Roles</TabsTrigger>
            </TabsList>

            <TabsContent value="slm-pool">
              <RoleTable
                roles={slmPoolRoles}
                assignments={assignments ?? []}
                onInvite={(code) => handleInvite(code, "challenge")}
                onDeactivate={handleDeactivate}
                isDeactivating={deactivate.isPending}
              />
            </TabsContent>

            <TabsContent value="org-core">
              <RoleTable
                roles={orgCoreRoles}
                assignments={assignments ?? []}
                onInvite={(code) => handleInvite(code, "core")}
                onDeactivate={handleDeactivate}
                isDeactivating={deactivate.isPending}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Assign Role Sheet */}
        <AssignRoleSheet
          open={assignSheetOpen}
          onOpenChange={setAssignSheetOpen}
          orgId={DEMO_ORG_ID}
          preSelectedRoleCode={assignRoleCode}
          availableRoles={availableRolesForSheet}
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
