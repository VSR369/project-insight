import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserId } from '@/lib/auditFields';
import { logWarning } from '@/lib/errorHandler';
import type { Database } from '@/integrations/supabase/types';

type SolutionProvider = Database['public']['Tables']['solution_providers']['Row'];
type SolutionProviderOrganization = Database['public']['Tables']['solution_provider_organizations']['Row'];
type StudentProfile = Database['public']['Tables']['student_profiles']['Row'];

export interface ProviderData extends SolutionProvider {
  organization?: SolutionProviderOrganization | null;
  student_profile?: StudentProfile | null;
}

export async function fetchCurrentProvider(): Promise<ProviderData | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('solution_providers')
    .select(`
      *,
      organization:solution_provider_organizations(*),
      student_profile:student_profiles(*)
    `)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as ProviderData | null;
}

export async function createProvider(data: {
  firstName: string;
  lastName: string;
  isStudent: boolean;
  industrySegmentId?: string;
  countryId?: string;
}): Promise<SolutionProvider> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { data: provider, error } = await supabase
    .from('solution_providers')
    .insert({
      user_id: userId,
      first_name: data.firstName,
      last_name: data.lastName,
      is_student: data.isStudent,
      industry_segment_id: data.industrySegmentId,
      country_id: data.countryId,
      lifecycle_status: 'profile_building',
      onboarding_status: 'in_progress',
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return provider;
}

export async function updateProviderMode(providerId: string, participationModeId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('solution_providers')
    .update({
      participation_mode_id: participationModeId,
      updated_by: userId,
    })
    .eq('id', providerId);

  if (error) throw error;
}

export async function upsertOrganization(
  providerId: string,
  data: {
    orgName: string;
    orgTypeId: string;
    orgWebsite?: string;
    designation?: string;
    managerName: string;
    managerEmail: string;
    managerPhone?: string;
  }
): Promise<SolutionProviderOrganization> {
  const { data: org, error } = await supabase
    .from('solution_provider_organizations')
    .upsert({
      provider_id: providerId,
      org_name: data.orgName,
      org_type_id: data.orgTypeId,
      org_website: data.orgWebsite || null,
      designation: data.designation || null,
      manager_name: data.managerName,
      manager_email: data.managerEmail,
      manager_phone: data.managerPhone || null,
    }, {
      onConflict: 'provider_id',
    })
    .select()
    .single();

  if (error) throw error;
  return org;
}

export async function updateProviderExpertise(
  providerId: string,
  expertiseLevelId: string
): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('solution_providers')
    .update({
      expertise_level_id: expertiseLevelId,
      updated_by: userId,
    })
    .eq('id', providerId);

  if (error) throw error;
}

export async function completeOnboarding(providerId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('solution_providers')
    .update({
      onboarding_status: 'completed',
      lifecycle_status: 'assessment_pending',
      profile_completion_percentage: 100,
      updated_by: userId,
    })
    .eq('id', providerId);

  if (error) throw error;
}

export async function updateProviderBasicProfile(
  providerId: string,
  data: {
    firstName: string;
    lastName: string;
    address: string;
    pinCode: string;
    countryId: string;
    industrySegmentId: string;
    isStudent: boolean;
  }
): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('solution_providers')
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      address: data.address,
      pin_code: data.pinCode,
      country_id: data.countryId,
      industry_segment_id: data.industrySegmentId,
      is_student: data.isStudent,
      lifecycle_status: 'enrolled',
      lifecycle_rank: 20,
      onboarding_status: 'in_progress',
      updated_by: userId,
    })
    .eq('id', providerId);

  if (error) throw error;
}

export async function upsertStudentProfile(
  providerId: string,
  data: {
    institution?: string;
    disciplineId?: string;
    streamId?: string;
    subjectId?: string;
    graduationYear?: number;
  }
): Promise<StudentProfile> {
  const { data: profile, error } = await supabase
    .from('student_profiles')
    .upsert({
      provider_id: providerId,
      institution: data.institution || null,
      discipline_id: data.disciplineId || null,
      stream_id: data.streamId || null,
      subject_id: data.subjectId || null,
      graduation_year: data.graduationYear || null,
    }, {
      onConflict: 'provider_id',
    })
    .select()
    .single();

  if (error) throw error;
  return profile;
}

// Fetch provider's selected proficiency areas
export async function fetchProviderProficiencyAreas(providerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('provider_proficiency_areas')
    .select('proficiency_area_id')
    .eq('provider_id', providerId);

  if (error) throw error;
  return data?.map(row => row.proficiency_area_id) || [];
}

// Upsert provider's proficiency area selections (delete old + insert new)
// Handles orphaned proof points when areas are removed
export async function upsertProviderProficiencyAreas(
  providerId: string,
  proficiencyAreaIds: string[]
): Promise<{ orphanedCount: number }> {
  // Get current user for audit fields
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  // 1. Fetch current selections to detect removed areas
  const { data: existingAreas, error: fetchError } = await supabase
    .from('provider_proficiency_areas')
    .select('proficiency_area_id')
    .eq('provider_id', providerId);

  if (fetchError) throw fetchError;

  const existingIds = existingAreas?.map(a => a.proficiency_area_id) || [];
  const removedIds = existingIds.filter(id => !proficiencyAreaIds.includes(id));

  let orphanedCount = 0;

  // 2. Handle orphaned proof points if areas were removed
  if (removedIds.length > 0) {
    const { data: result, error: orphanError } = await supabase
      .rpc('handle_orphaned_proof_points', {
        p_provider_id: providerId,
        p_removed_area_ids: removedIds,
      });

    if (orphanError) {
      logWarning('Error handling orphaned proof points', { 
        operation: 'upsertProviderProficiencyAreas', 
        providerId 
      });
      // Continue with the upsert even if orphan handling fails
    } else {
      orphanedCount = result || 0;
    }
  }

  // 3. Delete all existing selections for this provider
  const { error: deleteError } = await supabase
    .from('provider_proficiency_areas')
    .delete()
    .eq('provider_id', providerId);

  if (deleteError) throw deleteError;

  // 4. Insert new selections with audit fields (if any)
  if (proficiencyAreaIds.length > 0) {
    const rows = proficiencyAreaIds.map(areaId => ({
      provider_id: providerId,
      proficiency_area_id: areaId,
      created_by: userId,
    }));

    const { error: insertError } = await supabase
      .from('provider_proficiency_areas')
      .insert(rows);

    if (insertError) throw insertError;
  }

  return { orphanedCount };
}
