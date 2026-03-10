/**
 * PoolMemberTable — Data table for Resource Pool list (SCR-01b)
 * BRD Ref: BR-POOL-001, BR-PP-003 (Basic Admin read-only)
 * Role and availability labels resolved from master data hooks.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { RoleBadge } from "./RoleBadge";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { useProficiencyAreasLookup } from "@/hooks/queries/useProficiencyAreasLookup";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { useAvailabilityStatuses } from "@/hooks/queries/useAvailabilityStatuses";
import { Skeleton } from "@/components/ui/skeleton";
import type { PoolMemberRow } from "@/hooks/queries/usePoolMembers";

interface PoolMemberTableProps {
  members: PoolMemberRow[];
  isLoading: boolean;
  canWrite: boolean;
  onEdit: (member: PoolMemberRow) => void;
  onDeactivate: (member: PoolMemberRow) => void;
}

export function PoolMemberTable({
  members,
  isLoading,
  canWrite,
  onEdit,
  onDeactivate,
}: PoolMemberTableProps) {
  const { data: industries } = useIndustrySegments();
  const { data: proficiencies } = useProficiencyAreasLookup();
  const { data: roleCodes } = useSlmRoleCodes();
  const { data: availabilityStatuses } = useAvailabilityStatuses();

  const industryMap = new Map(industries?.map((i) => [i.id, i.name]) ?? []);
  const proficiencyMap = new Map(proficiencies?.map((p) => [p.id, p.name]) ?? []);
  const roleMap = new Map(roleCodes?.map((r) => [r.code, r.display_name]) ?? []);
  const availabilityMap = new Map(availabilityStatuses?.map((s) => [s.code, s.display_name]) ?? []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-foreground">No pool members added yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          {canWrite ? "Click \"+ Add Pool Member\" to get started." : "Pool members will appear here once added."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Full Name</TableHead>
            <TableHead>Assigned Roles</TableHead>
            <TableHead className="hidden lg:table-cell">Industry Segments</TableHead>
            <TableHead>Proficiency</TableHead>
            <TableHead className="text-center">Active</TableHead>
            <TableHead className="text-center">Max</TableHead>
            <TableHead>Availability</TableHead>
            {canWrite && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">
                <div>
                  <span>{member.full_name}</span>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {member.role_codes.map((code) => (
                    <RoleBadge key={code} code={code} label={roleMap.get(code) ?? code} />
                  ))}
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {member.industry_ids.map((id) => (
                    <span
                      key={id}
                      className="inline-block text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                    >
                      {industryMap.get(id) ?? "—"}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {member.proficiency_id ? proficiencyMap.get(member.proficiency_id) ?? "—" : "—"}
              </TableCell>
              <TableCell className="text-center">{member.current_assignments}</TableCell>
              <TableCell className="text-center">{member.max_concurrent}</TableCell>
              <TableCell>
                <AvailabilityBadge
                  status={member.availability_status}
                  label={availabilityMap.get(member.availability_status) ?? member.availability_status}
                />
              </TableCell>
              {canWrite && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(member)}
                      aria-label={`Edit ${member.full_name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDeactivate(member)}
                      aria-label={`Deactivate ${member.full_name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
