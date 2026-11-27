import { describe, expect, it } from 'vitest';
import { getLeaderPassImportPeriod, getLeaderPassPeriods, getLeaderPassTemplateRows } from '@/lib/leaderPassPeriods';

describe('Leader Pass: año completo', () => {
  it('habilita los doce meses de 2026, incluidos todos los anteriores a noviembre', () => {
    expect(getLeaderPassPeriods(2026)).toEqual([
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
      '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
    ]);
  });

  it('exporta las siete actividades permitidas para cada mes del año', () => {
    const activities = Array.from({ length: 10 }, (_, index) => ({ name: `Actividad ${index + 1}`, sort_order: index + 1 }));
    const rows = getLeaderPassTemplateRows(2026, '123456', activities).slice(1);
    expect(rows).toHaveLength(84);
    for (let month = 1; month <= 12; month++) {
      const monthly = rows.filter(row => row[0] === `01/${String(month).padStart(2, '0')}/2026`);
      expect(monthly).toHaveLength(7);
      expect(monthly.map(row => Number(String(row[2]).split('.')[0]))).toEqual([1, 2, 3, 4, 5, 6, 8]);
    }
  });

  it.each(Array.from({ length: 12 }, (_, index) => index + 1))('importa el mes %i al mismo período que se consulta y edita', month => {
    const expected = `2026-${String(month).padStart(2, '0')}`;
    expect(getLeaderPassImportPeriod(`01/${String(month).padStart(2, '0')}/2026`)).toBe(expected);
    expect(getLeaderPassImportPeriod(expected)).toBe(expected);
  });

  it('acepta fechas numéricas de Excel y etiquetas de meses', () => {
    expect(getLeaderPassImportPeriod(46023)).toBe('2026-01');
    expect(getLeaderPassImportPeriod('Dic 2026')).toBe('2026-12');
    expect(getLeaderPassImportPeriod('01/13/2026')).toBeNull();
  });
});