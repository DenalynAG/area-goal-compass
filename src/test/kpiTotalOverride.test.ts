import { describe, expect, it } from 'vitest';
import { withOverride } from '@/hooks/useKpiTotalOverrides';

describe('Total KPI valor fijo de Super Admin', () => {
  it('reemplaza el cálculo cuando hay valor fijo', () => expect(withOverride(8.76, 9)).toBe(9));
  it('conserva un valor fijo de cero', () => expect(withOverride(8.76, 0)).toBe(0));
  it('usa el cálculo cuando no hay valor fijo', () => expect(withOverride(8.76, null)).toBe(8.76));
});
