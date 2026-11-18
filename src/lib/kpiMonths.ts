export const KPI_FIRST_MONTH = 1;
export const KPI_LAST_MONTH = 11;

/** KPI measurements are collected from January through November. */
export function isKpiMonthAllowed(period: string): boolean {
  const match = /^\d{4}-(\d{2})(?:-\d{2})?$/.exec(period);
  if (!match) return false;
  const month = Number(match[1]);
  return month >= KPI_FIRST_MONTH && month <= KPI_LAST_MONTH;
}

export function getDefaultKpiMonth(now = new Date()): string {
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = Math.max(KPI_FIRST_MONTH, Math.min(KPI_LAST_MONTH, previous.getMonth() + 1));
  return `${previous.getFullYear()}-${String(month).padStart(2, '0')}`;
}

export function getAllowedKpiMonths(year: number): string[] {
  return Array.from({ length: KPI_LAST_MONTH - KPI_FIRST_MONTH + 1 }, (_, i) => `${year}-${String(i + KPI_FIRST_MONTH).padStart(2, '0')}`);
}