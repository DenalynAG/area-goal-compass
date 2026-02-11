import { useState } from 'react';
import { useKPIs, useObjectives, useKPIMeasurements } from '@/hooks/useSupabaseData';
import { getTrafficLight } from '@/types';
import { TrafficLightBadge, ProgressBar } from '@/components/StatusBadge';
import { BarChart3, Plus, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Tables } from '@/integrations/supabase/types';
import KPIFormDialog from '@/components/KPIFormDialog';

export default function IndicadoresPage() {
  const { data: kpis = [], isLoading } = useKPIs();
  const { data: objectives = [] } = useObjectives();
  const { data: measurements = [] } = useKPIMeasurements();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKPI, setEditingKPI] = useState<Tables<'kpis'> | null>(null);

  const openNew = () => { setEditingKPI(null); setDialogOpen(true); };
  const openEdit = (k: Tables<'kpis'>) => { setEditingKPI(k); setDialogOpen(true); };

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando indicadores...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Indicadores (KPIs)</h1>
          <p className="page-subtitle">{kpis.length} indicadores definidos</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nuevo Indicador</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {kpis.map(kpi => {
          const obj = objectives.find(o => o.id === kpi.objective_id);
          const kpiMeasurements = measurements.filter(m => m.kpi_id === kpi.id);
          const chartData = kpiMeasurements.map(m => ({ period: m.period_date, valor: m.value }));
          const light = getTrafficLight(kpi as any);
          const progress = kpi.target > 0 ? Math.round((kpi.current_value / kpi.target) * 100) : 0;

          return (
            <div key={kpi.id} className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-accent" />
                    <div>
                      <h3 className="font-semibold">{kpi.name}</h3>
                      <p className="text-xs text-muted-foreground">{obj?.title ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrafficLightBadge light={light} />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(kpi)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold">{kpi.current_value}</p>
                    <p className="text-[10px] text-muted-foreground">Actual</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{kpi.target}</p>
                    <p className="text-[10px] text-muted-foreground">Meta</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{kpi.baseline}</p>
                    <p className="text-[10px] text-muted-foreground">Línea Base</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} />
                </div>

                {chartData.length > 0 && (
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="period" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                        <Line type="monotone" dataKey="valor" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span>🟢 ≥{kpi.threshold_green}</span>
                  <span>🟡 ≥{kpi.threshold_yellow}</span>
                  <span>🔴 &lt;{kpi.threshold_yellow}</span>
                  <span className="ml-auto">{kpi.frequency} · {kpi.unit}</span>
                </div>
              </div>
            </div>
          );
        })}
        {kpis.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">No hay indicadores definidos</div>
        )}
      </div>

      <KPIFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        kpi={editingKPI}
        objectives={objectives}
      />
    </div>
  );
}
