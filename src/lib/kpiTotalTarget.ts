type TargetMeasurement = {
  kpi_id: string;
  period_date: string;
  target?: number | null;
};

/** Target aggregation is independent from the real-value method. */
export function getKpiTotalTarget(
  kpiId: string,
  year: number,
  baseTarget: number,
  measurements: readonly TargetMeasurement[],
  method: string = 'mensual',
): number {
  if (method === 'suma') {
    return Array.from({ length: 10 }, (_, index) => index + 2).reduce((sum, month) => {
      const period = `${year}-${String(month).padStart(2, '0')}`;
      const measurement = measurements.find(m => m.kpi_id === kpiId && m.period_date.startsWith(`${period}-`));
      return sum + Number(measurement?.target ?? baseTarget);
    }, 0);
  }
  const targets = measurements.filter(m => {
    const [measurementYear, month] = m.period_date.split('-').map(Number);
    return m.kpi_id === kpiId && measurementYear === year && month >= 2 && month <= 11
      && m.target !== null && m.target !== undefined;
  }).sort((a, b) => b.period_date.localeCompare(a.period_date));
  const latestTarget = targets[0]?.target;
  return latestTarget === null || latestTarget === undefined ? baseTarget : Number(latestTarget);
}