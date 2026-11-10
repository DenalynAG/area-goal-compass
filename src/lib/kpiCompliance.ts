/**
 * Regla de redondeo del % de cumplimiento: si la fracción es mayor a .5 sube al
 * siguiente entero (108,6 → 109); con .5 o menos baja al anterior (108,5 → 108).
 */
export function roundCompliancePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const floor = Math.floor(value);
  return value - floor > 0.5 + 1e-9 ? floor + 1 : floor;
}

export function getKpiComplianceRatio(value: number, target: number, inverse: boolean): number | null {
  if (!target || target <= 0) return null;
  if (inverse) return !value || value <= 0 ? 200 : (target / value) * 100;
  return (value / target) * 100;
}

/** El semáforo usa el % redondeado, así la luz coincide con el número visible. */
export function getKpiComplianceLight(value: number, target: number, inverse: boolean): 'verde' | 'amarillo' | 'rojo' {
  const compliance = getKpiComplianceRatio(value, target, inverse);
  if (compliance === null) return 'rojo';
  const rounded = roundCompliancePercent(compliance);
  if (rounded >= 109) return 'verde';
  if (rounded >= 90) return 'amarillo';
  return 'rojo';
}
