import { describe, expect, it } from 'vitest';
import { getKpiTotalTarget } from '@/lib/kpiTotalTarget';

const measurements = [
  { kpi_id: 'kpi', period_date: '2026-01-01', target: 999 },
  { kpi_id: 'kpi', period_date: '2026-02-01', target: 100 },
  { kpi_id: 'kpi', period_date: '2026-03-01', target: null },
  { kpi_id: 'kpi', period_date: '2026-04-01', target: 0 },
  { kpi_id: 'kpi', period_date: '2026-11-01', target: 200 },
  { kpi_id: 'kpi', period_date: '2026-12-01', target: 999 },
  { kpi_id: 'kpi', period_date: '2025-02-01', target: 999 },
  { kpi_id: 'other', period_date: '2026-02-01', target: 999 },
];

describe('Total KPI target', () => {
  it('sums saved targets from February through November of the selected year only', () => {
    expect(getKpiTotalTarget('kpi', 2026, 'suma', measurements)).toBe(300);
  });
  it('averages only saved targets, including zero and excluding missing months', () => {
    expect(getKpiTotalTarget('kpi', 2026, 'promedio', measurements)).toBe(100);
  });
  it('does not substitute a base target when no monthly targets are saved', () => {
    expect(getKpiTotalTarget('missing', 2026, 'suma', measurements)).toBeNull();
  });
});