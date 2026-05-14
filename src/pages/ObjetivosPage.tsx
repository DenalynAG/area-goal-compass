import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useObjectives, useKPIs, useKPIMeasurements, useAreas, useSubareas, useProfiles, getProfileName, getAreaNameFromList, useEvidenceCountsByEntity } from '@/hooks/useSupabaseData';
import { getTrafficLight } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge, ProgressBar, TrafficLightBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Plus, Target, ChevronRight, ChevronDown, Edit, TrendingUp, Settings, ArrowLeft, BarChart3, Paperclip, Calendar, Upload, Download, Layers, User, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Tables } from '@/integrations/supabase/types';
import ObjetivoFormDialog from '@/components/ObjetivoFormDialog';
import KPIFormDialog from '@/components/KPIFormDialog';
import EvidencePanel from '@/components/EvidencePanel';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/lib/activityLog';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LabelList } from 'recharts';
import { LayoutDashboard } from 'lucide-react';

interface ObjetivosPageProps {
  areaFilterName?: string;
}

export default function ObjetivosPage({ areaFilterName }: ObjetivosPageProps = {}) {
  const { data: objectives = [], isLoading } = useObjectives();
  const { data: kpis = [] } = useKPIs();
  const { data: measurements = [] } = useKPIMeasurements();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: profiles = [] } = useProfiles();
  const { isSuperAdmin, hasRole } = useAuth();
  const canEditKpi = isSuperAdmin || hasRole('admin_area') || hasRole('gestor_area') || hasRole('lider_subarea');
  const canDownload = isSuperAdmin;

  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [objToDelete, setObjToDelete] = useState<Tables<'objectives'> | null>(null);
  const [kpiToDelete, setKpiToDelete] = useState<Tables<'kpis'> | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingObj, setEditingObj] = useState<Tables<'objectives'> | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [expandedObj, setExpandedObj] = useState<Record<string, boolean>>({});
  const [globalExpanded, setGlobalExpanded] = useState(false);
  const [dashboardExpanded, setDashboardExpanded] = useState(true);
  const [dashAreaId, setDashAreaId] = useState<string>('__all__');
  const [dashSubareaId, setDashSubareaId] = useState<string>('__all__');
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});
  const toggleArea = (id: string) => setExpandedAreas(prev => ({ ...prev, [id]: !prev[id] }));

  // KPI dialog state
  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);
  const [editingKPI, setEditingKPI] = useState<Tables<'kpis'> | null>(null);
  const [preselectedObjectiveId, setPreselectedObjectiveId] = useState<string | null>(null);
  const [kpiSelectedMonth, setKpiSelectedMonth] = useState<string | null>(null);

  const openNew = () => { setEditingObj(null); setDialogOpen(true); };
  const openEdit = (o: Tables<'objectives'>) => { setEditingObj(o); setDialogOpen(true); };
  const toggleObj = (id: string) => setExpandedObj(prev => ({ ...prev, [id]: !prev[id] }));

  const openNewKPI = (objectiveId: string, month?: string) => {
    setEditingKPI(null);
    setPreselectedObjectiveId(objectiveId);
    setKpiSelectedMonth(month ?? null);
    setKpiDialogOpen(true);
  };
  const openEditKPI = (k: Tables<'kpis'>, month?: string) => {
    setEditingKPI(k);
    setPreselectedObjectiveId(null);
    setKpiSelectedMonth(month ?? null);
    setKpiDialogOpen(true);
  };

  // Auto-select area when areaFilterName is provided
  useEffect(() => {
    if (areaFilterName && areas.length > 0) {
      const match = areas.find(a => a.name.toLowerCase() === areaFilterName.toLowerCase());
      if (match) setSelectedAreaId(match.id);
    }
  }, [areaFilterName, areas]);

  const isAreaLocked = !!areaFilterName;

  // ───── Delete All Objectives & KPIs ─────
  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const { error: mErr } = await supabase.from('kpi_measurements').delete().not('id', 'is', null);
      if (mErr) throw mErr;
      const { error: kErr } = await supabase.from('kpis').delete().not('id', 'is', null);
      if (kErr) throw kErr;
      const { error: oErr } = await supabase.from('objectives').delete().not('id', 'is', null);
      if (oErr) throw oErr;
      qc.invalidateQueries({ queryKey: ['objectives'] });
      qc.invalidateQueries({ queryKey: ['kpis'] });
      qc.invalidateQueries({ queryKey: ['kpi_measurements'] });
      await logActivity('delete_all', 'objectives_kpis', null);
      toast.success('Todos los objetivos e indicadores fueron eliminados');
      setDeleteAllOpen(false);
    } catch (err: any) {
      toast.error('Error al eliminar: ' + (err.message || err));
    } finally {
      setDeletingAll(false);
    }
  };

  // ───── Delete single Objective (cascade KPIs + measurements) ─────
  const handleDeleteObjective = async (obj: Tables<'objectives'>) => {
    setDeletingItem(true);
    try {
      const objKpiIds = kpis.filter(k => k.objective_id === obj.id).map(k => k.id);
      if (objKpiIds.length > 0) {
        const { error: mErr } = await supabase.from('kpi_measurements').delete().in('kpi_id', objKpiIds);
        if (mErr) throw mErr;
        const { error: kErr } = await supabase.from('kpis').delete().in('id', objKpiIds);
        if (kErr) throw kErr;
      }
      const { error: oErr } = await supabase.from('objectives').delete().eq('id', obj.id);
      if (oErr) throw oErr;
      qc.invalidateQueries({ queryKey: ['objectives'] });
      qc.invalidateQueries({ queryKey: ['kpis'] });
      qc.invalidateQueries({ queryKey: ['kpi_measurements'] });
      await logActivity('eliminar', 'objective', obj.id, { titulo: obj.title });
      toast.success('Objetivo eliminado');
      setObjToDelete(null);
    } catch (err: any) {
      toast.error('Error al eliminar: ' + (err.message || err));
    } finally {
      setDeletingItem(false);
    }
  };

  // ───── Delete single KPI (cascade measurements) ─────
  const handleDeleteKpi = async (k: Tables<'kpis'>) => {
    setDeletingItem(true);
    try {
      const { error: mErr } = await supabase.from('kpi_measurements').delete().eq('kpi_id', k.id);
      if (mErr) throw mErr;
      const { error: kErr } = await supabase.from('kpis').delete().eq('id', k.id);
      if (kErr) throw kErr;
      qc.invalidateQueries({ queryKey: ['kpis'] });
      qc.invalidateQueries({ queryKey: ['kpi_measurements'] });
      await logActivity('eliminar', 'kpi', k.id, { nombre: k.name });
      toast.success('Indicador eliminado');
      setKpiToDelete(null);
    } catch (err: any) {
      toast.error('Error al eliminar: ' + (err.message || err));
    } finally {
      setDeletingItem(false);
    }
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
      setImportProgress({ current: 0, total: rows.length });

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
      let skipped = 0;
      let objCreated = 0, objUpdated = 0;
      let kpiCreated = 0, kpiUpdated = 0;
      let measCreated = 0, measUpdated = 0;

      // Local caches to avoid duplicates within the same import run
      // (React Query state doesn't refresh mid-loop)
      const objCache = new Map<string, string>(); // key: `${normalize(title)}|${scopeId}` -> id
      const kpiCache = new Map<string, string>(); // key: `${normalize(name)}|${objectiveId}` -> id
      objectives.forEach(o => objCache.set(`${normalize(o.title)}|${o.scope_id}`, o.id));
      kpis.forEach(k => kpiCache.set(`${normalize(k.name)}|${k.objective_id}`, k.id));

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setImportProgress({ current: i + 1, total: rows.length });
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
        const objKey = `${normalize(objTitle)}|${scopeId}`;
        const cachedObjId = objCache.get(objKey);
        if (cachedObjId) {
          objectiveId = cachedObjId;
          objUpdated++;
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
          objCache.set(objKey, objectiveId);
          objCreated++;
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
        const kpiKey = `${normalize(kpiName)}|${objectiveId}`;
        const cachedKpiId = kpiCache.get(kpiKey);
        let kpiId: string;
        if (cachedKpiId) {
          kpiId = cachedKpiId;
          await supabase.from('kpis').update({
            target, baseline, unit, current_value: latestMonthValue,
            threshold_green: thresholdGreen, threshold_yellow: thresholdYellow, threshold_red: thresholdRed,
          }).eq('id', kpiId);
          kpiUpdated++;
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
          kpiCache.set(kpiKey, kpiId);
          kpiCreated++;
        }

        // Insert monthly measurements
        for (const mv of monthValues) {
          const periodDate = `${currentYear}-${mv.month}-01`;
          // Check if already exists
          const { data: existing } = await supabase.from('kpi_measurements')
            .select('id').eq('kpi_id', kpiId).eq('period_date', periodDate).maybeSingle();
          if (existing) {
            await supabase.from('kpi_measurements').update({ value: mv.value }).eq('id', existing.id);
            measUpdated++;
          } else {
            await supabase.from('kpi_measurements').insert({
              kpi_id: kpiId, period_date: periodDate, value: mv.value, created_by: session.user.id,
            });
            measCreated++;
          }
        }
      }

      qc.invalidateQueries({ queryKey: ['objectives'] });
      qc.invalidateQueries({ queryKey: ['kpis'] });
      qc.invalidateQueries({ queryKey: ['kpi_measurements'] });
      await logActivity('import_excel', 'objectives_kpis', null, {
        objectives: { created: objCreated, updated: objUpdated },
        kpis: { created: kpiCreated, updated: kpiUpdated },
        measurements: { created: measCreated, updated: measUpdated },
        skipped,
      });
      toast.success('Importación completada', {
        description: `Objetivos: ${objCreated} creados, ${objUpdated} actualizados · KPIs: ${kpiCreated} creados, ${kpiUpdated} actualizados · Mediciones: ${measCreated} creadas, ${measUpdated} actualizadas · Filas omitidas: ${skipped}`,
        duration: 10000,
      });
    } catch (err: any) {
      toast.error('Error al importar: ' + (err.message || err));
    } finally {
      setImporting(false);
      setImportProgress({ current: 0, total: 0 });
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

  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const getKpiCurrentMonthValue = (kpiId: string) => {
    const m = measurements.find(m => m.kpi_id === kpiId && m.period_date.startsWith(currentMonthStr));
    return m ? m.value : null;
  };

  const elapsedMonths = new Date().getMonth() + 1;
  // Accumulated average window: only Feb (2) to Nov (11)
  const avgWindowEndTop = Math.min(elapsedMonths, 11);
  const avgWindowMonthsTop = Math.max(0, avgWindowEndTop - 2 + 1);
  const inAvgWindowTop = (mo: number) => mo >= 2 && mo <= avgWindowEndTop;

  // Financial KPIs (by unit) use SUM accumulated instead of average
  const isFinancialKpi = (k: { unit?: string | null }) => {
    const u = (k.unit ?? '').toString().trim().toLowerCase();
    if (!u) return false;
    return /\$|cop|usd|eur|mxn|pesos?|d[oó]lares?|facturaci[oó]n|ingreso|venta|ventas|costo|gasto/.test(u);
  };

  const getObjProgress = (obj: Tables<'objectives'>) => {
    const objKpis = kpis.filter(k => k.objective_id === obj.id);
    if (objKpis.length === 0) return obj.progress_percent;

    const currentYear = new Date().getFullYear();
    const values = objKpis.map(k => {
      const kpiMeasurements = measurements.filter(m => {
        if (m.kpi_id !== k.id) return false;
        const measurementDate = new Date(m.period_date);
        return measurementDate.getFullYear() === currentYear && inAvgWindowTop(measurementDate.getMonth() + 1);
      });

      if (kpiMeasurements.length === 0) return null;

      const sumValue = kpiMeasurements.reduce((sum, m) => sum + Number(m.value), 0);
      const accumulated = isFinancialKpi(k) ? sumValue : sumValue / (avgWindowMonthsTop || 1);
      return k.target > 0 ? (accumulated / k.target) * 100 : 0;
    }).filter((v): v is number => v !== null);

    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  };

  const getAreaProgress = (areaId: string) => {
    const areaObjs = getAreaObjectives(areaId);
    if (areaObjs.length === 0) return 0;
    return Math.round(
      areaObjs.reduce((sum, o) => sum + Math.min(getObjProgress(o), 100), 0) / areaObjs.length
    );
  };

  // Global KPIs for Dirección General objectives
  const globalKpis = useMemo(() => {
    const objIds = globalObjectives.map(o => o.id);
    return kpis.filter(k => objIds.includes(k.objective_id));
  }, [kpis, globalObjectives]);

  const globalProgress = useMemo(() => {
    if (globalObjectives.length === 0) return 0;
    return Math.round(
      globalObjectives.reduce((sum, o) => sum + Math.min(getObjProgress(o), 100), 0) / globalObjectives.length
    );
  }, [globalObjectives, kpis]);

  // Get areas that the objectives reference (as tags)
  const getObjectiveAreaTags = (obj: Tables<'objectives'>) => {
    // Show areas involved - for now show all other areas as tags
    return otherAreas.slice(0, 3);
  };

  const selectedArea = selectedAreaId ? areas.find(a => a.id === selectedAreaId) : null;

  // ───── Dashboard chart data ─────
  const getKpiAchievement = (k: Tables<'kpis'>) => {
    const currentYear = new Date().getFullYear();
    const ms = measurements.filter(m => {
      if (m.kpi_id !== k.id) return false;
      const d = new Date(m.period_date);
      return d.getFullYear() === currentYear && inAvgWindowTop(d.getMonth() + 1);
    });
    if (ms.length === 0) return null;
    const sumValue = ms.reduce((s, m) => s + Number(m.value), 0);
    const accumulated = isFinancialKpi(k) ? sumValue : sumValue / (avgWindowMonthsTop || 1);
    return k.target > 0 ? Math.round((accumulated / k.target) * 100) : 0;
  };

  const dashboardChartData = useMemo(() => {
    // Decide grouping
    if (dashAreaId === '__all__') {
      // by area (excluding Dirección General? include all)
      return areas.map(a => {
        const objs = getAreaObjectives(a.id);
        const ks = getAreaKpis(a.id);
        const objAvg = objs.length ? Math.round(objs.reduce((s, o) => s + getObjProgress(o), 0) / objs.length) : 0;
        const kpiVals = ks.map(k => getKpiAchievement(k)).filter((v): v is number => v !== null);
        const kpiAvg = kpiVals.length ? Math.round(kpiVals.reduce((s, v) => s + v, 0) / kpiVals.length) : 0;
        return { name: a.name, Objetivos: objAvg, Indicadores: kpiAvg };
      }).filter(d => d.Objetivos > 0 || d.Indicadores > 0);
    }
    if (dashSubareaId === '__all__') {
      // by subarea of selected area + direct area objectives
      const subs = subareas.filter(s => s.area_id === dashAreaId);
      const result: { name: string; Objetivos: number; Indicadores: number }[] = [];
      const directObjs = objectives.filter(o => o.scope_type === 'area' && o.scope_id === dashAreaId);
      if (directObjs.length) {
        const ks = kpis.filter(k => directObjs.some(o => o.id === k.objective_id));
        const objAvg = Math.round(directObjs.reduce((s, o) => s + getObjProgress(o), 0) / directObjs.length);
        const kpiVals = ks.map(k => getKpiAchievement(k)).filter((v): v is number => v !== null);
        const kpiAvg = kpiVals.length ? Math.round(kpiVals.reduce((s, v) => s + v, 0) / kpiVals.length) : 0;
        result.push({ name: '(Área directa)', Objetivos: objAvg, Indicadores: kpiAvg });
      }
      subs.forEach(s => {
        const objs = objectives.filter(o => o.scope_type === 'subarea' && o.scope_id === s.id);
        if (!objs.length) return;
        const ks = kpis.filter(k => objs.some(o => o.id === k.objective_id));
        const objAvg = Math.round(objs.reduce((sum, o) => sum + getObjProgress(o), 0) / objs.length);
        const kpiVals = ks.map(k => getKpiAchievement(k)).filter((v): v is number => v !== null);
        const kpiAvg = kpiVals.length ? Math.round(kpiVals.reduce((sum, v) => sum + v, 0) / kpiVals.length) : 0;
        result.push({ name: s.name, Objetivos: objAvg, Indicadores: kpiAvg });
      });
      return result;
    }
    // by objective inside selected subarea
    const objs = objectives.filter(o => o.scope_type === 'subarea' && o.scope_id === dashSubareaId);
    return objs.map(o => {
      const ks = kpis.filter(k => k.objective_id === o.id);
      const kpiVals = ks.map(k => getKpiAchievement(k)).filter((v): v is number => v !== null);
      const kpiAvg = kpiVals.length ? Math.round(kpiVals.reduce((s, v) => s + v, 0) / kpiVals.length) : 0;
      return { name: o.title.length > 40 ? o.title.slice(0, 40) + '…' : o.title, Objetivos: getObjProgress(o), Indicadores: kpiAvg };
    });
  }, [dashAreaId, dashSubareaId, areas, subareas, objectives, kpis, measurements]);

  const dashSubareaOptions = useMemo(() => {
    if (dashAreaId === '__all__') return [];
    return subareas.filter(s => s.area_id === dashAreaId);
  }, [dashAreaId, subareas]);

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando objetivos...</div>;

  // Drill-down view for a specific area
  if (selectedArea) {
    const areaObjs = getAreaObjectives(selectedArea.id);
    const areaKpisList = getAreaKpis(selectedArea.id);
    const areaSubareas = subareas.filter(s => s.area_id === selectedArea.id);
    const areaProgress = getAreaProgress(selectedArea.id);

    // Objectives directly on the area (not subarea)
    const directAreaObjs = objectives.filter(o => o.scope_type === 'area' && o.scope_id === selectedArea.id);
    // Objectives per subarea
    const getSubareaObjs = (subId: string) => objectives.filter(o => o.scope_type === 'subarea' && o.scope_id === subId);

    return (
      <div className="animate-fade-in space-y-4">
        {/* Breadcrumb + Back */}
        {!isAreaLocked && (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <button
                onClick={() => setSelectedAreaId(null)}
                className="hover:text-foreground transition-colors hover:underline"
              >
                Objetivos
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-foreground font-medium">{selectedArea.name}</span>
            </nav>
            <Button variant="outline" size="sm" onClick={() => setSelectedAreaId(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />Volver a la vista anterior
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h1 className="page-title">Objetivos — {selectedArea.name}</h1>
            <p className="page-subtitle">
              {areaObjs.length} objetivos · {areaKpisList.length} indicadores
            </p>
          </div>
          {isSuperAdmin && (
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nuevo Objetivo</Button>
          )}
        </div>

        {/* Area header */}
        <div className="bg-card border rounded-xl shadow-sm px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">{selectedArea.name}</span>
              <StatusBadge status={selectedArea.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              — Líder: {getProfileName(profiles, selectedArea.leader_user_id)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-center gap-2">
              <ProgressBar value={areaProgress} className="w-24" />
              <span className="text-xs font-semibold text-muted-foreground">{areaProgress}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{areaObjs.length} obj · {areaKpisList.length} ind</p>
          </div>
        </div>

        {/* Collapsible subarea cards */}
        <div className="space-y-3">
          {/* Direct area objectives */}
          {directAreaObjs.length > 0 && (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="flex items-center">
                <button
                  onClick={() => toggleArea(`obj-area-${selectedArea.id}`)}
                  className="flex-1 flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                >
                  {expandedAreas[`obj-area-${selectedArea.id}`] ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                  <Layers className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{selectedArea.name}</span>
                      <StatusBadge status={selectedArea.status} />
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Target className="w-3 h-3" />{directAreaObjs.length}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      — Líder: {getProfileName(profiles, selectedArea.leader_user_id)}
                    </p>
                  </div>
                </button>
              </div>
              {expandedAreas[`obj-area-${selectedArea.id}`] && (
                <div className="border-t bg-muted/20 px-5 py-4 space-y-3">
                  {directAreaObjs.map((obj, idx) => {
                    const objKpis2 = kpis.filter(k => k.objective_id === obj.id);
                    const isOpen = expandedObj[obj.id];
                    return (
                      <ObjectiveCard key={obj.id} obj={obj} index={idx + 1} objKpis={objKpis2} isOpen={isOpen}
                        onToggle={() => toggleObj(obj.id)} onEdit={() => openEdit(obj)} onNewKPI={(month) => openNewKPI(obj.id, month)} onEditKPI={(k, month) => openEditKPI(k, month)}
                          onDelete={() => setObjToDelete(obj)} onDeleteKPI={(k) => setKpiToDelete(k)}
                          profiles={profiles} areas={areas} subareas={subareas} measurements={measurements} canEdit={isSuperAdmin} canEditKpi={canEditKpi} canDelete={isSuperAdmin} />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Subarea collapsible cards */}
          {areaSubareas.map(sub => {
            const subObjs = getSubareaObjs(sub.id);
            const subProgress = subObjs.length > 0
              ? Math.round(subObjs.reduce((s, o) => s + Math.min(getObjProgress(o), 100), 0) / subObjs.length)
              : 0;
            const isSubExpanded = expandedAreas[`obj-sub-${sub.id}`];

            return (
              <div key={sub.id} className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="flex items-center">
                  <button
                    onClick={() => toggleArea(`obj-sub-${sub.id}`)}
                    className="flex-1 flex items-center gap-4 px-5 py-3 pl-14 hover:bg-muted/30 transition-colors text-left"
                  >
                    {isSubExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{sub.name}</span>
                        <StatusBadge status={sub.status} />
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Target className="w-3 h-3" />{subObjs.length}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        — Líder: {getProfileName(profiles, sub.leader_user_id)}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 mr-2">
                      <ProgressBar value={subProgress} className="w-20" />
                      <span className="text-xs font-semibold text-muted-foreground">{subProgress}%</span>
                    </div>
                  </button>
                </div>
                {isSubExpanded && (
                  <div className="border-t bg-muted/20 px-5 py-4 space-y-3">
                    {subObjs.map((obj, idx) => {
                      const objKpis2 = kpis.filter(k => k.objective_id === obj.id);
                      const isOpen = expandedObj[obj.id];
                      return (
                        <ObjectiveCard key={obj.id} obj={obj} index={idx + 1} objKpis={objKpis2} isOpen={isOpen}
                          onToggle={() => toggleObj(obj.id)} onEdit={() => openEdit(obj)} onNewKPI={(month) => openNewKPI(obj.id, month)} onEditKPI={(k, month) => openEditKPI(k, month)}
                          onDelete={() => setObjToDelete(obj)} onDeleteKPI={(k) => setKpiToDelete(k)}
                          profiles={profiles} areas={areas} subareas={subareas} measurements={measurements} canEdit={isSuperAdmin} canEditKpi={canEditKpi} canDelete={isSuperAdmin} />
                      );
                    })}
                    {subObjs.length === 0 && (
                      <div className="text-center py-8 text-sm text-muted-foreground bg-muted/20 rounded-lg">
                        Sin objetivos registrados
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <ObjetivoFormDialog open={dialogOpen} onOpenChange={setDialogOpen} objective={editingObj} areas={areas} subareas={subareas} profiles={profiles} />
        <KPIFormDialog open={kpiDialogOpen} onOpenChange={setKpiDialogOpen} kpi={editingKPI} objectives={objectives} areas={areas} subareas={subareas} preselectedObjectiveId={preselectedObjectiveId} />
      </div>
    );
  }

  // Main view
  return (
    <div className="animate-fade-in space-y-8">
      {/* Dashboard — Recursos Humanos */}
      <section className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setDashboardExpanded(!dashboardExpanded)}
          className="w-full px-5 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
        >
          {dashboardExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
          <LayoutDashboard className="w-5 h-5 text-primary" />
          <div className="flex-1 text-left">
            <h1 className="text-base font-bold">Dashboard — Recursos Humanos</h1>
            <p className="text-xs text-muted-foreground">% de avance de Objetivos e Indicadores por área</p>
          </div>
        </button>
        {dashboardExpanded && (
          <div className="border-t px-5 py-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Área</label>
                <SearchableSelect
                  options={[{ value: '__all__', label: 'Todas las áreas' }, ...areas.map(a => ({ value: a.id, label: a.name }))]}
                  value={dashAreaId}
                  onValueChange={(v) => { setDashAreaId(v); setDashSubareaId('__all__'); }}
                  placeholder="Selecciona un área"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Subárea</label>
                <SearchableSelect
                  options={[{ value: '__all__', label: 'Todas las subáreas' }, ...dashSubareaOptions.map(s => ({ value: s.id, label: s.name }))]}
                  value={dashSubareaId}
                  onValueChange={setDashSubareaId}
                  placeholder="Selecciona una subárea"
                  disabled={dashAreaId === '__all__' || dashSubareaOptions.length === 0}
                />
              </div>
            </div>
            {dashboardChartData.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground bg-muted/30 rounded-lg">
                No hay datos para mostrar con los filtros seleccionados
              </div>
            ) : (
              <div className="w-full" style={{ height: Math.max(280, dashboardChartData.length * 48 + 80) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardChartData} layout="vertical" margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" width={180} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="Objetivos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="Objetivos" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                    </Bar>
                    <Bar dataKey="Indicadores" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="Indicadores" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </section>

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
          {isSuperAdmin && (
            <Button size="sm" variant="outline" className="ml-2" onClick={(e) => { e.stopPropagation(); openNew(); }}>
              <Plus className="w-4 h-4 mr-1" />Nuevo
            </Button>
          )}
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
                  objKpis={(isSuperAdmin || canEditKpi) ? objKpis : []}
                  isOpen={isOpen}
                  onToggle={() => toggleObj(obj.id)}
                  onEdit={() => openEdit(obj)}
                  onNewKPI={(month) => openNewKPI(obj.id, month)}
                  onEditKPI={(k, month) => openEditKPI(k, month)}
                  onDelete={() => setObjToDelete(obj)}
                  onDeleteKPI={(k) => setKpiToDelete(k)}
                  profiles={profiles}
                  areas={areas}
                  subareas={subareas}
                  measurements={measurements}
                  showAreaTags
                  otherAreas={otherAreas}
                  canEdit={isSuperAdmin} canEditKpi={canEditKpi} canDelete={isSuperAdmin}
                  hideOwner={!isSuperAdmin}
                  hideExtras={!isSuperAdmin}
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
          <div className="flex items-center gap-2">
            {canDownload && (
            <Button variant="outline" size="sm" onClick={() => {
              const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
              const headers = ['Objetivo', 'Estado', 'Prioridad', 'Área', 'Subárea', 'Responsable', 'Indicador', 'Meta', 'Valor Actual', 'Unidad', 'Línea Base', 'Umbral Verde', 'Umbral Amarillo', 'Umbral Rojo', 'Semáforo', ...months];
              const rows: any[][] = [];
              objectives.forEach(obj => {
                const areaId = obj.scope_type === 'area' ? obj.scope_id : subareas.find(s => s.id === obj.scope_id)?.area_id ?? '';
                const subareaName = obj.scope_type === 'subarea' ? (subareas.find(s => s.id === obj.scope_id)?.name ?? '') : '';
                const areaName = getAreaNameFromList(areas, areaId);
                const ownerName = getProfileName(profiles, obj.owner_user_id);
                const objKpis = kpis.filter(k => k.objective_id === obj.id);
                if (objKpis.length === 0) {
                  rows.push([obj.title, obj.status, obj.priority, areaName, subareaName, ownerName, '', '', '', '', '', '', '', '', '', ...Array(12).fill('')]);
                } else {
                  objKpis.forEach(kpi => {
                    const light = getTrafficLight(kpi as any);
                    const currentYear = new Date().getFullYear();
                    const monthValues = months.map((_, mi) => {
                      const m = measurements.find(mm => mm.kpi_id === kpi.id && mm.period_date.startsWith(`${currentYear}-${String(mi + 1).padStart(2, '0')}`));
                      return m ? m.value : '';
                    });
                    rows.push([obj.title, obj.status, obj.priority, areaName, subareaName, ownerName, kpi.name, kpi.target, kpi.current_value, kpi.unit ?? '', kpi.baseline, kpi.threshold_green, kpi.threshold_yellow, kpi.threshold_red, light, ...monthValues]);
                  });
                }
              });
              const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
              ws['!cols'] = headers.map(() => ({ wch: 16 }));
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Objetivos');
              XLSX.writeFile(wb, `Objetivos_${new Date().getFullYear()}.xlsx`);
            }}>
              <Download className="w-4 h-4 mr-2" />Descargar Todo
            </Button>
            )}
            {canDownload && (
            <Button variant="ghost" size="sm" onClick={() => {
              const headers = ['Objetivo', 'Indicador', 'Meta', 'Responsable', 'Área', 'Subárea', 'Unidad', 'Línea Base', 'Umbral Verde', 'Umbral Amarillo', 'Umbral Rojo', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
              const example = ['Incrementar ventas', 'Ventas mensuales', '100', 'Juan Pérez', 'Comercial', '', 'unidades', '50', '90', '70', '50', '55', '60', '65', '70', '75', '80', '85', '88', '90', '92', '95', '100'];
              const ws = XLSX.utils.aoa_to_sheet([headers, example]);
              ws['!cols'] = headers.map(() => ({ wch: 16 }));
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
              XLSX.writeFile(wb, 'plantilla_objetivos.xlsx');
            }}>
              <Download className="w-4 h-4 mr-2" />Plantilla
            </Button>
            )}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
            {isSuperAdmin && (
              <Button variant="outline" size="sm" disabled={importing} onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />{importing ? 'Importando...' : 'Importar Excel'}
              </Button>
            )}
            {isSuperAdmin && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteAllOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2" />Eliminar Todo
              </Button>
            )}
          </div>
        </div>

        {importing && importProgress.total > 0 && (
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Importando objetivos e indicadores...</span>
              <span className="text-muted-foreground tabular-nums">
                {importProgress.current} / {importProgress.total} ({Math.round((importProgress.current / importProgress.total) * 100)}%)
              </span>
            </div>
            <Progress value={(importProgress.current / importProgress.total) * 100} />
          </div>
        )}

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
                    {/* Direct area objectives (not tied to a subarea) */}
                    {(() => {
                      const directObjs = objectives.filter(o => o.scope_type === 'area' && o.scope_id === area.id);
                      if (directObjs.length === 0) return null;
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            <Target className="w-3.5 h-3.5" />
                            Objetivos del Área
                          </div>
                          {directObjs.map((obj, idx) => {
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
                                onNewKPI={(month) => openNewKPI(obj.id, month)}
                                onEditKPI={(k, month) => openEditKPI(k, month)}
                                onDelete={() => setObjToDelete(obj)}
                                onDeleteKPI={(k) => setKpiToDelete(k)}
                                profiles={profiles}
                                areas={areas}
                                subareas={subareas}
                                measurements={measurements}
                                canEdit={isSuperAdmin} canEditKpi={canEditKpi} canDelete={isSuperAdmin}
                              />
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Cascade: Subareas → Objectives → KPIs */}
                    {areaSubareas.map(sub => {
                      const subObjs = objectives.filter(o => o.scope_type === 'subarea' && o.scope_id === sub.id);
                      const subProgress = subObjs.length > 0
                        ? Math.round(subObjs.reduce((s, o) => s + Math.min(getObjProgress(o), 100), 0) / subObjs.length)
                        : 0;
                      const subKey = `inline-sub-${sub.id}`;
                      const isSubExpanded = expandedAreas[subKey];
                      const subKpiCount = subObjs.reduce((acc, o) => acc + kpis.filter(k => k.objective_id === o.id).length, 0);

                      return (
                        <div key={sub.id} className="bg-muted/20 rounded-lg border overflow-hidden">
                          <button
                            onClick={() => toggleArea(subKey)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                          >
                            {isSubExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            <Layers className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{sub.name}</span>
                                <StatusBadge status={sub.status} />
                                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                  <Target className="w-3 h-3" />{subObjs.length}
                                </span>
                                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                  <BarChart3 className="w-3 h-3" />{subKpiCount}
                                </span>
                              </div>
                              {sub.leader_user_id && (
                                <p className="text-xs text-muted-foreground mt-0.5">— Líder: {getProfileName(profiles, sub.leader_user_id)}</p>
                              )}
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              <ProgressBar value={subProgress} className="w-20" />
                              <span className="text-xs font-semibold text-muted-foreground">{subProgress}%</span>
                            </div>
                          </button>
                          {isSubExpanded && (
                            <div className="border-t bg-card px-4 py-3 space-y-3">
                              {subObjs.map((obj, idx) => {
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
                                    onNewKPI={(month) => openNewKPI(obj.id, month)}
                                    onEditKPI={(k, month) => openEditKPI(k, month)}
                                    onDelete={() => setObjToDelete(obj)}
                                    onDeleteKPI={(k) => setKpiToDelete(k)}
                                    profiles={profiles}
                                    areas={areas}
                                    subareas={subareas}
                                    measurements={measurements}
                                    canEdit={isSuperAdmin} canEditKpi={canEditKpi} canDelete={isSuperAdmin}
                                  />
                                );
                              })}
                              {subObjs.length === 0 && (
                                <div className="text-center py-6 text-xs text-muted-foreground">Sin objetivos en esta subárea</div>
                              )}
                            </div>
                          )}
                        </div>
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
      <KPIFormDialog open={kpiDialogOpen} onOpenChange={setKpiDialogOpen} kpi={editingKPI} objectives={objectives} areas={areas} subareas={subareas} preselectedObjectiveId={preselectedObjectiveId} selectedMonth={kpiSelectedMonth} />

      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar todos los objetivos e indicadores?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente <strong>todos los objetivos, indicadores (KPIs) y mediciones</strong> registrados.
              Úsala solo si vas a realizar una importación desde cero. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAll}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteAll(); }}
              disabled={deletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAll ? 'Eliminando...' : 'Sí, eliminar todo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Reusable objective card with circular progress
function ObjectiveCard({
  obj, index, objKpis, isOpen, onToggle, onEdit, onNewKPI, onEditKPI, onDelete, onDeleteKPI, profiles, areas, subareas, measurements, showAreaTags, otherAreas, canEdit = false, canEditKpi = false, canDelete = false, hideOwner = false, hideExtras = false,
}: {
  obj: Tables<'objectives'>;
  index: number;
  objKpis: Tables<'kpis'>[];
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onNewKPI: (month?: string) => void;
  onEditKPI: (k: Tables<'kpis'>, month?: string) => void;
  onDelete?: () => void;
  onDeleteKPI?: (k: Tables<'kpis'>) => void;
  profiles: Tables<'profiles'>[];
  areas: Tables<'areas'>[];
  subareas: Tables<'subareas'>[];
  measurements?: Tables<'kpi_measurements'>[];
  showAreaTags?: boolean;
  otherAreas?: Tables<'areas'>[];
  canEdit?: boolean;
  canEditKpi?: boolean;
  canDelete?: boolean;
  hideOwner?: boolean;
  hideExtras?: boolean;
}) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [kpiEvidenceId, setKpiEvidenceId] = useState<string | null>(null);
  const [kpiEvidenceName, setKpiEvidenceName] = useState('');
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  const { data: kpiEvidenceRows = [] } = useEvidenceCountsByEntity('kpi');
  const { data: objEvidenceRows = [] } = useEvidenceCountsByEntity('objective');
  const objEvidenceCount = useMemo(
    () => objEvidenceRows.filter(r => r.entity_id === obj.id).length,
    [objEvidenceRows, obj.id]
  );
  const getKpiEvidenceCount = (kpiId: string) => {
    return kpiEvidenceRows.filter(r => {
      if (r.entity_id !== kpiId) return false;
      if (selectedMonth === 'total') return true;
      return (r.period ?? '').startsWith(selectedMonth);
    }).length;
  };

  // Build months for the current year
  const kpiIds = objKpis.map(k => k.id);
  const relevantMeasurements = (measurements ?? []).filter(m => kpiIds.includes(m.kpi_id));
  const currentYear = new Date().getFullYear();
  const availableMonths = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const mm = String(i + 1).padStart(2, '0');
      return `${currentYear}-${mm}`;
    });
    months.push('total');
    return months;
  }, [currentYear]);

  const monthLabels: Record<string, string> = {
    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
    '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
  };

  const getMonthLabel = (ym: string) => {
    if (ym === 'total') return 'Total KPI';
    const [year, month] = ym.split('-');
    return `${monthLabels[month] ?? month} ${year}`;
  };

  // Financial KPIs (by unit) accumulate as SUM, others as AVERAGE (fallback when calc_method is not set)
  const isFinancialKpi = (k: { unit?: string | null }) => {
    const u = (k.unit ?? '').toString().trim().toLowerCase();
    if (!u) return false;
    return /\$|cop|usd|eur|mxn|pesos?|d[oó]lares?|facturaci[oó]n|ingreso|venta|ventas|costo|gasto/.test(u);
  };

  // Format a numeric value for display: currency-aware (Spanish locale: 1.234,56)
  const formatKpiValue = (value: number | null | undefined, k: { unit?: string | null }) => {
    if (value === null || value === undefined || isNaN(Number(value))) return '—';
    const num = Number(value);
    if (isFinancialKpi(k)) {
      const formatted = new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: 0,
      }).format(num);
      return `$ ${formatted}`;
    }
    const formatted = new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: 2,
    }).format(num);
    return `${formatted}${k.unit ? ` ${k.unit}` : ''}`;
  };

  const qcLocal = useQueryClient();
  const updateCalcMethod = async (kpiId: string, method: 'promedio' | 'suma') => {
    const { error } = await supabase.from('kpis').update({ calc_method: method } as any).eq('id', kpiId);
    if (error) {
      toast.error('No se pudo actualizar el método de cálculo');
      return;
    }
    qcLocal.invalidateQueries({ queryKey: ['kpis'] });
    await logActivity('update', 'kpi_calc_method', kpiId, { method });
    toast.success(`Cálculo actualizado a ${method === 'suma' ? 'Suma total' : 'Promedio'}`);
  };

  const getCalcMethod = (k: any): 'promedio' | 'suma' => {
    if (k?.calc_method === 'suma' || k?.calc_method === 'promedio') return k.calc_method;
    return isFinancialKpi(k) ? 'suma' : 'promedio';
  };

  // Inline-save the "Valor Real" for the currently selected month
  const saveKpiMonthValue = async (kpiId: string, raw: string) => {
    if (selectedMonth === 'total') return;
    const trimmed = (raw ?? '').toString().trim();
    const periodDate = `${selectedMonth}-01`;
    const existing = relevantMeasurements.find(
      m => m.kpi_id === kpiId && m.period_date.startsWith(selectedMonth)
    );

    if (trimmed === '') {
      if (existing) {
        const { error } = await supabase.from('kpi_measurements').delete().eq('id', existing.id);
        if (error) { toast.error('No se pudo eliminar el valor'); return; }
        qcLocal.invalidateQueries({ queryKey: ['kpi_measurements'] });
        await logActivity('delete', 'kpi_measurement', kpiId, { period: selectedMonth });
        toast.success('Valor eliminado');
      }
      return;
    }

    // Accept "1.234,56" or "1234.56" formats
    const normalized = trimmed.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    const value = Number(normalized);
    if (!isFinite(value)) { toast.error('Valor inválido'); return; }
    if (existing && Number(existing.value) === value) return;

    if (existing) {
      const { error } = await supabase.from('kpi_measurements').update({ value }).eq('id', existing.id);
      if (error) { toast.error('No se pudo actualizar el valor'); return; }
    } else {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id ?? null;
      const { error } = await supabase.from('kpi_measurements').insert({
        kpi_id: kpiId, period_date: periodDate, value, created_by: userId,
      } as any);
      if (error) { toast.error('No se pudo guardar el valor'); return; }
    }
    qcLocal.invalidateQueries({ queryKey: ['kpi_measurements'] });
    await logActivity('update', 'kpi_measurement', kpiId, { period: selectedMonth, value });
    toast.success('Valor guardado');
  };

  // Get KPI accumulated value up to current month in current year (sum for financial, average otherwise)
  const getKpiAccumulatedAverage = (kpiId: string) => {
    const kpi = objKpis.find(k => k.id === kpiId);
    const elapsed = new Date().getMonth() + 1;
    const winEnd = Math.min(elapsed, 11);
    const winMonths = Math.max(0, winEnd - 2 + 1);
    const kpiMeasurements = relevantMeasurements.filter(m => {
      if (m.kpi_id !== kpiId) return false;
      const measurementDate = new Date(m.period_date);
      const mo = measurementDate.getMonth() + 1;
      return measurementDate.getFullYear() === currentYear && mo >= 2 && mo <= winEnd;
    });
    if (kpiMeasurements.length === 0) return null;
    const sumValue = kpiMeasurements.reduce((sum, m) => sum + Number(m.value), 0);
    const method = kpi ? getCalcMethod(kpi) : 'promedio';
    const accumulated = method === 'suma' ? sumValue : sumValue / (winMonths || 1);
    return Math.round(accumulated * 100) / 100;
  };

  // Count measured months in current year up to elapsedMonths (used to scale accumulated target)
  const getKpiMeasuredMonthsCount = (kpiId: string) => {
    const elapsed = new Date().getMonth() + 1;
    const winEnd = Math.min(elapsed, 11);
    return relevantMeasurements.filter(m => {
      if (m.kpi_id !== kpiId) return false;
      const d = new Date(m.period_date);
      const mo = d.getMonth() + 1;
      return d.getFullYear() === currentYear && mo >= 2 && mo <= winEnd;
    }).length;
  };

  // Accumulated target: for SUM-method KPIs, multiply monthly target by number of measured months.
  // For AVG-method KPIs the target stays as the monthly target (comparable to the average).
  const getKpiAccumulatedTarget = (k: any) => {
    const method = getCalcMethod(k);
    if (method !== 'suma') return Number(k.target) || 0;
    const n = getKpiMeasuredMonthsCount(k.id);
    return (Number(k.target) || 0) * (n > 0 ? n : 1);
  };

  // Get KPI value for a given month (or accumulated average up to date for 'total')
  const getKpiMonthValue = (kpiId: string) => {
    if (selectedMonth === 'total') {
      return getKpiAccumulatedAverage(kpiId);
    }
    const m = relevantMeasurements.find(m => m.kpi_id === kpiId && m.period_date.startsWith(selectedMonth));
    return m ? m.value : null;
  };

  // Get per-month target for a KPI (falls back to KPI default target)
  const getKpiMonthTarget = (k: any) => {
    if (selectedMonth === 'total') return Number(k.target) || 0;
    const m = relevantMeasurements.find(m => m.kpi_id === k.id && m.period_date.startsWith(selectedMonth));
    const t = (m as any)?.target;
    return (t === null || t === undefined) ? (Number(k.target) || 0) : Number(t);
  };

  // Progress: accumulated average up to date / target
  const elapsedMonths = new Date().getMonth() + 1;
  const computedProgress = useMemo(() => {
    if (objKpis.length === 0) return obj.progress_percent;

    const values = objKpis.map(k => {
      const accumulatedAverage = getKpiAccumulatedAverage(k.id);
      if (accumulatedAverage === null) return null;
      const tgt = getKpiAccumulatedTarget(k);
      return tgt > 0 ? (accumulatedAverage / tgt) * 100 : 0;
    }).filter((v): v is number => v !== null);

    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [objKpis, obj.progress_percent, relevantMeasurements, currentYear, elapsedMonths]);

  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (Math.min(computedProgress, 100) / 100) * circumference;
  const progressColor = computedProgress >= 70 ? 'hsl(var(--success))' : computedProgress >= 40 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';

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
          {!hideOwner && obj.owner_user_id && (
            <p className="text-xs text-muted-foreground">Responsable: {getProfileName(profiles, obj.owner_user_id)}</p>
          )}
          {!hideOwner && !obj.owner_user_id && obj.scope_type === 'area' && (
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
            {!hideExtras && objKpis.length > 0 && (
              <button onClick={onToggle} className="flex items-center gap-1 text-xs text-accent font-medium hover:underline">
                {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {objKpis.length} indicadores
              </button>
            )}
            {canEdit && (
              <button onClick={() => onNewKPI(selectedMonth)} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                <Plus className="w-3 h-3" /> Indicador
              </button>
            )}
            {!hideExtras && (
              <button onClick={() => setEvidenceOpen(true)} className="flex items-center gap-1 text-xs text-muted-foreground font-medium hover:underline hover:text-foreground">
                <Paperclip className="w-3 h-3" /> Evidencias
                {objEvidenceCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none">
                    {objEvidenceCount}
                  </span>
                )}
              </button>
            )}
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

        {canEdit && (
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onEdit}>
            <Edit className="w-4 h-4" />
          </Button>
        )}
      </div>

      {!hideExtras && isOpen && objKpis.length > 0 && (
        <div className="border-t bg-muted/20 px-5 py-3">
          {/* Month tabs */}
          {objKpis.length > 0 && (
            <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mr-1" />
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
                <th className="text-center py-1">Peso %</th>
                <th className="text-left py-1">Meta</th>
                <th className="text-left py-1">Valor Real</th>
                <th className="text-center py-1">Prom. Acumulado</th>
                <th className="text-center py-1">Cálculo</th>
                <th className="text-left py-1">Semáforo</th>
                <th className="text-right py-1"></th>
              </tr>
            </thead>
            <tbody>
              {objKpis.map(k => {
                const monthValue = getKpiMonthValue(k.id);
                const displayValue = monthValue ?? 0;
                const isTotalView = selectedMonth === 'total';
                const calcMethod = getCalcMethod(k);
                const accumulatedTarget = getKpiAccumulatedTarget(k);
                // Meta column shows the per-month target (or KPI default target if no per-month value set)
                const displayTarget = getKpiMonthTarget(k);
                // Traffic light still compares against accumulated target on total view (sum method)
                const lightTarget = isTotalView && calcMethod === 'suma' ? accumulatedTarget : displayTarget;
                const kpiForLight = { ...k, current_value: displayValue, target: lightTarget };
                const weight = (k as any).weight_percent ?? 0;
                const cumulativeAvg = getKpiAccumulatedAverage(k.id);
                return (
                  <tr key={k.id} className="border-t border-border/50">
                    <td className="py-2 font-medium">{k.name}</td>
                    <td className="py-2 text-center">
                      {weight > 0 ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent">{weight}%</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2">{formatKpiValue(displayTarget, k)}</td>
                    <td className="py-2">
                      {isTotalView || !(canEdit || canEditKpi) ? (
                        monthValue === null
                          ? <span className="text-muted-foreground italic">Sin dato</span>
                          : <>{formatKpiValue(displayValue, k)}</>
                      ) : (
                        <input
                          key={`${k.id}-${selectedMonth}-${monthValue ?? ''}`}
                          type="text"
                          inputMode="decimal"
                          defaultValue={monthValue === null ? '' : String(monthValue)}
                          placeholder="Sin dato"
                          onBlur={(e) => {
                            const v = e.target.value;
                            const orig = monthValue === null ? '' : String(monthValue);
                            if (v.trim() !== orig.trim()) saveKpiMonthValue(k.id, v);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') {
                              (e.target as HTMLInputElement).value = monthValue === null ? '' : String(monthValue);
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="w-28 rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      )}
                    </td>
                    <td className="py-2 text-center">
                      {cumulativeAvg !== null
                        ? <span className="font-semibold">{formatKpiValue(cumulativeAvg, k)}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="py-2 text-center">
                      <select
                        value={getCalcMethod(k)}
                        onChange={(e) => updateCalcMethod(k.id, e.target.value as 'promedio' | 'suma')}
                        disabled={!canEdit}
                        className="text-xs rounded-md border border-border bg-background px-2 py-1 disabled:opacity-60"
                      >
                        <option value="promedio">Promedio</option>
                        <option value="suma">Suma total</option>
                      </select>
                    </td>
                    <td className="py-2">
                      {monthValue === null
                        ? <span className="text-muted-foreground">—</span>
                        : <TrafficLightBadge light={getTrafficLight(kpiForLight as any)} />
                      }
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 relative" onClick={() => { setKpiEvidenceId(k.id); setKpiEvidenceName(k.name); }}>
                          <Paperclip className="w-3 h-3" />
                          {(() => {
                            const c = getKpiEvidenceCount(k.id);
                            return c > 0 ? (
                              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold leading-none">
                                {c}
                              </span>
                            ) : null;
                          })()}
                        </Button>
                        {(canEdit || canEditKpi) && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditKPI(k, selectedMonth)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td className="py-2 font-semibold text-sm">Promedio General:</td>
                <td className="py-2 text-center font-semibold text-xs">
                  {(() => {
                    const totalWeight = objKpis.reduce((s, k) => s + ((k as any).weight_percent ?? 0), 0);
                    return totalWeight > 0 ? `${totalWeight}%` : '—';
                  })()}
                </td>
                <td></td>
                <td className="py-2 font-bold text-sm">
                  {(() => {
                    const values = objKpis.map(k => {
                      const monthValue = getKpiMonthValue(k.id);
                      if (monthValue === null) return null;
                      return k.target > 0 ? (monthValue / k.target) * 100 : 0;
                    }).filter((v): v is number => v !== null);
                    const avg = values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
                    return `${avg}%`;
                  })()}
                </td>
                <td className="py-2 text-center font-bold text-sm">
                  {(() => {
                    // Overall cumulative percentage across all KPIs (uses accumulated target for SUM-method KPIs)
                    const ratios = objKpis.map(k => {
                      const acc = getKpiAccumulatedAverage(k.id);
                      if (acc === null) return null;
                      const tgt = getKpiAccumulatedTarget(k);
                      return tgt > 0 ? (acc / tgt) * 100 : 0;
                    }).filter((v): v is number => v !== null);
                    const avg = ratios.length > 0 ? Math.round(ratios.reduce((s, v) => s + v, 0) / ratios.length) : 0;
                    return `${avg}%`;
                  })()}
                </td>
                <td></td>
                <td className="py-2">
                  {(() => {
                    const values = objKpis.map(k => {
                      const monthValue = getKpiMonthValue(k.id);
                      if (monthValue === null) return null;
                      return k.target > 0 ? (monthValue / k.target) * 100 : 0;
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
          entityName={`${kpiEvidenceName} — ${getMonthLabel(selectedMonth)}`}
          period={selectedMonth}
          open={!!kpiEvidenceId}
          onOpenChange={(open) => { if (!open) setKpiEvidenceId(null); }}
        />
      )}
    </div>
  );
}
