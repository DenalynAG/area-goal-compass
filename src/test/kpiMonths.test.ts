import { describe, expect, it } from 'vitest';
import { getAllowedKpiMonths, getDefaultKpiMonth, isKpiMonthAllowed } from '@/lib/kpiMonths';

describe('KPI collection months', () => {
  it('blocks January', () => {
    expect(isKpiMonthAllowed('2026-01')).toBe(false);
    expect(isKpiMonthAllowed('2026-01-01')).toBe(false);
  });
  it('blocks December', () => {
    expect(isKpiMonthAllowed('2026-12')).toBe(false);
    expect(isKpiMonthAllowed('2026-12-01')).toBe(false);
  });
  it('allows exactly February through November', () => {
    expect(getAllowedKpiMonths(2026)).toEqual(['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    expect(getAllowedKpiMonths(2026).every(isKpiMonthAllowed)).toBe(true);
  });
  it('never defaults to an excluded month', () => {
    expect(getDefaultKpiMonth(new Date(2026, 0, 10))).toBe('2025-11');
    expect(getDefaultKpiMonth(new Date(2026, 1, 10))).toBe('2026-02');
    expect(getDefaultKpiMonth(new Date(2026, 10, 10))).toBe('2026-10');
  });
});