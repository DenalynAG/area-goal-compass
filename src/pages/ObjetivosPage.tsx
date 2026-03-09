import { useState, useMemo, useRef } from 'react';
import { useObjectives, useKPIs, useKPIMeasurements, useAreas, useSubareas, useProfiles, getProfileName, getAreaNameFromList } from '@/hooks/useSupabaseData';
import { getTrafficLight } from '@/types';
import { StatusBadge, ProgressBar, TrafficLightBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Plus, Target, ChevronRight, ChevronDown, Edit, TrendingUp, Settings, ArrowLeft, BarChart3, Paperclip, Calendar, Upload, Download } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import ObjetivoFormDialog from '@/components/ObjetivoFormDialog';
import KPIFormDialog from '@/components/KPIFormDialog';
import EvidencePanel from '@/components/EvidencePanel';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function ObjetivosPage() {
  const { data: objectives = [], isLoading } = useObjectives();
  const { data: kpis = [] } = useKPIs();
  const { data: measurements = [] } = useKPIMeasurements();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: profiles = [] } = useProfiles();

  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

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

  // ───── Excel Import Handler ─────
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (rows.length === 0) { toast.error('El archivo está vacío'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Debes iniciar sesión'); return; }

      // Normalize helpers
      const normalize = (s: string) => (s || '').toString().trim().toLowerCase();
      const findArea = (name: string) => areas.find(a => normalize(a.name) === normalize(name));
      const findSubarea = (name: string, areaId: string) => subareas.find(s => normalize(s.name) === normalize(name) && s.area_id === areaId);
      const findProfile = (name: string) => profiles.find(p => normalize(p.name) === normalize(name));

      // Month columns mapping
      const monthCols: Record<string, string> = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
        'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
        'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12',
      };

      const currentYear = new Date().getFullYear();
      let created = 0, skipped = 0;

      for (const row of rows) {
        // Expected columns: Objetivo, Indicador, Meta, Responsable, Area, Subarea, Unidad, Linea Base, Umbral Verde, Umbral Amarillo, Umbral Rojo, Ene..Dic
        const objTitle = (row['Objetivo'] || '').toString().trim();
        const kpiName = (row['Indicador'] || row['KPI'] || '').toString().trim();
        const target = parseFloat(row['Meta']) || 0;
        const responsable = (row['Responsable'] || '').toString().trim();
        const areaName = (row['Area'] || row['Área'] || '').toString().trim();
        const subareaName = (row['Subarea'] || row['Subárea'] || '').toString().trim();
        const unit = (row['Unidad'] || '').toString().trim();
        const baseline = parseFloat(row['Linea Base'] || row['Línea Base'] || '0') || 0;
        const thresholdGreen = parseFloat(row['Umbral Verde'] || '0') || 0;
        const thresholdYellow = parseFloat(row['Umbral Amarillo'] || '0') || 0;
        const thresholdRed = parseFloat(row['Umbral Rojo'] || '0') || 0;

        if (!objTitle || !kpiName || !areaName) { skipped++; continue; }

        const area = findArea(areaName);
        if (!area) { skipped++; continue; }

        const scopeType = subareaName ? 'subarea' : 'area';
        const sub = subareaName ? findSubarea(subareaName, area.id) : null;
        if (subareaName && !sub) { skipped++; continue; }
        const scopeId = scopeType === 'subarea' ? sub!.id : area.id;

        const ownerProfile = responsable ? findProfile(responsable) : null;

        // Upsert objective (find existing by title + scope)
        let objectiveId: string;
        const existingObj = objectives.find(o => normalize(o.title) === normalize(objTitle) && o.scope_id === scopeId);
        if (existingObj) {
          objectiveId = existingObj.id;
        } else {
          const { data: newObj, error: objErr } = await supabase.from('objectives').insert({
            title: objTitle,
            scope_type: scopeType,
            scope_id: scopeId,
            owner_user_id: ownerProfile?.id ?? null,
            status: 'activo',
            priority: 'media',
          }).select('id').single();
          if (objErr || !newObj) { skipped++; continue; }
          objectiveId = newObj.id;
        }

        // Get month values from row
        const monthValues: { month: string; value: number }[] = [];
        for (const [colName, colVal] of Object.entries(row)) {
          const monthNum = monthCols[normalize(colName)];
          if (monthNum && colVal !== '' && !isNaN(parseFloat(colVal as string))) {
            monthValues.push({ month: monthNum, value: parseFloat(colVal as string) });
          }
        }

        // Current value = last month with data or 0
        const latestMonthValue = monthValues.length > 0 ? monthValues[monthValues.length - 1].value : 0;

        // Upsert KPI
        const existingKpi = kpis.find(k => normalize(k.name) === normalize(kpiName) && k.objective_id === objectiveId);
        let kpiId: string;
        if (existingKpi) {
          kpiId = existingKpi.id;
          await supabase.from('kpis').update({
            target, baseline, unit, current_value: latestMonthValue,
            threshold_green: thresholdGreen, threshold_yellow: thresholdYellow, threshold_red: thresholdRed,
          }).eq('id', kpiId);
        } else {
          const { data: newKpi, error: kpiErr } = await supabase.from('kpis').insert({
            name: kpiName,
            objective_id: objectiveId,
            target, baseline, unit,
            current_value: latestMonthValue,
            threshold_green: thresholdGreen, threshold_yellow: thresholdYellow, threshold_red: thresholdRed,
          }).select('id').single();
          if (kpiErr || !newKpi) { skipped++; continue; }
          kpiId = newKpi.id;
        }

        // Insert monthly measurements
        for (const mv of monthValues) {
          const periodDate = `${currentYear}-${mv.month}-01`;
          // Check if already exists
          const { data: existing } = await supabase.from('kpi_measurements')
            .select('id').eq('kpi_id', kpiId).eq('period_date', periodDate).maybeSingle();
          if (existing) {
            await supabase.from('kpi_measurements').update({ value: mv.value }).eq('id', existing.id);
          } else {
            await supabase.from('kpi_measurements').insert({
              kpi_id: kpiId, period_date: periodDate, value: mv.value, created_by: session.user.id,
            });
          }
        }

        created++;
      }

      qc.invalidateQueries({ queryKey: ['objectives'] });
      qc.invalidateQueries({ queryKey: ['kpis'] });
      qc.invalidateQueries({ queryKey: ['kpi_measurements'] });
      toast.success(`Importación completada: ${created} filas procesadas, ${skipped} omitidas`);
    } catch (err: any) {
      toast.error('Error al importar: ' + (err.message || err));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  const getObjProgress = (obj: Tables<'objectives'>) => {
    const objKpis = kpis.filter(k => k.objective_id === obj.id);
    if (objKpis.length === 0) return obj.progress_percent;
    return Math.round(objKpis.reduce((sum, k) => sum + (k.target > 0 ? (k.current_value / k.target) * 100 : 0), 0) / objKpis.length);
  };

  const getAreaProgress = (areaId: string) => {
    const areaObjs = getAreaObjectives(areaId);
    if (areaObjs.length === 0) return 0;
    return Math.round(areaObjs.reduce((sum, o) => sum + getObjProgress(o), 0) / areaObjs.length);
  };

  // Global KPIs for Dirección General objectives
  const globalKpis = useMemo(() => {
    const objIds = globalObjectives.map(o => o.id);
    return kpis.filter(k => objIds.includes(k.objective_id));
  }, [kpis, globalObjectives]);

  const globalProgress = useMemo(() => {
    if (globalObjectives.length === 0) return 0;
    return Math.round(globalObjectives.reduce((sum, o) => sum + getObjProgress(o), 0) / globalObjectives.length);
  }, [globalObjectives, kpis]);

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
          const subProgress = subObjs.length > 0 ? Math.round(subObjs.reduce((s, o) => s + getObjProgress(o), 0) / subObjs.length) : 0;

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
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Objetivos por Áreas:</h2>
            <p className="text-sm text-muted-foreground">{otherAreas.length} departamentos · Haz clic para expandir o ver detalles</p>
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
            <Button variant="outline" size="sm" disabled={importing} onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />{importing ? 'Importando...' : 'Importar Excel'}
            </Button>
          </div>
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
  obj, index, objKpis, isOpen, onToggle, onEdit, onNewKPI, onEditKPI, profiles, areas, subareas, measurements, showAreaTags, otherAreas,
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
  measurements?: Tables<'kpi_measurements'>[];
  showAreaTags?: boolean;
  otherAreas?: Tables<'areas'>[];
}) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [kpiEvidenceId, setKpiEvidenceId] = useState<string | null>(null);
  const [kpiEvidenceName, setKpiEvidenceName] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('actual');
  
  // Progress computed from KPI average
  const computedProgress = useMemo(() => {
    if (objKpis.length === 0) return obj.progress_percent;
    return Math.round(objKpis.reduce((sum, k) => sum + (k.target > 0 ? (k.current_value / k.target) * 100 : 0), 0) / objKpis.length);
  }, [objKpis, obj.progress_percent]);

  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (Math.min(computedProgress, 100) / 100) * circumference;
  const progressColor = computedProgress >= 70 ? 'hsl(var(--success))' : computedProgress >= 40 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';

  // Build months for the current year
  const kpiIds = objKpis.map(k => k.id);
  const relevantMeasurements = (measurements ?? []).filter(m => kpiIds.includes(m.kpi_id));
  const currentYear = new Date().getFullYear();
  const availableMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mm = String(i + 1).padStart(2, '0');
      return `${currentYear}-${mm}`;
    });
  }, [currentYear]);

  const monthLabels: Record<string, string> = {
    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
    '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
  };

  const getMonthLabel = (ym: string) => {
    const [year, month] = ym.split('-');
    return `${monthLabels[month] ?? month} ${year}`;
  };

  // Get KPI value for a given month
  const getKpiMonthValue = (kpiId: string) => {
    if (selectedMonth === 'actual') return null; // use current_value
    const m = relevantMeasurements.find(m => m.kpi_id === kpiId && m.period_date.startsWith(selectedMonth));
    return m ? m.value : null;
  };

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
          <span className="text-lg font-bold -mt-11">{computedProgress}%</span>
        </div>

        <Button variant="ghost" size="icon" className="shrink-0" onClick={onEdit}>
          <Edit className="w-4 h-4" />
        </Button>
      </div>

      {isOpen && objKpis.length > 0 && (
        <div className="border-t bg-muted/20 px-5 py-3">
          {/* Month tabs */}
          {objKpis.length > 0 && (
            <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mr-1" />
              <button
                onClick={() => setSelectedMonth('actual')}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedMonth === 'actual'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Actual
              </button>
              {availableMonths.map(ym => (
                <button
                  key={ym}
                  onClick={() => setSelectedMonth(ym)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedMonth === ym
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {getMonthLabel(ym)}
                </button>
              ))}
            </div>
          )}

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
              {objKpis.map(k => {
                const monthValue = getKpiMonthValue(k.id);
                const displayValue = selectedMonth === 'actual' ? k.current_value : (monthValue ?? 0);
                const kpiForLight = { ...k, current_value: displayValue };
                return (
                  <tr key={k.id} className="border-t border-border/50">
                    <td className="py-2 font-medium">{k.name}</td>
                    <td className="py-2">{k.target} {k.unit}</td>
                    <td className="py-2">
                      {selectedMonth !== 'actual' && monthValue === null
                        ? <span className="text-muted-foreground italic">Sin dato</span>
                        : <>{displayValue} {k.unit}</>
                      }
                    </td>
                    <td className="py-2">
                      {selectedMonth !== 'actual' && monthValue === null
                        ? <span className="text-muted-foreground">—</span>
                        : <TrafficLightBadge light={getTrafficLight(kpiForLight as any)} />
                      }
                    </td>
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
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td colSpan={2} className="py-2 text-right font-semibold text-sm">Promedio General:</td>
                <td className="py-2 font-bold text-sm">
                  {(() => {
                    const values = objKpis.map(k => {
                      const monthValue = getKpiMonthValue(k.id);
                      const val = selectedMonth === 'actual' ? k.current_value : (monthValue ?? null);
                      if (val === null) return null;
                      return k.target > 0 ? (val / k.target) * 100 : 0;
                    }).filter((v): v is number => v !== null);
                    const avg = values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
                    return `${avg}%`;
                  })()}
                </td>
                <td className="py-2">
                  {(() => {
                    const values = objKpis.map(k => {
                      const monthValue = getKpiMonthValue(k.id);
                      const val = selectedMonth === 'actual' ? k.current_value : (monthValue ?? null);
                      if (val === null) return null;
                      return k.target > 0 ? (val / k.target) * 100 : 0;
                    }).filter((v): v is number => v !== null);
                    const avg = values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
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
