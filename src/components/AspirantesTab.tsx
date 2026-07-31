import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAreas, useSubareas, usePositions, useProfiles, useUserRoles } from '@/hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Search, UserCheck, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const NONE = '__none__';

type Candidate = {
  id: string;
  full_name: string;
  document_id: string | null;
  phone: string | null;
  email: string | null;
  position: string | null;
  area_id: string | null;
  subarea_id: string | null;
  evaluator_user_id: string | null;
  application_date: string;
  status: string;
  notes: string | null;
};

type CandidateComp = { id: string; candidate_id: string; competency_id: string };

type Competency = {
  id: string; name: string; subtitle: string | null; position_name: string | null; is_active: boolean;
};

const STATUSES = [
  { value: 'pendiente', label: 'Pendiente', cls: 'bg-sky-500 text-white border border-sky-600' },
  { value: 'en_evaluacion', label: 'En evaluación', cls: 'bg-amber-400 text-amber-950 border border-amber-500' },
  { value: 'evaluado', label: 'Evaluado', cls: 'bg-emerald-500 text-white border border-emerald-600' },
  { value: 'descartado', label: 'Descartado', cls: 'bg-red-500 text-white border border-red-600' },
];

const emptyForm = {
  full_name: '',
  document_id: '',
  phone: '',
  email: '',
  position: NONE,
  area_id: NONE,
  subarea_id: NONE,
  evaluator_user_id: NONE,
  application_date: new Date().toISOString().split('T')[0],
  status: 'pendiente',
};

export default function AspirantesTab({ onAssessmentStarted }: { onAssessmentStarted?: () => void } = {}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: positions = [] } = usePositions();
  const { data: profiles = [] } = useProfiles();
  const { data: userRoles = [] } = useUserRoles();

  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [selectedComps, setSelectedComps] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Iniciar Assessment (selección múltiple)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startOpen, setStartOpen] = useState(false);
  const [startComps, setStartComps] = useState<string[]>([]);
  const [startEvaluator, setStartEvaluator] = useState<string>(NONE);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [starting, setStarting] = useState(false);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['assessment_candidates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_candidates' as any)
        .select('*')
        .order('application_date', { ascending: false });
      if (error) throw error;
      return (data as unknown) as Candidate[];
    },
  });

  const { data: candidateComps = [] } = useQuery({
    queryKey: ['assessment_candidate_competencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_candidate_competencies' as any)
        .select('*');
      if (error) throw error;
      return (data as unknown) as CandidateComp[];
    },
  });

  const { data: competencies = [] } = useQuery({
    queryKey: ['assessment_competencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_competencies' as any)
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as unknown) as Competency[];
    },
  });

  const activeComps = useMemo(() => competencies.filter(c => c.is_active), [competencies]);

  // Evaluators: leaders / area managers / area admins
  const evaluatorOptions = useMemo(() => {
    const allowed = new Set(['admin_area', 'gestor_area', 'lider_subarea', 'super_admin']);
    const ids = new Set(userRoles.filter((r: any) => allowed.has(r.role)).map((r: any) => r.user_id));
    return profiles
      .filter((p: any) => ids.has(p.id))
      .map((p: any) => ({ value: p.id, label: `${p.name}${p.position ? ` · ${p.position}` : ''}` }));
  }, [profiles, userRoles]);

  const areaName = (id: string | null) => areas.find(a => a.id === id)?.name ?? '—';
  const subareaName = (id: string | null) => subareas.find(s => s.id === id)?.name ?? '';
  const profileName = (id: string | null) => (id ? (profiles.find((p: any) => p.id === id)?.name ?? '—') : '—');

  const filteredSubareas = useMemo(
    () => (form.area_id !== NONE ? subareas.filter(s => s.area_id === form.area_id) : []),
    [subareas, form.area_id],
  );

  const filteredPositions = useMemo(() => {
    if (form.area_id === NONE) return positions;
    return positions.filter((p: any) =>
      p.area_id === form.area_id && (form.subarea_id === NONE || !p.subarea_id || p.subarea_id === form.subarea_id));
  }, [positions, form.area_id, form.subarea_id]);

  const filtered = useMemo(() => {
    let r = candidates;
    if (filterArea !== 'all') r = r.filter(c => c.area_id === filterArea);
    if (filterStatus !== 'all') r = r.filter(c => c.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(c =>
        c.full_name.toLowerCase().includes(q) ||
        (c.position ?? '').toLowerCase().includes(q) ||
        (c.document_id ?? '').toLowerCase().includes(q));
    }
    return r;
  }, [candidates, filterArea, filterStatus, search]);

  const compsOf = (candidateId: string) =>
    candidateComps
      .filter(cc => cc.candidate_id === candidateId)
      .map(cc => competencies.find(c => c.id === cc.competency_id))
      .filter(Boolean) as Competency[];

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setSelectedComps([]);
    setOpen(true);
  };

  const openEdit = (c: Candidate) => {
    setEditing(c);
    setForm({
      full_name: c.full_name,
      document_id: c.document_id ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      position: c.position ?? NONE,
      area_id: c.area_id ?? NONE,
      subarea_id: c.subarea_id ?? NONE,
      evaluator_user_id: c.evaluator_user_id ?? NONE,
      application_date: c.application_date,
      status: c.status,
    });
    setSelectedComps(candidateComps.filter(cc => cc.candidate_id === c.id).map(cc => cc.competency_id));
    setOpen(true);
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['assessment_candidates'] });
    qc.invalidateQueries({ queryKey: ['assessment_candidate_competencies'] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        document_id: form.document_id.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        position: form.position === NONE ? null : form.position,
        area_id: form.area_id === NONE ? null : form.area_id,
        subarea_id: form.subarea_id === NONE ? null : form.subarea_id,
        evaluator_user_id: form.evaluator_user_id === NONE ? null : form.evaluator_user_id,
        application_date: form.application_date,
        status: form.status,
      };

      let candidateId = editing?.id ?? '';
      if (editing) {
        const { error } = await supabase.from('assessment_candidates' as any).update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('assessment_candidates' as any)
          .insert(payload as any)
          .select('id')
          .single();
        if (error) throw error;
        candidateId = (data as any).id;
      }

      // Sync selected competencies
      const current = candidateComps.filter(cc => cc.candidate_id === candidateId).map(cc => cc.competency_id);
      const toAdd = selectedComps.filter(id => !current.includes(id));
      const toRemove = current.filter(id => !selectedComps.includes(id));
      if (toAdd.length) {
        const { error } = await supabase
          .from('assessment_candidate_competencies' as any)
          .insert(toAdd.map(id => ({ candidate_id: candidateId, competency_id: id })) as any);
        if (error) throw error;
      }
      if (toRemove.length) {
        const { error } = await supabase
          .from('assessment_candidate_competencies' as any)
          .delete()
          .eq('candidate_id', candidateId)
          .in('competency_id', toRemove);
        if (error) throw error;
      }

      toast.success(editing ? 'Aspirante actualizado' : 'Aspirante registrado');
      invalidate();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('assessment_candidates' as any).delete().eq('id', deleteId);
    if (error) toast.error(error.message);
    else { toast.success('Aspirante eliminado'); invalidate(); }
    setDeleteId(null);
  };

  const statusBadge = (s: string) => {
    const st = STATUSES.find(x => x.value === s) ?? STATUSES[0];
    return <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${st.cls}`}>{st.label}</span>;
  };

  const selectedCands = useMemo(
    () => candidates.filter(c => selectedIds.includes(c.id)),
    [candidates, selectedIds],
  );

  const toggleSelected = (id: string, checked: boolean) =>
    setSelectedIds(prev => (checked ? [...new Set([...prev, id])] : prev.filter(x => x !== id)));

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selectedIds.includes(c.id));

  const openStart = () => {
    if (selectedCands.length === 0) return;
    const base = selectedCands[0];
    const assigned = candidateComps.filter(cc => cc.candidate_id === base.id).map(cc => cc.competency_id);
    setStartComps(assigned.length
      ? assigned
      : activeComps.filter(k => !k.position_name || k.position_name === base.position).map(k => k.id));
    setStartEvaluator(base.evaluator_user_id ?? NONE);
    setStartDate(new Date().toISOString().split('T')[0]);
    setStartOpen(true);
  };

  const startForCandidate = async (cand: Candidate) => {
    const { error: upErr } = await supabase
      .from('assessment_candidates' as any)
      .update({ evaluator_user_id: startEvaluator, status: 'en_evaluacion' })
      .eq('id', cand.id);
    if (upErr) throw upErr;

    const current = candidateComps.filter(cc => cc.candidate_id === cand.id).map(cc => cc.competency_id);
    const toAdd = startComps.filter(id => !current.includes(id));
    const toRemove = current.filter(id => !startComps.includes(id));
    if (toAdd.length) {
      const { error } = await supabase
        .from('assessment_candidate_competencies' as any)
        .insert(toAdd.map(id => ({ candidate_id: cand.id, competency_id: id })) as any);
      if (error) throw error;
    }
    if (toRemove.length) {
      const { error } = await supabase
        .from('assessment_candidate_competencies' as any)
        .delete()
        .eq('candidate_id', cand.id)
        .in('competency_id', toRemove);
      if (error) throw error;
    }

    const { data: existing } = await supabase
      .from('assessment_evaluations' as any)
      .select('id')
      .eq('candidate_id', cand.id)
      .maybeSingle();

    const payload = {
      candidate_id: cand.id,
      candidate_name: cand.full_name,
      area_id: cand.area_id,
      subarea_id: cand.subarea_id,
      position: cand.position,
      evaluation_date: startDate,
      evaluator_user_id: startEvaluator,
    };

    let evaluationId = (existing as any)?.id as string | undefined;
    if (evaluationId) {
      const { error } = await supabase.from('assessment_evaluations' as any).update(payload as any).eq('id', evaluationId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('assessment_evaluations' as any)
        .insert({ ...payload, created_by: user?.id ?? null } as any)
        .select('id')
        .single();
      if (error) throw error;
      evaluationId = (data as any).id;
    }

    const { error: scErr } = await (supabase.from('assessment_competency_scores' as any) as any)
      .upsert(startComps.map(id => ({ evaluation_id: evaluationId, competency_id: id })),
        { onConflict: 'evaluation_id,competency_id', ignoreDuplicates: true });
    if (scErr) throw scErr;

    if (toRemove.length) {
      await supabase.from('assessment_competency_scores' as any)
        .delete().eq('evaluation_id', evaluationId).in('competency_id', toRemove);
    }
  };

  const handleStartAssessment = async () => {
    if (selectedCands.length === 0) return toast.error('Selecciona al menos un aspirante');
    if (startComps.length === 0) return toast.error('Selecciona al menos una competencia');
    if (startEvaluator === NONE) return toast.error('Asigna el líder que evaluará las competencias');
    setStarting(true);
    try {
      for (const cand of selectedCands) {
        await startForCandidate(cand);
      }

      toast.success(`Assessment iniciado para ${selectedCands.length} aspirante(s)`);
      invalidate();
      qc.invalidateQueries({ queryKey: ['assessment_evaluations'] });
      qc.invalidateQueries({ queryKey: ['assessment_competency_scores'] });
      setStartOpen(false);
      setSelectedIds([]);
      onAssessmentStarted?.();
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo iniciar el assessment');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Recursos Humanos registra los aspirantes, asigna el líder o gestor de área evaluador y selecciona las competencias a evaluar.
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Registrar aspirante</Button>
          <Button variant="outline" onClick={openStart} disabled={selectedIds.length === 0}>
            <PlayCircle className="w-4 h-4 mr-1" />
            Iniciar Assessment{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="Buscar aspirante, cargo o documento..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Área" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las áreas</SelectItem>
            {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No hay aspirantes registrados.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b text-left">
                    <th className="px-3 py-2">Aspirante</th>
                    <th className="px-3 py-2">Cargo / Área</th>
                    <th className="px-3 py-2">Evaluador asignado</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2 w-[230px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b align-top">
                      <td className="px-3 py-2">
                        <p className="font-semibold">{c.full_name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.document_id ?? '—'}</p>
                        {c.email && <p className="text-[11px] text-muted-foreground">{c.email}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <p>{c.position ?? '—'}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {areaName(c.area_id)}{c.subarea_id ? ` · ${subareaName(c.subarea_id)}` : ''}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
                          {profileName(c.evaluator_user_id)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{c.application_date}</td>
                      <td className="px-3 py-2">{statusBadge(c.status)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-0.5">
                          <Button variant="outline" size="sm" className="h-7 text-[11px] mr-1" onClick={() => openStart(c)}>
                            <PlayCircle className="w-3.5 h-3.5 mr-1" /> Iniciar Assessment
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(c.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y">
              {filtered.map(c => (
                <div key={c.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{c.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.position ?? '—'} · {areaName(c.area_id)}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs">Evaluador: <b>{profileName(c.evaluator_user_id)}</b></p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{c.application_date}</span>
                    {statusBadge(c.status)}
                  </div>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => openStart(c)}>
                    <PlayCircle className="w-4 h-4 mr-1" /> Iniciar Assessment
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar aspirante' : 'Registrar aspirante'}</DialogTitle>
            <DialogDescription>
              Datos del aspirante, evaluador asignado y competencias que se le evaluarán.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Nombre completo *</label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Documento</label>
                <Input value={form.document_id} onChange={e => setForm(f => ({ ...f, document_id: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Teléfono</label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Correo</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Área</label>
                <SearchableSelect
                  className="w-full"
                  options={[{ value: NONE, label: 'Sin área' }, ...areas.map(a => ({ value: a.id, label: a.name }))]}
                  value={form.area_id}
                  onValueChange={v => setForm(f => ({ ...f, area_id: v, subarea_id: NONE, position: NONE }))}
                  placeholder="Selecciona un área"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Subárea</label>
                <SearchableSelect
                  className="w-full"
                  disabled={form.area_id === NONE}
                  options={[{ value: NONE, label: 'Sin subárea' }, ...filteredSubareas.map(s => ({ value: s.id, label: s.name }))]}
                  value={form.subarea_id}
                  onValueChange={v => setForm(f => ({ ...f, subarea_id: v }))}
                  placeholder="Selecciona una subárea"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cargo al que aplica</label>
                <SearchableSelect
                  className="w-full"
                  options={[{ value: NONE, label: 'Sin cargo' }, ...filteredPositions.map((p: any) => ({ value: p.name, label: p.name }))]}
                  value={form.position}
                  onValueChange={v => setForm(f => ({ ...f, position: v }))}
                  placeholder="Selecciona un cargo"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Evaluador (líder / gestor de área)</label>
                <SearchableSelect
                  className="w-full"
                  options={[{ value: NONE, label: 'Sin asignar' }, ...evaluatorOptions]}
                  value={form.evaluator_user_id}
                  onValueChange={v => setForm(f => ({ ...f, evaluator_user_id: v }))}
                  placeholder="Asignar evaluador"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fecha de postulación</label>
                <Input type="date" value={form.application_date} onChange={e => setForm(f => ({ ...f, application_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Estado</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 border rounded-md p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Competencias a evaluar</h3>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => setSelectedComps(activeComps
                      .filter(c => !c.position_name || c.position_name === (form.position === NONE ? null : form.position))
                      .map(c => c.id))}>
                    Sugeridas por cargo
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedComps([])}>
                    Limpiar
                  </Button>
                </div>
              </div>
              {activeComps.length === 0 && (
                <p className="text-xs text-muted-foreground">No hay competencias activas. Créalas desde el botón "Competencias".</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeComps.map(c => {
                  const checked = selectedComps.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-start gap-2 border rounded-md p-2 bg-background cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={v => setSelectedComps(prev => v ? [...prev, c.id] : prev.filter(x => x !== c.id))}
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold">{c.name}</span>
                        {c.subtitle && <span className="block text-[10px] text-muted-foreground">{c.subtitle}</span>}
                        <span className="block text-[10px] text-muted-foreground italic">Cargo: {c.position_name ?? 'Todos'}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
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
            <AlertDialogTitle>¿Eliminar aspirante?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el registro y las competencias asignadas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Iniciar Assessment */}
      <Dialog open={!!startCand} onOpenChange={o => !o && setStartCand(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Iniciar Assessment</DialogTitle>
            <DialogDescription>
              Se generará la planilla de Assessment con los datos de <b>{startCand?.full_name}</b>. Selecciona las competencias a evaluar y el líder que las califica.
            </DialogDescription>
          </DialogHeader>

          {startCand && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm border rounded-md p-3 bg-muted/20">
                <div>
                  <p className="text-[11px] text-muted-foreground">Aspirante</p>
                  <p className="font-semibold">{startCand.full_name}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Cargo</p>
                  <p className="font-semibold">{startCand.position ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Área / Subárea</p>
                  <p className="font-semibold">
                    {areaName(startCand.area_id)}{startCand.subarea_id ? ` · ${subareaName(startCand.subarea_id)}` : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Líder que evalúa *</label>
                  <SearchableSelect
                    className="w-full"
                    options={[{ value: NONE, label: 'Sin asignar' }, ...evaluatorOptions]}
                    value={startEvaluator}
                    onValueChange={setStartEvaluator}
                    placeholder="Asignar evaluador"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Fecha de evaluación</label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Competencias a evaluar ({startComps.length})</h3>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs"
                      onClick={() => setStartComps(activeComps
                        .filter(c => !c.position_name || c.position_name === startCand.position)
                        .map(c => c.id))}>
                      Sugeridas por cargo
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setStartComps([])}>
                      Limpiar
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeComps.map(c => (
                    <label key={c.id} className="flex items-start gap-2 border rounded-md p-2 bg-background cursor-pointer">
                      <Checkbox
                        checked={startComps.includes(c.id)}
                        onCheckedChange={v => setStartComps(prev => v ? [...prev, c.id] : prev.filter(x => x !== c.id))}
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold">{c.name}</span>
                        {c.subtitle && <span className="block text-[10px] text-muted-foreground">{c.subtitle}</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setStartCand(null)}>Cancelar</Button>
            <Button onClick={handleStartAssessment} disabled={starting}>
              <PlayCircle className="w-4 h-4 mr-1" />
              {starting ? 'Generando...' : 'Iniciar Assessment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
