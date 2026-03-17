import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useProfiles, useMemberships, useAreas, useSubareas } from '@/hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Plus, Star, MessageSquare, ClipboardCheck, Users2, Calendar, Pencil,
  Search, CheckCircle2, Clock, ChevronDown, ChevronRight, User,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
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

const evalTypes: EvalType[] = ['feedback', 'desempeno', 'performance', 'one_to_one'];

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
  const [preselectedCollaborator, setPreselectedCollaborator] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
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
  const { data: subareas = [] } = useSubareas();

  // Filter collaborators by area if areaFilterName provided
  const relevantProfiles = useMemo(() => {
    if (!areaFilterName) return profiles;
    const area = areas.find(a => a.name === areaFilterName);
    if (!area) return profiles;
    const userIds = new Set(memberships.filter(m => m.area_id === area.id).map(m => m.user_id));
    return profiles.filter(p => userIds.has(p.id));
  }, [profiles, areaFilterName, areas, memberships]);

  // Filter evaluations by area
  const areaFilteredEvaluations = useMemo(() => {
    if (!areaFilterName) return evaluations;
    const area = areas.find(a => a.name === areaFilterName);
    if (!area) return evaluations;
    const userIds = new Set(memberships.filter(m => m.area_id === area.id).map(m => m.user_id));
    return evaluations.filter(e => userIds.has(e.collaborator_user_id));
  }, [evaluations, areaFilterName, areas, memberships]);

  // Build area->subarea->collaborators structure
  const areaStructure = useMemo(() => {
    const structure: {
      areaId: string;
      areaName: string;
      subareas: {
        subareaId: string | null;
        subareaName: string;
        collaborators: Tables<'profiles'>[];
      }[];
      totalCollaborators: number;
      evaluatedCount: number;
      pendingCount: number;
    }[] = [];

    // Get relevant area IDs
    const relevantUserIds = new Set(relevantProfiles.map(p => p.id));
    const relevantMemberships = memberships.filter(m => relevantUserIds.has(m.user_id));

    // Group by area
    const areaMap = new Map<string, Map<string | null, string[]>>();
    relevantMemberships.forEach(m => {
      if (!areaMap.has(m.area_id)) areaMap.set(m.area_id, new Map());
      const subareaMap = areaMap.get(m.area_id)!;
      const key = m.subarea_id;
      if (!subareaMap.has(key)) subareaMap.set(key, []);
      subareaMap.get(key)!.push(m.user_id);
    });

    areaMap.forEach((subareaMap, areaId) => {
      const area = areas.find(a => a.id === areaId);
      if (!area) return;

      const subareaList: typeof structure[0]['subareas'] = [];
      let totalCollabs = 0;
      let evaluatedTotal = 0;

      subareaMap.forEach((userIds, subareaId) => {
        const subarea = subareaId ? subareas.find(s => s.id === subareaId) : null;
        const collabs = userIds
          .map(uid => profiles.find(p => p.id === uid))
          .filter(Boolean) as Tables<'profiles'>[];

        // Apply search filter
        const filtered = searchQuery.trim()
          ? collabs.filter(p =>
              p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (p.position && p.position.toLowerCase().includes(searchQuery.toLowerCase()))
            )
          : collabs;

        if (filtered.length > 0) {
          subareaList.push({
            subareaId,
            subareaName: subarea?.name || 'Sin subárea',
            collaborators: filtered,
          });
          totalCollabs += filtered.length;

          filtered.forEach(c => {
            const hasEval = evaluations.some(e => e.collaborator_user_id === c.id);
            if (hasEval) evaluatedTotal++;
          });
        }
      });

      if (subareaList.length > 0) {
        structure.push({
          areaId,
          areaName: area.name,
          subareas: subareaList.sort((a, b) => a.subareaName.localeCompare(b.subareaName)),
          totalCollaborators: totalCollabs,
          evaluatedCount: evaluatedTotal,
          pendingCount: totalCollabs - evaluatedTotal,
        });
      }
    });

    return structure.sort((a, b) => a.areaName.localeCompare(b.areaName));
  }, [relevantProfiles, memberships, areas, subareas, profiles, evaluations, searchQuery]);

  // Auto-expand all areas initially
  useMemo(() => {
    if (expandedAreas.size === 0 && areaStructure.length > 0) {
      setExpandedAreas(new Set(areaStructure.map(a => a.areaId)));
    }
  }, [areaStructure.length]);

  const toggleArea = (areaId: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      next.has(areaId) ? next.delete(areaId) : next.add(areaId);
      return next;
    });
  };

  // Evaluation status per collaborator
  const getCollabEvalStatus = (userId: string) => {
    const userEvals = evaluations.filter(e => e.collaborator_user_id === userId);
    const completedTypes = new Set(userEvals.map(e => e.type));
    return { userEvals, completedTypes, total: userEvals.length };
  };

  const handleEvaluateCollaborator = (collaboratorId: string) => {
    setPreselectedCollaborator(collaboratorId);
    setEditingEval(null);
    setOpen(true);
  };

  const handleEdit = (ev: Tables<'evaluations'>) => {
    setPreselectedCollaborator(null);
    setEditingEval(ev);
    setOpen(true);
  };

  const handleNew = () => {
    setPreselectedCollaborator(null);
    setEditingEval(null);
    setOpen(true);
  };

  const filtered = filterType === 'all' ? areaFilteredEvaluations : areaFilteredEvaluations.filter(e => e.type === filterType);
  const getCollaboratorName = (id: string) => profiles.find(p => p.id === id)?.name ?? id;

  // Summary counts
  const totalCollabs = relevantProfiles.length;
  const evaluatedCollabs = new Set(areaFilteredEvaluations.map(e => e.collaborator_user_id)).size;
  const pendingCollabs = totalCollabs - evaluatedCollabs;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title">Evaluaciones</h1>
          <p className="page-subtitle">Gestión de evaluaciones por colaborador</p>
        </div>
        <Button onClick={handleNew}><Plus className="w-4 h-4 mr-2" />Nueva Evaluación</Button>
      </div>

      <EvaluacionFormDialog
        open={open}
        onOpenChange={setOpen}
        evaluation={editingEval}
        preselectedCollaboratorId={preselectedCollaborator}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Users2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalCollabs}</p>
            <p className="text-xs text-muted-foreground">Total Colaboradores</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{evaluatedCollabs}</p>
            <p className="text-xs text-muted-foreground">Evaluados</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{pendingCollabs}</p>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <ClipboardCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{areaFilteredEvaluations.length}</p>
            <p className="text-xs text-muted-foreground">Total Evaluaciones</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="collaborators" className="space-y-4">
        <TabsList>
          <TabsTrigger value="collaborators">
            <User className="w-4 h-4 mr-1.5" />
            Colaboradores
          </TabsTrigger>
          <TabsTrigger value="history">
            <Calendar className="w-4 h-4 mr-1.5" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Tab: Collaborators by Area/Subarea */}
        <TabsContent value="collaborators" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colaborador..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : areaStructure.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay colaboradores disponibles</div>
          ) : (
            <div className="space-y-3">
              {areaStructure.map(area => (
                <div key={area.areaId} className="bg-card rounded-xl border overflow-hidden">
                  {/* Area header */}
                  <button
                    onClick={() => toggleArea(area.areaId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {expandedAreas.has(area.areaId) ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-semibold">{area.areaName}</span>
                      <span className="text-xs text-muted-foreground">({area.totalCollaborators})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />{area.evaluatedCount}
                      </Badge>
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-200">
                        <Clock className="w-3 h-3 mr-1" />{area.pendingCount}
                      </Badge>
                    </div>
                  </button>

                  {expandedAreas.has(area.areaId) && (
                    <div className="border-t">
                      {area.subareas.map(sub => (
                        <div key={sub.subareaId || 'none'}>
                          {/* Subarea label */}
                          <div className="px-4 py-2 bg-muted/30 border-b flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {sub.subareaName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({sub.collaborators.length})
                            </span>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Colaborador</TableHead>
                                <TableHead>Cargo</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                                <TableHead className="text-center">Evaluaciones</TableHead>
                                <TableHead className="w-24 text-center">Acción</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sub.collaborators.map(collab => {
                                const { completedTypes, total } = getCollabEvalStatus(collab.id);
                                const hasSomeEval = total > 0;
                                return (
                                  <TableRow key={collab.id}>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                                          {collab.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-sm">{collab.name}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {collab.position || '—'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {hasSomeEval ? (
                                        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200 text-xs">
                                          <CheckCircle2 className="w-3 h-3 mr-1" />Evaluado
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-200 text-xs">
                                          <Clock className="w-3 h-3 mr-1" />Pendiente
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <div className="flex items-center justify-center gap-1 flex-wrap">
                                        {evalTypes.map(t => {
                                          const Icon = typeIcons[t];
                                          const done = completedTypes.has(t);
                                          return (
                                            <span
                                              key={t}
                                              title={`${typeLabels[t]}: ${done ? 'Realizado' : 'Pendiente'}`}
                                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                                                done
                                                  ? 'bg-green-500/10 text-green-600'
                                                  : 'bg-muted text-muted-foreground'
                                              }`}
                                            >
                                              <Icon className="w-3.5 h-3.5" />
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEvaluateCollaborator(collab.id)}
                                      >
                                        <Plus className="w-3.5 h-3.5 mr-1" />Evaluar
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Evaluation History */}
        <TabsContent value="history" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Filtrar:</span>
            <Button size="sm" variant={filterType === 'all' ? 'default' : 'outline'} onClick={() => setFilterType('all')}>Todos</Button>
            {evalTypes.map(t => (
              <Button key={t} size="sm" variant={filterType === t ? 'default' : 'outline'} onClick={() => setFilterType(t)}>
                {typeLabels[t]}
              </Button>
            ))}
          </div>

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
        </TabsContent>
      </Tabs>
    </div>
  );
}
