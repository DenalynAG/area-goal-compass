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

/**
 * Semáforo de la etiqueta: ≥109 Verde / Alto, 100–108 Amarillo / Medio,
 * ≤99 Rojo / Bajo. Usa el % redondeado, así la luz coincide con el número visible.
 */
export function getComplianceStatus(percent: number): { light: 'verde' | 'amarillo' | 'rojo'; label: 'Alto' | 'Medio' | 'Bajo' } {
  const rounded = roundCompliancePercent(percent);
  if (rounded >= 109) return { light: 'verde', label: 'Alto' };
  if (rounded >= 100) return { light: 'amarillo', label: 'Medio' };
  return { light: 'rojo', label: 'Bajo' };
}

export function getKpiComplianceLight(value: number, target: number, inverse: boolean): 'verde' | 'amarillo' | 'rojo' {
  const compliance = getKpiComplianceRatio(value, target, inverse);
  if (compliance === null) return 'rojo';
  return getComplianceStatus(compliance).light;
}

/**
 * Color de la barra de progreso: sale del mismo semáforo de la etiqueta, así una
 * barra nunca queda en amarillo cuando su etiqueta dice «Alto» (verde).
 */
export function getComplianceBarClass(percent: number): string {
  const { light } = getComplianceStatus(percent);
  if (light === 'verde') return 'bg-success-bright';
  if (light === 'amarillo') return 'bg-warning-bright';
  return 'bg-danger-bright';
}
