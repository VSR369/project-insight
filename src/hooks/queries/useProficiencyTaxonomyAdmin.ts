import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

// Import types for bulk import
import type { ParsedTaxonomyRow } from "@/pages/admin/proficiency-taxonomy/ProficiencyExcelExport";

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

/**
 * Fetches proficiency areas with optional filtering
 * @param industrySegmentId - Filter by industry segment
 * @param expertiseLevelId - Filter by expertise level (optional for backward compatibility)
 * @param includeInactive - Include inactive areas (default false)
 */
export function useProficiencyAreasAdmin(
  industrySegmentId?: string, 
  expertiseLevelId?: string,
  includeInactive = false
) {
  return useQuery({
    queryKey: ["proficiency_areas_admin", industrySegmentId, expertiseLevelId, { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("proficiency_areas")
        .select("id, name, description, display_order, industry_segment_id, expertise_level_id, is_active, created_at, updated_at, created_by, updated_by")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (industrySegmentId) {
        query = query.eq("industry_segment_id", industrySegmentId);
      }

      if (expertiseLevelId) {
        query = query.eq("expertise_level_id", expertiseLevelId);
      }

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as ProficiencyArea[];
    },
    // Enable when segment is selected (or for includeInactive scenarios)
    enabled: !!industrySegmentId || includeInactive,
  });
}

export function useCreateProficiencyArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (area: ProficiencyAreaInsert) => {
      const areaWithAudit = await withCreatedBy(area);
      const { data, error } = await supabase
        .from("proficiency_areas")
        .insert(areaWithAudit)
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
      handleMutationError(error, { operation: 'create_proficiency_area' });
    },
  });
}

export function useUpdateProficiencyArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProficiencyAreaUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("proficiency_areas")
        .update(updatesWithAudit)
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
      handleMutationError(error, { operation: 'update_proficiency_area' });
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
      handleMutationError(error, { operation: 'deactivate_proficiency_area' });
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
      handleMutationError(error, { operation: 'restore_proficiency_area' });
    },
  });
}

export function useHardDeleteProficiencyArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("proficiency_areas")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proficiency_areas_admin"] });
      toast.success("Proficiency area permanently deleted");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'hard_delete_proficiency_area' });
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
        .select("id, name, description, display_order, proficiency_area_id, is_active, created_at, updated_at, created_by, updated_by")
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
    // Only run when parent is selected - hierarchy must be respected
    enabled: !!proficiencyAreaId,
  });
}

export function useCreateSubDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subDomain: SubDomainInsert) => {
      const subDomainWithAudit = await withCreatedBy(subDomain);
      const { data, error } = await supabase
        .from("sub_domains")
        .insert(subDomainWithAudit)
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
      handleMutationError(error, { operation: 'create_sub_domain' });
    },
  });
}

export function useUpdateSubDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SubDomainUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("sub_domains")
        .update(updatesWithAudit)
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
      handleMutationError(error, { operation: 'update_sub_domain' });
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
      handleMutationError(error, { operation: 'deactivate_sub_domain' });
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
      handleMutationError(error, { operation: 'restore_sub_domain' });
    },
  });
}

export function useHardDeleteSubDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sub_domains")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub_domains_admin"] });
      toast.success("Sub-domain permanently deleted");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'hard_delete_sub_domain' });
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
        .select("id, name, description, display_order, sub_domain_id, is_active, created_at, updated_at, created_by, updated_by")
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
    // Only run when parent is selected - hierarchy must be respected
    enabled: !!subDomainId,
  });
}

export function useCreateSpeciality() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (speciality: SpecialityInsert) => {
      const specialityWithAudit = await withCreatedBy(speciality);
      const { data, error } = await supabase
        .from("specialities")
        .insert(specialityWithAudit)
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
      handleMutationError(error, { operation: 'create_speciality' });
    },
  });
}

export function useUpdateSpeciality() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SpecialityUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("specialities")
        .update(updatesWithAudit)
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
      handleMutationError(error, { operation: 'update_speciality' });
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
      handleMutationError(error, { operation: 'deactivate_speciality' });
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
      handleMutationError(error, { operation: 'restore_speciality' });
    },
  });
}

export function useHardDeleteSpeciality() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("specialities")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialities_admin"] });
      toast.success("Speciality permanently deleted");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'hard_delete_speciality' });
    },
  });
}

// ===================== BULK IMPORT =====================

interface BulkImportResult {
  areasCreated: number;
  areasUpdated: number;
  areasDeleted: number;
  subDomainsCreated: number;
  subDomainsUpdated: number;
  subDomainsDeleted: number;
  specialitiesCreated: number;
  specialitiesUpdated: number;
  specialitiesDeleted: number;
  errors: string[];
}

interface BulkImportInput {
  rows: ParsedTaxonomyRow[];
  replaceExisting?: boolean;
  onProgress?: (progress: number) => void;
}

export function useBulkImportProficiencyTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rows, replaceExisting = true, onProgress }: BulkImportInput): Promise<BulkImportResult> => {
      const result: BulkImportResult = {
        areasCreated: 0,
        areasUpdated: 0,
        areasDeleted: 0,
        subDomainsCreated: 0,
        subDomainsUpdated: 0,
        subDomainsDeleted: 0,
        specialitiesCreated: 0,
        specialitiesUpdated: 0,
        specialitiesDeleted: 0,
        errors: [],
      };

      // Fetch all industry segments
      const { data: segments, error: segmentsError } = await supabase
        .from("industry_segments")
        .select("id, name")
        .eq("is_active", true);

      if (segmentsError) throw new Error(`Failed to fetch segments: ${segmentsError.message}`);

      const segmentMap = new Map(
        (segments || []).map(s => [s.name.toLowerCase().trim(), s.id])
      );

      // Fetch all expertise levels
      const { data: levels, error: levelsError } = await supabase
        .from("expertise_levels")
        .select("id, name")
        .eq("is_active", true);

      if (levelsError) throw new Error(`Failed to fetch expertise levels: ${levelsError.message}`);

      const levelMap = new Map(
        (levels || []).map(l => [l.name.toLowerCase().trim(), l.id])
      );

      // Cache for created/found entities to avoid duplicate queries
      // Key format: "segmentId:levelId:areaName" -> areaId
      const areaCache = new Map<string, string>();
      const subDomainCache = new Map<string, string>(); // "areaId:subDomainName" -> subDomainId
      const specialityCache = new Map<string, string>(); // "subDomainId:specialityName" -> specialityId

      // Pre-fetch existing data
      const { data: existingAreas } = await supabase
        .from("proficiency_areas")
        .select("id, name, industry_segment_id, expertise_level_id");

      for (const area of existingAreas || []) {
        areaCache.set(`${area.industry_segment_id}:${area.expertise_level_id}:${area.name.toLowerCase().trim()}`, area.id);
      }

      const { data: existingSubDomains } = await supabase
        .from("sub_domains")
        .select("id, name, proficiency_area_id");

      for (const sd of existingSubDomains || []) {
        subDomainCache.set(`${sd.proficiency_area_id}:${sd.name.toLowerCase().trim()}`, sd.id);
      }

      const { data: existingSpecialities } = await supabase
        .from("specialities")
        .select("id, name, sub_domain_id");

      for (const sp of existingSpecialities || []) {
        specialityCache.set(`${sp.sub_domain_id}:${sp.name.toLowerCase().trim()}`, sp.id);
      }

      // Process each row
      const totalRows = rows.length;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
          // Find industry segment
          const segmentId = segmentMap.get(row.industrySegment.toLowerCase().trim());
          if (!segmentId) {
            result.errors.push(`Row ${row.rowNumber}: Industry segment "${row.industrySegment}" not found`);
            continue;
          }

          // Find expertise level
          const levelId = levelMap.get(row.expertiseLevel.toLowerCase().trim());
          if (!levelId) {
            result.errors.push(`Row ${row.rowNumber}: Expertise level "${row.expertiseLevel}" not found`);
            continue;
          }

          // Find or create proficiency area (now keyed by segment + level + name)
          const areaKey = `${segmentId}:${levelId}:${row.proficiencyArea.toLowerCase().trim()}`;
          let areaId = areaCache.get(areaKey);

          if (!areaId) {
            // Create new area
            const { data: newArea, error: areaError } = await supabase
              .from("proficiency_areas")
              .insert({
                name: row.proficiencyArea,
                description: row.areaDescription || null,
                industry_segment_id: segmentId,
                expertise_level_id: levelId,
                is_active: true,
              })
              .select()
              .single();

            if (areaError) {
              result.errors.push(`Row ${row.rowNumber}: Failed to create area - ${areaError.message}`);
              continue;
            }

            areaId = newArea.id;
            areaCache.set(areaKey, areaId);
            result.areasCreated++;
          } else if (row.areaDescription) {
            // Update existing area description if provided
            await supabase
              .from("proficiency_areas")
              .update({ description: row.areaDescription })
              .eq("id", areaId);
            result.areasUpdated++;
          }

          // Find or create sub-domain
          const subDomainKey = `${areaId}:${row.subDomain.toLowerCase().trim()}`;
          let subDomainId = subDomainCache.get(subDomainKey);

          if (!subDomainId) {
            // Create new sub-domain
            const { data: newSubDomain, error: sdError } = await supabase
              .from("sub_domains")
              .insert({
                name: row.subDomain,
                description: row.subDomainDescription || null,
                proficiency_area_id: areaId,
                is_active: true,
              })
              .select()
              .single();

            if (sdError) {
              result.errors.push(`Row ${row.rowNumber}: Failed to create sub-domain - ${sdError.message}`);
              continue;
            }

            subDomainId = newSubDomain.id;
            subDomainCache.set(subDomainKey, subDomainId);
            result.subDomainsCreated++;
          } else if (row.subDomainDescription) {
            // Update existing sub-domain description if provided
            await supabase
              .from("sub_domains")
              .update({ description: row.subDomainDescription })
              .eq("id", subDomainId);
            result.subDomainsUpdated++;
          }

          // Find or create speciality
          const specialityKey = `${subDomainId}:${row.speciality.toLowerCase().trim()}`;
          let specialityId = specialityCache.get(specialityKey);

          if (!specialityId) {
            // Create new speciality
            const { data: newSpeciality, error: spError } = await supabase
              .from("specialities")
              .insert({
                name: row.speciality,
                description: row.specialityDescription || null,
                display_order: row.displayOrder,
                sub_domain_id: subDomainId,
                is_active: row.isActive,
              })
              .select()
              .single();

            if (spError) {
              result.errors.push(`Row ${row.rowNumber}: Failed to create speciality - ${spError.message}`);
              continue;
            }

            specialityId = newSpeciality.id;
            specialityCache.set(specialityKey, specialityId);
            result.specialitiesCreated++;
          } else {
            // Update existing speciality
            await supabase
              .from("specialities")
              .update({
                description: row.specialityDescription || undefined,
                display_order: row.displayOrder,
                is_active: row.isActive,
              })
              .eq("id", specialityId);
            result.specialitiesUpdated++;
          }
        } catch (error) {
          result.errors.push(`Row ${row.rowNumber}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }

        // Report progress (use 80% for import, 20% for deletion)
        if (onProgress) {
          onProgress(Math.round(((i + 1) / totalRows) * 80));
        }
      }

      // If replaceExisting is true, delete items not in the import
      if (replaceExisting) {
        const importedAreaIds = new Set(areaCache.values());
        const importedSubDomainIds = new Set(subDomainCache.values());
        const importedSpecialityIds = new Set(specialityCache.values());

        // Delete specialities not in import
        const { data: allSpecialities } = await supabase
          .from("specialities")
          .select("id");

        const specialitiesToDelete = (allSpecialities || [])
          .filter(s => !importedSpecialityIds.has(s.id))
          .map(s => s.id);

        if (specialitiesToDelete.length > 0) {
          const { error: deleteSpecError } = await supabase
            .from("specialities")
            .delete()
            .in("id", specialitiesToDelete);

          if (deleteSpecError) {
            result.errors.push(`Failed to delete old specialities: ${deleteSpecError.message}`);
          } else {
            result.specialitiesDeleted = specialitiesToDelete.length;
          }
        }

        if (onProgress) onProgress(85);

        // Delete sub-domains not in import
        const { data: allSubDomains } = await supabase
          .from("sub_domains")
          .select("id");

        const subDomainsToDelete = (allSubDomains || [])
          .filter(sd => !importedSubDomainIds.has(sd.id))
          .map(sd => sd.id);

        if (subDomainsToDelete.length > 0) {
          const { error: deleteSDError } = await supabase
            .from("sub_domains")
            .delete()
            .in("id", subDomainsToDelete);

          if (deleteSDError) {
            result.errors.push(`Failed to delete old sub-domains: ${deleteSDError.message}`);
          } else {
            result.subDomainsDeleted = subDomainsToDelete.length;
          }
        }

        if (onProgress) onProgress(92);

        // Delete proficiency areas not in import
        const { data: allAreas } = await supabase
          .from("proficiency_areas")
          .select("id");

        const areasToDelete = (allAreas || [])
          .filter(a => !importedAreaIds.has(a.id))
          .map(a => a.id);

        if (areasToDelete.length > 0) {
          const { error: deleteAreaError } = await supabase
            .from("proficiency_areas")
            .delete()
            .in("id", areasToDelete);

          if (deleteAreaError) {
            result.errors.push(`Failed to delete old proficiency areas: ${deleteAreaError.message}`);
          } else {
            result.areasDeleted = areasToDelete.length;
          }
        }

        if (onProgress) onProgress(100);
      } else {
        if (onProgress) onProgress(100);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proficiency_areas_admin"] });
      queryClient.invalidateQueries({ queryKey: ["sub_domains_admin"] });
      queryClient.invalidateQueries({ queryKey: ["specialities_admin"] });
      toast.success("Proficiency taxonomy imported successfully");
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });
}
