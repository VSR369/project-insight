/**
 * SCR-03: Pool Member Profile Detail + Audit View
 * BRD Ref: BR-PP-005, MOD-01
 * Shows full profile, domain scope, assignment history, and audit trail
 */

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Mail, Phone, Shield, Users, History, ClipboardList } from "lucide-react";
import { AvailabilityBadge } from "@/components/admin/marketplace/AvailabilityBadge";
import { RoleBadge } from "@/components/admin/marketplace/RoleBadge";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { useAvailabilityStatuses } from "@/hooks/queries/useAvailabilityStatuses";
import { useIndustrySegments } from "@/hooks/queries/useMasterData";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  action: string;
  actor_id: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

function usePoolMemberDetail(memberId?: string) {
  return useQuery({
    queryKey: ["pool-member-detail", memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const { data, error } = await supabase
        .from("platform_provider_pool")
        .select("id, full_name, email, phone, role_codes, domain_scope, max_concurrent, current_assignments, availability_status, is_active, created_at, updated_at, created_by, updated_by")
        .eq("id", memberId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!memberId,
  });
}

function usePoolMemberAudit(memberId?: string) {
  return useQuery({
    queryKey: ["pool-member-audit", memberId],
    queryFn: async () => {
      if (!memberId) return [];
      const { data, error } = await supabase
        .from("role_audit_log")
        .select("id, action, actor_id, before_state, after_state, created_at, metadata")
        .eq("entity_type", "pool_member")
        .eq("entity_id", memberId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as AuditEntry[];
    },
    enabled: !!memberId,
  });
}

function usePoolMemberAssignments(memberId?: string) {
  return useQuery({
    queryKey: ["pool-member-assignments", memberId],
    queryFn: async () => {
      if (!memberId) return [];
      const { data, error } = await supabase
        .from("challenge_role_assignments")
        .select("id, challenge_id, role_code, status, assigned_at, reassignment_reason")
        .eq("pool_member_id", memberId)
        .order("assigned_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!memberId,
  });
}

export default function PoolMemberDetailPage() {
  const navigate = useNavigate();
  const { memberId } = useParams<{ memberId: string }>();

  const { data: member, isLoading } = usePoolMemberDetail(memberId);
  const { data: auditLog, isLoading: auditLoading } = usePoolMemberAudit(memberId);
  const { data: assignments, isLoading: assignLoading } = usePoolMemberAssignments(memberId);
  const { data: roleCodes } = useSlmRoleCodes();
  const { data: availStatuses } = useAvailabilityStatuses();
  const { data: industries } = useIndustrySegments();

  const getRoleLabel = (code: string) =>
    roleCodes?.find((r) => r.code === code)?.display_name ?? code;

  const getAvailLabel = (status: string) =>
    availStatuses?.find((s) => s.code === status)?.display_name ?? status;

  const getIndustryName = (id: string) =>
    industries?.find((i) => i.id === id)?.name ?? id;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Pool member not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/marketplace/resource-pool")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Resource Pool
        </Button>
      </div>
    );
  }

  const domainScope = member.domain_scope as Record<string, string[]> | null;
  const industryIds = domainScope?.industry_segment_ids ?? [];

  return (
    <ErrorBoundary componentName="PoolMemberDetailPage">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/marketplace/resource-pool")} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Resource Pool
            </Button>
            <h1 className="text-2xl font-bold text-foreground">{member.full_name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Pool Member Profile</p>
          </div>
          <div className="flex items-center gap-2">
            <AvailabilityBadge status={member.availability_status} label={getAvailLabel(member.availability_status)} />
            {!member.is_active && (
              <Badge variant="destructive">Inactive</Badge>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Profile Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{member.phone}</span>
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-muted-foreground">Capacity: </span>
                  <span className="font-medium">{member.current_assignments}/{member.max_concurrent}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Member since {format(new Date(member.created_at), "MMM d, yyyy")}
                </div>
              </div>

              {/* Roles & Domain */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Assigned Roles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(member.role_codes as string[]).map((code) => (
                      <RoleBadge key={code} code={code} label={getRoleLabel(code)} />
                    ))}
                  </div>
                </div>
                {industryIds.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Industry Expertise</p>
                    <div className="flex flex-wrap gap-1.5">
                      {industryIds.map((id) => (
                        <Badge key={id} variant="outline" className="text-xs">{getIndustryName(id)}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Assignments & Audit Log */}
        <Tabs defaultValue="assignments">
          <TabsList className="mb-4">
            <TabsTrigger value="assignments" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Challenge Assignments
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <History className="h-3.5 w-3.5" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <Card>
              <CardContent className="pt-4">
                {assignLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : !assignments?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No challenge assignments yet.</p>
                  </div>
                ) : (
                  <div className="relative w-full overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assigned At</TableHead>
                          <TableHead>Reassignment Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>
                              <RoleBadge code={a.role_code} label={getRoleLabel(a.role_code)} />
                            </TableCell>
                            <TableCell>
                              <Badge variant={a.status === "active" ? "default" : "secondary"} className="text-xs">
                                {a.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(a.assigned_at), "MMM d, yyyy HH:mm")}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {a.reassignment_reason ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardContent className="pt-4">
                {auditLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : !auditLog?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No audit entries recorded.</p>
                  </div>
                ) : (
                  <div className="relative w-full overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>Before</TableHead>
                          <TableHead>After</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLog.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">
                                {entry.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                              {entry.before_state ? (
                                <pre className="whitespace-pre-wrap text-[10px] bg-muted/50 rounded p-1">
                                  {JSON.stringify(entry.before_state, null, 1)}
                                </pre>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                              {entry.after_state ? (
                                <pre className="whitespace-pre-wrap text-[10px] bg-muted/50 rounded p-1">
                                  {JSON.stringify(entry.after_state, null, 1)}
                                </pre>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}
