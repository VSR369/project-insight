/**
 * RoleTable — Renders role rows with spec-exact styling
 * Uppercase headers, avatar initials, dynamic status badges from master data, proper action buttons
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, UserMinus, Building2 } from "lucide-react";
import { RoleAssignmentStatusBadge } from "@/components/rbac/roles/RoleAssignmentStatusBadge";
import { InitialsAvatar } from "@/components/admin/platform-admins/InitialsAvatar";
import { useDepartments } from "@/hooks/queries/usePrimaryContactData";
import type { SlmRoleCode } from "@/hooks/queries/useSlmRoleCodes";
import type { RoleAssignment } from "@/hooks/queries/useRoleAssignments";

interface RoleTableProps {
  roles: SlmRoleCode[];
  assignments: RoleAssignment[];
  onInvite: (roleCode: string) => void;
  onDeactivate: (assignmentId: string) => void;
  isDeactivating?: boolean;
}


export function RoleTable({ roles, assignments, onInvite, onDeactivate, isDeactivating }: RoleTableProps) {
  const { data: departments } = useDepartments();

  if (roles.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No roles configured for this model.
      </div>
    );
  }

  const getDeptName = (deptId: string | null) => {
    if (!deptId || !departments) return null;
    const dept = departments.find((d: { id: string; name: string }) => d.id === deptId);
    return dept?.name ?? null;
  };

  return (
    <div className="relative w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="uppercase text-xs tracking-wider">Role Name</TableHead>
            <TableHead className="uppercase text-xs tracking-wider">Code</TableHead>
            <TableHead className="uppercase text-xs tracking-wider">Assigned User(s)</TableHead>
            <TableHead className="uppercase text-xs tracking-wider">Status</TableHead>
            <TableHead className="uppercase text-xs tracking-wider text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => {
            const roleAssignments = assignments.filter(
              (a) => a.role_code === role.code && (a.status === "active" || a.status === "invited")
            );
            const isUnassigned = roleAssignments.length === 0;

            return (
              <TableRow key={role.id}>
                <TableCell className="font-medium text-foreground">
                  {role.display_name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs font-mono bg-muted/50">
                    {role.code}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isUnassigned ? (
                    <span className="text-sm text-muted-foreground italic">No user assigned</span>
                  ) : (
                    <div className="space-y-1.5">
                      {roleAssignments.map((a) => (
                        <div key={a.id} className="flex items-center gap-2">
                          <InitialsAvatar name={a.user_name ?? "?"} size="sm" className="h-6 w-6 text-[10px]" />
                          <span className="text-sm text-foreground">
                            {a.user_name ?? a.user_email}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {isUnassigned ? (
                    <RoleAssignmentStatusBadge statusCode="unassigned" />
                  ) : (
                    <div className="space-y-1.5">
                      {roleAssignments.map((a) => (
                        <RoleAssignmentStatusBadge key={a.id} statusCode={a.status} />
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      variant={isUnassigned ? "default" : "outline"}
                      size="sm"
                      onClick={() => onInvite(role.code)}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      <span className="hidden lg:inline">Assign User</span>
                      <span className="lg:hidden">Assign</span>
                    </Button>
                    {!isUnassigned && roleAssignments.map((a) => (
                      <Button
                        key={a.id}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDeactivate(a.id)}
                        disabled={isDeactivating}
                      >
                        <UserMinus className="h-3.5 w-3.5 mr-1" />
                        <span className="hidden lg:inline">Deactivate</span>
                      </Button>
                    ))}
                    {!isUnassigned && (role.min_required ?? 0) > 1 && roleAssignments.length < (role.min_required ?? 0) && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        Minimum {role.min_required} required — {roleAssignments.length} assigned
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
