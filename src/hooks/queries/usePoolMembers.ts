/**
 * CRUD hooks for platform_provider_pool (MOD-01 Resource Pool)
 * BRD Ref: BR-PP-001–005, BR-POOL-001–003
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface PoolMemberRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role_codes: string[];
  industry_ids: string[];
  proficiency_id: string | null;
  max_concurrent: number;
  current_assignments: number;
  availability_status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface PoolMemberFilters {
  role?: string;
  industry?: string;
  proficiency?: string;
  availability?: string;
}

export function usePoolMembers(filters: PoolMemberFilters = {}) {
  return useQuery({
    queryKey: ["pool-members", filters.role, filters.industry, filters.proficiency, filters.availability],
    queryFn: async () => {
      let query = supabase
        .from("platform_provider_pool")
        .select("id, full_name, email, phone, role_codes, industry_ids, proficiency_id, max_concurrent, current_assignments, availability_status, is_active, created_at, updated_at, created_by, updated_by")
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (filters.availability) {
        query = query.eq("availability_status", filters.availability);
      }

      if (filters.proficiency) {
        query = query.eq("proficiency_id", filters.proficiency);
      }

      if (filters.role) {
        query = query.contains("role_codes", [filters.role]);
      }

      if (filters.industry) {
        query = query.contains("industry_ids", [filters.industry]);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as PoolMemberRow[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export interface PoolMemberInsert {
  full_name: string;
  email: string;
  phone?: string;
  role_codes: string[];
  industry_ids: string[];
  proficiency_id: string;
  max_concurrent: number;
}

export function useCreatePoolMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: PoolMemberInsert) => {
      const withAudit = await withCreatedBy(data);
      const { data: result, error } = await supabase
        .from("platform_provider_pool")
        .insert(withAudit)
        .select("id, full_name, availability_status, created_at")
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["pool-members"] });
      toast.success(`Pool member ${result.full_name} added successfully.`);
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "create_pool_member" });
    },
  });
}

export function useUpdatePoolMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PoolMemberInsert> & { id: string }) => {
      const withAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("platform_provider_pool")
        .update(withAudit)
        .eq("id", id)
        .select("id, full_name")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["pool-members"] });
      toast.success(`Pool member ${result.full_name} updated successfully.`);
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "update_pool_member" });
    },
  });
}

export function useDeactivatePoolMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("platform_provider_pool")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pool-members"] });
      toast.success("Pool member deactivated successfully.");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "deactivate_pool_member" });
    },
  });
}
