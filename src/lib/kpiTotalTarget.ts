type TargetMeasurement = {
  kpi_id: string;
  period_date: string;
  target?: number | null;
};

/** Keep one monthly target; never accumulate targets with the real-value method. */
export function getKpiTotalTarget(
  kpiId: string,
  year: number,
  baseTarget: number,
  measurements: readonly TargetMeasurement[],
): number {
  const targets = measurements.filter(m => {
    const [measurementYear, month] = m.period_date.split('-').map(Number);
    return m.kpi_id === kpiId && measurementYear === year && month >= 2 && month <= 11
      && m.target !== null && m.target !== undefined;
  }).sort((a, b) => b.period_date.localeCompare(a.period_date));
  const latestTarget = targets[0]?.target;
  return latestTarget === null || latestTarget === undefined ? baseTarget : Number(latestTarget);
}