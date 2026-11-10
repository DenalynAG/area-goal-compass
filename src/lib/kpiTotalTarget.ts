type TargetMeasurement = {
  kpi_id: string;
  period_date: string;
  target?: number | null;
};

/** Aggregate only explicitly saved targets in the February–November window. */
export function getKpiTotalTarget(
  kpiId: string,
  year: number,
  method: 'suma' | 'promedio',
  measurements: readonly TargetMeasurement[],
): number | null {
  const targets = measurements.filter(m => {
    const [measurementYear, month] = m.period_date.split('-').map(Number);
    return m.kpi_id === kpiId && measurementYear === year && month >= 2 && month <= 11
      && m.target !== null && m.target !== undefined;
  }).map(m => Number(m.target));
  if (targets.length === 0) return null;
  const sum = targets.reduce((total, target) => total + target, 0);
  return method === 'suma' ? sum : sum / targets.length;
}