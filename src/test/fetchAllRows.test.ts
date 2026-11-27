import { describe, expect, it } from 'vitest';
import { fetchAllRows } from '@/lib/fetchAllRows';

describe('complete evidence counts', () => {
  it('counts monthly and Total KPI attachments beyond the first 1000 rows', async () => {
    const records = Array.from({ length: 1848 }, (_, index) => ({
      id: index,
      entity_id: index >= 1000 ? 'target-kpi' : 'other-kpi',
      period: index % 2 === 0 ? '2026-02' : '2026-03',
    }));
    const result = await fetchAllRows(async (from, to) => ({
      data: records.slice(from, to + 1), error: null,
    }));
    expect(result).toHaveLength(1848);
    expect(result.filter(row => row.entity_id === 'target-kpi')).toHaveLength(848);
    expect(result.filter(row => row.entity_id === 'target-kpi' && row.period === '2026-02')).toHaveLength(424);
  });

  it('does not silently show partial counts after a failed page', async () => {
    await expect(fetchAllRows(async (from) => ({
      data: from === 0 ? Array.from({ length: 1000 }, (_, id) => ({ id })) : null,
      error: from === 0 ? null : new Error('Read failed'),
    }))).rejects.toThrow('Read failed');
  });
});