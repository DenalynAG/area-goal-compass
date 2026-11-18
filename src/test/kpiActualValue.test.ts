import { describe, expect, it } from 'vitest';
import { getKpiActualValue } from '@/lib/kpiActualValue';

describe('Total KPI: calendario febrero a noviembre', () => {
  const measurements = [8.8, 8.8, 8.8, 8.8, 8.9, 8.6, 8.8, 8.7, 8.7, 8.7].map((value, i) => ({
    kpi_id: 'booking', period_date: `2026-${String(i + 2).padStart(2, '0')}-01`, value,
  }));
  it('promedia los diez valores reales de Booking: 87,6 / 10 = 8,76', () => {
    expect(getKpiActualValue('booking', 2026, measurements, 'promedio')).toBe(8.76);
  });
  it('conserva Suma total sin dividirla por diez', () => {
    expect(getKpiActualValue('booking', 2026, measurements, 'suma')).toBe(87.6);
  });
  it('excluye diciembre, otros años y otros indicadores', () => {
    const extras = [
      { kpi_id: 'booking', period_date: '2026-12-01', value: 1000 },
      { kpi_id: 'booking', period_date: '2025-02-01', value: 1000 },
      { kpi_id: 'other', period_date: '2026-02-01', value: 1000 },
    ];
    expect(getKpiActualValue('booking', 2026, [...measurements, ...extras], 'promedio')).toBe(8.76);
  });
  it('mantiene el período acumulado al seleccionar un mes del dashboard', () => {
    expect(getKpiActualValue('booking', 2026, measurements, 'promedio', 6)).toBe(8.82);
  });
  it('no omite febrero por el huso horario de Bogotá', () => {
    expect(getKpiActualValue('booking', 2026, [measurements[0]], 'suma')).toBe(8.8);
  });
  it('mantiene los diez meses en Total y no inventa valores sin registros', () => {
    expect(getKpiActualValue('booking', 2026, [measurements[0]], 'promedio')).toBe(0.88);
    expect(getKpiActualValue('booking', 2026, [], 'promedio')).toBeNull();
  });
});

describe('Total KPI con enero (startMonth = 1)', () => {
  const withJanuary = [
    { kpi_id: 'booking', period_date: '2026-01-01', value: 9 },
    ...[8.8, 8.8, 8.8, 8.8, 8.9, 8.6, 8.8, 8.7, 8.7, 8.7].map((value, i) => ({
      kpi_id: 'booking', period_date: `2026-${String(i + 2).padStart(2, '0')}-01`, value,
    })),
  ];
  it('promedia los once meses: 96,6 / 11 = 8,78', () => {
    expect(getKpiActualValue('booking', 2026, withJanuary, 'promedio', 11, 1)).toBe(8.78);
  });
  it('suma los once meses en Suma total', () => {
    expect(getKpiActualValue('booking', 2026, withJanuary, 'suma', 11, 1)).toBe(96.6);
  });
  it('sin startMonth enero queda fuera (dashboard sigue feb–nov)', () => {
    expect(getKpiActualValue('booking', 2026, withJanuary, 'promedio')).toBe(8.76);
  });
});
