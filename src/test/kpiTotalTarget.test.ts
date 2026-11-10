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
  it('keeps a monthly target of 100 instead of summing repeated monthly targets', () => {
    const repeated = Array.from({ length: 10 }, (_, index) => ({
      kpi_id: 'kpi', period_date: `2026-${String(index + 2).padStart(2, '0')}-01`, target: 100,
    }));
    expect(getKpiTotalTarget('kpi', 2026, 100, repeated)).toBe(100);
  });
  it('uses the latest saved monthly target within February through November', () => {
    expect(getKpiTotalTarget('kpi', 2026, 100, measurements)).toBe(200);
  });
  it('shows the base monthly target when no monthly overrides are saved', () => {
    expect(getKpiTotalTarget('missing', 2026, 9.2, measurements)).toBe(9.2);
  });
  it('preserves a saved target of zero', () => {
    expect(getKpiTotalTarget('kpi', 2026, 100, measurements.slice(0, 4))).toBe(0);
  });
});