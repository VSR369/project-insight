import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('id, code, name, phone_code')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useIndustrySegments() {
  return useQuery({
    queryKey: ['industry_segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('industry_segments')
        .select('id, code, name, description')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useAcademicDisciplines() {
  return useQuery({
    queryKey: ['academic_disciplines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_disciplines')
        .select('id, name')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useAcademicStreams(disciplineId?: string) {
  return useQuery({
    queryKey: ['academic_streams', disciplineId],
    queryFn: async () => {
      if (!disciplineId) return [];
      
      const { data, error } = await supabase
        .from('academic_streams')
        .select('id, name')
        .eq('discipline_id', disciplineId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!disciplineId,
  });
}

export function useAcademicSubjects(streamId?: string) {
  return useQuery({
    queryKey: ['academic_subjects', streamId],
    queryFn: async () => {
      if (!streamId) return [];
      
      const { data, error } = await supabase
        .from('academic_subjects')
        .select('id, name')
        .eq('stream_id', streamId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!streamId,
  });
}

export function useExpertiseLevels() {
  return useQuery({
    queryKey: ['expertise_levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expertise_levels')
        .select('id, level_number, name, min_years, max_years, description')
        .order('level_number', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useParticipationModes() {
  return useQuery({
    queryKey: ['participation_modes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('participation_modes')
        .select('id, code, name, description, requires_org_info')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useOrganizationTypes() {
  return useQuery({
    queryKey: ['organization_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_types')
        .select('id, code, name')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
}
