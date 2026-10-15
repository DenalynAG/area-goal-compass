import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useProfiles } from '@/hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Download, Upload, Loader2, ShieldCheck } from 'lucide-react';

interface Activity {
  id: string;
  name: string;
  sort_order: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
  period: string;
  periodOptions: { value: string; label: string }[];
}

const norm = (v: unknown) =>
  String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const ALLOWED_ORDERS = [1, 2, 3, 4, 5, 6, 8];

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const stripOrder = (name: string) => norm(name).replace(/^\d+[\.\)\-\s]*/, '').trim();

const periodFromFecha = (fecha: unknown): string | null => {
  if (fecha === undefined || fecha === null || fecha === '') return null;
  let d: Date | null = null;
  if (fecha instanceof Date) d = fecha;
  else if (typeof fecha === 'number') {
    const parsed = XLSX.SSF.parse_date_code(fecha);
    if (parsed) d = new Date(parsed.y, parsed.m - 1, parsed.d);
  } else {
    const s = String(fecha).trim();
    const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/) || s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (m) {
      const [y, mo] = m[1].length === 4 ? [m[1], m[2]] : [m[3], m[2]];
      d = new Date(Number(y), Number(mo) - 1, 1);
    } else {
      const txt = s.match(/^([A-Za-zÁéíóúñ]+)\.?\s+(\d{4})$/);
      if (txt) {
        const mi = MONTHS_SHORT.findIndex(m2 => norm(m2) === norm(txt[1]));
        if (mi >= 0) d = new Date(Number(txt[2]), mi, 1);
      }
      if (!d) {
        const t = new Date(s);
        if (!isNaN(t.getTime())) d = t;
      }
    }
  }
  if (!d || isNaN(d.getTime())) return null;
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

export default function LeaderPassImportDialog({ open, onOpenChange, activities, period, periodOptions }: Props) {
  const { data: profiles = [] } = useProfiles();
  const qc = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: string[] } | null>(null);

  const sortedActivities = useMemo(
    () => [...activities].filter(a => ALLOWED_ORDERS.includes(a.sort_order)).sort((a, b) => a.sort_order - b.sort_order),
    [activities]
  );

  const downloadTemplate = () => {
    const exampleDoc = profiles.find(p => p.identificacion)?.identificacion ?? '1234567890';
    const fechas = periodOptions.length > 0
      ? periodOptions.map(p => p.label)
      : [`${MONTHS_SHORT[new Date().getMonth()]} ${new Date().getFullYear()}`];
    const rows = [
      ['Fecha x Mes', 'Cedula del Responsable Area / Sub Area', 'Actividad de Liderazgo', 'Valor Cumplimiento'],
      ...fechas.flatMap(fecha =>
        sortedActivities.map(a => [fecha, exampleDoc, `${a.sort_order}. ${a.name}`, a.sort_order === 5 ? '100%' : 1])
      ),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 14 }, { wch: 36 }, { wch: 40 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LeaderPass');
    XLSX.writeFile(wb, 'plantilla_leader_pass.xlsx');
  };

  const handleFile = async (file: File) => {
    setImporting(true);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws0 = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws0, { raw: true });
      const textRows: any[] = XLSX.utils.sheet_to_json(ws0, { raw: false });
      if (rows.length === 0) { toast.error('El archivo está vacío'); setImporting(false); return; }

      const byDoc = new Map(profiles.filter(p => p.identificacion).map(p => [norm(p.identificacion).replace(/[^0-9a-z]/g, ''), p.id]));

      const findActivity = (v: unknown): Activity | undefined => {
        if (!v) return undefined;
        const n = stripOrder(String(v));
        return (
          sortedActivities.find(a => stripOrder(a.name) === n) ||
          sortedActivities.find(a => stripOrder(a.name).includes(n) || n.includes(stripOrder(a.name)))
        );
      };

      const targets: { userId: string; activityId: string; period: string; value: number; isPercent: boolean }[] = [];
      const fail: string[] = [];

      rows.forEach((row, idx) => {
        const keys = Object.keys(row);
        const keyOf = (frag: string[]) => keys.find(k2 => frag.some(f => norm(k2).includes(f)));
        const kF = keyOf(['fecha', 'mes']);
        const kD = keyOf(['cedula', 'documento', 'identificacion']);
        const kA = keyOf(['actividad']);
        const kV = keyOf(['valor', 'cumplimiento']);
        const fila = idx + 2;
        const activity = findActivity(kA ? row[kA] : undefined);
        if (!activity) { fail.push(`Fila ${fila}: actividad no permitida o no encontrada`); return; }
        const doc = kD ? norm(row[kD]).replace(/[^0-9a-z]/g, '') : '';
        const userId = byDoc.get(doc);
        if (!userId) { fail.push(`Fila ${fila}: cédula no encontrada (${doc || 'vacía'})`); return; }
        const rawV = kV ? row[kV] : undefined;
        const txtV = String(kV ? textRows[idx]?.[kV] ?? rawV ?? '' : '').trim();
        const isPercent = txtV.includes('%');
        let value: number;
        if (typeof rawV === 'number') value = isPercent && Math.abs(rawV) <= 1 ? Math.round(rawV * 10000) / 100 : rawV;
        else value = Number(txtV.replace('%', '').replace(',', '.'));
        if (!isFinite(value) || txtV === '') { fail.push(`Fila ${fila}: valor de cumplimiento inválido`); return; }
        const per = periodFromFecha(kF ? row[kF] : undefined) || selectedPeriod;
        targets.push({ userId, activityId: activity.id, period: per, value, isPercent });
      });

      const unique = Array.from(new Map(targets.map(t => [`${t.userId}|${t.activityId}|${t.period}`, t])).values());
      if (unique.length === 0) {
        setResult({ ok: 0, fail });
        toast.error('No se encontró ningún registro válido en el archivo');
        setImporting(false);
        return;
      }

      const now = new Date().toISOString();
      let applied = 0;

      // Procesar por periodo para consultar existentes
      const byPeriod = new Map<string, typeof unique>();
      unique.forEach(t => {
        const arr = byPeriod.get(t.period) ?? [];
        arr.push(t);
        byPeriod.set(t.period, arr);
      });

      for (const [per, items] of byPeriod) {
        const userIds = Array.from(new Set(items.map(i => i.userId)));
        const activityIds = Array.from(new Set(items.map(i => i.activityId)));
        const { data: existing, error: exErr } = await supabase
          .from('leader_pass_records')
          .select('id,user_id,activity_id')
          .eq('period', per)
          .in('user_id', userIds)
          .in('activity_id', activityIds);
        if (exErr) throw exErr;

        const existingMap = new Map((existing ?? []).map(r => [`${r.user_id}|${r.activity_id}`, r.id]));
        const toInsert = items
          .filter(i => !existingMap.has(`${i.userId}|${i.activityId}`))
          .map(i => ({ activity_id: i.activityId, user_id: i.userId, period: per, completed: i.value > 0, completed_at: i.value > 0 ? now : null, compliance_value: i.value, compliance_is_percent: i.isPercent }));
        if (toInsert.length > 0) {
          const { error } = await supabase.from('leader_pass_records').insert(toInsert);
          if (error) throw error;
        }
        for (const i of items.filter(i => existingMap.has(`${i.userId}|${i.activityId}`))) {
          const { error } = await supabase
            .from('leader_pass_records')
            .update({ completed: i.value > 0, completed_at: i.value > 0 ? now : null, compliance_value: i.value, compliance_is_percent: i.isPercent })
            .eq('id', existingMap.get(`${i.userId}|${i.activityId}`)!);
          if (error) throw error;
        }
        applied += items.length;
      }

      qc.invalidateQueries({ queryKey: ['leader_pass_records'] });
      setResult({ ok: applied, fail });
      toast.success(`${applied} registros importados`);
    } catch (e: any) {
      toast.error(e.message ?? 'Error al importar el archivo');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Acciones Admin — Carga masiva Leader Pass
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Periodo por defecto</label>
            <SearchableSelect
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
              options={periodOptions}
              placeholder="Periodo"
              searchPlaceholder="Buscar periodo..."
              className="w-full"
            />
            <p className="text-[11px] text-muted-foreground">Se usa cuando la fila no tiene Fecha válida.</p>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
            Columnas: <strong>Fecha x Mes</strong>, <strong>Cedula del Responsable Area / Sub Area</strong>,
            <strong> Actividad de Liderazgo</strong> y <strong>Valor Cumplimiento</strong> (número o %, ej. 3 o 85%).
            Solo se importan las actividades 1, 2, 3, 4, 5, 6 y 8. Un valor mayor que 0 marca la actividad como cumplida.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1">
              <Download className="w-4 h-4" />
              Descargar plantilla
            </Button>
            <label className="inline-flex">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={importing}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />
              <span
                className={`inline-flex items-center gap-1 h-9 px-3 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                  importing
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:opacity-90'
                }`}
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importar Excel
              </span>
            </label>
          </div>

          {result && (
            <div className="rounded-lg border p-3 text-xs space-y-1">
              <p className="font-semibold">Resultado: {result.ok} registros aplicados</p>
              {result.fail.length > 0 && (
                <div>
                  <p className="text-destructive font-medium">No procesados ({result.fail.length}):</p>
                  <p className="text-muted-foreground break-words">{result.fail.slice(0, 20).join(', ')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
