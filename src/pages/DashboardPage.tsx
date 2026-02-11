import { useAreas, useSubareas, useProfiles, useObjectives, useKPIs, getAreaNameFromList, getProfileName } from '@/hooks/useSupabaseData';
import { getTrafficLight } from '@/types';
import { StatusBadge, TrafficLightBadge, ProgressBar } from '@/components/StatusBadge';
import { Users, Target, BarChart3, AlertTriangle, TrendingUp, Building2 } from 'lucide-react';

export default function DashboardPage() {
  const { data: areas = [], isLoading } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: profiles = [] } = useProfiles();
  const { data: objectives = [] } = useObjectives();
  const { data: kpis = [] } = useKPIs();

  const activeObjectives = objectives.filter(o => o.status === 'activo' || o.status === 'en_riesgo');
  const avgProgress = Math.round(activeObjectives.reduce((s, o) => s + o.progress_percent, 0) / (activeObjectives.length || 1));
  const atRisk = objectives.filter(o => o.status === 'en_riesgo').length;
  const kpisAtRisk = kpis.filter(k => getTrafficLight(k as any) === 'rojo').length;

  const metrics = [
    { label: 'Colaboradores', value: profiles.length, icon: Users, accent: 'text-accent' },
    { label: 'Áreas', value: areas.length, icon: Building2, accent: 'text-primary' },
    { label: 'Objetivos Activos', value: activeObjectives.length, icon: Target, accent: 'text-success' },
    { label: 'Avance Promedio', value: `${avgProgress}%`, icon: TrendingUp, accent: 'text-accent' },
    { label: 'Objetivos en Riesgo', value: atRisk, icon: AlertTriangle, accent: 'text-danger' },
    { label: 'KPIs en Rojo', value: kpisAtRisk, icon: BarChart3, accent: 'text-danger' },
  ];

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando dashboard...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumen general del sistema</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="metric-card">
            <m.icon className={`w-5 h-5 ${m.accent} mb-2`} />
            <p className="text-2xl font-bold">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Objectives table */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">Objetivos Activos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Objetivo</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Área</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Responsable</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Avance</th>
              </tr>
            </thead>
            <tbody>
              {activeObjectives.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No hay objetivos activos</td></tr>
              ) : activeObjectives.map(obj => {
                const areaId = obj.scope_type === 'area' ? obj.scope_id : subareas.find(s => s.id === obj.scope_id)?.area_id ?? '';
                return (
                  <tr key={obj.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">{obj.title}</td>
                    <td className="px-5 py-3 text-muted-foreground">{getAreaNameFromList(areas, areaId)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{getProfileName(profiles, obj.owner_user_id)}</td>
                    <td className="px-5 py-3"><StatusBadge status={obj.status} /></td>
                    <td className="px-5 py-3 w-40">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={obj.progress_percent} className="flex-1" />
                        <span className="text-xs text-muted-foreground w-8">{obj.progress_percent}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPIs overview */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">Indicadores (KPIs)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Indicador</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Meta</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Actual</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Unidad</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Semáforo</th>
              </tr>
            </thead>
            <tbody>
              {kpis.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No hay KPIs definidos</td></tr>
              ) : kpis.map(kpi => (
                <tr key={kpi.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium">{kpi.name}</td>
                  <td className="px-5 py-3">{kpi.target}</td>
                  <td className="px-5 py-3">{kpi.current_value}</td>
                  <td className="px-5 py-3 text-muted-foreground">{kpi.unit}</td>
                  <td className="px-5 py-3"><TrafficLightBadge light={getTrafficLight(kpi as any)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
