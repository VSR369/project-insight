/**
 * RoleTable — Renders role rows with spec-exact styling
 * Uppercase headers, avatar initials, dynamic status badges from master data, proper action buttons
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, UserMinus } from "lucide-react";
import { RoleAssignmentStatusBadge } from "@/components/rbac/roles/RoleAssignmentStatusBadge";
import type { SlmRoleCode } from "@/hooks/queries/useSlmRoleCodes";
import type { RoleAssignment } from "@/hooks/queries/useRoleAssignments";

interface RoleTableProps {
  roles: SlmRoleCode[];
  assignments: RoleAssignment[];
  onInvite: (roleCode: string) => void;
  onDeactivate: (assignmentId: string) => void;
  isDeactivating?: boolean;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function RoleTable({ roles, assignments, onInvite, onDeactivate, isDeactivating }: RoleTableProps) {
  if (roles.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No roles configured for this model.
      </div>
    );
  }

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
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                            {getInitials(a.user_name)}
                          </div>
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
                    <div className="space-y-1">
                      {roleAssignments.map((a) => (
                        <RoleAssignmentStatusBadge key={a.id} statusCode={a.status} />
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isUnassigned ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onInvite(role.code)}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        <span className="hidden lg:inline">Invite User</span>
                        <span className="lg:hidden">Invite</span>
                      </Button>
                    ) : (
                      <>
                        {roleAssignments.length < (role.min_required ?? 1) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onInvite(role.code)}
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            <span className="hidden lg:inline">Add User</span>
                            <span className="lg:hidden">Add</span>
                          </Button>
                        )}
                        {roleAssignments.map((a) => (
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
                      </>
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
