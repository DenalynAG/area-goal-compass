import { describe, expect, it } from 'vitest';
import { getComplianceStatus, getKpiComplianceLight, getKpiComplianceRatio, roundCompliancePercent } from '@/lib/kpiCompliance';
import { getTrafficLight, type KPI } from '@/types';

describe('Redondeo del % de cumplimiento', () => {
  it('sube al siguiente entero cuando la fracción es mayor a .5', () => {
    expect(roundCompliancePercent(108.6)).toBe(109);
    expect(roundCompliancePercent(109.977)).toBe(110);
    expect(roundCompliancePercent(89.51)).toBe(90);
  });
  it('baja al anterior cuando la fracción es .5 o menor', () => {
    expect(roundCompliancePercent(108.5)).toBe(108);
    expect(roundCompliancePercent(108.4)).toBe(108);
    expect(roundCompliancePercent(89.5)).toBe(89);
    expect(roundCompliancePercent(100)).toBe(100);
  });
});

describe('Semáforo de todos los KPIs', () => {
  it('clasifica el promedio y el objetivo de 100% como amarillo / Medio', () => {
    expect(getComplianceStatus(100)).toEqual({ light: 'amarillo', label: 'Medio' });
    expect(getComplianceStatus(100).light).toBe(getKpiComplianceLight(200000, 200000, false));
  });
  it('clasifica Alto desde 109% para promedio y objetivo', () => {
    expect(getComplianceStatus(109)).toEqual({ light: 'verde', label: 'Alto' });
    expect(getComplianceStatus(108.7)).toEqual({ light: 'verde', label: 'Alto' });
  });
  it('clasifica Medio entre 90% y 108% para promedio y objetivo', () => {
    expect(getComplianceStatus(90)).toEqual({ light: 'amarillo', label: 'Medio' });
    expect(getComplianceStatus(108)).toEqual({ light: 'amarillo', label: 'Medio' });
  });
  it('clasifica Bajo por debajo de 90% para promedio y objetivo', () => {
    expect(getComplianceStatus(89)).toEqual({ light: 'rojo', label: 'Bajo' });
  });
  it('es verde desde 109% real para indicadores directos', () => {
    expect(getKpiComplianceLight(109, 100, false)).toBe('verde');
    expect(getKpiComplianceLight(110, 100, false)).toBe('verde');
    expect(getKpiComplianceLight(108.99, 100, false)).toBe('verde');
    expect(getKpiComplianceLight(108.5, 100, false)).toBe('amarillo');
  });
  it('es verde desde 109% real también para indicadores inversos', () => {
    expect(getKpiComplianceLight(100, 109, true)).toBe('verde');
    expect(getKpiComplianceLight(100, 108.99, true)).toBe('verde');
    expect(getKpiComplianceRatio(309812438, 340725764, true)).toBeCloseTo(109.977);
    expect(getKpiComplianceLight(309812438, 340725764, true)).toBe('verde');
  });
  it('usa el valor redondeado para decidir amarillo y rojo', () => {
    expect(getKpiComplianceLight(89.6, 100, false)).toBe('amarillo');
    expect(getKpiComplianceLight(89.5, 100, false)).toBe('rojo');
    expect(getKpiComplianceLight(89, 100, false)).toBe('rojo');
    expect(getKpiComplianceLight(100, 0, false)).toBe('rojo');
  });
  it('aplica la misma regla en el listado de indicadores', () => {
    const kpi: KPI = { id: 'k', objective_id: 'o', name: 'Indicador', definition: '', unit: '%', frequency: 'mensual', baseline: 0, target: 100, current_value: 109, threshold_green: 120, threshold_yellow: 80, threshold_red: 0, inverse_thresholds: false };
    expect(getTrafficLight(kpi)).toBe('verde');
    expect(getTrafficLight({ ...kpi, target: 109, current_value: 100, inverse_thresholds: true })).toBe('verde');
  });
});
