import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useProfiles, useAreas, useSubareas, useMemberships } from '@/hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, AlertCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { ScrollArea } from '@/components/ui/scroll-area';

type EvalType = 'feedback' | 'desempeno' | 'performance' | 'one_to_one';

const typeLabels: Record<EvalType, string> = {
  feedback: 'Feedback',
  desempeno: 'Evaluación de Desempeño',
  performance: 'Performance Review',
  one_to_one: 'One to One',
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  evaluation?: Tables<'evaluations'> | null;
}

interface CriterionRow {
  id: string;
  position_name: string;
  criterion_name: string;
  sort_order: number;
  is_comment: boolean;
}

export default function EvaluacionFormDialog({ open, onOpenChange, evaluation }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profiles = [] } = useProfiles();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: memberships = [] } = useMemberships();
  const [saving, setSaving] = useState(false);

  // Filters for collaborator selection
  const [filterAreaId, setFilterAreaId] = useState('');
  const [filterSubareaId, setFilterSubareaId] = useState('');
  const [filterCargo, setFilterCargo] = useState('');
  const [searchCollab, setSearchCollab] = useState('');

  const [form, setForm] = useState({
    collaborator_user_id: '',
    type: 'desempeno' as EvalType,
    title: '',
    description: '',
    score: '',
    evaluation_date: new Date().toISOString().split('T')[0],
    period: '',
    notes: '',
  });

  // Scores per criterion: { criterionId: score (1-5) }
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number | null>>({});
  const [criteriaComments, setCriteriaComments] = useState<Record<string, string>>({});

  // Fetch all criteria
  const { data: allCriteria = [] } = useQuery({
    queryKey: ['evaluation_criteria'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_criteria' as any)
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as unknown as CriterionRow[];
    },
  });

  // Fetch existing scores when editing
  const { data: existingScores = [] } = useQuery({
    queryKey: ['evaluation_scores', evaluation?.id],
    queryFn: async () => {
      if (!evaluation?.id) return [];
      const { data, error } = await supabase
        .from('evaluation_scores' as any)
        .select('*')
        .eq('evaluation_id', evaluation.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!evaluation?.id,
  });

  // Get the selected collaborator's position
  const selectedPosition = useMemo(() => {
    if (!form.collaborator_user_id) return null;
    const profile = profiles.find(p => p.id === form.collaborator_user_id);
    return profile?.position || null;
  }, [form.collaborator_user_id, profiles]);

  // Filter criteria for the selected position
  const positionCriteria = useMemo(() => {
    if (!selectedPosition) return [];
    return allCriteria.filter(c => c.position_name === selectedPosition);
  }, [selectedPosition, allCriteria]);

  // Available positions in criteria
  const availablePositions = useMemo(() => {
    return [...new Set(allCriteria.map(c => c.position_name))];
  }, [allCriteria]);

  // Filtered subareas based on selected area
  const filteredSubareas = useMemo(() => {
    if (!filterAreaId) return subareas;
    return subareas.filter(s => s.area_id === filterAreaId);
  }, [filterAreaId, subareas]);

  // Unique cargos from profiles, filtered by area/subarea
  const filteredCargos = useMemo(() => {
    let relevantProfiles = profiles;
    if (filterAreaId) {
      const userIds = memberships.filter(m => m.area_id === filterAreaId).map(m => m.user_id);
      relevantProfiles = relevantProfiles.filter(p => userIds.includes(p.id));
    }
    if (filterSubareaId) {
      const userIds = memberships.filter(m => m.subarea_id === filterSubareaId).map(m => m.user_id);
      relevantProfiles = relevantProfiles.filter(p => userIds.includes(p.id));
    }
    const cargos = relevantProfiles.map(p => p.position).filter((v): v is string => !!v && v !== '');
    return [...new Set(cargos)].sort();
  }, [profiles, memberships, filterAreaId, filterSubareaId]);

  // Filtered collaborator profiles
  const filteredProfiles = useMemo(() => {
    let result = profiles;
    if (filterAreaId) {
      const userIds = memberships.filter(m => m.area_id === filterAreaId).map(m => m.user_id);
      result = result.filter(p => userIds.includes(p.id));
    }
    if (filterSubareaId) {
      const userIds = memberships.filter(m => m.subarea_id === filterSubareaId).map(m => m.user_id);
      result = result.filter(p => userIds.includes(p.id));
    }
    if (filterCargo) {
      result = result.filter(p => p.position === filterCargo);
    }
    if (searchCollab.trim()) {
      const q = searchCollab.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
    }
    return result;
  }, [profiles, memberships, filterAreaId, filterSubareaId, filterCargo, searchCollab]);

  useEffect(() => {
    if (evaluation) {
      setForm({
        collaborator_user_id: evaluation.collaborator_user_id,
        type: evaluation.type as EvalType,
        title: evaluation.title,
        description: evaluation.description ?? '',
        score: evaluation.score ? String(evaluation.score) : '',
        evaluation_date: evaluation.evaluation_date,
        period: evaluation.period ?? '',
        notes: evaluation.notes ?? '',
      });
    } else {
      setForm({
        collaborator_user_id: '',
        type: 'desempeno',
        title: '',
        description: '',
        score: '',
        evaluation_date: new Date().toISOString().split('T')[0],
        period: '',
        notes: '',
      });
      setCriteriaScores({});
      setCriteriaComments({});
      setFilterAreaId('');
      setFilterSubareaId('');
      setFilterCargo('');
      setSearchCollab('');
    }
  }, [evaluation, open]);

  // Load existing scores into state when editing
  useEffect(() => {
    if (existingScores.length > 0) {
      const scores: Record<string, number | null> = {};
      const comments: Record<string, string> = {};
      existingScores.forEach((s: any) => {
        scores[s.criterion_id] = s.score;
        comments[s.criterion_id] = s.comment || '';
      });
      setCriteriaScores(scores);
      setCriteriaComments(comments);
    }
  }, [existingScores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Calculate average score as percentage (B=80%, M=100%, A=120%)
    const scoreToPercent: Record<number, number> = { 1: 80, 2: 100, 3: 120 };
    const scoredValues = Object.values(criteriaScores).filter((v): v is number => v !== null && v !== undefined);
    const avgScore = scoredValues.length > 0 ? Math.round(scoredValues.reduce((a, v) => a + (scoreToPercent[v] || 0), 0) / scoredValues.length) : null;

    const payload = {
      collaborator_user_id: form.collaborator_user_id,
      type: form.type,
      title: form.type === 'desempeno' ? `Evaluación de Desempeño - ${form.period || form.evaluation_date}` : form.title,
      description: form.type === 'desempeno' ? '' : form.description,
      score: avgScore,
      evaluation_date: form.evaluation_date,
      period: form.period,
      notes: form.notes,
    };

    let evalId = evaluation?.id;

    if (evaluation) {
      const { error } = await supabase.from('evaluations').update(payload).eq('id', evaluation.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from('evaluations').insert({ ...payload, evaluator_user_id: user!.id }).select('id').single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      evalId = data.id;
    }

    // Save criteria scores
    if (evalId && positionCriteria.length > 0) {
      // Delete existing scores first
      await (supabase.from('evaluation_scores' as any) as any).delete().eq('evaluation_id', evalId);

      const scoreRows = positionCriteria.map(c => ({
        evaluation_id: evalId!,
        criterion_id: c.id,
        score: c.is_comment ? null : (criteriaScores[c.id] ?? null),
        comment: criteriaComments[c.id] || '',
      }));

      const { error: scoreError } = await (supabase.from('evaluation_scores' as any) as any).insert(scoreRows);
      if (scoreError) { toast.error('Error guardando puntajes: ' + scoreError.message); }
    }

    setSaving(false);
    toast.success(evaluation ? 'Evaluación actualizada' : 'Evaluación registrada');
    qc.invalidateQueries({ queryKey: ['evaluations'] });
    qc.invalidateQueries({ queryKey: ['evaluation_scores'] });
    onOpenChange(false);
  };

  const isEditing = !!evaluation;
  const hasPositionCriteria = positionCriteria.length > 0;
  const noMatchingPosition = selectedPosition && !hasPositionCriteria;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Evaluación' : 'Registrar Evaluación'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica los datos de la evaluación.' : 'Completa los campos para registrar una nueva evaluación.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as EvalType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(typeLabels) as EvalType[]).map(t => (
                    <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filters for collaborator */}
            <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
              <h3 className="text-sm font-semibold">Seleccionar Colaborador</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Área</label>
                  <Select value={filterAreaId} onValueChange={v => { setFilterAreaId(v === '__all__' ? '' : v); setFilterSubareaId(''); setFilterCargo(''); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
                      {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Subárea</label>
                  <Select value={filterSubareaId} onValueChange={v => { setFilterSubareaId(v === '__all__' ? '' : v); setFilterCargo(''); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
                      {filteredSubareas.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Cargo</label>
                  <Select value={filterCargo} onValueChange={v => setFilterCargo(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      {filteredCargos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar colaborador por nombre o correo..."
                  value={searchCollab}
                  onChange={e => setSearchCollab(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Select value={form.collaborator_user_id} onValueChange={v => {
                setForm(f => ({ ...f, collaborator_user_id: v }));
                setCriteriaScores({});
                setCriteriaComments({});
              }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar colaborador..." /></SelectTrigger>
                <SelectContent>
                  {filteredProfiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.position ? `(${p.position})` : ''}
                    </SelectItem>
                  ))}
                  {filteredProfiles.length === 0 && (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">Sin resultados</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {form.type !== 'desempeno' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Título</label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Descripción</label>
                  <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
            )}

            <div className={`grid ${form.type === 'desempeno' ? 'grid-cols-2' : 'grid-cols-2'} gap-4`}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Período</label>
                <Input placeholder="Q1 2026" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fecha</label>
                <Input type="date" value={form.evaluation_date} onChange={e => setForm(f => ({ ...f, evaluation_date: e.target.value }))} required />
              </div>
            </div>

            {/* Position-specific criteria */}
            {selectedPosition && (
              <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Indicadores — {selectedPosition}
                  </h3>
                  {hasPositionCriteria && (
                    <span className="text-xs text-muted-foreground">
                      {positionCriteria.filter(c => !c.is_comment).length} indicadores
                    </span>
                  )}
                </div>

                <div className="rounded-md border border-border bg-background px-3 py-2 space-y-0.5 text-sm">
                  <p className="font-semibold mb-1">Criterios de Evaluación</p>
                  <p><span className="font-bold text-green-700">A(Alto):</span> Excede su desempeño. WOW. Calificación: 120%</p>
                  <p><span className="font-bold text-yellow-700">M(Medio):</span> Cumple su desempeño. Calificación 100%</p>
                  <p><span className="font-bold text-destructive">B (Bajo):</span> No alcanza el cumplimiento del 100% del desempeño.</p>
                </div>

                {noMatchingPosition && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>No hay indicadores configurados para "{selectedPosition}". Cargos disponibles: {availablePositions.join(', ')}</span>
                  </div>
                )}

                {hasPositionCriteria && (
                  <div className="space-y-1">
                    {positionCriteria.map(criterion => (
                      <div key={criterion.id} className={`flex items-center gap-3 rounded-md px-2 py-1.5 ${criterion.is_comment ? 'flex-col items-start' : ''} bg-background/50`}>
                        <span className="text-sm font-medium flex items-center gap-1 min-w-0 flex-1">
                          <span className="text-muted-foreground text-xs shrink-0">{criterion.sort_order}.</span>
                          <span className="truncate">{criterion.criterion_name}</span>
                        </span>
                        {criterion.is_comment ? (
                          <Textarea
                            placeholder="Escribe un comentario..."
                            value={criteriaComments[criterion.id] || ''}
                            onChange={e => setCriteriaComments(prev => ({ ...prev, [criterion.id]: e.target.value }))}
                            rows={1}
                            className="w-full text-xs"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {([
                              { value: 1, label: 'B', color: 'bg-destructive/10 text-destructive border-destructive/30' },
                              { value: 2, label: 'M', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
                              { value: 3, label: 'A', color: 'bg-green-500/10 text-green-700 border-green-500/30' },
                            ] as const).map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setCriteriaScores(prev => ({ ...prev, [criterion.id]: prev[criterion.id] === opt.value ? null : opt.value }))}
                                className={`w-8 h-7 rounded text-xs font-bold border transition-all ${
                                  criteriaScores[criterion.id] === opt.value
                                    ? opt.color + ' ring-2 ring-offset-1 ring-current'
                                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {hasPositionCriteria && (() => {
                  const scoreToPercent: Record<number, number> = { 1: 80, 2: 100, 3: 120 };
                  const scored = Object.values(criteriaScores).filter((v): v is number => v !== null && v !== undefined);
                  if (scored.length === 0) return null;
                  const avgPercent = scored.reduce((a, v) => a + (scoreToPercent[v] || 0), 0) / scored.length;
                  const avgLabel = avgPercent < 100 ? 'Bajo' : avgPercent === 100 ? 'Medio' : 'Alto';
                  return (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t text-sm">
                      <span className="font-medium">Promedio:</span>
                      <span className="font-bold">{avgLabel} ({avgPercent.toFixed(0)}%)</span>
                    </div>
                  );
                })()}
              </div>
            )}

            {form.type !== 'desempeno' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Notas generales</label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : form.type === 'desempeno' ? 'Guardar Evaluación' : 'Guardar'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
