/**
 * RoleTable — Renders role rows for core or challenge roles
 * All role data from md_slm_role_codes, assignment data from role_assignments
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, UserMinus } from "lucide-react";
import { RoleAssignmentStatusBadge } from "./RoleAssignmentStatusBadge";
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
            <TableHead className="uppercase text-xs">Role</TableHead>
            <TableHead className="uppercase text-xs">Code</TableHead>
            <TableHead className="uppercase text-xs">Assigned To</TableHead>
            <TableHead className="uppercase text-xs">Status</TableHead>
            <TableHead className="uppercase text-xs text-right">Actions</TableHead>
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
                    <span className="text-sm text-muted-foreground italic">Unassigned</span>
                  ) : (
                    <div className="space-y-1">
                      {roleAssignments.map((a) => (
                        <div key={a.id} className="text-sm text-foreground">
                          {a.user_name ?? a.user_email}
                        </div>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {isUnassigned ? (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                      Unassigned
                    </Badge>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onInvite(role.code)}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      <span className="hidden lg:inline">Invite</span>
                    </Button>
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
