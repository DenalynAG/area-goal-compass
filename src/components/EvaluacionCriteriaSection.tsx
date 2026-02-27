import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAreas, useSubareas, usePositions } from '@/hooks/useSupabaseData';
import { ClipboardList, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Building2, FolderOpen, Briefcase, GripVertical, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

interface CriterionRow {
  id: string;
  position_name: string;
  criterion_name: string;
  sort_order: number;
  is_comment: boolean;
}

export default function EvaluacionCriteriaSection({ canManage }: { canManage: boolean }) {
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: positions = [] } = usePositions();
  const qc = useQueryClient();

  const { data: criteria = [], isLoading } = useQuery({
    queryKey: ['evaluation_criteria'],
    queryFn: async () => {
      const { data, error } = await supabase.from('evaluation_criteria').select('*').order('position_name').order('sort_order');
      if (error) throw error;
      return data as CriterionRow[];
    },
  });

  const [filterAreaId, setFilterAreaId] = useState('');
  const [filterSubareaId, setFilterSubareaId] = useState('');
  const [expandedPositions, setExpandedPositions] = useState<Record<string, boolean>>({});

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CriterionRow | null>(null);
  const [formPositionName, setFormPositionName] = useState('');
  const [formCriterionName, setFormCriterionName] = useState('');
  const [formIsComment, setFormIsComment] = useState(false);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  // Filter subareas by area
  const filteredSubareas = useMemo(() =>
    filterAreaId ? subareas.filter(s => s.area_id === filterAreaId) : subareas,
    [filterAreaId, subareas]
  );

  // Filter positions by area & subarea
  const filteredPositions = useMemo(() => {
    let result = positions;
    if (filterAreaId) result = result.filter((p: any) => p.area_id === filterAreaId);
    if (filterSubareaId) result = result.filter((p: any) => p.subarea_id === filterSubareaId);
    return result;
  }, [positions, filterAreaId, filterSubareaId]);

  // Get position names from filtered positions
  const filteredPositionNames = useMemo(() =>
    filteredPositions.map((p: any) => p.name as string),
    [filteredPositions]
  );

  // Group criteria by position_name, filtered
  const groupedCriteria = useMemo(() => {
    const posNames = filterAreaId || filterSubareaId
      ? new Set(filteredPositionNames)
      : new Set(criteria.map(c => c.position_name));

    const groups: { positionName: string; items: CriterionRow[]; position: any }[] = [];
    for (const name of Array.from(posNames).sort()) {
      const items = criteria.filter(c => c.position_name === name).sort((a, b) => a.sort_order - b.sort_order);
      const pos = positions.find((p: any) => p.name === name);
      groups.push({ positionName: name, items, position: pos });
    }
    return groups;
  }, [criteria, filteredPositionNames, filterAreaId, filterSubareaId, positions]);

  const togglePosition = (name: string) =>
    setExpandedPositions(prev => ({ ...prev, [name]: !prev[name] }));

  const openNew = (positionName?: string) => {
    setEditing(null);
    setFormPositionName(positionName || '');
    setFormCriterionName('');
    setFormIsComment(false);
    const maxOrder = criteria.filter(c => c.position_name === (positionName || '')).reduce((m, c) => Math.max(m, c.sort_order), -1);
    setFormSortOrder(maxOrder + 1);
    setDialogOpen(true);
  };

  const openEdit = (c: CriterionRow) => {
    setEditing(c);
    setFormPositionName(c.position_name);
    setFormCriterionName(c.criterion_name);
    setFormIsComment(c.is_comment);
    setFormSortOrder(c.sort_order);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('evaluation_criteria').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Indicador eliminado');
    qc.invalidateQueries({ queryKey: ['evaluation_criteria'] });
  };

  const handleSave = async () => {
    if (!formPositionName.trim() || !formCriterionName.trim()) {
      toast.error('Cargo e indicador son obligatorios');
      return;
    }
    setSaving(true);
    const payload = {
      position_name: formPositionName.trim(),
      criterion_name: formCriterionName.trim(),
      is_comment: formIsComment,
      sort_order: formSortOrder,
    };

    if (editing) {
      const { error } = await supabase.from('evaluation_criteria').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Indicador actualizado');
    } else {
      const { error } = await supabase.from('evaluation_criteria').insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Indicador creado');
    }
    qc.invalidateQueries({ queryKey: ['evaluation_criteria'] });
    setSaving(false);
    setDialogOpen(false);
  };

  // All unique position names from positions table for the select
  const allPositionNames = useMemo(() =>
    Array.from(new Set(positions.map((p: any) => p.name as string))).sort(),
    [positions]
  );

  const getAreaForPosition = (pos: any) => {
    if (!pos?.area_id) return null;
    return areas.find(a => a.id === pos.area_id);
  };

  const getSubareaForPosition = (pos: any) => {
    if (!pos?.subarea_id) return null;
    return subareas.find(s => s.id === pos.subarea_id);
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm">
      <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-accent" />
          <div>
            <h3 className="font-semibold">Indicadores de Evaluación</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{criteria.length} indicadores · {groupedCriteria.length} cargos</p>
          </div>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => openNew()}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo Indicador
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="px-5 py-3 border-b bg-muted/10 flex flex-wrap gap-3">
        <div className="w-48">
          <Select value={filterAreaId} onValueChange={v => { setFilterAreaId(v === '__all__' ? '' : v); setFilterSubareaId(''); }}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todas las áreas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las áreas</SelectItem>
              {areas.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={filterSubareaId} onValueChange={v => setFilterSubareaId(v === '__all__' ? '' : v)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todas las subáreas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las subáreas</SelectItem>
              {filteredSubareas.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Cargando indicadores...</div>
        ) : groupedCriteria.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
            <p>No hay indicadores de evaluación {(filterAreaId || filterSubareaId) ? 'para este filtro' : 'registrados'}</p>
          </div>
        ) : (
          groupedCriteria.map(({ positionName, items, position }) => {
            const area = getAreaForPosition(position);
            const subarea = getSubareaForPosition(position);
            const isExpanded = expandedPositions[positionName];

            return (
              <div key={positionName} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => togglePosition(positionName)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <Briefcase className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">{positionName}</span>
                    {area && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{area.name}</span>
                    )}
                    {subarea && (
                      <span className="text-[10px] bg-accent/10 text-accent-foreground px-2 py-0.5 rounded-full">{subarea.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {items.length} indicador{items.length !== 1 ? 'es' : ''}
                    </span>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={e => { e.stopPropagation(); openNew(positionName); }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="divide-y">
                    {items.length === 0 ? (
                      <div className="px-6 py-4 text-sm text-muted-foreground text-center">
                        Sin indicadores definidos para este cargo
                      </div>
                    ) : (
                      items.map((c, idx) => (
                        <div key={c.id} className="flex items-center justify-between px-6 py-2.5 hover:bg-muted/40 transition-colors group">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-5 text-right">{idx + 1}.</span>
                            {c.is_comment ? (
                              <MessageSquare className="w-3.5 h-3.5 text-accent" />
                            ) : (
                              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50" />
                            )}
                            <span className="text-sm">{c.criterion_name}</span>
                            {c.is_comment && (
                              <span className="text-[10px] bg-accent/10 text-accent-foreground px-1.5 py-0.5 rounded">Comentario</span>
                            )}
                          </div>
                          {canManage && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Indicador' : 'Nuevo Indicador de Evaluación'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Cargo <span className="text-destructive">*</span></Label>
              <Select value={formPositionName} onValueChange={setFormPositionName}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cargo" />
                </SelectTrigger>
                <SelectContent>
                  {allPositionNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nombre del Indicador <span className="text-destructive">*</span></Label>
              <Input value={formCriterionName} onChange={e => setFormCriterionName(e.target.value)} placeholder="Ej: Puntualidad, Atención al cliente..." />
            </div>
            <div>
              <Label>Orden</Label>
              <Input type="number" value={formSortOrder} onChange={e => setFormSortOrder(Number(e.target.value))} className="w-24" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formIsComment} onCheckedChange={setFormIsComment} />
              <Label className="cursor-pointer">Es campo de comentario (sin puntaje)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
