import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAreas, useSubareas, usePositions } from '@/hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Pencil, Trash2, Search, SlidersHorizontal, ArrowUp, ArrowDown, Table, BarChart3, Eye, EyeOff, History } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AspirantesTab from '@/components/AspirantesTab';
import AssessmentDashboardTab from '@/components/AssessmentDashboardTab';

type Assessment = {
  id: string;
  candidate_name: string;
  candidate_id?: string | null;
  area_id: string | null;
  subarea_id: string | null;
  position: string | null;
  profession: string | null;
  weighted_score: number | null;
  evaluation_date: string;
  created_by: string | null;
};

type Competency = {
  id: string;
  name: string;
  subtitle: string | null;
  behavior: string | null;
  position_name: string | null;
  sort_order: number;
  is_active: boolean;
};

type CompScore = {
  id: string;
  evaluation_id: string;
  competency_id: string;
  score: number | null;
};

const SCORE_OPTIONS = [
  { value: 0, label: '0 · No tiene la competencia', short: '0', color: 'bg-destructive/15 text-destructive border-destructive/40' },
  { value: 1, label: '1 · Competencia deficiente', short: '1', color: 'bg-orange-500/15 text-orange-700 border-orange-500/40' },
  { value: 3, label: '3 · Cumple con la competencia', short: '3', color: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/40' },
  { value: 5, label: '5 · Excede la competencia', short: '5', color: 'bg-green-500/15 text-green-700 border-green-500/40' },
] as const;

const ALL_POSITIONS = '__all__';

function calcWeighted(values: (number | null | undefined)[], total: number): number | null {
  const vals = values.filter((v): v is number => v !== null && v !== undefined);
  if (vals.length === 0 || total === 0) return null;
  return Math.round((vals.reduce((s, v) => s + v, 0) / (total * 5)) * 100 * 100) / 100;
}

function scoreBadge(pct: number | null) {
  if (pct === null) return <span className="text-muted-foreground text-xs">—</span>;
  let cls = 'bg-destructive/15 text-destructive';
  if (pct >= 80) cls = 'bg-green-500/15 text-green-700';
  else if (pct >= 60) cls = 'bg-yellow-500/15 text-yellow-700';
  else if (pct >= 40) cls = 'bg-orange-500/15 text-orange-700';
  return <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${cls}`}>{pct.toFixed(0)}%</span>;
}

const emptyForm = {
  candidate_name: '',
  profession: '',
  area_id: '' as string,
  subarea_id: '' as string,
  position: '',
  evaluation_date: new Date().toISOString().split('T')[0],
};

const emptyComp = {
  name: '',
  subtitle: '',
  behavior: '',
  position_name: ALL_POSITIONS,
  is_active: true,
};

export default function SeleccionDesarrolloPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: positions = [] } = usePositions();

  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formScores, setFormScores] = useState<Record<string, number | null>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('aspirantes');

  // Competency manager state
  const [compOpen, setCompOpen] = useState(false);
  const [compEditing, setCompEditing] = useState<Competency | null>(null);
  const [compForm, setCompForm] = useState({ ...emptyComp });
  const [compSaving, setCompSaving] = useState(false);
  const [compDeleteId, setCompDeleteId] = useState<string | null>(null);
  const [expandedBehaviors, setExpandedBehaviors] = useState<Record<string, boolean>>({});


  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['assessment_evaluations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_evaluations' as any)
        .select('*')
        .order('evaluation_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown) as Assessment[];
    },
  });

  const { data: competencies = [] } = useQuery({
    queryKey: ['assessment_competencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_competencies' as any)
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as unknown) as Competency[];
    },
  });

  const { data: compScores = [] } = useQuery({
    queryKey: ['assessment_competency_scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_competency_scores' as any)
        .select('*');
      if (error) throw error;
      return (data as unknown) as CompScore[];
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ['assessment_candidates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_candidates' as any)
        .select('id, full_name, status');
      if (error) throw error;
      return (data as unknown) as { id: string; full_name: string; status: string }[];
    },
  });

  const areaName = (id: string | null) => areas.find(a => a.id === id)?.name ?? '—';
  const subareaName = (id: string | null) => subareas.find(s => s.id === id)?.name ?? '';

  const activeCompetencies = useMemo(
    () => competencies.filter(c => c.is_active),
    [competencies],
  );

  // Competencies applicable to a given position (global ones + position-specific)
  const compsForPosition = (position: string | null) =>
    activeCompetencies.filter(c => !c.position_name || c.position_name === position);

  // Competencias efectivas de una evaluación: las seleccionadas al iniciar el assessment
  // (filas existentes en scores), o por defecto las del cargo.
  const compsOfRow = (row: Assessment) => {
    const ids = compScores.filter(s => s.evaluation_id === row.id).map(s => s.competency_id);
    if (ids.length) return activeCompetencies.filter(c => ids.includes(c.id));
    return compsForPosition(row.position);
  };

  const scoreOf = (evaluationId: string, competencyId: string) =>
    compScores.find(s => s.evaluation_id === evaluationId && s.competency_id === competencyId)?.score ?? null;

  const filteredSubareas = useMemo(
    () => (form.area_id ? subareas.filter(s => s.area_id === form.area_id) : []),
    [subareas, form.area_id],
  );

  const filteredPositions = useMemo(() => {
    if (!form.area_id) return positions;
    return positions.filter((p: any) =>
      p.area_id === form.area_id && (!form.subarea_id || !p.subarea_id || p.subarea_id === form.subarea_id),
    );
  }, [positions, form.area_id, form.subarea_id]);

  const filtered = useMemo(() => {
    let r = rows;
    if (filterArea !== 'all') r = r.filter(x => x.area_id === filterArea);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x =>
        x.candidate_name.toLowerCase().includes(q) ||
        (x.position ?? '').toLowerCase().includes(q),
      );
    }
    return r;
  }, [rows, filterArea, search]);

  // Competencies shown as rows in a grid: union of those applicable to its aspirants
  const compsForRows = (rowsIn: Assessment[]) => {
    const ids = new Set<string>();
    rowsIn.forEach(row => compsOfRow(row).forEach(c => ids.add(c.id)));
    return activeCompetencies.filter(c => ids.has(c.id));
  };

  // Agrupar por convocatoria: fecha del assessment. Una misma convocatoria puede
  // incluir varios cargos, perfiles, áreas y subáreas en una sola planilla.
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; positions: string[]; areas: string[]; position: string | null; area_id: string | null; subarea_id: string | null; rows: Assessment[] }>();
    filtered.forEach(row => {
      const key = `${row.evaluation_date ?? '—'}`;
      if (!map.has(key)) {
        map.set(key, { key, positions: [], areas: [], position: row.position, area_id: row.area_id, subarea_id: row.subarea_id, rows: [] });
      }
      const g = map.get(key)!;
      g.rows.push(row);
      const p = row.position?.trim();
      if (p && !g.positions.includes(p)) g.positions.push(p);
      const a = `${areaName(row.area_id)}${row.subarea_id ? ` / ${subareaName(row.subarea_id)}` : ''}`;
      if (a && !g.areas.includes(a)) g.areas.push(a);
    });
    return Array.from(map.values()).map(g => ({
      ...g,
      position: g.positions.length ? g.positions.join(' · ') : null,
      areasLabel: g.areas.length ? g.areas.join(' · ') : 'Sin área',
    }));
  }, [filtered, areas, subareas]);


  // Un aspirante está "completado" cuando su ficha quedó en estado evaluado
  const isRowCompleted = (row: Assessment) => {
    const c = candidates.find(x =>
      (row.candidate_id && x.id === row.candidate_id) ||
      (!row.candidate_id && x.full_name === row.candidate_name),
    );
    return c?.status === 'evaluado';
  };

  const activeGroups = useMemo(
    () => groups.filter(g => !g.rows.every(isRowCompleted)),
    [groups, candidates],
  );
  const historyGroups = useMemo(
    () => groups.filter(g => g.rows.every(isRowCompleted)),
    [groups, candidates],
  );

  const [detailGroupKey, setDetailGroupKey] = useState<string | null>(null);
  const detailGroup = historyGroups.find(g => g.key === detailGroupKey) ?? null;

  const [completing, setCompleting] = useState<string | null>(null);

  const completeGroup = async (rowsIn: Assessment[], key: string) => {
    const names = rowsIn.map(r => r.candidate_name);
    const ids = rowsIn.map(r => r.candidate_id).filter(Boolean) as string[];
    setCompleting(key);
    let error: any = null;
    if (ids.length) {
      ({ error } = await (supabase.from('assessment_candidates' as any) as any)
        .update({ status: 'evaluado' }).in('id', ids));
    } else {
      ({ error } = await (supabase.from('assessment_candidates' as any) as any)
        .update({ status: 'evaluado' }).in('full_name', names));
    }
    setCompleting(null);
    if (error) return toast.error(error.message);
    toast.success('Evaluación completada');
    qc.invalidateQueries({ queryKey: ['assessment_candidates'] });
    qc.invalidateQueries({ queryKey: ['assessment_evaluations'] });
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormScores({});
    setOpen(true);
  };

  const openEdit = (row: Assessment) => {
    setEditing(row);
    setForm({
      candidate_name: row.candidate_name,
      profession: row.profession ?? '',
      area_id: row.area_id ?? '',
      subarea_id: row.subarea_id ?? '',
      position: row.position ?? '',
      evaluation_date: row.evaluation_date,
    });
    const initial: Record<string, number | null> = {};
    compScores.filter(s => s.evaluation_id === row.id).forEach(s => { initial[s.competency_id] = s.score; });
    setFormScores(initial);
    setOpen(true);
  };

  const formCompetencies = useMemo(
    () => compsForPosition(form.position || null),
    [activeCompetencies, form.position],
  );

  const livePct = calcWeighted(
    formCompetencies.map(c => formScores[c.id]),
    formCompetencies.length,
  );

  const persistScores = async (evaluationId: string) => {
    const rowsToSave = formCompetencies.map(c => ({
      evaluation_id: evaluationId,
      competency_id: c.id,
      score: formScores[c.id] ?? null,
    }));
    if (rowsToSave.length === 0) return;
    const { error } = await (supabase.from('assessment_competency_scores' as any) as any)
      .upsert(rowsToSave, { onConflict: 'evaluation_id,competency_id' });
    if (error) toast.error('Error guardando competencias: ' + error.message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.candidate_name.trim()) return toast.error('Ingresa el nombre del aspirante');

    const payload = {
      candidate_name: form.candidate_name.trim(),
      profession: form.profession || null,
      area_id: form.area_id || null,
      subarea_id: form.subarea_id || null,
      position: form.position || null,
      weighted_score: livePct,
      evaluation_date: form.evaluation_date,
      evaluator_user_id: user?.id ?? null,
    };

    setSaving(true);
    if (editing) {
      const { error } = await (supabase.from('assessment_evaluations' as any) as any)
        .update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      await persistScores(editing.id);
      toast.success('Evaluación actualizada');
    } else {
      const { data, error } = await (supabase.from('assessment_evaluations' as any) as any)
        .insert({ ...payload, created_by: user?.id ?? null }).select('id').single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      await persistScores((data as any).id);
      toast.success('Evaluación registrada');
    }
    setSaving(false);
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['assessment_evaluations'] });
    qc.invalidateQueries({ queryKey: ['assessment_competency_scores'] });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase.from('assessment_evaluations' as any) as any)
      .delete().eq('id', deleteId);
    if (error) return toast.error(error.message);
    toast.success('Evaluación eliminada');
    setDeleteId(null);
    qc.invalidateQueries({ queryKey: ['assessment_evaluations'] });
    qc.invalidateQueries({ queryKey: ['assessment_competency_scores'] });
  };

  // Inline update of a single competency score for a given aspirant
  const updateScore = async (row: Assessment, competencyId: string, value: number | null) => {
    const applicable = compsOfRow(row);
    const nextValues = applicable.map(c =>
      c.id === competencyId ? value : scoreOf(row.id, c.id),
    );
    const weighted = calcWeighted(nextValues, applicable.length);

    const { error } = await (supabase.from('assessment_competency_scores' as any) as any)
      .upsert({ evaluation_id: row.id, competency_id: competencyId, score: value }, { onConflict: 'evaluation_id,competency_id' });
    if (error) { toast.error(error.message); return; }

    await (supabase.from('assessment_evaluations' as any) as any)
      .update({ weighted_score: weighted }).eq('id', row.id);

    qc.invalidateQueries({ queryKey: ['assessment_competency_scores'] });
    qc.invalidateQueries({ queryKey: ['assessment_evaluations'] });
  };

  // ---- Competency CRUD ----
  const openCompNew = () => {
    setCompEditing(null);
    setCompForm({ ...emptyComp });
  };

  const openCompEdit = (c: Competency) => {
    setCompEditing(c);
    setCompForm({
      name: c.name,
      subtitle: c.subtitle ?? '',
      behavior: c.behavior ?? '',
      position_name: c.position_name ?? ALL_POSITIONS,
      is_active: c.is_active,
    });
  };

  const saveCompetency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compForm.name.trim()) return toast.error('Ingresa el nombre de la competencia');
    setCompSaving(true);
    const payload = {
      name: compForm.name.trim(),
      subtitle: compForm.subtitle.trim() || null,
      behavior: compForm.behavior.trim() || null,
      position_name: compForm.position_name === ALL_POSITIONS ? null : compForm.position_name,
      is_active: compForm.is_active,
    };
    if (compEditing) {
      const { error } = await (supabase.from('assessment_competencies' as any) as any)
        .update(payload).eq('id', compEditing.id);
      if (error) { toast.error(error.message); setCompSaving(false); return; }
      toast.success('Competencia actualizada');
    } else {
      const nextOrder = (competencies.reduce((m, c) => Math.max(m, c.sort_order), 0) || 0) + 1;
      const { error } = await (supabase.from('assessment_competencies' as any) as any)
        .insert({ ...payload, sort_order: nextOrder, created_by: user?.id ?? null });
      if (error) { toast.error(error.message); setCompSaving(false); return; }
      toast.success('Competencia creada');
    }
    setCompSaving(false);
    setCompEditing(null);
    setCompForm({ ...emptyComp });
    qc.invalidateQueries({ queryKey: ['assessment_competencies'] });
  };

  const confirmCompDelete = async () => {
    if (!compDeleteId) return;
    const { error } = await (supabase.from('assessment_competencies' as any) as any)
      .delete().eq('id', compDeleteId);
    if (error) return toast.error(error.message);
    toast.success('Competencia eliminada');
    setCompDeleteId(null);
    qc.invalidateQueries({ queryKey: ['assessment_competencies'] });
    qc.invalidateQueries({ queryKey: ['assessment_competency_scores'] });
  };

  const moveCompetency = async (c: Competency, dir: -1 | 1) => {
    const idx = competencies.findIndex(x => x.id === c.id);
    const target = competencies[idx + dir];
    if (!target) return;
    await (supabase.from('assessment_competencies' as any) as any)
      .update({ sort_order: target.sort_order }).eq('id', c.id);
    await (supabase.from('assessment_competencies' as any) as any)
      .update({ sort_order: c.sort_order }).eq('id', target.id);
    qc.invalidateQueries({ queryKey: ['assessment_competencies'] });
  };

  const toggleCompActive = async (c: Competency) => {
    await (supabase.from('assessment_competencies' as any) as any)
      .update({ is_active: !c.is_active }).eq('id', c.id);
    qc.invalidateQueries({ queryKey: ['assessment_competencies'] });
  };

  const ScoreCell = ({ row, competencyId, disabled }: { row: Assessment; competencyId: string; disabled?: boolean }) => {
    const val = scoreOf(row.id, competencyId);
    const opt = SCORE_OPTIONS.find(o => o.value === val);
    if (disabled) return <span className="text-xs text-muted-foreground">No aplica</span>;
    return (
      <Select
        value={val === null || val === undefined ? '__none__' : String(val)}
        onValueChange={(v) => updateScore(row, competencyId, v === '__none__' ? null : Number(v))}
      >
        <SelectTrigger
          className={`h-8 w-full justify-center font-bold text-xs md:h-9 md:text-sm border ${
            opt ? opt.color : 'bg-background text-muted-foreground'
          }`}
        >
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">—</SelectItem>
          {SCORE_OPTIONS.map(o => (
            <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-3 md:space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Selección y Desarrollo</h1>
            <p className="text-sm text-muted-foreground">
              Planilla de Evaluación Assessment Center — Aspirantes por área y cargo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" onClick={() => { setCompOpen(true); openCompNew(); }}>
            <SlidersHorizontal className="w-4 h-4 mr-1" /> Competencias
          </Button>
          <Button variant="success" onClick={() => setActiveTab('planilla')}>
            <Table className="w-4 h-4 mr-1" /> Planilla Assessment
          </Button>
          <Button variant="warning" onClick={() => setActiveTab('dashboard')}>
            <BarChart3 className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <Button variant="info" onClick={() => setActiveTab('historico')}>
            <History className="w-4 h-4 mr-1" /> Histórico
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="gap-1">
          <TabsTrigger
            value="aspirantes"
            className="bg-primary/10 text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Aspirantes
          </TabsTrigger>
          <TabsTrigger
            value="historico"
            className="bg-info/10 text-info data-[state=active]:bg-info data-[state=active]:text-info-foreground"
          >
            Histórico
          </TabsTrigger>
          <TabsTrigger
            value="dashboard"
            className="bg-warning/10 text-warning data-[state=active]:bg-warning data-[state=active]:text-warning-foreground"
          >
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aspirantes">
          <AspirantesTab onAssessmentStarted={() => setActiveTab('planilla')} />
        </TabsContent>

        <TabsContent value="historico" className="space-y-3">
          {historyGroups.length === 0 ? (
            <Card className="p-0 overflow-hidden">
              <div className="py-10 text-center text-muted-foreground text-sm">
                Aún no hay convocatorias con evaluación completada.
              </div>
            </Card>
          ) : (
            historyGroups.map(group => (
              <Card key={group.key} className="p-4 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-base font-bold leading-tight">
                    Convocatoria: {group.positions.length ? group.positions.join(' · ') : 'Sin cargo definido'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Áreas: {group.areasLabel} · {group.rows.length} aspirante(s) · Completada
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setDetailGroupKey(group.key)}>
                  <Eye className="w-4 h-4 mr-1" /> Ver detalles
                </Button>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="dashboard">
          <AssessmentDashboardTab />
        </TabsContent>

        <TabsContent value="planilla" className="space-y-4">
      <Card className="p-3 md:p-4 bg-muted/30 space-y-2">
        <h2 className="text-sm font-semibold">Método de evaluación</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {SCORE_OPTIONS.map(o => (
            <div key={o.value} className={`rounded-md border px-2 py-1.5 ${o.color}`}>
              <span className="font-bold">{o.value}</span> · {o.label.replace(`${o.value} · `, '')}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground pt-1">
          Las competencias son autogestionables: puedes crearlas, editarlas, ordenarlas o asignarlas a un cargo específico desde el botón <b>Competencias</b>. La nota ponderada es el promedio de las competencias aplicables sobre 5, expresado en %.
        </p>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Buscar aspirante o cargo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por área" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las áreas</SelectItem>
            {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card className="p-0 overflow-hidden">
          <div className="py-10 text-center text-muted-foreground text-sm">Cargando...</div>
        </Card>
      ) : activeGroups.length === 0 ? (
        <Card className="p-0 overflow-hidden">
          <div className="py-10 text-center text-muted-foreground text-sm">
            No hay convocatorias en evaluación. Las completadas están en el botón "Histórico".
          </div>
        </Card>
      ) : (
        activeGroups.map(group => {
          const gridCompetencies = compsForRows(group.rows);
          const filtered = group.rows;
          return (
          <Card key={group.key} className="p-0 overflow-hidden">
            {/* Título de la convocatoria */}
            <div className="flex items-start justify-between gap-3 flex-wrap px-4 py-3 border-b bg-muted/20">
              <div>
                <h3 className="text-base font-bold leading-tight">
                  Convocatoria: {group.positions.length ? group.positions.join(' · ') : 'Sin cargo definido'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Áreas: {group.areasLabel} · {group.rows.length} aspirante(s)
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => completeGroup(group.rows, group.key)}
                disabled={completing === group.key}
              >
                {completing === group.key ? 'Completando...' : 'Completar Evaluación'}
              </Button>
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="sticky left-0 z-20 bg-muted/40 text-left px-3 py-2 md:px-4 md:py-3 w-[200px] min-w-[180px] md:w-[260px] md:min-w-[240px] lg:w-[280px] lg:min-w-[260px] border-r shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]">
                      Competencia
                    </th>
                    {filtered.map(row => (
                      <th key={row.id} className="text-left px-2 py-1.5 md:px-3 md:py-2 min-w-[140px] md:min-w-[160px] lg:min-w-[180px] border-r align-top">
                        <div className="flex items-start justify-between gap-1">
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-semibold text-xs md:text-sm leading-tight truncate">{row.candidate_name}</p>
                            <p className="text-[11px] text-muted-foreground leading-tight">{row.profession ?? '—'}</p>
                            <p className="text-[11px] text-muted-foreground leading-tight">{row.position ?? '—'}</p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(row)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteId(row.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gridCompetencies.length === 0 && (
                    <tr className="border-b">
                      <td colSpan={1 + filtered.length} className="px-2 py-4 md:px-3 md:py-6 text-center text-sm text-muted-foreground">
                        No hay competencias configuradas. Créalas desde el botón "Competencias".
                      </td>
                    </tr>
                  )}
                  {gridCompetencies.map(c => {
                    const isExpanded = !!expandedBehaviors[c.id];
                    return (
                      <tr key={c.id} className="border-b">
                        <td className="sticky left-0 z-20 bg-background px-3 py-2 md:px-4 md:py-3 border-r align-top shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-xs md:text-sm">{c.name}</p>
                              {c.subtitle && <p className="text-[10px] md:text-[11px] text-muted-foreground">{c.subtitle}</p>}
                              {c.position_name && (
                                <p className="text-[10px] text-muted-foreground italic mt-0.5">Cargo: {c.position_name}</p>
                              )}
                            </div>
                            {c.behavior && (
                              <button
                                type="button"
                                onClick={() => setExpandedBehaviors(prev => ({ ...prev, [c.id]: !isExpanded }))}
                                className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground"
                                title={isExpanded ? 'Ocultar comportamientos' : 'Ver comportamientos observables'}
                              >
                                {isExpanded ? <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                              </button>
                            )}
                          </div>
                          {isExpanded && c.behavior && (
                            <div className="mt-2 text-[11px] md:text-xs text-muted-foreground leading-snug border-t pt-2">
                              {c.behavior}
                            </div>
                          )}
                        </td>
                        {filtered.map(row => {
                          const applies = compsOfRow(row).some(x => x.id === c.id);
                          return (
                            <td key={row.id} className="px-1.5 py-1.5 md:px-2 md:py-2 border-r">
                              <ScoreCell row={row} competencyId={c.id} disabled={!applies} />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr className="bg-muted/30">
                    <td className="sticky left-0 z-20 bg-muted/30 px-3 py-2 md:px-4 md:py-3 border-r font-semibold shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]">
                      Nota ponderada
                    </td>
                    {filtered.map(row => (
                      <td key={row.id} className="px-2 py-1.5 md:px-3 md:py-2 border-r text-center">
                        {scoreBadge(row.weighted_score !== null ? Number(row.weighted_score) : null)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="sticky left-0 z-20 bg-background px-3 py-2 md:px-4 md:py-3 border-r text-xs text-muted-foreground shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]">
                      Fecha
                    </td>
                    {filtered.map(row => (
                      <td key={row.id} className="px-2 py-1.5 md:px-3 md:py-2 border-r text-xs text-muted-foreground">
                        {row.evaluation_date}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden divide-y">
              {filtered.map(row => (
                <div key={row.id} className="p-3 md:p-4 space-y-2 md:space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{row.candidate_name}</p>
                      <p className="text-[11px] text-muted-foreground">{row.profession ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(row)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteId(row.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {compsOfRow(row).map(c => {
                      const isExpanded = !!expandedBehaviors[c.id];
                      return (
                        <div key={c.id} className="border rounded-md p-2 space-y-1 md:p-2.5 md:space-y-1.5 bg-muted/20">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-[11px] md:text-xs min-w-0">{c.name}</p>
                            {c.behavior && (
                              <button
                                type="button"
                                onClick={() => setExpandedBehaviors(prev => ({ ...prev, [c.id]: !isExpanded }))}
                                className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground"
                                title={isExpanded ? 'Ocultar comportamientos' : 'Ver comportamientos observables'}
                              >
                                {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                          {isExpanded && c.behavior && (
                            <p className="text-[10px] md:text-xs text-muted-foreground leading-snug">{c.behavior}</p>
                          )}
                          <ScoreCell row={row} competencyId={c.id} />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">Nota ponderada</span>
                    {scoreBadge(row.weighted_score !== null ? Number(row.weighted_score) : null)}
                  </div>
                  <p className="text-[10px] md:text-[11px] text-muted-foreground">Fecha: {row.evaluation_date}</p>
                </div>
              ))}
            </div>
          </Card>
          );
        })
      )}
        </TabsContent>
      </Tabs>

      {/* Detalle histórico */}
      <Dialog open={!!detailGroup} onOpenChange={o => !o && setDetailGroupKey(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Convocatoria: {detailGroup?.positions.length ? detailGroup.positions.join(' · ') : 'Sin cargo definido'}
            </DialogTitle>
            <DialogDescription>
              {detailGroup
                ? `Áreas: ${detailGroup.areasLabel} · ${detailGroup.rows.length} aspirante(s)`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {detailGroup && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-2 py-1.5 md:px-3 md:py-2 border-r min-w-[160px] md:min-w-[200px]">Competencia</th>
                    {detailGroup.rows.map(row => (
                      <th key={row.id} className="text-left px-2 py-1.5 md:px-3 md:py-2 border-r min-w-[130px] md:min-w-[160px]">
                        <p className="font-semibold text-xs md:text-sm">{row.candidate_name}</p>
                        <p className="text-[10px] md:text-[11px] font-normal text-muted-foreground">{row.profession ?? '—'}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compsForRows(detailGroup.rows).map(c => (
                    <tr key={c.id} className="border-b">
                      <td className="px-2 py-1.5 md:px-3 md:py-2 border-r align-top">
                        <p className="font-semibold text-xs md:text-sm">{c.name}</p>
                        {c.subtitle && <p className="text-[10px] md:text-[11px] text-muted-foreground">{c.subtitle}</p>}
                      </td>
                      {detailGroup.rows.map(row => {
                        const s = scoreOf(row.id, c.id);
                        const opt = SCORE_OPTIONS.find(o => o.value === s);
                        return (
                          <td key={row.id} className="px-3 py-2 border-r">
                            {opt
                              ? <span className={`inline-flex px-2 py-1 rounded-md border text-xs font-medium ${opt.color}`}>{opt.label}</span>
                              : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="bg-muted/30">
                    <td className="px-2 py-1.5 md:px-3 md:py-2 border-r font-semibold">Nota ponderada</td>
                    {detailGroup.rows.map(row => (
                      <td key={row.id} className="px-2 py-1.5 md:px-3 md:py-2 border-r">
                        {scoreBadge(row.weighted_score !== null ? Number(row.weighted_score) : null)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 border-r text-xs text-muted-foreground">Fecha</td>
                    {detailGroup.rows.map(row => (
                      <td key={row.id} className="px-2 py-1.5 md:px-3 md:py-2 border-r text-xs text-muted-foreground">
                        {row.evaluation_date}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Aspirant dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar evaluación' : 'Nueva evaluación Assessment Center'}</DialogTitle>
            <DialogDescription>Registra al aspirante y califica cada competencia.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Nombre del aspirante *</label>
                <Input
                  value={form.candidate_name}
                  onChange={e => setForm(f => ({ ...f, candidate_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Profesión</label>
                <Input
                  value={form.profession}
                  onChange={e => setForm(f => ({ ...f, profession: e.target.value }))}
                  placeholder="Ej. Ingeniero Industrial"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Área</label>
                <Select
                  value={form.area_id || undefined}
                  onValueChange={v => setForm(f => ({ ...f, area_id: v, subarea_id: '', position: '' }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona un área" /></SelectTrigger>
                  <SelectContent>
                    {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Subárea</label>
                <Select
                  value={form.subarea_id || undefined}
                  onValueChange={v => setForm(f => ({ ...f, subarea_id: v }))}
                  disabled={!form.area_id}
                >
                  <SelectTrigger><SelectValue placeholder={form.area_id ? 'Selecciona una subárea' : 'Selecciona un área primero'} /></SelectTrigger>
                  <SelectContent>
                    {filteredSubareas.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cargo al que aplica</label>
                <Select
                  value={form.position || undefined}
                  onValueChange={v => setForm(f => ({ ...f, position: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona un cargo" /></SelectTrigger>
                  <SelectContent>
                    {filteredPositions.map((p: any) => (
                      <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fecha</label>
                <Input
                  type="date"
                  value={form.evaluation_date}
                  onChange={e => setForm(f => ({ ...f, evaluation_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Competencias</h3>
              {formCompetencies.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No hay competencias activas para este cargo. Configúralas en el botón "Competencias".
                </p>
              )}
              <div className="space-y-2">
                {formCompetencies.map(c => (
                  <div key={c.id} className="border rounded-md p-3 space-y-2 bg-muted/20">
                    <div className="flex items-baseline justify-between flex-wrap gap-1">
                      <div>
                        <p className="text-sm font-semibold">{c.name}</p>
                        {c.subtitle && <p className="text-xs text-muted-foreground">{c.subtitle}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SCORE_OPTIONS.map(opt => {
                        const active = formScores[c.id] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFormScores(s => ({ ...s, [c.id]: active ? null : opt.value }))}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                              active
                                ? `${opt.color} ring-2 ring-offset-1`
                                : 'bg-background text-muted-foreground border-border hover:bg-muted'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm text-muted-foreground">Nota ponderada</span>
                <span className="text-lg font-bold">{scoreBadge(livePct)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Competency manager dialog */}
      <Dialog open={compOpen} onOpenChange={o => { setCompOpen(o); if (!o) { setCompEditing(null); setCompForm({ ...emptyComp }); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestionar competencias</DialogTitle>
            <DialogDescription>
              Crea, edita, ordena o desactiva las competencias del Assessment Center. Puedes dejarlas generales o asociarlas a un cargo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={saveCompetency} className="space-y-3 border rounded-md p-3 bg-muted/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Competencia *</label>
                <Input value={compForm.name} onChange={e => setCompForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Subtítulo</label>
                <Input value={compForm.subtitle} onChange={e => setCompForm(f => ({ ...f, subtitle: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Comportamientos observables</label>
                <Textarea rows={3} value={compForm.behavior} onChange={e => setCompForm(f => ({ ...f, behavior: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Aplica al cargo</label>
                <Select value={compForm.position_name} onValueChange={v => setCompForm(f => ({ ...f, position_name: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_POSITIONS}>Todos los cargos</SelectItem>
                    {positions.map((p: any) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Estado</label>
                <Select value={compForm.is_active ? 'activo' : 'inactivo'} onValueChange={v => setCompForm(f => ({ ...f, is_active: v === 'activo' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activa</SelectItem>
                    <SelectItem value="inactivo">Inactiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {compEditing && (
                <Button type="button" variant="outline" onClick={openCompNew}>Cancelar edición</Button>
              )}
              <Button type="submit" disabled={compSaving}>
                {compSaving ? 'Guardando...' : compEditing ? 'Actualizar competencia' : 'Agregar competencia'}
              </Button>
            </div>
          </form>

          <div className="divide-y border rounded-md">
            {competencies.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground text-center">Aún no hay competencias.</p>
            )}
            {competencies.map((c, i) => (
              <div key={c.id} className="p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {c.name}
                    {!c.is_active && <span className="ml-2 text-[10px] uppercase text-muted-foreground border rounded px-1">Inactiva</span>}
                  </p>
                  {c.subtitle && <p className="text-xs text-muted-foreground">{c.subtitle}</p>}
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Cargo: {c.position_name ?? 'Todos'}
                  </p>
                  {c.behavior && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{c.behavior}</p>}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} onClick={() => moveCompetency(c, -1)}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === competencies.length - 1} onClick={() => moveCompetency(c, 1)}>
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleCompActive(c)}>
                    {c.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCompEdit(c)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCompDeleteId(c.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar evaluación?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!compDeleteId} onOpenChange={o => !o && setCompDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar competencia?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán también las calificaciones registradas para esta competencia. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCompDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}