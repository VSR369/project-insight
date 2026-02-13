import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type Department = Tables<"md_departments">;
export type DepartmentInsert = TablesInsert<"md_departments">;
export type DepartmentUpdate = TablesUpdate<"md_departments">;

export function useDepartments(includeInactive = false) {
  return useQuery({
    queryKey: ["departments", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_departments")
        .select("id, code, name, description, display_order, is_active, created_at, updated_at")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as Department[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: DepartmentInsert) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_departments").insert(d).select().single();
      if (error) throw new Error(error.message);
      return data as Department;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); toast.success("Department created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_department" }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: DepartmentUpdate & { id: string }) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_departments").update(d).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as Department;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); toast.success("Department updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_department" }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_departments").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); toast.success("Department deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_department" }),
  });
}

export function useRestoreDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_departments").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); toast.success("Department restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_department" }),
  });
}

export function useHardDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_departments").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); toast.success("Department permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_department" }),
  });
}
