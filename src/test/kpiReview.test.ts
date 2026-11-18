import { describe, it, expect } from 'vitest';
import { getReviewCompliancePercent } from '@/lib/kpiReview';
import { getComplianceStatus, getKpiComplianceRatio, roundCompliancePercent } from '@/lib/kpiCompliance';

describe('getReviewCompliancePercent (Total KPI: Real Revisión / Meta Revisión)', () => {
  it('calcula Real Revisión / Meta Revisión como porcentaje', () => {
    expect(getReviewCompliancePercent(100, 110)).toBe(110);
    expect(getReviewCompliancePercent(200000, 1530000)).toBe(200); // tope 200
  });

  it('sube al siguiente entero cuando la fracción supera .5', () => {
    expect(getReviewCompliancePercent(300, 326)).toBe(109); // 108,67 -> 109
    expect(getReviewCompliancePercent(200, 217)).toBe(108); // 108,5 -> 108
  });

  it('devuelve null cuando falta alguno de los datos de revisión', () => {
    expect(getReviewCompliancePercent(null, 100)).toBeNull();
    expect(getReviewCompliancePercent(100, null)).toBeNull();
    expect(getReviewCompliancePercent(undefined, undefined)).toBeNull();
  });

  it('devuelve null cuando la Meta Revisión es 0', () => {
    expect(getReviewCompliancePercent(0, 100)).toBeNull();
  });

  it('usa Meta / Real para el KPI inverso de ahorro de AyB', () => {
    const target = 5687400704.05;
    const actual = 5273303988;
    const review = getReviewCompliancePercent(target, actual, true);
    expect(review).toBe(108);
    expect(review).toBe(roundCompliancePercent(Number(getKpiComplianceRatio(actual, target, true))));
    expect(getComplianceStatus(Number(review))).toEqual({ light: 'amarillo', label: 'Medio' });
  });

  it('mantiene Real / Meta para el mismo par de datos si el KPI es normal', () => {
    expect(getReviewCompliancePercent(5687400704.05, 5273303988, false)).toBe(93);
  });

  it('aplica el mismo tope a un KPI inverso con valor real cero', () => {
    expect(getReviewCompliancePercent(100, 0, true)).toBe(200);
  });

  it('redondea el KPI inverso y clasifica Alto desde 109%', () => {
    const percent = getReviewCompliancePercent(326, 300, true);
    expect(percent).toBe(109);
    expect(getComplianceStatus(Number(percent))).toEqual({ light: 'verde', label: 'Alto' });
  });
});
