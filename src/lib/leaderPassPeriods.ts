import * as XLSX from 'xlsx';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function getLeaderPassPeriods(year: number): string[] {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
}

export function getLeaderPassImportPeriod(value: unknown): string | null {
  const period = (year: number, month: number) =>
    Number.isInteger(year) && year >= 1900 && month >= 1 && month <= 12
      ? `${year}-${String(month).padStart(2, '0')}`
      : null;
  if (value instanceof Date) return period(value.getFullYear(), value.getMonth() + 1);
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return date ? period(date.y, date.m) : null;
  }
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const iso = text.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?$/);
  if (iso) return period(Number(iso[1]), Number(iso[2]));
  const short = text.match(/^\d{1,2}[-/](\d{1,2})[-/](\d{4})$/);
  if (short) return period(Number(short[2]), Number(short[1]));
  const label = text.match(/^([A-Za-zÁéíóúñ]+)\.?\s+(\d{4})$/);
  if (label) return period(Number(label[2]), MONTHS.findIndex(month => normalize(month) === normalize(label[1])) + 1);
  return null;
}

export function getLeaderPassTemplateRows(year: number, identification: string, activities: { name: string; sort_order: number }[]) {
  const allowed = activities.filter(activity => [1, 2, 3, 4, 5, 6, 8].includes(activity.sort_order))
    .sort((a, b) => a.sort_order - b.sort_order);
  return [
    ['Fecha x Mes', 'Identificación Cedula del responsable Área / Sub-Área', 'Actividad de Liderazgo', 'Valor Cumplimiento'],
    ...getLeaderPassPeriods(year).flatMap(month => allowed.map(activity => [
      `01/${month.slice(5)}/${year}`, identification, `${activity.sort_order}. ${activity.name}`, activity.sort_order === 5 ? '100%' : 1,
    ])),
  ];
}