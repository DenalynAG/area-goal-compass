import { describe, expect, it } from 'vitest';
import { getConsolidatedIndicatorProgress } from '@/lib/kpiConsolidatedProgress';

describe('Consolidado de indicadores del área', () => {
  const indicators = [
    { objective_id: 'area', progress: 100 },
    { objective_id: 'subarea', progress: 50 },
    { objective_id: 'subarea', progress: 0 },
    { objective_id: 'other-area', progress: 100 },
  ];
  it('incluye todos los indicadores del área y sus subáreas sin promediar objetivos', () => {
    expect(getConsolidatedIndicatorProgress(['area', 'subarea'], indicators, k => k.progress)).toBe(50);
  });
  it('el avance del líder incluye solo los objetivos directos de su grupo', () => {
    expect(getConsolidatedIndicatorProgress(['area'], indicators, k => k.progress)).toBe(100);
  });
  it('incluye los indicadores sin mediciones en el consolidado', () => {
    expect(getConsolidatedIndicatorProgress(['area'], [
      { objective_id: 'area', progress: 100 },
      { objective_id: 'area', progress: null },
    ], k => k.progress)).toBe(50);
  });
  it('mantiene el límite del 100% y devuelve cero sin indicadores', () => {
    expect(getConsolidatedIndicatorProgress(['area'], [{ objective_id: 'area', progress: 120 }], k => k.progress)).toBe(100);
    expect(getConsolidatedIndicatorProgress([], indicators, k => k.progress)).toBe(0);
  });
});