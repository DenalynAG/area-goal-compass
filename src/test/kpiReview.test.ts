import { describe, it, expect } from 'vitest';
import { getReviewCompliancePercent } from '@/lib/kpiReview';

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
});
