import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
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
import type { Tables } from '@/integrations/supabase/types';

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

export default function EvaluacionFormDialog({ open, onOpenChange, evaluation }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profiles = [] } = useProfiles();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    collaborator_user_id: '',
    type: 'feedback' as EvalType,
    title: '',
    description: '',
    score: '',
    evaluation_date: new Date().toISOString().split('T')[0],
    period: '',
    notes: '',
  });

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
        type: 'feedback',
        title: '',
        description: '',
        score: '',
        evaluation_date: new Date().toISOString().split('T')[0],
        period: '',
        notes: '',
      });
    }
  }, [evaluation, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      collaborator_user_id: form.collaborator_user_id,
      type: form.type,
      title: form.title,
      description: form.description,
      score: form.score ? parseInt(form.score) : null,
      evaluation_date: form.evaluation_date,
      period: form.period,
      notes: form.notes,
    };

    const { error } = evaluation
      ? await supabase.from('evaluations').update(payload).eq('id', evaluation.id)
      : await supabase.from('evaluations').insert({ ...payload, evaluator_user_id: user!.id });

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(evaluation ? 'Evaluación actualizada' : 'Evaluación registrada');
    qc.invalidateQueries({ queryKey: ['evaluations'] });
    onOpenChange(false);
  };

  const isEditing = !!evaluation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Evaluación' : 'Registrar Evaluación'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica los datos de la evaluación.' : 'Completa los campos para registrar una nueva evaluación.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Select value={form.collaborator_user_id} onValueChange={v => setForm(f => ({ ...f, collaborator_user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Título</label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descripción</label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Puntaje (1-5)</label>
              <Select value={form.score} onValueChange={v => setForm(f => ({ ...f, score: v }))}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {['1','2','3','4','5'].map(v => (
                    <SelectItem key={v} value={v}>{v} ⭐</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha</label>
              <Input type="date" value={form.evaluation_date} onChange={e => setForm(f => ({ ...f, evaluation_date: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Período</label>
              <Input placeholder="Q1 2026" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notas</label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
