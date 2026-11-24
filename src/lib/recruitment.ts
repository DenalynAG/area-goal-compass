/** Días de cobertura: fecha de cierre − fecha de apertura; si no hay cierre, días hasta hoy. */
export function coverageDays(opening: string | null | undefined, closing: string | null | undefined, today: Date = new Date()): number | null {
  if (!opening) return null;
  const toUtc = (s: string) => { const [y, m, d] = s.slice(0, 10).split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const end = closing ? toUtc(closing) : Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((end - toUtc(opening)) / 86400000));
}
