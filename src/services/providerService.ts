import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type SolutionProvider = Database['public']['Tables']['solution_providers']['Row'];
type SolutionProviderInsert = Database['public']['Tables']['solution_providers']['Insert'];
type SolutionProviderUpdate = Database['public']['Tables']['solution_providers']['Update'];
type SolutionProviderOrganization = Database['public']['Tables']['solution_provider_organizations']['Row'];
type SolutionProviderOrganizationInsert = Database['public']['Tables']['solution_provider_organizations']['Insert'];
type StudentProfile = Database['public']['Tables']['student_profiles']['Row'];
type StudentProfileInsert = Database['public']['Tables']['student_profiles']['Insert'];

export interface ProviderData extends SolutionProvider {
  organization?: SolutionProviderOrganization | null;
  student_profile?: StudentProfile | null;
}

export async function fetchCurrentProvider(): Promise<ProviderData | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('solution_providers')
    .select(`
      *,
      organization:solution_provider_organizations(*),
      student_profile:student_profiles(*)
    `)
    .eq('user_id', user.id)
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: provider, error } = await supabase
    .from('solution_providers')
    .insert({
      user_id: user.id,
      first_name: data.firstName,
      last_name: data.lastName,
      is_student: data.isStudent,
      industry_segment_id: data.industrySegmentId,
      country_id: data.countryId,
      lifecycle_status: 'profile_building',
      onboarding_status: 'in_progress',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return provider;
}

export async function updateProviderMode(providerId: string, participationModeId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('solution_providers')
    .update({
      participation_mode_id: participationModeId,
      updated_by: user.id,
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('solution_providers')
    .update({
      expertise_level_id: expertiseLevelId,
      updated_by: user.id,
    })
    .eq('id', providerId);

  if (error) throw error;
}

export async function completeOnboarding(providerId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('solution_providers')
    .update({
      onboarding_status: 'completed',
      lifecycle_status: 'assessment_pending',
      profile_completion_percentage: 100,
      updated_by: user.id,
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
