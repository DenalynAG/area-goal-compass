import { useState, useMemo } from 'react';
import { useObjectives, useKPIs, useAreas, useSubareas, useProfiles, getProfileName, getAreaNameFromList } from '@/hooks/useSupabaseData';
import { getTrafficLight } from '@/types';
import { StatusBadge, ProgressBar, TrafficLightBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Plus, Target, ChevronRight, ChevronDown, Edit, TrendingUp, Settings, ArrowLeft } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import ObjetivoFormDialog from '@/components/ObjetivoFormDialog';

export default function ObjetivosPage() {
  const { data: objectives = [], isLoading } = useObjectives();
  const { data: kpis = [] } = useKPIs();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: profiles = [] } = useProfiles();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingObj, setEditingObj] = useState<Tables<'objectives'> | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [expandedObj, setExpandedObj] = useState<Record<string, boolean>>({});

  const openNew = () => { setEditingObj(null); setDialogOpen(true); };
  const openEdit = (o: Tables<'objectives'>) => { setEditingObj(o); setDialogOpen(true); };
  const toggleObj = (id: string) => setExpandedObj(prev => ({ ...prev, [id]: !prev[id] }));

  const direccionGeneral = areas.find(a => a.name === 'Dirección General');
  const otherAreas = areas.filter(a => a.name !== 'Dirección General');

  // Global objectives (Dirección General area)
  const globalObjectives = useMemo(() => {
    if (!direccionGeneral) return [];
    return objectives.filter(o => o.scope_type === 'area' && o.scope_id === direccionGeneral.id);
  }, [objectives, direccionGeneral]);

  // Get objectives for a specific area (including its subareas)
  const getAreaObjectives = (areaId: string) => {
    const areaSubareaIds = subareas.filter(s => s.area_id === areaId).map(s => s.id);
    return objectives.filter(o =>
      (o.scope_type === 'area' && o.scope_id === areaId) ||
      (o.scope_type === 'subarea' && areaSubareaIds.includes(o.scope_id))
    );
  };

  const getAreaKpis = (areaId: string) => {
    const areaObjs = getAreaObjectives(areaId);
    const objIds = areaObjs.map(o => o.id);
    return kpis.filter(k => objIds.includes(k.objective_id));
  };

  const getAreaProgress = (areaId: string) => {
    const areaObjs = getAreaObjectives(areaId);
    if (areaObjs.length === 0) return 0;
    return Math.round(areaObjs.reduce((sum, o) => sum + o.progress_percent, 0) / areaObjs.length);
  };

  // Global KPIs for Dirección General objectives
  const globalKpis = useMemo(() => {
    const objIds = globalObjectives.map(o => o.id);
    return kpis.filter(k => objIds.includes(k.objective_id));
  }, [kpis, globalObjectives]);

  // Get areas that the objectives reference (as tags)
  const getObjectiveAreaTags = (obj: Tables<'objectives'>) => {
    // Show areas involved - for now show all other areas as tags
    return otherAreas.slice(0, 3);
  };

  const selectedArea = selectedAreaId ? areas.find(a => a.id === selectedAreaId) : null;

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando objetivos...</div>;

  // Drill-down view for a specific area
  if (selectedArea) {
    const areaObjs = getAreaObjectives(selectedArea.id);
    const areaKpisList = getAreaKpis(selectedArea.id);

    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedAreaId(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="page-title">Objetivos — {selectedArea.name}</h1>
            <p className="page-subtitle">{areaObjs.length} objetivos · {areaKpisList.length} indicadores</p>
          </div>
          <div className="ml-auto">
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nuevo Objetivo</Button>
          </div>
        </div>

        <div className="space-y-3">
          {areaObjs.map((obj, idx) => {
            const objKpis = kpis.filter(k => k.objective_id === obj.id);
            const isOpen = expandedObj[obj.id];
            return (
              <ObjectiveCard
                key={obj.id}
                obj={obj}
                index={idx + 1}
                objKpis={objKpis}
                isOpen={isOpen}
                onToggle={() => toggleObj(obj.id)}
                onEdit={() => openEdit(obj)}
                profiles={profiles}
                areas={areas}
                subareas={subareas}
              />
            );
          })}
          {areaObjs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No hay objetivos registrados para esta área</div>
          )}
        </div>

        <ObjetivoFormDialog open={dialogOpen} onOpenChange={setDialogOpen} objective={editingObj} areas={areas} subareas={subareas} profiles={profiles} />
      </div>
    );
  }

  // Main view
  return (
    <div className="animate-fade-in space-y-8">
      {/* Section 1: Global Objectives - Dirección General */}
      <section>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold">Objetivos Globales Dirección General</h1>
            <p className="text-sm text-muted-foreground">Dirección General · {globalObjectives.length} objetivos estratégicos</p>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nuevo Objetivo</Button>
        </div>

        <div className="space-y-3">
          {globalObjectives.map((obj, idx) => {
            const objKpis = kpis.filter(k => k.objective_id === obj.id);
            const isOpen = expandedObj[obj.id];
            return (
              <ObjectiveCard
                key={obj.id}
                obj={obj}
                index={idx + 1}
                objKpis={objKpis}
                isOpen={isOpen}
                onToggle={() => toggleObj(obj.id)}
                onEdit={() => openEdit(obj)}
                profiles={profiles}
                areas={areas}
                subareas={subareas}
                showAreaTags
                otherAreas={otherAreas}
              />
            );
          })}
          {globalObjectives.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border rounded-xl bg-card">No hay objetivos globales registrados</div>
          )}
        </div>
      </section>

      {/* Section 2: Objectives by Area */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold">Objetivos por Áreas:</h2>
          <p className="text-sm text-muted-foreground">{otherAreas.length} departamentos · Haz clic para ver detalles</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {otherAreas.map(area => {
            const areaObjs = getAreaObjectives(area.id);
            const areaKpisList = getAreaKpis(area.id);
            const progress = getAreaProgress(area.id);

            return (
              <button
                key={area.id}
                onClick={() => setSelectedAreaId(area.id)}
                className="bg-card border rounded-xl p-4 text-left hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{area.name}</h3>
                    {area.leader_user_id && (
                      <p className="text-xs text-muted-foreground">Líder: {getProfileName(profiles, area.leader_user_id)}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{areaObjs.length} objetivo{areaObjs.length !== 1 ? 's' : ''}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                </div>

                <ProgressBar value={progress} className="my-3" />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{areaKpisList.length} indicadores</span>
                  <span className="font-semibold text-foreground">{progress}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <ObjetivoFormDialog open={dialogOpen} onOpenChange={setDialogOpen} objective={editingObj} areas={areas} subareas={subareas} profiles={profiles} />
    </div>
  );
}

// Reusable objective card with circular progress
function ObjectiveCard({
  obj, index, objKpis, isOpen, onToggle, onEdit, profiles, areas, subareas, showAreaTags, otherAreas,
}: {
  obj: Tables<'objectives'>;
  index: number;
  objKpis: Tables<'kpis'>[];
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  profiles: Tables<'profiles'>[];
  areas: Tables<'areas'>[];
  subareas: Tables<'subareas'>[];
  showAreaTags?: boolean;
  otherAreas?: Tables<'areas'>[];
}) {
  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (obj.progress_percent / 100) * circumference;
  const progressColor = obj.progress_percent >= 70 ? 'hsl(var(--success))' : obj.progress_percent >= 40 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-5 py-4 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center mt-0.5">
          {index <= 3 ? (
            [<Target key="t" className="w-5 h-5 text-primary" />, <TrendingUp key="tr" className="w-5 h-5 text-primary" />, <Settings key="s" className="w-5 h-5 text-primary" />][index - 1]
          ) : (
            <Target className="w-5 h-5 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <h3 className="font-semibold">{index}. {obj.title}</h3>
          {obj.owner_user_id && (
            <p className="text-xs text-muted-foreground">Responsable: {getProfileName(profiles, obj.owner_user_id)}</p>
          )}
          {!obj.owner_user_id && obj.scope_type === 'area' && (
            <p className="text-xs text-muted-foreground">Responsable: {getProfileName(profiles, areas.find(a => a.id === obj.scope_id)?.leader_user_id ?? null)}</p>
          )}
          {obj.description && <p className="text-sm text-muted-foreground leading-relaxed">{obj.description}</p>}

          {showAreaTags && otherAreas && otherAreas.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {otherAreas.slice(0, 3).map(a => (
                <span key={a.id} className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">{a.name.toLowerCase().slice(0, 12)}</span>
              ))}
              {otherAreas.length > 3 && (
                <span className="text-xs text-muted-foreground">+{otherAreas.length - 3}</span>
              )}
            </div>
          )}

          {objKpis.length > 0 && (
            <button onClick={onToggle} className="flex items-center gap-1 text-xs text-accent font-medium hover:underline">
              {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {objKpis.length} indicadores
            </button>
          )}
        </div>

        {/* Circular progress */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
            <circle cx="32" cy="32" r="28" stroke="hsl(var(--muted))" strokeWidth="4" fill="none" />
            <circle
              cx="32" cy="32" r="28"
              stroke={progressColor}
              strokeWidth="4"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <span className="text-lg font-bold -mt-11">{obj.progress_percent}%</span>
        </div>

        <Button variant="ghost" size="icon" className="shrink-0" onClick={onEdit}>
          <Edit className="w-4 h-4" />
        </Button>
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
}
