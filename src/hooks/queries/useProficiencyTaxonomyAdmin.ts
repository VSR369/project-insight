import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

// Types
export type ProficiencyArea = Tables<"proficiency_areas">;
export type ProficiencyAreaInsert = TablesInsert<"proficiency_areas">;
export type ProficiencyAreaUpdate = TablesUpdate<"proficiency_areas">;

export type SubDomain = Tables<"sub_domains">;
export type SubDomainInsert = TablesInsert<"sub_domains">;
export type SubDomainUpdate = TablesUpdate<"sub_domains">;

export type Speciality = Tables<"specialities">;
export type SpecialityInsert = TablesInsert<"specialities">;
export type SpecialityUpdate = TablesUpdate<"specialities">;

// ===================== PROFICIENCY AREAS =====================

export function useProficiencyAreasAdmin(industrySegmentId?: string, includeInactive = false) {
  return useQuery({
    queryKey: ["proficiency_areas_admin", industrySegmentId, { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("proficiency_areas")
        .select("*")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (industrySegmentId) {
        query = query.eq("industry_segment_id", industrySegmentId);
      }

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as ProficiencyArea[];
    },
    enabled: !!industrySegmentId || includeInactive,
  });
}

export function useCreateProficiencyArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (area: ProficiencyAreaInsert) => {
      const { data, error } = await supabase
        .from("proficiency_areas")
        .insert(area)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as ProficiencyArea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proficiency_areas_admin"] });
      toast.success("Proficiency area created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create proficiency area: ${error.message}`);
    },
  });
}

export function useUpdateProficiencyArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProficiencyAreaUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("proficiency_areas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as ProficiencyArea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proficiency_areas_admin"] });
      toast.success("Proficiency area updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update proficiency area: ${error.message}`);
    },
  });
}

export function useDeleteProficiencyArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("proficiency_areas")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proficiency_areas_admin"] });
      toast.success("Proficiency area deactivated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate proficiency area: ${error.message}`);
    },
  });
}

export function useRestoreProficiencyArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("proficiency_areas")
        .update({ is_active: true })
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proficiency_areas_admin"] });
      toast.success("Proficiency area restored successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore proficiency area: ${error.message}`);
    },
  });
}

// Check if proficiency area has children
export function useCheckProficiencyAreaChildren() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { count, error } = await supabase
        .from("sub_domains")
        .select("*", { count: "exact", head: true })
        .eq("proficiency_area_id", id)
        .eq("is_active", true);

      if (error) throw new Error(error.message);
      return (count || 0) > 0;
    },
  });
}

// ===================== SUB-DOMAINS =====================

export function useSubDomainsAdmin(proficiencyAreaId?: string, includeInactive = false) {
  return useQuery({
    queryKey: ["sub_domains_admin", proficiencyAreaId, { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("sub_domains")
        .select("*")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (proficiencyAreaId) {
        query = query.eq("proficiency_area_id", proficiencyAreaId);
      }

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as SubDomain[];
    },
    enabled: !!proficiencyAreaId || includeInactive,
  });
}

export function useCreateSubDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subDomain: SubDomainInsert) => {
      const { data, error } = await supabase
        .from("sub_domains")
        .insert(subDomain)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as SubDomain;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub_domains_admin"] });
      toast.success("Sub-domain created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create sub-domain: ${error.message}`);
    },
  });
}

export function useUpdateSubDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SubDomainUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("sub_domains")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as SubDomain;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub_domains_admin"] });
      toast.success("Sub-domain updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update sub-domain: ${error.message}`);
    },
  });
}

export function useDeleteSubDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sub_domains")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub_domains_admin"] });
      toast.success("Sub-domain deactivated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate sub-domain: ${error.message}`);
    },
  });
}

export function useRestoreSubDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sub_domains")
        .update({ is_active: true })
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub_domains_admin"] });
      toast.success("Sub-domain restored successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore sub-domain: ${error.message}`);
    },
  });
}

// Check if sub-domain has children
export function useCheckSubDomainChildren() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { count, error } = await supabase
        .from("specialities")
        .select("*", { count: "exact", head: true })
        .eq("sub_domain_id", id)
        .eq("is_active", true);

      if (error) throw new Error(error.message);
      return (count || 0) > 0;
    },
  });
}

// ===================== SPECIALITIES =====================

export function useSpecialitiesAdmin(subDomainId?: string, includeInactive = false) {
  return useQuery({
    queryKey: ["specialities_admin", subDomainId, { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("specialities")
        .select("*")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (subDomainId) {
        query = query.eq("sub_domain_id", subDomainId);
      }

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as Speciality[];
    },
    enabled: !!subDomainId || includeInactive,
  });
}

export function useCreateSpeciality() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (speciality: SpecialityInsert) => {
      const { data, error } = await supabase
        .from("specialities")
        .insert(speciality)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Speciality;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialities_admin"] });
      toast.success("Speciality created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create speciality: ${error.message}`);
    },
  });
}

export function useUpdateSpeciality() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SpecialityUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("specialities")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Speciality;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialities_admin"] });
      toast.success("Speciality updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update speciality: ${error.message}`);
    },
  });
}

export function useDeleteSpeciality() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("specialities")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialities_admin"] });
      toast.success("Speciality deactivated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate speciality: ${error.message}`);
    },
  });
}

export function useRestoreSpeciality() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("specialities")
        .update({ is_active: true })
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialities_admin"] });
      toast.success("Speciality restored successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore speciality: ${error.message}`);
    },
  });
}
