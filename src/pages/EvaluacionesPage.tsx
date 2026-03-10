import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useProfiles, useMemberships, useAreas } from '@/hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Star, MessageSquare, ClipboardCheck, Users2, Calendar, Pencil, Briefcase } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { Tables } from '@/integrations/supabase/types';
import EvaluacionFormDialog from '@/components/EvaluacionFormDialog';

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

function ScoreLabel({ score }: { score: number | null }) {
  if (!score) return <span className="text-muted-foreground text-xs">Sin puntaje</span>;
  const label = score <= 1.5 ? 'Bajo' : score <= 2.5 ? 'Medio' : 'Alto';
  const color = score <= 1.5 ? 'bg-destructive/10 text-destructive' : score <= 2.5 ? 'bg-yellow-500/10 text-yellow-700' : 'bg-green-500/10 text-green-700';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>;
}

interface EvaluacionesPageProps {
  areaFilterName?: string;
}

export default function EvaluacionesPage({ areaFilterName }: EvaluacionesPageProps = {}) {
  const [open, setOpen] = useState(false);
  const [editingEval, setEditingEval] = useState<Tables<'evaluations'> | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

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

  const { data: profiles = [] } = useProfiles();
  const { data: memberships = [] } = useMemberships();
  const { data: areas = [] } = useAreas();

  // Filter evaluations by area if areaFilterName is provided
  const areaFilteredEvaluations = useMemo(() => {
    if (!areaFilterName) return evaluations;
    const area = areas.find(a => a.name === areaFilterName);
    if (!area) return evaluations;
    const areaUserIds = new Set(memberships.filter(m => m.area_id === area.id).map(m => m.user_id));
    return evaluations.filter(e => areaUserIds.has(e.collaborator_user_id));
  }, [evaluations, areaFilterName, areas, memberships]);

  const filtered = filterType === 'all' ? areaFilteredEvaluations : areaFilteredEvaluations.filter(e => e.type === filterType);
  const getCollaboratorName = (id: string) => profiles.find(p => p.id === id)?.name ?? id;

  const handleEdit = (ev: Tables<'evaluations'>) => {
    setEditingEval(ev);
    setOpen(true);
  };

  const handleNew = () => {
    setEditingEval(null);
    setOpen(true);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title">Evaluaciones</h1>
          <p className="page-subtitle">Feedback, desempeño, performance y one-to-one</p>
        </div>
        <Button onClick={handleNew}><Plus className="w-4 h-4 mr-2" />Nueva Evaluación</Button>
      </div>

      <EvaluacionFormDialog open={open} onOpenChange={setOpen} evaluation={editingEval} />

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

      {/* Evaluaciones por Cargo */}
      {(() => {
        const cargoMap = new Map<string, { count: number; totalScore: number; scored: number }>();
        evaluations.forEach(ev => {
          const profile = profiles.find(p => p.id === ev.collaborator_user_id);
          const cargo = profile?.position || 'Sin cargo';
          const entry = cargoMap.get(cargo) || { count: 0, totalScore: 0, scored: 0 };
          entry.count++;
          if (ev.score) { entry.totalScore += ev.score; entry.scored++; }
          cargoMap.set(cargo, entry);
        });
        const cargoEntries = Array.from(cargoMap.entries()).sort((a, b) => b[1].count - a[1].count);
        if (cargoEntries.length === 0) return null;
        const maxCount = Math.max(...cargoEntries.map(([, v]) => v.count));
        return (
          <div className="bg-card rounded-xl border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-base">Evaluaciones por Cargo</h2>
              <span className="text-xs text-muted-foreground ml-auto">{cargoEntries.length} cargos</span>
            </div>
            <div className="space-y-3">
              {cargoEntries.map(([cargo, { count, totalScore, scored }]) => {
                const avg = scored > 0 ? (totalScore / scored) : 0;
                return (
                  <div key={cargo} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[200px]">{cargo}</span>
                      <div className="flex items-center gap-3">
                        {scored > 0 && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${avg <= 1.5 ? 'bg-destructive/10 text-destructive' : avg <= 2.5 ? 'bg-yellow-500/10 text-yellow-700' : 'bg-green-500/10 text-green-700'}`}>
                            {avg <= 1.5 ? 'Bajo' : avg <= 2.5 ? 'Medio' : 'Alto'}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{count} eval.</span>
                      </div>
                    </div>
                    <Progress value={(count / maxCount) * 100} className="h-2" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay evaluaciones registradas</TableCell></TableRow>
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
                  <TableCell><ScoreLabel score={ev.score} /></TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{ev.evaluation_date}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{ev.period || '—'}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(ev)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
