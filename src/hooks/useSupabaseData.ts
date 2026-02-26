import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export function useAreas() {
  return useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('areas').select('*').order('name');
      if (error) throw error;
      return data as Tables<'areas'>[];
    },
  });
}

export function useSubareas() {
  return useQuery({
    queryKey: ['subareas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subareas').select('*').order('name');
      if (error) throw error;
      return data as Tables<'subareas'>[];
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (error) throw error;
      return data as Tables<'profiles'>[];
    },
  });
}

export function useMemberships() {
  return useQuery({
    queryKey: ['memberships'],
    queryFn: async () => {
      const { data, error } = await supabase.from('memberships').select('*');
      if (error) throw error;
      return data as Tables<'memberships'>[];
    },
  });
}

export function useUserRoles() {
  return useQuery({
    queryKey: ['user_roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data as Tables<'user_roles'>[];
    },
  });
}

export function useObjectives() {
  return useQuery({
    queryKey: ['objectives'],
    queryFn: async () => {
      const { data, error } = await supabase.from('objectives').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Tables<'objectives'>[];
    },
  });
}

export function useKPIs() {
  return useQuery({
    queryKey: ['kpis'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kpis').select('*').order('name');
      if (error) throw error;
      return data as Tables<'kpis'>[];
    },
  });
}

export function useKPIMeasurements() {
  return useQuery({
    queryKey: ['kpi_measurements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kpi_measurements').select('*').order('period_date');
      if (error) throw error;
      return data as Tables<'kpi_measurements'>[];
    },
  });
}

export function useActivityLog() {
  return useQuery({
    queryKey: ['activity_log'],
    queryFn: async () => {
      const { data, error } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data as Tables<'activity_log'>[];
    },
  });
}

export function usePositions() {
  return useQuery({
    queryKey: ['positions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('positions').select('*').order('name');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useSystemParameters() {
  return useQuery({
    queryKey: ['system_parameters'],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_parameters').select('*').order('key');
      if (error) throw error;
      return data as { key: string; value: string; label: string; updated_at: string }[];
    },
  });
}

export function useNewsletterPosts() {
  return useQuery({
    queryKey: ['newsletter_posts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('newsletter_posts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

// Helper to get name from profiles array
export function getProfileName(profiles: Tables<'profiles'>[], userId: string | null): string {
  if (!userId) return 'N/A';
  return profiles.find(p => p.id === userId)?.name ?? 'N/A';
}

// Helper to get area name
export function getAreaNameFromList(areas: Tables<'areas'>[], areaId: string | null): string {
  if (!areaId) return 'N/A';
  return areas.find(a => a.id === areaId)?.name ?? 'N/A';
}

// Helper to get subarea name
export function getSubareaNameFromList(subareas: Tables<'subareas'>[], subareaId: string | null): string {
  if (!subareaId) return '';
  return subareas.find(s => s.id === subareaId)?.name ?? '';
}
