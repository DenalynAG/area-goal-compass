import { useState } from 'react';
import { useObjectives, useKPIs, useAreas, useSubareas, useProfiles, getProfileName, getAreaNameFromList, getSubareaNameFromList } from '@/hooks/useSupabaseData';
import { getTrafficLight } from '@/types';
import { StatusBadge, PriorityBadge, ProgressBar, TrafficLightBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Target, ChevronDown, ChevronRight, Edit } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import ObjetivoFormDialog from '@/components/ObjetivoFormDialog';

export default function ObjetivosPage() {
  const { data: objectives = [], isLoading } = useObjectives();
  const { data: kpis = [] } = useKPIs();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: profiles = [] } = useProfiles();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingObj, setEditingObj] = useState<Tables<'objectives'> | null>(null);

  const openNew = () => { setEditingObj(null); setDialogOpen(true); };
  const openEdit = (o: Tables<'objectives'>) => { setEditingObj(o); setDialogOpen(true); };

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const filtered = objectives.filter(o =>
    o.title.toLowerCase().includes(search.toLowerCase()) ||
    (o.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const getScopeName = (obj: typeof objectives[0]) => {
    if (obj.scope_type === 'area') return getAreaNameFromList(areas, obj.scope_id);
    return getSubareaNameFromList(subareas, obj.scope_id);
  };

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando objetivos...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Objetivos</h1>
          <p className="page-subtitle">{objectives.length} objetivos registrados</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nuevo Objetivo</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar objetivos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="space-y-3">
        {filtered.map(obj => {
          const objKpis = kpis.filter(k => k.objective_id === obj.id);
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
                      <span>👤 {getProfileName(profiles, obj.owner_user_id)}</span>
                      <span>📅 {obj.start_date ?? '—'} → {obj.end_date ?? '—'}</span>
                      <span>🔄 {obj.period || '—'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ProgressBar value={obj.progress_percent} className="flex-1 max-w-xs" />
                      <span className="text-sm font-medium">{obj.progress_percent}%</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => openEdit(obj)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>

                {objKpis.length > 0 && (
                  <button onClick={() => toggle(obj.id)} className="mt-3 flex items-center gap-1 text-xs text-accent font-medium hover:underline">
                    {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    {objKpis.length} indicadores
                  </button>
                )}
              </div>

              {isOpen && objKpis.length > 0 && (
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
                      {objKpis.map(k => (
                        <tr key={k.id} className="border-t border-border/50">
                          <td className="py-2 font-medium">{k.name}</td>
                          <td className="py-2">{k.target} {k.unit}</td>
                          <td className="py-2">{k.current_value} {k.unit}</td>
                          <td className="py-2"><TrafficLightBadge light={getTrafficLight(k as any)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No hay objetivos registrados</div>
        )}
      </div>

      <ObjetivoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        objective={editingObj}
        areas={areas}
        subareas={subareas}
        profiles={profiles}
      />
    </div>
  );
}
