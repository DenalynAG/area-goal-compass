import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type KpiTotalOverride = { kpi_id: string; year: number; target: number | null; actual: number | null };

export function useKpiTotalOverrides() {
  return useQuery({
    queryKey: ['kpi_total_overrides'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kpi_total_overrides').select('kpi_id, year, target, actual');
      if (error) throw error;
      return (data ?? []) as KpiTotalOverride[];
    },
  });
}

export function findTotalOverride(list: readonly KpiTotalOverride[], kpiId: string, year: number) {
  return list.find(o => o.kpi_id === kpiId && o.year === year);
}

/** A Super Admin fixed value replaces the calculated Total KPI value. */
export function withOverride(calculated: number | null, fixed: number | null | undefined): number | null {
  return fixed === null || fixed === undefined ? calculated : Number(fixed);
}
