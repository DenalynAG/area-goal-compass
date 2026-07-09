import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface HistoryRow {
  id: string;
  period_date: string;
  field: 'value' | 'target';
  old_value: number | null;
  new_value: number | null;
  action: 'insert' | 'update' | 'delete';
  changed_by_name: string | null;
  changed_at: string;
}

interface Props {
  kpiId: string | null;
  kpiName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function formatPeriod(period: string) {
  const [y, m] = period.split('-');
  const idx = parseInt(m, 10) - 1;
  return `${MONTHS[idx] ?? m} ${y}`;
}

function formatValue(v: number | null) {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(Number(v));
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function KpiHistoryDialog({ kpiId, kpiName, open, onOpenChange }: Props) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !kpiId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('kpi_measurement_history' as any)
        .select('id, period_date, field, old_value, new_value, action, changed_by_name, changed_at')
        .eq('kpi_id', kpiId)
        .order('changed_at', { ascending: false })
        .limit(500);
      if (cancelled) return;
      if (error) {
        console.error('kpi history load error', error);
        setRows([]);
      } else {
        setRows((data ?? []) as unknown as HistoryRow[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, kpiId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Historial de cambios{kpiName ? ` — ${kpiName}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Sin cambios registrados todavía.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Fecha y hora</th>
                  <th className="px-3 py-2 font-medium">Mes</th>
                  <th className="px-3 py-2 font-medium">Campo</th>
                  <th className="px-3 py-2 font-medium">Anterior</th>
                  <th className="px-3 py-2 font-medium">Nuevo</th>
                  <th className="px-3 py-2 font-medium">Acción</th>
                  <th className="px-3 py-2 font-medium">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(r.changed_at)}</td>
                    <td className="px-3 py-2">{formatPeriod(r.period_date)}</td>
                    <td className="px-3 py-2">{r.field === 'value' ? 'Valor Real' : 'Meta'}</td>
                    <td className="px-3 py-2 tabular-nums">{formatValue(r.old_value)}</td>
                    <td className="px-3 py-2 tabular-nums font-medium">{formatValue(r.new_value)}</td>
                    <td className="px-3 py-2 capitalize">
                      {r.action === 'insert' ? 'Creación' : r.action === 'update' ? 'Edición' : 'Eliminación'}
                    </td>
                    <td className="px-3 py-2">{r.changed_by_name ?? 'Sistema'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}