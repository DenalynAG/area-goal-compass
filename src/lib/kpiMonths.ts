/** KPI measurements are only collected from February through November. */
export function isKpiMonthAllowed(period: string): boolean {
  const match = /^\d{4}-(\d{2})(?:-\d{2})?$/.exec(period);
  if (!match) return false;
  const month = Number(match[1]);
  return month >= 2 && month <= 11;
}

export function getDefaultKpiMonth(now = new Date()): string {
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = Math.max(2, Math.min(11, previous.getMonth() + 1));
  return `${previous.getFullYear()}-${String(month).padStart(2, '0')}`;
}

export function getAllowedKpiMonths(year: number): string[] {
  return Array.from({ length: 10 }, (_, i) => `${year}-${String(i + 2).padStart(2, '0')}`);
}