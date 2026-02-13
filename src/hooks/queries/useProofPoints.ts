import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { canModifyField } from '@/services/lifecycleService';
import { withCreatedBy, withUpdatedBy, getCurrentUserId } from '@/lib/auditFields';
import { handleMutationError, logWarning } from '@/lib/errorHandler';

type ProofPoint = Database['public']['Tables']['proof_points']['Row'];
type ProofPointType = Database['public']['Enums']['proof_point_type'];
type ProofPointCategory = Database['public']['Enums']['proof_point_category'];
type LifecycleStatus = Database['public']['Enums']['lifecycle_status'];

export interface ProofPointWithCounts extends ProofPoint {
  linksCount: number;
  filesCount: number;
  tagsCount: number;
  speciality_tags?: Array<{ speciality_id: string }>;
}

export interface CreateProofPointInput {
  providerId: string;
  enrollmentId?: string; // Enrollment-scoped tracking
  industrySegmentId?: string; // Industry context
  category: ProofPointCategory;
  type: ProofPointType;
  title: string;
  description: string;
  specialityIds?: string[];
  links?: Array<{ url: string; title?: string; description?: string }>;
}

export interface UpdateProofPointInput {
  id: string;
  category?: ProofPointCategory;
  type?: ProofPointType;
  title?: string;
  description?: string;
  specialityIds?: string[];
}

// Minimum proof points required - this can be overridden by system_settings
const DEFAULT_MIN_PROOF_POINTS = 2;

// Helper to get minimum proof points from system settings
async function getMinProofPointsRequired(): Promise<number> {
  const { data } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'proof_points_minimum')
    .single();

  if (data?.setting_value && typeof data.setting_value === 'object' && 'value' in data.setting_value) {
    return (data.setting_value as { value: number }).value;
  }
  return DEFAULT_MIN_PROOF_POINTS;
}

// Helper to check content modification lock (enrollment-scoped)
async function checkContentLock(enrollmentId?: string): Promise<{ allowed: boolean; reason?: string }> {
  // If no enrollment, allow (new user or registration phase)
  if (!enrollmentId) {
    return { allowed: true };
  }

  const { data: enrollment, error } = await supabase
    .from('provider_industry_enrollments')
    .select('lifecycle_rank')
    .eq('id', enrollmentId)
    .single();

  if (error) {
    // Log but don't block - enrollment might not exist yet
    logWarning('Could not fetch enrollment for content lock check', { operation: 'checkContentLock', enrollmentId });
    return { allowed: true };
  }

  return canModifyField(enrollment?.lifecycle_rank || 0, 'content');
}

// Options for useProofPoints hook
export interface UseProofPointsOptions {
  enrollmentId?: string; // Filter by specific enrollment
  industrySegmentId?: string;
  includeAllIndustries?: boolean;
}

// Proof point counts by industry segment
export interface ProofPointCountByIndustry {
  industrySegmentId: string | null;
  count: number;
}

// Fetch proof point counts grouped by industry segment
export function useProofPointCountsByIndustry(providerId?: string) {
  return useQuery({
    queryKey: ['proof-point-counts-by-industry', providerId],
    queryFn: async (): Promise<ProofPointCountByIndustry[]> => {
      if (!providerId) return [];

      const { data, error } = await supabase
        .from('proof_points')
        .select('industry_segment_id')
        .eq('provider_id', providerId)
        .eq('is_deleted', false);

      if (error) throw error;
      if (!data?.length) return [];

      // Count by industry segment
      const countMap = new Map<string | null, number>();
      data.forEach(pp => {
        const key = pp.industry_segment_id;
        countMap.set(key, (countMap.get(key) || 0) + 1);
      });

      return Array.from(countMap.entries()).map(([industrySegmentId, count]) => ({
        industrySegmentId,
        count,
      }));
    },
    enabled: !!providerId,
    staleTime: 30000,
  });
}

// Fetch all proof points for a provider with counts
export function useProofPoints(providerId?: string, options?: UseProofPointsOptions) {
  return useQuery({
    queryKey: ['proof-points', providerId, options?.industrySegmentId, options?.includeAllIndustries],
    queryFn: async () => {
      if (!providerId) return [];

      // Fetch proof points
      let query = supabase
        .from('proof_points')
        .select('id, provider_id, enrollment_id, industry_segment_id, category, type, title, description, is_deleted, created_at, updated_at, created_by, updated_by')
        .eq('provider_id', providerId)
        .eq('is_deleted', false);

      // Filter by industry unless explicitly showing all
      if (options?.industrySegmentId && !options?.includeAllIndustries) {
        query = query.eq('industry_segment_id', options.industrySegmentId);
      }

      const { data: proofPoints, error: proofPointsError } = await query.order('created_at', { ascending: false });

      if (proofPointsError) throw proofPointsError;
      if (!proofPoints?.length) return [];

      const proofPointIds = proofPoints.map(pp => pp.id);

      // Fetch counts in parallel
      const [linksResult, filesResult, tagsResult] = await Promise.all([
        supabase
          .from('proof_point_links')
          .select('proof_point_id')
          .in('proof_point_id', proofPointIds),
        supabase
          .from('proof_point_files')
          .select('proof_point_id')
          .in('proof_point_id', proofPointIds),
        supabase
          .from('proof_point_speciality_tags')
          .select('proof_point_id, speciality_id')
          .in('proof_point_id', proofPointIds),
      ]);

      // Build counts map
      const linksCounts = new Map<string, number>();
      const filesCounts = new Map<string, number>();
      const tagsCounts = new Map<string, number>();
      const tagsMap = new Map<string, Array<{ speciality_id: string }>>();

      linksResult.data?.forEach(link => {
        linksCounts.set(link.proof_point_id, (linksCounts.get(link.proof_point_id) || 0) + 1);
      });
      filesResult.data?.forEach(file => {
        filesCounts.set(file.proof_point_id, (filesCounts.get(file.proof_point_id) || 0) + 1);
      });
      tagsResult.data?.forEach(tag => {
        tagsCounts.set(tag.proof_point_id, (tagsCounts.get(tag.proof_point_id) || 0) + 1);
        if (!tagsMap.has(tag.proof_point_id)) {
          tagsMap.set(tag.proof_point_id, []);
        }
        tagsMap.get(tag.proof_point_id)!.push({ speciality_id: tag.speciality_id });
      });

      return proofPoints.map(pp => ({
        ...pp,
        linksCount: linksCounts.get(pp.id) || 0,
        filesCount: filesCounts.get(pp.id) || 0,
        tagsCount: tagsCounts.get(pp.id) || 0,
        speciality_tags: tagsMap.get(pp.id) || [],
      })) as ProofPointWithCounts[];
    },
    enabled: !!providerId,
    staleTime: 30000,
  });
}

// Fetch single proof point with all related data
export function useProofPoint(proofPointId?: string) {
  return useQuery({
    queryKey: ['proof-point', proofPointId],
    queryFn: async () => {
      if (!proofPointId) return null;

      const [proofPointResult, linksResult, filesResult, tagsResult] = await Promise.all([
        supabase
          .from('proof_points')
          .select('id, provider_id, enrollment_id, industry_segment_id, category, type, title, description, is_deleted, created_at, updated_at, created_by, updated_by')
          .eq('id', proofPointId)
          .single(),
        supabase
          .from('proof_point_links')
          .select('id, proof_point_id, url, title, description, display_order, created_at')
          .eq('proof_point_id', proofPointId)
          .order('display_order', { ascending: true }),
        supabase
          .from('proof_point_files')
          .select('id, proof_point_id, file_name, mime_type, file_size, storage_path, created_at')
          .eq('proof_point_id', proofPointId),
        supabase
          .from('proof_point_speciality_tags')
          .select('*, specialities(id, name)')
          .eq('proof_point_id', proofPointId),
      ]);

      if (proofPointResult.error) throw proofPointResult.error;

      return {
        ...proofPointResult.data,
        links: linksResult.data || [],
        files: filesResult.data || [],
        specialityTags: tagsResult.data || [],
      };
    },
    enabled: !!proofPointId,
  });
}

// Helper to update enrollment lifecycle based on proof point count
async function updateEnrollmentLifecycleForProofPoints(
  enrollmentId: string,
  providerId: string,
  industrySegmentId: string | null
) {
  // Get current proof point count for this enrollment
  let countQuery = supabase
    .from('proof_points')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .eq('is_deleted', false);

  if (enrollmentId) {
    countQuery = countQuery.eq('enrollment_id', enrollmentId);
  } else if (industrySegmentId) {
    countQuery = countQuery.eq('industry_segment_id', industrySegmentId);
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    logWarning('Error counting proof points', { operation: 'updateEnrollmentLifecycleForProofPoints', enrollmentId }, { error: countError });
    return;
  }

  const currentCount = count || 0;
  const minRequired = await getMinProofPointsRequired();

  // Get current enrollment lifecycle
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('provider_industry_enrollments')
    .select('lifecycle_rank, lifecycle_status')
    .eq('id', enrollmentId)
    .single();

  if (enrollmentError || !enrollment) {
    logWarning('Error fetching enrollment', { operation: 'updateEnrollmentLifecycleForProofPoints', enrollmentId }, { error: enrollmentError });
    return;
  }

  // Determine target lifecycle based on proof point count
  let targetStatus: LifecycleStatus | null = null;
  let targetRank: number | null = null;

  if (currentCount >= minRequired && enrollment.lifecycle_rank < 70) {
    // Minimum met - advance to proof_points_min_met
    targetStatus = 'proof_points_min_met';
    targetRank = 70;
  } else if (currentCount >= 1 && currentCount < minRequired && enrollment.lifecycle_rank < 60) {
    // At least one proof point - advance to proof_points_started
    targetStatus = 'proof_points_started';
    targetRank = 60;
  } else if (currentCount < minRequired && enrollment.lifecycle_rank === 70) {
    // Dropped below minimum (after delete) - revert to proof_points_started
    targetStatus = 'proof_points_started';
    targetRank = 60;
  } else if (currentCount === 0 && enrollment.lifecycle_rank === 60) {
    // No proof points left - revert to expertise_selected (if that was previous state)
    targetStatus = 'expertise_selected';
    targetRank = 50;
  }

  // Update enrollment if lifecycle change is needed
  if (targetStatus && targetRank !== null) {
    const { error: updateError } = await supabase
      .from('provider_industry_enrollments')
      .update({
        lifecycle_status: targetStatus,
        lifecycle_rank: targetRank,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId);

    if (updateError) {
      logWarning('Error updating enrollment lifecycle', { operation: 'updateEnrollmentLifecycleForProofPoints', enrollmentId }, { targetStatus, error: updateError });
    }
  }
}

// Create new proof point with links and tags
export function useCreateProofPoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProofPointInput) => {
      // Check content lock (enrollment-scoped)
      const contentCheck = await checkContentLock(input.enrollmentId);
      if (!contentCheck.allowed) {
        throw new Error(contentCheck.reason || 'Content modification is locked at this lifecycle stage');
      }

      // Insert proof point with audit fields and enrollment scope
      const proofPointData = await withCreatedBy({
        provider_id: input.providerId,
        enrollment_id: input.enrollmentId || null, // Enrollment-scoped tracking
        industry_segment_id: input.industrySegmentId || null,
        category: input.category,
        type: input.type,
        title: input.title,
        description: input.description,
      });
      
      const { data: proofPoint, error: proofPointError } = await supabase
        .from('proof_points')
        .insert(proofPointData)
        .select()
        .single();

      if (proofPointError) throw proofPointError;

      // Insert speciality tags if category is specialty_specific
      if (input.category === 'specialty_specific' && input.specialityIds?.length) {
        const tags = input.specialityIds.map(specialityId => ({
          proof_point_id: proofPoint.id,
          speciality_id: specialityId,
        }));

        const { error: tagsError } = await supabase
          .from('proof_point_speciality_tags')
          .insert(tags);

        if (tagsError) throw tagsError;
      }

      // Insert links if provided
      if (input.links?.length) {
        const links = input.links.map((link, index) => ({
          proof_point_id: proofPoint.id,
          url: link.url,
          title: link.title || null,
          display_order: index,
        }));

        const { error: linksError } = await supabase
          .from('proof_point_links')
          .insert(links);

        if (linksError) throw linksError;
      }

      // Update enrollment lifecycle based on new proof point count
      if (input.enrollmentId) {
        await updateEnrollmentLifecycleForProofPoints(
          input.enrollmentId,
          input.providerId,
          input.industrySegmentId || null
        );
      }

      return proofPoint;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proof-points', variables.providerId] });
      queryClient.invalidateQueries({ queryKey: ['provider-enrollments', variables.providerId] });
      queryClient.invalidateQueries({ queryKey: ['enrollment', variables.enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['can-start-enrollment-assessment'] });
      toast.success('Proof Point saved successfully');
    },
    onError: (error) => {
      handleMutationError(error, { operation: 'createProofPoint' }, true);
    },
  });
}

// Update existing proof point
export function useUpdateProofPoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProofPointInput & { providerId: string; enrollmentId?: string }) => {
      const { id, providerId, enrollmentId, specialityIds, ...updateData } = input;

      // Get enrollment_id from proof point if not provided
      let effectiveEnrollmentId = enrollmentId;
      if (!effectiveEnrollmentId) {
        const { data: pp } = await supabase
          .from('proof_points')
          .select('enrollment_id')
          .eq('id', id)
          .single();
        effectiveEnrollmentId = pp?.enrollment_id ?? undefined;
      }

      // Check content lock (enrollment-scoped)
      const contentCheck = await checkContentLock(effectiveEnrollmentId);
      if (!contentCheck.allowed) {
        throw new Error(contentCheck.reason || 'Content modification is locked at this lifecycle stage');
      }

      // Update proof point with audit fields
      const updateDataWithAudit = await withUpdatedBy({
        ...updateData,
        updated_at: new Date().toISOString(),
      });
      
      const { error: updateError } = await supabase
        .from('proof_points')
        .update(updateDataWithAudit)
        .eq('id', id);

      if (updateError) throw updateError;

      // Update speciality tags if provided
      if (specialityIds !== undefined) {
        // Delete existing tags
        await supabase
          .from('proof_point_speciality_tags')
          .delete()
          .eq('proof_point_id', id);

        // Insert new tags
        if (specialityIds.length > 0) {
          const tags = specialityIds.map(specialityId => ({
            proof_point_id: id,
            speciality_id: specialityId,
          }));

          const { error: tagsError } = await supabase
            .from('proof_point_speciality_tags')
            .insert(tags);

          if (tagsError) throw tagsError;
        }
      }

      return { id, providerId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['proof-points', result.providerId] });
      queryClient.invalidateQueries({ queryKey: ['proof-point', result.id] });
      toast.success('Proof Point updated successfully');
    },
    onError: (error) => {
      handleMutationError(error, { operation: 'updateProofPoint' }, true);
    },
  });
}

// Soft delete proof point with minimum constraint check (enrollment-scoped)
export function useDeleteProofPoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, providerId, enrollmentId, industrySegmentId }: { 
      id: string; 
      providerId: string; 
      enrollmentId?: string;
      industrySegmentId?: string;
    }) => {
      // Check content lock (enrollment-scoped)
      const contentCheck = await checkContentLock(enrollmentId);
      if (!contentCheck.allowed) {
        throw new Error(contentCheck.reason || 'Content modification is locked at this lifecycle stage');
      }

      const userId = await getCurrentUserId();
      
      // Soft delete the proof point
      const { error } = await supabase
        .from('proof_points')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
        })
        .eq('id', id);

      if (error) throw error;

      // Update enrollment lifecycle after deletion
      if (enrollmentId) {
        await updateEnrollmentLifecycleForProofPoints(
          enrollmentId,
          providerId,
          industrySegmentId || null
        );
      }

      return { id, providerId, enrollmentId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['proof-points', result.providerId] });
      queryClient.invalidateQueries({ queryKey: ['provider-enrollments', result.providerId] });
      queryClient.invalidateQueries({ queryKey: ['enrollment', result.enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['can-start-enrollment-assessment'] });
      toast.success('Proof Point deleted');
    },
    onError: (error) => {
      handleMutationError(error, { operation: 'deleteProofPoint' }, true);
    },
  });
}

// Add link to proof point
export function useAddProofPointLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      proofPointId, 
      url, 
      title,
      providerId,
      enrollmentId,
    }: { 
      proofPointId: string; 
      url: string; 
      title?: string;
      providerId: string;
      enrollmentId?: string;
    }) => {
      // Get enrollment_id from proof point if not provided
      let effectiveEnrollmentId = enrollmentId;
      if (!effectiveEnrollmentId) {
        const { data: pp } = await supabase
          .from('proof_points')
          .select('enrollment_id')
          .eq('id', proofPointId)
          .single();
        effectiveEnrollmentId = pp?.enrollment_id ?? undefined;
      }

      // Check content lock (enrollment-scoped)
      const contentCheck = await checkContentLock(effectiveEnrollmentId);
      if (!contentCheck.allowed) {
        throw new Error(contentCheck.reason || 'Content modification is locked at this lifecycle stage');
      }

      const { error } = await supabase
        .from('proof_point_links')
        .insert({
          proof_point_id: proofPointId,
          url,
          title: title || null,
        });

      if (error) throw error;
      return { proofPointId, providerId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['proof-points', result.providerId] });
      queryClient.invalidateQueries({ queryKey: ['proof-point', result.proofPointId] });
    },
    onError: (error) => {
      handleMutationError(error, { operation: 'addProofPointLink' }, true);
    },
  });
}

// Upload file to proof point
export function useUploadProofPointFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      proofPointId, 
      file, 
      providerId,
      userId,
      enrollmentId,
    }: { 
      proofPointId: string; 
      file: File; 
      providerId: string;
      userId: string;
      enrollmentId?: string;
    }) => {
      // Get enrollment_id from proof point if not provided
      let effectiveEnrollmentId = enrollmentId;
      if (!effectiveEnrollmentId) {
        const { data: pp } = await supabase
          .from('proof_points')
          .select('enrollment_id')
          .eq('id', proofPointId)
          .single();
        effectiveEnrollmentId = pp?.enrollment_id ?? undefined;
      }

      // Check content lock (enrollment-scoped)
      const contentCheck = await checkContentLock(effectiveEnrollmentId);
      if (!contentCheck.allowed) {
        throw new Error(contentCheck.reason || 'Content modification is locked at this lifecycle stage');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File exceeds 10 MB limit');
      }

      // Upload to storage
      const fileName = `${Date.now()}-${file.name}`;
      const storagePath = `${userId}/${proofPointId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('proof-point-files')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Create file record
      const { error: insertError } = await supabase
        .from('proof_point_files')
        .insert({
          proof_point_id: proofPointId,
          file_name: file.name,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
          storage_path: storagePath,
        });

      if (insertError) throw insertError;

      return { proofPointId, providerId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['proof-points', result.providerId] });
      queryClient.invalidateQueries({ queryKey: ['proof-point', result.proofPointId] });
      toast.success('File uploaded successfully');
    },
    onError: (error) => {
      handleMutationError(error, { operation: 'uploadProofPointFile' }, true);
    },
  });
}

// Delete file from proof point
export function useDeleteProofPointFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      fileId, 
      storagePath, 
      proofPointId,
      providerId,
      enrollmentId,
    }: { 
      fileId: string; 
      storagePath: string; 
      proofPointId: string;
      providerId: string;
      enrollmentId?: string;
    }) => {
      // Get enrollment_id from proof point if not provided
      let effectiveEnrollmentId = enrollmentId;
      if (!effectiveEnrollmentId) {
        const { data: pp } = await supabase
          .from('proof_points')
          .select('enrollment_id')
          .eq('id', proofPointId)
          .single();
        effectiveEnrollmentId = pp?.enrollment_id ?? undefined;
      }

      // Check content lock (enrollment-scoped)
      const contentCheck = await checkContentLock(effectiveEnrollmentId);
      if (!contentCheck.allowed) {
        throw new Error(contentCheck.reason || 'Content modification is locked at this lifecycle stage');
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('proof-point-files')
        .remove([storagePath]);

      if (storageError) logWarning('Storage delete error', { operation: 'deleteProofPointFile' }, { storagePath, error: storageError });

      // Delete record
      const { error } = await supabase
        .from('proof_point_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
      return { proofPointId, providerId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['proof-points', result.providerId] });
      queryClient.invalidateQueries({ queryKey: ['proof-point', result.proofPointId] });
      toast.success('File deleted');
    },
    onError: (error) => {
      handleMutationError(error, { operation: 'deleteProofPointFile' }, true);
    },
  });
}
