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
import { Users, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Assessment = {
  id: string;
  candidate_name: string;
  area_id: string | null;
  subarea_id: string | null;
  position: string | null;
  score_creatividad: number | null;
  score_trabajo_equipo: number | null;
  score_pensamiento_analitico: number | null;
  weighted_score: number | null;
  evaluation_date: string;
  notes: string | null;
  created_by: string | null;
};

const SCORE_OPTIONS = [
  { value: 0, label: '0 · No tiene la competencia', short: '0', color: 'bg-destructive/15 text-destructive border-destructive/40' },
  { value: 1, label: '1 · Competencia deficiente', short: '1', color: 'bg-orange-500/15 text-orange-700 border-orange-500/40' },
  { value: 3, label: '3 · Cumple con la competencia', short: '3', color: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/40' },
  { value: 5, label: '5 · Excede la competencia', short: '5', color: 'bg-green-500/15 text-green-700 border-green-500/40' },
] as const;

const COMPETENCIAS = [
  { key: 'score_creatividad' as const, label: 'Creatividad', sub: 'Experiencia WOW' },
  { key: 'score_trabajo_equipo' as const, label: 'Trabajo en equipo', sub: 'Empatía y colaboración' },
  { key: 'score_pensamiento_analitico' as const, label: 'Pensamiento analítico', sub: 'Comunicación y análisis' },
] as const;

type ScoreKey = typeof COMPETENCIAS[number]['key'];

function calcWeighted(a: number | null, b: number | null, c: number | null): number | null {
  const vals = [a, b, c].filter((v): v is number => v !== null && v !== undefined);
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((s, v) => s + v, 0) / (vals.length * 5)) * 100 * 100) / 100;
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
  area_id: '' as string,
  subarea_id: '' as string,
  position: '',
  score_creatividad: null as number | null,
  score_trabajo_equipo: null as number | null,
  score_pensamiento_analitico: null as number | null,
  evaluation_date: new Date().toISOString().split('T')[0],
  notes: '',
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
  const [saving, setSaving] = useState(false);

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

  const areaName = (id: string | null) => areas.find(a => a.id === id)?.name ?? '—';
  const subareaName = (id: string | null) => subareas.find(s => s.id === id)?.name ?? '';

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

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (row: Assessment) => {
    setEditing(row);
    setForm({
      candidate_name: row.candidate_name,
      area_id: row.area_id ?? '',
      subarea_id: row.subarea_id ?? '',
      position: row.position ?? '',
      score_creatividad: row.score_creatividad,
      score_trabajo_equipo: row.score_trabajo_equipo,
      score_pensamiento_analitico: row.score_pensamiento_analitico,
      evaluation_date: row.evaluation_date,
      notes: row.notes ?? '',
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.candidate_name.trim()) return toast.error('Ingresa el nombre del aspirante');

    const weighted = calcWeighted(
      form.score_creatividad,
      form.score_trabajo_equipo,
      form.score_pensamiento_analitico,
    );

    const payload = {
      candidate_name: form.candidate_name.trim(),
      area_id: form.area_id || null,
      subarea_id: form.subarea_id || null,
      position: form.position || null,
      score_creatividad: form.score_creatividad,
      score_trabajo_equipo: form.score_trabajo_equipo,
      score_pensamiento_analitico: form.score_pensamiento_analitico,
      weighted_score: weighted,
      evaluation_date: form.evaluation_date,
      notes: form.notes || null,
      evaluator_user_id: user?.id ?? null,
    };

    setSaving(true);
    if (editing) {
      const { error } = await (supabase.from('assessment_evaluations' as any) as any)
        .update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Evaluación actualizada');
    } else {
      const { error } = await (supabase.from('assessment_evaluations' as any) as any)
        .insert({ ...payload, created_by: user?.id ?? null });
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Evaluación registrada');
    }
    setSaving(false);
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['assessment_evaluations'] });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase.from('assessment_evaluations' as any) as any)
      .delete().eq('id', deleteId);
    if (error) return toast.error(error.message);
    toast.success('Evaluación eliminada');
    setDeleteId(null);
    qc.invalidateQueries({ queryKey: ['assessment_evaluations'] });
  };

  const livePct = calcWeighted(
    form.score_creatividad,
    form.score_trabajo_equipo,
    form.score_pensamiento_analitico,
  );

  // Inline update of a single competency score for a given aspirant
  const updateScore = async (row: Assessment, key: ScoreKey, value: number | null) => {
    const next = { ...row, [key]: value } as Assessment;
    const weighted = calcWeighted(
      next.score_creatividad,
      next.score_trabajo_equipo,
      next.score_pensamiento_analitico,
    );
    // Optimistic update
    qc.setQueryData<Assessment[]>(['assessment_evaluations'], (prev) =>
      (prev ?? []).map(r => r.id === row.id ? { ...next, weighted_score: weighted } : r),
    );
    const { error } = await (supabase.from('assessment_evaluations' as any) as any)
      .update({ [key]: value, weighted_score: weighted })
      .eq('id', row.id);
    if (error) {
      toast.error(error.message);
      qc.invalidateQueries({ queryKey: ['assessment_evaluations'] });
    }
  };

  const ScoreCell = ({ row, k }: { row: Assessment; k: ScoreKey }) => {
    const val = row[k];
    const opt = SCORE_OPTIONS.find(o => o.value === val);
    return (
      <Select
        value={val === null || val === undefined ? '__none__' : String(val)}
        onValueChange={(v) => updateScore(row, k, v === '__none__' ? null : Number(v))}
      >
        <SelectTrigger
          className={`h-9 w-full justify-center font-bold text-sm border ${
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
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Selección y Desarrollo</h1>
            <p className="text-sm text-muted-foreground">
              Planilla de Evaluación Assessment Center — Aspirantes por área y cargo
            </p>
          </div>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo aspirante
        </Button>
      </div>

      <Card className="p-4 bg-muted/30 space-y-2">
        <h2 className="text-sm font-semibold">Método de evaluación</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {SCORE_OPTIONS.map(o => (
            <div key={o.value} className={`rounded-md border px-2 py-1.5 ${o.color}`}>
              <span className="font-bold">{o.value}</span> · {o.label.replace(`${o.value} · `, '')}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground pt-1">
          Competencias evaluadas: <b>Creatividad (Experiencia WOW)</b>, <b>Trabajo en equipo</b> y <b>Pensamiento analítico</b>. La nota ponderada es el promedio de las 3 competencias sobre 5 expresado en %.
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

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-10 text-center text-muted-foreground text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            No hay aspirantes. Crea el primero con "Nuevo aspirante".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="sticky left-0 z-10 bg-muted/40 text-left px-3 py-2 w-[240px] min-w-[240px] border-r">
                    Competencia
                  </th>
                  {filtered.map(row => (
                    <th key={row.id} className="text-left px-3 py-2 min-w-[190px] border-r align-top">
                      <div className="flex items-start justify-between gap-1">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-sm leading-tight">{row.candidate_name}</p>
                          <p className="text-[11px] text-muted-foreground leading-tight">
                            {areaName(row.area_id)}{row.subarea_id ? ` · ${subareaName(row.subarea_id)}` : ''}
                          </p>
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
                {COMPETENCIAS.map(c => (
                  <tr key={c.key} className="border-b">
                    <td className="sticky left-0 z-10 bg-background px-3 py-2 border-r align-top">
                      <p className="font-semibold text-sm">{c.label}</p>
                      <p className="text-[11px] text-muted-foreground">{c.sub}</p>
                    </td>
                    {filtered.map(row => (
                      <td key={row.id} className="px-2 py-2 border-r">
                        <ScoreCell row={row} k={c.key} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-muted/30">
                  <td className="sticky left-0 z-10 bg-muted/30 px-3 py-2 border-r font-semibold">
                    Nota ponderada
                  </td>
                  {filtered.map(row => (
                    <td key={row.id} className="px-3 py-2 border-r text-center">
                      {scoreBadge(row.weighted_score !== null ? Number(row.weighted_score) : null)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky left-0 z-10 bg-background px-3 py-2 border-r text-xs text-muted-foreground">
                    Fecha
                  </td>
                  {filtered.map(row => (
                    <td key={row.id} className="px-3 py-2 border-r text-xs text-muted-foreground">
                      {row.evaluation_date}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
              <div className="space-y-2">
                {COMPETENCIAS.map(c => (
                  <div key={c.key} className="border rounded-md p-3 space-y-2 bg-muted/20">
                    <div className="flex items-baseline justify-between flex-wrap gap-1">
                      <div>
                        <p className="text-sm font-semibold">{c.label}</p>
                        <p className="text-xs text-muted-foreground">{c.sub}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SCORE_OPTIONS.map(opt => {
                        const active = form[c.key] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, [c.key]: active ? null : opt.value }))}
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

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notas</label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            </DialogFooter>
          </form>
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
    </div>
  );
}