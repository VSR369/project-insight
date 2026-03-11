/**
 * CRUD hooks for role_assignments (org-scoped RBAC assignments)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface RoleAssignment {
  id: string;
  org_id: string;
  role_code: string;
  user_email: string;
  user_name: string | null;
  user_id: string | null;
  status: string;
  domain_tags: Record<string, unknown>;
  model_applicability: string;
  invited_at: string | null;
  activated_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
}

export interface CreateRoleAssignmentInput {
  org_id: string;
  role_code: string;
  user_email: string;
  user_name?: string;
  user_id?: string;
  status?: string;
  domain_tags?: Record<string, unknown>;
  model_applicability?: string;
}

export function useRoleAssignments(orgId?: string) {
  return useQuery({
    queryKey: ["role-assignments", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("role_assignments")
        .select("id, org_id, role_code, user_email, user_name, user_id, status, domain_tags, model_applicability, invited_at, activated_at, expires_at, created_by, created_at, updated_by, updated_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as RoleAssignment[];
    },
    enabled: !!orgId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateRoleAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRoleAssignmentInput) => {
      const d = await withCreatedBy(input);
      const { data, error } = await supabase
        .from("role_assignments")
        .insert(d)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["role-assignments", variables.org_id] });
      qc.invalidateQueries({ queryKey: ["role-readiness"] });
      toast.success("Role assignment created successfully");
    },
    onError: (e: Error) => handleMutationError(e, { operation: "create_role_assignment" }),
  });
}

export function useDeactivateRoleAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      const d = await withUpdatedBy({ status: "inactive", updated_at: new Date().toISOString() });
      const { error } = await supabase
        .from("role_assignments")
        .update(d)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return orgId;
    },
    onSuccess: (orgId) => {
      qc.invalidateQueries({ queryKey: ["role-assignments", orgId] });
      qc.invalidateQueries({ queryKey: ["role-readiness"] });
      toast.success("Role assignment deactivated");
    },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_role_assignment" }),
  });
}

export function useBulkCreateRoleAssignments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inputs: CreateRoleAssignmentInput[]) => {
      if (inputs.length === 0) return [];
      const withAudit = await Promise.all(inputs.map((i) => withCreatedBy(i)));
      const { data, error } = await supabase
        .from("role_assignments")
        .insert(withAudit)
        .select();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, variables) => {
      const orgId = variables[0]?.org_id;
      if (orgId) {
        qc.invalidateQueries({ queryKey: ["role-assignments", orgId] });
        qc.invalidateQueries({ queryKey: ["role-readiness"] });
      }
      toast.success(`${variables.length} role(s) assigned successfully`);
    },
    onError: (e: Error) => handleMutationError(e, { operation: "bulk_create_role_assignments" }),
  });
}
