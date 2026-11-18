type TargetMeasurement = {
  kpi_id: string;
  period_date: string;
  target?: number | null;
};

/**
 * Target aggregation is independent from the real-value method.
 * startMonth defaults to 2 (February–November); the Total KPI view passes 1
 * so January is included in the summed target and the monthly-target lookup.
 */
export function getKpiTotalTarget(
  kpiId: string,
  year: number,
  baseTarget: number,
  measurements: readonly TargetMeasurement[],
  method: string = 'mensual',
  startMonth = 2,
): number {
  if (method === 'suma') {
    return Array.from({ length: 12 - startMonth }, (_, index) => index + startMonth).reduce((sum, month) => {
      const period = `${year}-${String(month).padStart(2, '0')}`;
      const measurement = measurements.find(m => m.kpi_id === kpiId && m.period_date.startsWith(`${period}-`));
      return sum + Number(measurement?.target ?? baseTarget);
    }, 0);
  }
  const targets = measurements.filter(m => {
    const [measurementYear, month] = m.period_date.split('-').map(Number);
    return m.kpi_id === kpiId && measurementYear === year && month >= startMonth && month <= 11
      && m.target !== null && m.target !== undefined;
  }).sort((a, b) => b.period_date.localeCompare(a.period_date));
  const latestTarget = targets[0]?.target;
  return latestTarget === null || latestTarget === undefined ? baseTarget : Number(latestTarget);
}
