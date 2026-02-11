import { mockAreas, mockSubareas, mockObjectives, mockKPIs } from '@/data/mockData';
import { getTrafficLight } from '@/types';
import { StatusBadge, TrafficLightBadge, ProgressBar } from '@/components/StatusBadge';
import { FileText, Building2 } from 'lucide-react';

export default function ReportesPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">Reportes</h1>
        <p className="page-subtitle">Resumen por área y período</p>
      </div>

      <div className="space-y-5">
        {mockAreas.map(area => {
          const subareas = mockSubareas.filter(s => s.area_id === area.id);
          const areaObjs = mockObjectives.filter(o =>
            (o.scope_type === 'area' && o.scope_id === area.id) ||
            (o.scope_type === 'subarea' && subareas.some(s => s.id === o.scope_id))
          );
          const kpis = mockKPIs.filter(k => areaObjs.some(o => o.id === k.objective_id));
          const kpisRojo = kpis.filter(k => getTrafficLight(k) === 'rojo').length;
          const avgProgress = areaObjs.length ? Math.round(areaObjs.reduce((s, o) => s + o.progress_percent, 0) / areaObjs.length) : 0;

          return (
            <div key={area.id} className="bg-card rounded-xl border shadow-sm">
              <div className="px-5 py-4 border-b flex items-center gap-3">
                <Building2 className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-semibold">{area.name}</h3>
                  <p className="text-xs text-muted-foreground">{subareas.length} subáreas · {areaObjs.length} objetivos · {kpis.length} KPIs</p>
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
      </div>
    </div>
  );
}
