export function getKpiComplianceRatio(value: number, target: number, inverse: boolean): number | null {
  if (!target || target <= 0) return null;
  if (inverse) return !value || value <= 0 ? 200 : (target / value) * 100;
  return (value / target) * 100;
}

export function getKpiComplianceLight(value: number, target: number, inverse: boolean): 'verde' | 'amarillo' | 'rojo' {
  const compliance = getKpiComplianceRatio(value, target, inverse);
  if (compliance === null) return 'rojo';
  if (compliance >= 109) return 'verde';
  if (compliance >= 90) return 'amarillo';
  return 'rojo';
}