import { useAreas, useSubareas, useObjectives, useKPIs } from '@/hooks/useSupabaseData';
import { getTrafficLight } from '@/types';
import { ProgressBar } from '@/components/StatusBadge';
import { Building2 } from 'lucide-react';

export default function ReportesPage() {
  const { data: areas = [], isLoading } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: objectives = [] } = useObjectives();
  const { data: kpis = [] } = useKPIs();

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando reportes...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">Reportes</h1>
        <p className="page-subtitle">Resumen por área y período</p>
      </div>

      <div className="space-y-5">
        {areas.map(area => {
          const areaSubs = subareas.filter(s => s.area_id === area.id);
          const areaObjs = objectives.filter(o =>
            (o.scope_type === 'area' && o.scope_id === area.id) ||
            (o.scope_type === 'subarea' && areaSubs.some(s => s.id === o.scope_id))
          );
          const areaKpis = kpis.filter(k => areaObjs.some(o => o.id === k.objective_id));
          const kpisRojo = areaKpis.filter(k => getTrafficLight(k as any) === 'rojo').length;
          const avgProgress = areaObjs.length ? Math.round(areaObjs.reduce((s, o) => s + o.progress_percent, 0) / areaObjs.length) : 0;

          return (
            <div key={area.id} className="bg-card rounded-xl border shadow-sm">
              <div className="px-5 py-4 border-b flex items-center gap-3">
                <Building2 className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-semibold">{area.name}</h3>
                  <p className="text-xs text-muted-foreground">{areaSubs.length} subáreas · {areaObjs.length} objetivos · {areaKpis.length} KPIs</p>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold">{areaObjs.length}</p>
                    <p className="text-xs text-muted-foreground">Objetivos</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{avgProgress}%</p>
                    <p className="text-xs text-muted-foreground">Avance Prom.</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-danger">{kpisRojo}</p>
                    <p className="text-xs text-muted-foreground">KPIs en Rojo</p>
                  </div>
                </div>
                <ProgressBar value={avgProgress} />
              </div>
            </div>
          );
        })}
        {areas.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No hay áreas registradas</div>
        )}
      </div>
    </div>
  );
}
