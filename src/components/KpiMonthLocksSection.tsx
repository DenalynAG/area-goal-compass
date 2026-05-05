import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Unlock, ChevronDown, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function KpiMonthLocksSection({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [updating, setUpdating] = useState<string | null>(null);

  const { data: locks = [], isLoading } = useQuery({
    queryKey: ['kpi_month_locks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kpi_month_locks' as any).select('*');
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const yearLocks = useMemo(() => {
    const map = new Map<number, boolean>();
    locks.filter(l => l.year === year).forEach(l => map.set(l.month, l.is_locked));
    return map;
  }, [locks, year]);

  const toggleMonth = async (month: number, locked: boolean) => {
    if (!canManage) return;
    setUpdating(`${year}-${month}`);
    const { data: { user } } = await supabase.auth.getUser();
    const existing = locks.find(l => l.year === year && l.month === month);
    if (existing) {
      const { error } = await supabase.from('kpi_month_locks' as any)
        .update({ is_locked: locked, updated_at: new Date().toISOString(), updated_by: user?.id })
        .eq('id', existing.id);
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.from('kpi_month_locks' as any)
        .insert({ year, month, is_locked: locked, updated_by: user?.id });
      if (error) toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ['kpi_month_locks'] });
    setUpdating(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base mb-1">Cierre de meses para KPI</h3>
        <p className="text-xs text-muted-foreground">
          Cuando un mes está cerrado, no se podrá modificar el campo <strong>Valor Real</strong> de los KPI para ese mes.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setYear(y => y - 1)}>‹</Button>
        <span className="font-semibold text-sm min-w-[60px] text-center">{year}</span>
        <Button variant="outline" size="sm" onClick={() => setYear(y => y + 1)}>›</Button>
      </div>

      {isLoading ? (
        <div className="py-4 text-center text-muted-foreground text-sm">Cargando...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {MONTH_LABELS.map((label, idx) => {
            const month = idx + 1;
            const locked = yearLocks.get(month) ?? false;
            const key = `${year}-${month}`;
            return (
              <div key={month} className="flex items-center justify-between gap-3 px-4 py-3 border rounded-lg bg-card">
                <div className="flex items-center gap-2">
                  {locked
                    ? <Lock className="w-4 h-4 text-destructive" />
                    : <Unlock className="w-4 h-4 text-success" />
                  }
                  <span className="text-sm font-medium">{label} {year}</span>
                </div>
                <Switch
                  checked={locked}
                  disabled={!canManage || updating === key}
                  onCheckedChange={(v) => toggleMonth(month, v)}
                />
              </div>
            );
          })}
        </div>
      )}

      {!canManage && (
        <p className="text-xs text-muted-foreground italic">Solo el Super Admin puede modificar el cierre de meses.</p>
      )}
    </div>
  );
}