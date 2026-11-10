/** Each indicator contributes once, including indicators without measurements. */
import { roundCompliancePercent } from '@/lib/kpiCompliance';

export function getConsolidatedIndicatorProgress<T extends { objective_id: string }>(
  objectiveIds: readonly string[],
  indicators: readonly T[],
  achievement: (indicator: T) => number | null,
): number {
  const ids = new Set(objectiveIds);
  const included = indicators.filter(k => ids.has(k.objective_id));
  if (included.length === 0) return 0;
  const total = included.reduce((sum, k) => sum + Math.min(achievement(k) ?? 0, 100), 0);
  return roundCompliancePercent(total / included.length);
}