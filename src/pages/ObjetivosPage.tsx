import { useState, useMemo } from 'react';
import { useObjectives, useKPIs, useKPIMeasurements, useAreas, useSubareas, useProfiles, getProfileName, getAreaNameFromList } from '@/hooks/useSupabaseData';
import { getTrafficLight } from '@/types';
import { StatusBadge, ProgressBar, TrafficLightBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Plus, Target, ChevronRight, ChevronDown, Edit, TrendingUp, Settings, ArrowLeft, BarChart3, Paperclip, Calendar } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import ObjetivoFormDialog from '@/components/ObjetivoFormDialog';
import KPIFormDialog from '@/components/KPIFormDialog';
import EvidencePanel from '@/components/EvidencePanel';

export default function ObjetivosPage() {
  const { data: objectives = [], isLoading } = useObjectives();
  const { data: kpis = [] } = useKPIs();
  const { data: measurements = [] } = useKPIMeasurements();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: profiles = [] } = useProfiles();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingObj, setEditingObj] = useState<Tables<'objectives'> | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [expandedObj, setExpandedObj] = useState<Record<string, boolean>>({});
  const [globalExpanded, setGlobalExpanded] = useState(false);
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});
  const toggleArea = (id: string) => setExpandedAreas(prev => ({ ...prev, [id]: !prev[id] }));

  // KPI dialog state
  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);
  const [editingKPI, setEditingKPI] = useState<Tables<'kpis'> | null>(null);
  const [preselectedObjectiveId, setPreselectedObjectiveId] = useState<string | null>(null);

  const openNew = () => { setEditingObj(null); setDialogOpen(true); };
  const openEdit = (o: Tables<'objectives'>) => { setEditingObj(o); setDialogOpen(true); };
  const toggleObj = (id: string) => setExpandedObj(prev => ({ ...prev, [id]: !prev[id] }));

  const openNewKPI = (objectiveId: string) => {
    setEditingKPI(null);
    setPreselectedObjectiveId(objectiveId);
    setKpiDialogOpen(true);
  };
  const openEditKPI = (k: Tables<'kpis'>) => {
    setEditingKPI(k);
    setPreselectedObjectiveId(null);
    setKpiDialogOpen(true);
  };

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

  const globalProgress = useMemo(() => {
    if (globalObjectives.length === 0) return 0;
    return Math.round(globalObjectives.reduce((sum, o) => sum + o.progress_percent, 0) / globalObjectives.length);
  }, [globalObjectives]);

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
    const areaSubareas = subareas.filter(s => s.area_id === selectedArea.id);

    // Objectives directly on the area (not subarea)
    const directAreaObjs = objectives.filter(o => o.scope_type === 'area' && o.scope_id === selectedArea.id);
    // Objectives per subarea
    const getSubareaObjs = (subId: string) => objectives.filter(o => o.scope_type === 'subarea' && o.scope_id === subId);

    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedAreaId(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="page-title">Objetivos — {selectedArea.name}</h1>
            <p className="page-subtitle">
              {selectedArea.leader_user_id && `Líder: ${getProfileName(profiles, selectedArea.leader_user_id)} · `}
              {areaObjs.length} objetivos · {areaKpisList.length} indicadores
            </p>
          </div>
          <div className="ml-auto">
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nuevo Objetivo</Button>
          </div>
        </div>

        {/* Direct area objectives */}
        {directAreaObjs.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Objetivos del Área</h2>
            {directAreaObjs.map((obj, idx) => {
              const objKpis = kpis.filter(k => k.objective_id === obj.id);
              const isOpen = expandedObj[obj.id];
              return (
                <ObjectiveCard key={obj.id} obj={obj} index={idx + 1} objKpis={objKpis} isOpen={isOpen}
                  onToggle={() => toggleObj(obj.id)} onEdit={() => openEdit(obj)} onNewKPI={() => openNewKPI(obj.id)} onEditKPI={openEditKPI}
                  profiles={profiles} areas={areas} subareas={subareas} measurements={measurements} />
              );
            })}
          </div>
        )}

        {/* Subarea sections */}
        {areaSubareas.map(sub => {
          const subObjs = getSubareaObjs(sub.id);
          const subKpis = kpis.filter(k => subObjs.some(o => o.id === k.objective_id));
          const subProgress = subObjs.length > 0 ? Math.round(subObjs.reduce((s, o) => s + o.progress_percent, 0) / subObjs.length) : 0;

          return (
            <div key={sub.id} className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h2 className="text-sm font-semibold">{sub.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {sub.leader_user_id ? `Responsable: ${getProfileName(profiles, sub.leader_user_id)}` : 'Sin responsable'} · {subObjs.length} objetivos · {subKpis.length} indicadores · {subProgress}%
                  </p>
                </div>
              </div>
              {subObjs.map((obj, idx) => {
                const objKpis = kpis.filter(k => k.objective_id === obj.id);
                const isOpen = expandedObj[obj.id];
                return (
                <ObjectiveCard key={obj.id} obj={obj} index={idx + 1} objKpis={objKpis} isOpen={isOpen}
                  onToggle={() => toggleObj(obj.id)} onEdit={() => openEdit(obj)} onNewKPI={() => openNewKPI(obj.id)} onEditKPI={openEditKPI}
                  profiles={profiles} areas={areas} subareas={subareas} measurements={measurements} />
                );
              })}
              {subObjs.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground bg-muted/30 rounded-lg">Sin objetivos registrados</div>
              )}
            </div>
          );
        })}

        {areaObjs.length === 0 && areaSubareas.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No hay objetivos registrados para esta área</div>
        )}

        <ObjetivoFormDialog open={dialogOpen} onOpenChange={setDialogOpen} objective={editingObj} areas={areas} subareas={subareas} profiles={profiles} />
        <KPIFormDialog open={kpiDialogOpen} onOpenChange={setKpiDialogOpen} kpi={editingKPI} objectives={objectives} areas={areas} subareas={subareas} preselectedObjectiveId={preselectedObjectiveId} />
      </div>
    );
  }

  // Main view
  return (
    <div className="animate-fade-in space-y-8">
      {/* Section 1: Global Objectives - Dirección General */}
      <section className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setGlobalExpanded(!globalExpanded)}
          className="w-full px-5 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
        >
          {globalExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
          <Target className="w-5 h-5 text-primary" />
          <div className="flex-1 text-left min-w-0">
            <h1 className="text-base font-bold">Objetivos Globales — Dirección General</h1>
            <p className="text-xs text-muted-foreground">
              {direccionGeneral?.leader_user_id && `Líder: ${getProfileName(profiles, direccionGeneral.leader_user_id)} · `}
              {globalObjectives.length} objetivo{globalObjectives.length !== 1 ? 's' : ''} estratégico{globalObjectives.length !== 1 ? 's' : ''} · {globalProgress}%
            </p>
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar value={globalProgress} className="flex-1" />
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{globalProgress}%</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{globalKpis.length} indicadores</span>
            <StatusBadge status="activo" />
          </div>
          <Button size="sm" variant="outline" className="ml-2" onClick={(e) => { e.stopPropagation(); openNew(); }}>
            <Plus className="w-4 h-4 mr-1" />Nuevo
          </Button>
        </button>

        {globalExpanded && (
          <div className="border-t px-5 py-4 space-y-3">
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
                  onNewKPI={() => openNewKPI(obj.id)}
                  onEditKPI={openEditKPI}
                  profiles={profiles}
                  areas={areas}
                  subareas={subareas}
                  measurements={measurements}
                  showAreaTags
                  otherAreas={otherAreas}
                />
              );
            })}
            {globalObjectives.length === 0 && (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">No hay objetivos globales registrados</div>
            )}
          </div>
        )}
      </section>

      {/* Section 2: Objectives by Area */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold">Objetivos por Áreas:</h2>
          <p className="text-sm text-muted-foreground">{otherAreas.length} departamentos · Haz clic para expandir o ver detalles</p>
        </div>

        <div className="space-y-3">
          {otherAreas.map(area => {
            const areaObjs = getAreaObjectives(area.id);
            const areaKpisList = getAreaKpis(area.id);
            const progress = getAreaProgress(area.id);
            const areaSubareas = subareas.filter(s => s.area_id === area.id);
            const isAreaExpanded = expandedAreas[area.id];

            return (
              <div key={area.id} className="bg-card border rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleArea(area.id)}
                  className="w-full px-5 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                >
                  {isAreaExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                  <Target className="w-5 h-5 text-primary" />
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="text-base font-bold">{area.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {area.leader_user_id && `Líder: ${getProfileName(profiles, area.leader_user_id)} · `}
                      {areaObjs.length} objetivo{areaObjs.length !== 1 ? 's' : ''} · {areaSubareas.length > 0 ? `${areaSubareas.length} subárea${areaSubareas.length !== 1 ? 's' : ''} · ` : ''}
                      {progress}%
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <ProgressBar value={progress} className="flex-1" />
                      <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{progress}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{areaKpisList.length} indicadores</span>
                    <StatusBadge status={area.status} />
                  </div>
                  <Button size="sm" variant="outline" className="ml-2" onClick={(e) => { e.stopPropagation(); setSelectedAreaId(area.id); }}>
                    Ver detalle
                  </Button>
                </button>

                {isAreaExpanded && (
                  <div className="border-t px-5 py-4 space-y-3">
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
                          onNewKPI={() => openNewKPI(obj.id)}
                          onEditKPI={openEditKPI}
                          profiles={profiles}
                          areas={areas}
                          subareas={subareas}
                          measurements={measurements}
                        />
                      );
                    })}
                    {areaObjs.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">No hay objetivos registrados para esta área</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <ObjetivoFormDialog open={dialogOpen} onOpenChange={setDialogOpen} objective={editingObj} areas={areas} subareas={subareas} profiles={profiles} />
      <KPIFormDialog open={kpiDialogOpen} onOpenChange={setKpiDialogOpen} kpi={editingKPI} objectives={objectives} areas={areas} subareas={subareas} preselectedObjectiveId={preselectedObjectiveId} />
    </div>
  );
}

// Reusable objective card with circular progress
function ObjectiveCard({
  obj, index, objKpis, isOpen, onToggle, onEdit, onNewKPI, onEditKPI, profiles, areas, subareas, showAreaTags, otherAreas,
}: {
  obj: Tables<'objectives'>;
  index: number;
  objKpis: Tables<'kpis'>[];
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onNewKPI: () => void;
  onEditKPI: (k: Tables<'kpis'>) => void;
  profiles: Tables<'profiles'>[];
  areas: Tables<'areas'>[];
  subareas: Tables<'subareas'>[];
  showAreaTags?: boolean;
  otherAreas?: Tables<'areas'>[];
}) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [kpiEvidenceId, setKpiEvidenceId] = useState<string | null>(null);
  const [kpiEvidenceName, setKpiEvidenceName] = useState('');
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

          <div className="flex items-center gap-2">
            {objKpis.length > 0 && (
              <button onClick={onToggle} className="flex items-center gap-1 text-xs text-accent font-medium hover:underline">
                {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {objKpis.length} indicadores
              </button>
            )}
            <button onClick={onNewKPI} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
              <Plus className="w-3 h-3" /> Indicador
            </button>
            <button onClick={() => setEvidenceOpen(true)} className="flex items-center gap-1 text-xs text-muted-foreground font-medium hover:underline hover:text-foreground">
              <Paperclip className="w-3 h-3" /> Evidencias
            </button>
          </div>
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
                <th className="text-right py-1"></th>
              </tr>
            </thead>
            <tbody>
              {objKpis.map(k => (
                <tr key={k.id} className="border-t border-border/50">
                  <td className="py-2 font-medium">{k.name}</td>
                  <td className="py-2">{k.target} {k.unit}</td>
                  <td className="py-2">{k.current_value} {k.unit}</td>
                  <td className="py-2"><TrafficLightBadge light={getTrafficLight(k as any)} /></td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setKpiEvidenceId(k.id); setKpiEvidenceName(k.name); }}>
                        <Paperclip className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditKPI(k)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td colSpan={2} className="py-2 text-right font-semibold text-sm">Promedio General:</td>
                <td className="py-2 font-bold text-sm">
                  {(() => {
                    const avg = objKpis.length > 0
                      ? Math.round(objKpis.reduce((sum, k) => sum + (k.target > 0 ? (k.current_value / k.target) * 100 : 0), 0) / objKpis.length)
                      : 0;
                    return `${avg}%`;
                  })()}
                </td>
                <td className="py-2">
                  {(() => {
                    const avg = objKpis.length > 0
                      ? Math.round(objKpis.reduce((sum, k) => sum + (k.target > 0 ? (k.current_value / k.target) * 100 : 0), 0) / objKpis.length)
                      : 0;
                    const label = avg >= 100 ? 'Alto' : avg >= 80 ? 'Medio' : 'Bajo';
                    const color = avg >= 100 ? 'text-green-600 bg-green-50' : avg >= 80 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50';
                    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{label} ({avg}%)</span>;
                  })()}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Evidence dialogs */}
      <EvidencePanel
        entityType="objective"
        entityId={obj.id}
        entityName={obj.title}
        open={evidenceOpen}
        onOpenChange={setEvidenceOpen}
      />
      {kpiEvidenceId && (
        <EvidencePanel
          entityType="kpi"
          entityId={kpiEvidenceId}
          entityName={kpiEvidenceName}
          open={!!kpiEvidenceId}
          onOpenChange={(open) => { if (!open) setKpiEvidenceId(null); }}
        />
      )}
    </div>
  );
}
