import { isKpiMonthAllowed, KPI_FIRST_MONTH, KPI_LAST_MONTH } from '@/lib/kpiMonths';

type Measurement = { kpi_id: string; period_date: string; value: number };

/** Calendar date strings must not be converted to local-time Date objects. */
export function getKpiActualValue(
  kpiId: string,
  year: number,
  measurements: readonly Measurement[],
  method: string,
  endMonth = KPI_LAST_MONTH,
): number | null {
  const end = Math.min(KPI_LAST_MONTH, endMonth);
  const included = measurements.filter(m =>
    m.kpi_id === kpiId && m.period_date.startsWith(`${year}-`) &&
    isKpiMonthAllowed(m.period_date) && Number(m.period_date.slice(5, 7)) <= end,
  );
  if (!included.length || end < KPI_FIRST_MONTH) return null;
  const sum = included.reduce((total, m) => total + Number(m.value), 0);
  return Math.round((method === 'suma' ? sum : sum / (end - KPI_FIRST_MONTH + 1)) * 100) / 100;
}