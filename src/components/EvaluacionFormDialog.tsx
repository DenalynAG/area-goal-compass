import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useProfiles } from '@/hooks/useSupabaseData';
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
import { Star, AlertCircle } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);

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

    // Calculate average score from criteria scores
    const scoredValues = Object.values(criteriaScores).filter((v): v is number => v !== null && v !== undefined);
    const avgScore = scoredValues.length > 0 ? Math.round(scoredValues.reduce((a, b) => a + b, 0) / scoredValues.length) : null;

    const payload = {
      collaborator_user_id: form.collaborator_user_id,
      type: form.type,
      title: form.title,
      description: form.description,
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Evaluación' : 'Registrar Evaluación'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica los datos de la evaluación.' : 'Completa los campos para registrar una nueva evaluación.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Colaborador</label>
                <Select value={form.collaborator_user_id} onValueChange={v => {
                  setForm(f => ({ ...f, collaborator_user_id: v }));
                  setCriteriaScores({});
                  setCriteriaComments({});
                }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.position ? `(${p.position})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Título</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Período</label>
                <Input placeholder="Q1 2026" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fecha</label>
                <Input type="date" value={form.evaluation_date} onChange={e => setForm(f => ({ ...f, evaluation_date: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Descripción</label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>

            {/* Position-specific criteria */}
            {selectedPosition && (
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
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

                {noMatchingPosition && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>No hay indicadores configurados para "{selectedPosition}". Cargos disponibles: {availablePositions.join(', ')}</span>
                  </div>
                )}

                {hasPositionCriteria && positionCriteria.map(criterion => (
                  <div key={criterion.id} className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1">
                      <span className="text-muted-foreground text-xs">{criterion.sort_order}.</span>
                      {criterion.criterion_name}
                    </label>
                    {criterion.is_comment ? (
                      <Textarea
                        placeholder="Escribe un comentario..."
                        value={criteriaComments[criterion.id] || ''}
                        onChange={e => setCriteriaComments(prev => ({ ...prev, [criterion.id]: e.target.value }))}
                        rows={2}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        {([
                          { value: 1, label: 'Bajo', color: 'bg-destructive/10 text-destructive border-destructive/30' },
                          { value: 2, label: 'Medio', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
                          { value: 3, label: 'Alto', color: 'bg-green-500/10 text-green-700 border-green-500/30' },
                        ] as const).map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setCriteriaScores(prev => ({ ...prev, [criterion.id]: prev[criterion.id] === opt.value ? null : opt.value }))}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
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

                {hasPositionCriteria && (() => {
                  const scoreLabels: Record<number, string> = { 1: 'Bajo', 2: 'Medio', 3: 'Alto' };
                  const scored = Object.values(criteriaScores).filter((v): v is number => v !== null && v !== undefined);
                  if (scored.length === 0) return null;
                  const avg = scored.reduce((a, b) => a + b, 0) / scored.length;
                  const avgLabel = avg <= 1.5 ? 'Bajo' : avg <= 2.5 ? 'Medio' : 'Alto';
                  return (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <span className="text-sm font-medium">Promedio:</span>
                      <span className="font-bold">{avgLabel} ({avg.toFixed(1)})</span>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notas generales</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
