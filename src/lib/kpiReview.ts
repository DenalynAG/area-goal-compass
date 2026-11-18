import { getKpiComplianceRatio, roundCompliancePercent } from '@/lib/kpiCompliance';

/**
 * Cumplimiento % de la vista Total KPI cuando el KPI tiene
 * Meta Revisión y Real Revisión diligenciados:
 *   Real Revisión / Meta Revisión * 100 (normal), o Meta / Real (inverso).
 * Devuelve null cuando falta alguno de los dos datos o la meta es 0,
 * para que la vista use el cálculo habitual (Valor Real / Meta).
 * Se limita al rango 0–200 y se redondea con la regla compartida
 * (fracción mayor a .5 sube al siguiente entero).
 */
export function getReviewCompliancePercent(
  reviewTarget: number | null | undefined,
  reviewActual: number | null | undefined,
  inverse = false,
): number | null {
  if (reviewTarget === null || reviewTarget === undefined) return null;
  if (reviewActual === null || reviewActual === undefined) return null;
  const target = Number(reviewTarget);
  const actual = Number(reviewActual);
  if (!isFinite(target) || !isFinite(actual)) return null;
  const ratio = getKpiComplianceRatio(actual, target, inverse);
  if (ratio === null) return null;
  return roundCompliancePercent(Math.max(0, Math.min(ratio, 200)));
}
