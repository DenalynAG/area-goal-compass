import { useState } from 'react';
import { mockObjectives, mockKPIs, mockSubareas, getAreaName, getSubareaName, getUserName } from '@/data/mockData';
import { getStatusLabel, getTrafficLight } from '@/types';
import { StatusBadge, PriorityBadge, ProgressBar, TrafficLightBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Target, ChevronDown, ChevronRight } from 'lucide-react';

export default function ObjetivosPage() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const filtered = mockObjectives.filter(o =>
    o.title.toLowerCase().includes(search.toLowerCase()) ||
    o.description.toLowerCase().includes(search.toLowerCase())
  );

  const getScopeName = (o: typeof mockObjectives[0]) => {
    if (o.scope_type === 'area') return getAreaName(o.scope_id);
    return getSubareaName(o.scope_id);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Objetivos</h1>
          <p className="page-subtitle">{mockObjectives.length} objetivos registrados</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" />Nuevo Objetivo</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar objetivos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="space-y-3">
        {filtered.map(obj => {
          const kpis = mockKPIs.filter(k => k.objective_id === obj.id);
          const isOpen = expanded[obj.id];
          return (
            <div key={obj.id} className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4">
                <div className="flex items-start gap-4">
                  <Target className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{obj.title}</h3>
                      <StatusBadge status={obj.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{obj.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span>📍 {getScopeName(obj)}</span>
                      <span>👤 {getUserName(obj.owner_user_id)}</span>
                      <span>📅 {obj.start_date} → {obj.end_date}</span>
                      <span>🔄 {obj.period}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ProgressBar value={obj.progress_percent} className="flex-1 max-w-xs" />
                      <span className="text-sm font-medium">{obj.progress_percent}%</span>
                    </div>
                  </div>
                </div>

                {kpis.length > 0 && (
                  <button onClick={() => toggle(obj.id)} className="mt-3 flex items-center gap-1 text-xs text-accent font-medium hover:underline">
                    {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    {kpis.length} indicadores
                  </button>
                )}
              </div>

              {isOpen && kpis.length > 0 && (
                <div className="border-t bg-muted/20 px-5 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground">
                        <th className="text-left py-1">KPI</th>
                        <th className="text-left py-1">Meta</th>
                        <th className="text-left py-1">Actual</th>
                        <th className="text-left py-1">Semáforo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.map(k => (
                        <tr key={k.id} className="border-t border-border/50">
                          <td className="py-2 font-medium">{k.name}</td>
                          <td className="py-2">{k.target} {k.unit}</td>
                          <td className="py-2">{k.current_value} {k.unit}</td>
                          <td className="py-2"><TrafficLightBadge light={getTrafficLight(k)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
