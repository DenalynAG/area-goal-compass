import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useProfiles, useAreas, useSubareas } from '@/hooks/useSupabaseData';
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
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const qc = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: string[] } | null>(null);

  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => a.sort_order - b.sort_order),
    [activities]
  );

  const downloadTemplate = () => {
    const exampleArea = areas[0]?.name ?? 'Comercial';
    const exampleLeader = profiles[0]?.name ?? 'Perez Gomez Juan';
    const fechas = periodOptions.length > 0
      ? periodOptions.map(p => p.label)
      : [`${MONTHS_SHORT[new Date().getMonth()]} ${new Date().getFullYear()}`];
    const rows = [
      ['Fecha', 'Área / Sub Área', 'Responsable del Área / Subárea', 'Nombre Actividad', 'Cumplimiento'],
      ...fechas.flatMap(fecha =>
        sortedActivities.map(a => [fecha, exampleArea, exampleLeader, `${a.sort_order}. ${a.name}`, 'SI'])
      ),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 30 }, { wch: 40 }, { wch: 14 }];
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
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: true });
      if (rows.length === 0) { toast.error('El archivo está vacío'); setImporting(false); return; }

      const byEmail = new Map(profiles.map(p => [norm(p.email), p.id]));
      const byDoc = new Map(profiles.filter(p => p.identificacion).map(p => [norm(p.identificacion), p.id]));
      const byName = new Map(profiles.map(p => [norm(p.name), p.id]));
      const areaByName = new Map(areas.map(a => [norm(a.name), a]));
      const subareaByName = new Map(subareas.map(s => [norm(s.name), s]));

      const findProfile = (v: unknown): string | undefined => {
        if (!v) return undefined;
        const n = norm(v);
        return byEmail.get(n) || byDoc.get(n) || byName.get(n);
      };

      const findActivity = (v: unknown): Activity | undefined => {
        if (!v) return undefined;
        const n = stripOrder(String(v));
        return (
          sortedActivities.find(a => stripOrder(a.name) === n) ||
          sortedActivities.find(a => stripOrder(a.name).includes(n) || n.includes(stripOrder(a.name)))
        );
      };

      const targets: { userId: string; activityId: string; period: string }[] = [];
      const fail: string[] = [];

      for (const row of rows) {
        const keys = Object.keys(row);
        const pick = (frag: string[]) => {
          const k = keys.find(k2 => frag.some(f => norm(k2).includes(f)));
          return k ? row[k] : undefined;
        };
        const fecha = pick(['fecha', 'date']);
        const areaVal = pick(['area', 'sub area', 'subarea', 'zona']);
        const respVal = pick(['responsable', 'lider', 'correo', 'documento', 'nombre']);
        const actVal = pick(['actividad', 'activity']);
        const cumple = pick(['cumplimiento', 'cumple', 'completado', 'estado']);

        if (cumple !== undefined && ['no', 'false', '0'].includes(norm(cumple))) continue;

        const activity = findActivity(actVal);
        if (!activity) { fail.push(`Actividad no encontrada: ${actVal ?? '(vacía)'}`); continue; }

        let userId = findProfile(respVal);
        if (!userId && areaVal) {
          const nArea = norm(areaVal);
          const area = areaByName.get(nArea) || areas.find(a => norm(a.name).includes(nArea) || nArea.includes(norm(a.name)));
          const sub = subareaByName.get(nArea) || subareas.find(s => norm(s.name).includes(nArea) || nArea.includes(norm(s.name)));
          userId = (sub?.leader_user_id as string | undefined) || (area?.leader_user_id as string | undefined);
        }
        if (!userId) { fail.push(`Responsable no encontrado: ${respVal || areaVal || '(vacío)'}`); continue; }

        const rowPeriod = periodFromFecha(fecha) || selectedPeriod;
        targets.push({ userId, activityId: activity.id, period: rowPeriod });
      }

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
          .map(i => ({ activity_id: i.activityId, user_id: i.userId, period: per, completed: true, completed_at: now }));
        const toUpdate = items
          .filter(i => existingMap.has(`${i.userId}|${i.activityId}`))
          .map(i => existingMap.get(`${i.userId}|${i.activityId}`)!);

        if (toInsert.length > 0) {
          const { error } = await supabase.from('leader_pass_records').insert(toInsert);
          if (error) throw error;
        }
        if (toUpdate.length > 0) {
          const { error } = await supabase
            .from('leader_pass_records')
            .update({ completed: true, completed_at: now })
            .in('id', toUpdate);
          if (error) throw error;
        }
        applied += items.length;
      }

      qc.invalidateQueries({ queryKey: ['leader_pass_records'] });
      setResult({ ok: applied, fail });
      toast.success(`${applied} registros marcados como cumplidos`);
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
            El archivo puede incluir <strong>todas las actividades</strong> en un solo Excel, con las columnas:
            <strong> Fecha</strong>, <strong>Área / Sub Área</strong>, <strong>Responsable del Área / Subárea</strong>,
            <strong> Nombre Actividad</strong> y <strong>Cumplimiento</strong> (SI / NO). Si el responsable está vacío,
            se usa el líder del área o subárea indicada.
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
