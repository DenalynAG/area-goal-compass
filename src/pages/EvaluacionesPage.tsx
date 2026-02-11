import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Star, MessageSquare, ClipboardCheck, Users2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type EvalType = 'feedback' | 'desempeno' | 'performance' | 'one_to_one';

const typeLabels: Record<EvalType, string> = {
  feedback: 'Feedback',
  desempeno: 'Evaluación de Desempeño',
  performance: 'Performance Review',
  one_to_one: 'One to One',
};

const typeIcons: Record<EvalType, typeof MessageSquare> = {
  feedback: MessageSquare,
  desempeno: ClipboardCheck,
  performance: Star,
  one_to_one: Users2,
};

const typeBadgeVariant: Record<EvalType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  feedback: 'default',
  desempeno: 'secondary',
  performance: 'outline',
  one_to_one: 'default',
};

function ScoreStars({ score }: { score: number | null }) {
  if (!score) return <span className="text-muted-foreground text-xs">Sin puntaje</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= score ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );
}

export default function EvaluacionesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  // Form state
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

  // Fetch evaluations
  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['evaluations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .order('evaluation_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles for collaborator selection
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, name, email, position');
      if (error) throw error;
      return data;
    },
  });

  // Create evaluation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('evaluations').insert({
        evaluator_user_id: user!.id,
        collaborator_user_id: form.collaborator_user_id,
        type: form.type,
        title: form.title,
        description: form.description,
        score: form.score ? parseInt(form.score) : null,
        evaluation_date: form.evaluation_date,
        period: form.period,
        notes: form.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      setOpen(false);
      resetForm();
      toast.success('Evaluación registrada exitosamente');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () =>
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

  const filtered = filterType === 'all' ? evaluations : evaluations.filter(e => e.type === filterType);

  const getCollaboratorName = (id: string) => profiles.find(p => p.id === id)?.name ?? id;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title">Evaluaciones</h1>
          <p className="page-subtitle">Feedback, desempeño, performance y one-to-one</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nueva Evaluación</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Evaluación</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={e => { e.preventDefault(); createMutation.mutate(); }}
              className="space-y-4"
            >
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
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(typeLabels) as EvalType[]).map(t => {
          const Icon = typeIcons[t];
          const count = evaluations.filter(e => e.type === t).length;
          return (
            <div key={t} className="bg-card rounded-xl border p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{typeLabels[t]}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filtrar:</span>
        <Button size="sm" variant={filterType === 'all' ? 'default' : 'outline'} onClick={() => setFilterType('all')}>Todos</Button>
        {(Object.keys(typeLabels) as EvalType[]).map(t => (
          <Button key={t} size="sm" variant={filterType === t ? 'default' : 'outline'} onClick={() => setFilterType(t)}>
            {typeLabels[t]}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Colaborador</TableHead>
              <TableHead>Puntaje</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Período</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay evaluaciones registradas</TableCell></TableRow>
            ) : (
              filtered.map(ev => (
                <TableRow key={ev.id}>
                  <TableCell>
                    <Badge variant={typeBadgeVariant[ev.type as EvalType]}>
                      {typeLabels[ev.type as EvalType]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{ev.title}</TableCell>
                  <TableCell>{getCollaboratorName(ev.collaborator_user_id)}</TableCell>
                  <TableCell><ScoreStars score={ev.score} /></TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{ev.evaluation_date}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{ev.period || '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
