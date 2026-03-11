/**
 * PoolMemberTable — Data table for Resource Pool list (SCR-01b)
 * BRD Ref: BR-POOL-001, BR-PP-003 (Basic Admin read-only)
 * Role and availability labels resolved from master data hooks.
 */

import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "./RoleBadge";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
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
  const navigate = useNavigate();
  const { data: industries } = useIndustrySegments();
  const { data: roleCodes } = useSlmRoleCodes();
  const { data: availabilityStatuses } = useAvailabilityStatuses();

  const industryMap = new Map(industries?.map((i) => [i.id, i.name]) ?? []);
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
            <TableHead className="hidden lg:table-cell">Scope Depth</TableHead>
            <TableHead className="text-center">Active</TableHead>
            <TableHead className="text-center">Max</TableHead>
            <TableHead>Availability</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const scope = member.domain_scope;
            const industryIds = scope?.industry_segment_ids ?? [];
            const paCount = scope?.proficiency_area_ids?.length ?? 0;
            const sdCount = scope?.sub_domain_ids?.length ?? 0;
            const spCount = scope?.speciality_ids?.length ?? 0;

            return (
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
                    {industryIds.length === 0 ? (
                      <Badge variant="outline" className="text-xs">All Industries</Badge>
                    ) : (
                      industryIds.map((id) => (
                        <span
                          key={id}
                          className="inline-block text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                        >
                          {industryMap.get(id) ?? "—"}
                        </span>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                  {paCount === 0 ? <Badge variant="outline" className="text-xs">All</Badge> : <span>{paCount} PA</span>}
                  {sdCount > 0 && <span className="ml-1">· {sdCount} SD</span>}
                  {spCount > 0 && <span className="ml-1">· {spCount} SP</span>}
                </TableCell>
                <TableCell className="text-center">{member.current_assignments}</TableCell>
                <TableCell className="text-center">{member.max_concurrent}</TableCell>
                <TableCell>
                  <AvailabilityBadge
                    status={member.availability_status}
                    label={availabilityMap.get(member.availability_status) ?? member.availability_status}
                  />
                </TableCell>
                {canWrite ? (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/marketplace/resource-pool/${member.id}`)}
                        aria-label={`View ${member.full_name}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
                ) : (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/admin/marketplace/resource-pool/${member.id}`)}
                      aria-label={`View ${member.full_name}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
