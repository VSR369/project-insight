/**
 * SCR-16: Delegated SOA List — Tab content for Role Management Dashboard
 * Shows delegated admins with Edit Scope and Deactivate actions
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, UserMinus, UserPlus, AlertTriangle } from "lucide-react";
import { useDelegatedAdmins, useMaxDelegatedAdmins, useDeactivateDelegatedAdmin } from "@/hooks/queries/useDelegatedAdmins";
import { DomainScopeDisplay } from "@/components/org/DomainScopeDisplay";
import { DeactivationCheckModal } from "@/components/rbac/DeactivationCheckModal";
import { DelegatedAdminLimitWarning } from "@/components/rbac/DelegatedAdminLimitWarning";
import { ReassignmentWizard } from "@/components/rbac/DelegatedAdminReassignmentWizard";
import { useRoleAssignments, type RoleAssignment } from "@/hooks/queries/useRoleAssignments";

interface DelegatedAdminListTabProps {
  orgId: string;
}

export function DelegatedAdminListTab({ orgId }: DelegatedAdminListTabProps) {
  const navigate = useNavigate();
  const { data: admins = [], isLoading } = useDelegatedAdmins(orgId);
  const { data: maxAllowed = 5 } = useMaxDelegatedAdmins();
  const deactivate = useDeactivateDelegatedAdmin();

  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string } | null>(null);
  const [reassignTarget, setReassignTarget] = useState<{ id: string; name: string; orphanRoles: RoleAssignment[] } | null>(null);
  const { data: roleAssignments = [] } = useRoleAssignments(orgId);

  const activeAdmins = admins.filter((a) => a.status !== "deactivated");
  const activeCount = activeAdmins.length;

  const handleDeactivateConfirm = async () => {
    if (!deactivateTarget) return;
    await deactivate.mutateAsync({ adminId: deactivateTarget.id, organizationId: orgId });
    setDeactivateTarget(null);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Loading delegated admins...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Limit warning (SCR-16a) */}
      <DelegatedAdminLimitWarning current={activeCount} max={maxAllowed} />

      {/* Add button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => navigate("/org/admin-management/create")}
          disabled={activeCount >= maxAllowed}
          title={activeCount >= maxAllowed ? "Delegated admin limit reached" : undefined}
        >
          <UserPlus className="h-3.5 w-3.5 mr-1" />
          Add Delegated Admin
        </Button>
      </div>

      {admins.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No delegated admins configured. Click "Add Delegated Admin" to get started.
        </div>
      ) : (
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="uppercase text-xs tracking-wider">Name</TableHead>
                <TableHead className="uppercase text-xs tracking-wider">Email</TableHead>
                <TableHead className="uppercase text-xs tracking-wider">Status</TableHead>
                <TableHead className="uppercase text-xs tracking-wider">Domain Scope</TableHead>
                <TableHead className="uppercase text-xs tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium text-foreground">
                    {admin.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {admin.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        admin.status === "active"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : admin.status === "deactivated"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      }
                    >
                      {admin.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DomainScopeDisplay scope={admin.domain_scope} compact />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {admin.status !== "deactivated" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/org/admin-management/${admin.id}/edit`)}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            <span className="hidden lg:inline">Edit Scope</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeactivateTarget({ id: admin.id, name: admin.full_name ?? "Admin" })}
                          >
                            <UserMinus className="h-3.5 w-3.5 mr-1" />
                            <span className="hidden lg:inline">Deactivate</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Deactivation confirmation (SCR-15) */}
      {deactivateTarget && (
        <DeactivationCheckModal
          open={!!deactivateTarget}
          onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}
          adminName={deactivateTarget.name}
          onConfirm={handleDeactivateConfirm}
          isSubmitting={deactivate.isPending}
        />
      )}
    </div>
  );
}
