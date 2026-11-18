import { isKpiMonthAllowed } from '@/lib/kpiMonths';

type Measurement = { kpi_id: string; period_date: string; value: number };

/**
 * Calendar date strings must not be converted to local-time Date objects.
 * startMonth defaults to 2 (dashboard area compliance stays February–November);
 * the Total KPI view passes 1 so January counts toward the average or sum.
 */
export function getKpiActualValue(
  kpiId: string,
  year: number,
  measurements: readonly Measurement[],
  method: string,
  endMonth = 11,
  startMonth = 2,
): number | null {
  const end = Math.min(11, endMonth);
  const start = Math.max(1, startMonth);
  const included = measurements.filter(m =>
    m.kpi_id === kpiId && m.period_date.startsWith(`${year}-`) &&
    isKpiMonthAllowed(m.period_date) && Number(m.period_date.slice(5, 7)) <= end
    && Number(m.period_date.slice(5, 7)) >= start,
  );
  if (!included.length || end < start) return null;
  const sum = included.reduce((total, m) => total + Number(m.value), 0);
  return Math.round((method === 'suma' ? sum : sum / (end - start + 1)) * 100) / 100;
}
