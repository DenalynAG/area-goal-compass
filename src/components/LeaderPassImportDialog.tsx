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

// Actividades habilitadas para carga masiva
const IMPORTABLE_ORDERS = [1, 2, 3, 4, 5, 6, 8];

const norm = (v: unknown) =>
  String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export default function LeaderPassImportDialog({ open, onOpenChange, activities, period, periodOptions }: Props) {
  const { data: profiles = [] } = useProfiles();
  const qc = useQueryClient();
  const [activityId, setActivityId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: string[] } | null>(null);

  const importable = useMemo(
    () => activities.filter(a => IMPORTABLE_ORDERS.includes(a.sort_order)).sort((a, b) => a.sort_order - b.sort_order),
    [activities]
  );

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['correo', 'documento', 'nombre', 'cumple'],
      ['ejemplo@osh.com', '1234567890', 'Perez Gomez Juan', 'SI'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LeaderPass');
    XLSX.writeFile(wb, 'plantilla_leader_pass.xlsx');
  };

  const handleFile = async (file: File) => {
    if (!activityId) { toast.error('Selecciona primero la actividad'); return; }
    setImporting(true);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      if (rows.length === 0) { toast.error('El archivo está vacío'); setImporting(false); return; }

      const byEmail = new Map(profiles.map(p => [norm(p.email), p.id]));
      const byDoc = new Map(profiles.filter(p => p.identificacion).map(p => [norm(p.identificacion), p.id]));
      const byName = new Map(profiles.map(p => [norm(p.name), p.id]));

      const targets: string[] = [];
      const fail: string[] = [];

      for (const row of rows) {
        const keys = Object.keys(row);
        const pick = (frag: string[]) => {
          const k = keys.find(k2 => frag.some(f => norm(k2).includes(f)));
          return k ? row[k] : undefined;
        };
        const email = pick(['correo', 'email', 'mail']);
        const doc = pick(['documento', 'identificacion', 'cedula']);
        const name = pick(['nombre', 'colaborador', 'lider']);
        const cumple = pick(['cumple', 'completado', 'estado']);

        if (cumple !== undefined && ['no', 'false', '0'].includes(norm(cumple))) continue;

        const id =
          (email && byEmail.get(norm(email))) ||
          (doc && byDoc.get(norm(doc))) ||
          (name && byName.get(norm(name)));

        if (id) targets.push(id as string);
        else fail.push(String(email || doc || name || '(fila vacía)'));
      }

      const unique = Array.from(new Set(targets));
      if (unique.length === 0) {
        setResult({ ok: 0, fail });
        toast.error('No se encontró ningún colaborador del archivo');
        setImporting(false);
        return;
      }

      const { data: existing, error: exErr } = await supabase
        .from('leader_pass_records')
        .select('id,user_id')
        .eq('activity_id', activityId)
        .eq('period', selectedPeriod)
        .in('user_id', unique);
      if (exErr) throw exErr;

      const existingMap = new Map((existing ?? []).map(r => [r.user_id, r.id]));
      const now = new Date().toISOString();

      const toInsert = unique
        .filter(u => !existingMap.has(u))
        .map(u => ({ activity_id: activityId, user_id: u, period: selectedPeriod, completed: true, completed_at: now }));

      if (toInsert.length > 0) {
        const { error } = await supabase.from('leader_pass_records').insert(toInsert);
        if (error) throw error;
      }

      const toUpdate = unique.filter(u => existingMap.has(u)).map(u => existingMap.get(u)!);
      if (toUpdate.length > 0) {
        const { error } = await supabase
          .from('leader_pass_records')
          .update({ completed: true, completed_at: now })
          .in('id', toUpdate);
        if (error) throw error;
      }

      qc.invalidateQueries({ queryKey: ['leader_pass_records'] });
      setResult({ ok: unique.length, fail });
      toast.success(`${unique.length} colaboradores marcados como cumplidos`);
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
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actividad</label>
            <SearchableSelect
              value={activityId}
              onValueChange={v => { setActivityId(v); setResult(null); }}
              options={importable.map(a => ({ value: a.id, label: `${a.sort_order}. ${a.name}` }))}
              placeholder="Selecciona la actividad..."
              searchPlaceholder="Buscar actividad..."
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Periodo</label>
            <SearchableSelect
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
              options={periodOptions}
              placeholder="Periodo"
              searchPlaceholder="Buscar periodo..."
              className="w-full"
            />
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
            El archivo debe tener una columna con <strong>correo</strong>, <strong>documento</strong> o <strong>nombre</strong> del
            colaborador. Opcionalmente una columna <strong>cumple</strong> con SI / NO.
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
                disabled={importing || !activityId}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />
              <span
                className={`inline-flex items-center gap-1 h-9 px-3 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                  importing || !activityId
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
                  <p className="text-destructive font-medium">No encontrados ({result.fail.length}):</p>
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
