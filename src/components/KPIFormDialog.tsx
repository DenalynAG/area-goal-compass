import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi?: Tables<'kpis'> | null;
  objectives: Tables<'objectives'>[];
  areas?: Tables<'areas'>[];
  subareas?: Tables<'subareas'>[];
  preselectedObjectiveId?: string | null;
}

export default function KPIFormDialog({ open, onOpenChange, kpi, objectives, areas = [], subareas = [], preselectedObjectiveId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [definition, setDefinition] = useState('');
  const [objectiveId, setObjectiveId] = useState('');
  const [unit, setUnit] = useState('');
  const [frequency, setFrequency] = useState<'semanal' | 'mensual' | 'trimestral'>('mensual');
  const [baseline, setBaseline] = useState(0);
  const [target, setTarget] = useState(0);
  const [currentValue, setCurrentValue] = useState(0);
  const [thresholdGreen, setThresholdGreen] = useState(0);
  const [thresholdYellow, setThresholdYellow] = useState(0);
  const [thresholdRed, setThresholdRed] = useState(0);
  const [weightPercent, setWeightPercent] = useState(0);
  const [filterAreaId, setFilterAreaId] = useState('all');
  const [filterSubareaId, setFilterSubareaId] = useState('all');

  const filteredSubareas = useMemo(() =>
    filterAreaId && filterAreaId !== 'all'
      ? subareas.filter(s => s.area_id === filterAreaId)
      : subareas,
    [subareas, filterAreaId]
  );

  const filteredObjectives = useMemo(() => {
    let result = objectives;
    if (filterAreaId && filterAreaId !== 'all') {
      result = result.filter(o =>
        (o.scope_type === 'area' && o.scope_id === filterAreaId) ||
        (o.scope_type === 'subarea' && subareas.some(s => s.id === o.scope_id && s.area_id === filterAreaId))
      );
    }
    if (filterSubareaId && filterSubareaId !== 'all') {
      result = result.filter(o => o.scope_type === 'subarea' && o.scope_id === filterSubareaId);
    }
    return result;
  }, [objectives, filterAreaId, filterSubareaId, subareas]);

  useEffect(() => {
    if (kpi) {
      setName(kpi.name);
      setDefinition(kpi.definition ?? '');
      setObjectiveId(kpi.objective_id);
      setUnit(kpi.unit ?? '');
      setFrequency(kpi.frequency);
      setBaseline(kpi.baseline);
      setTarget(kpi.target);
      setCurrentValue(kpi.current_value);
      setThresholdGreen(kpi.threshold_green);
      setThresholdYellow(kpi.threshold_yellow);
      setThresholdRed(kpi.threshold_red);
      setWeightPercent((kpi as any).weight_percent ?? 0);
      // Set filters based on existing objective
      const obj = objectives.find(o => o.id === kpi.objective_id);
      if (obj) {
        if (obj.scope_type === 'area') {
          setFilterAreaId(obj.scope_id);
          setFilterSubareaId('all');
        } else if (obj.scope_type === 'subarea') {
          const sub = subareas.find(s => s.id === obj.scope_id);
          setFilterAreaId(sub?.area_id ?? 'all');
          setFilterSubareaId(obj.scope_id);
        }
      }
    } else {
      setName(''); setDefinition(''); setUnit('');
      setFrequency('mensual'); setBaseline(0); setTarget(0); setCurrentValue(0);
      setThresholdGreen(0); setThresholdYellow(0); setThresholdRed(0); setWeightPercent(0);
      // Pre-select objective if provided
      if (preselectedObjectiveId) {
        setObjectiveId(preselectedObjectiveId);
        const obj = objectives.find(o => o.id === preselectedObjectiveId);
        if (obj) {
          if (obj.scope_type === 'area') {
            setFilterAreaId(obj.scope_id);
            setFilterSubareaId('all');
          } else if (obj.scope_type === 'subarea') {
            const sub = subareas.find(s => s.id === obj.scope_id);
            setFilterAreaId(sub?.area_id ?? 'all');
            setFilterSubareaId(obj.scope_id);
          }
        }
      } else {
        setObjectiveId('');
        setFilterAreaId('all'); setFilterSubareaId('all');
      }
    }
  }, [kpi, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { toast.error('El nombre es obligatorio'); return; }
    if (!objectiveId) { toast.error('Selecciona un objetivo'); return; }

    setSaving(true);
    const payload = {
      name: trimmed,
      definition: definition.trim().slice(0, 500),
      objective_id: objectiveId,
      unit: unit.trim() || null,
      frequency,
      baseline,
      target,
      current_value: currentValue,
      threshold_green: thresholdGreen,
      threshold_yellow: thresholdYellow,
      threshold_red: thresholdRed,
      weight_percent: weightPercent,
    } as any;

    let kpiId = kpi?.id;

    if (kpi) {
      const { error } = await supabase.from('kpis').update(payload).eq('id', kpi.id);
      if (error) { setSaving(false); toast.error(error.message); return; }
    } else {
      const { data, error } = await supabase.from('kpis').insert(payload).select('id').single();
      if (error) { setSaving(false); toast.error(error.message); return; }
      kpiId = data.id;
    }

    // Upsert a kpi_measurement for the current month so the grid reflects the value
    if (kpiId && currentValue > 0) {
      const now = new Date();
      const periodDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      // Check if measurement already exists for this month
      const { data: existing } = await supabase
        .from('kpi_measurements')
        .select('id')
        .eq('kpi_id', kpiId)
        .gte('period_date', periodDate)
        .lt('period_date', `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`)
        .maybeSingle();

      if (existing) {
        await supabase.from('kpi_measurements').update({ value: currentValue }).eq('id', existing.id);
      } else {
        await supabase.from('kpi_measurements').insert({
          kpi_id: kpiId,
          period_date: periodDate,
          value: currentValue,
          created_by: (await supabase.auth.getUser()).data.user?.id ?? '',
        });
      }
    }

    setSaving(false);
    toast.success(kpi ? 'Indicador actualizado' : 'Indicador creado');
    qc.invalidateQueries({ queryKey: ['kpis'] });
    qc.invalidateQueries({ queryKey: ['kpi_measurements'] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{kpi ? 'Editar Indicador' : 'Nuevo Indicador'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} maxLength={100} required />
          </div>
          <div className="space-y-2">
            <Label>Definición</Label>
            <Textarea value={definition} onChange={e => setDefinition(e.target.value)} maxLength={500} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={filterAreaId} onValueChange={v => { setFilterAreaId(v); setFilterSubareaId('all'); setObjectiveId(''); }}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las áreas</SelectItem>
                  {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subárea</Label>
              <Select value={filterSubareaId} onValueChange={v => { setFilterSubareaId(v); setObjectiveId(''); }}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las subáreas</SelectItem>
                  {filteredSubareas.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Objetivo *</Label>
              <SearchableSelect
                value={objectiveId}
                onValueChange={setObjectiveId}
                options={filteredObjectives.map(o => ({ value: o.id, label: o.title }))}
                placeholder="Seleccionar..."
                searchPlaceholder="Buscar objetivo..."
                className="w-full"
              />
              {filteredObjectives.length === 0 && (
                <p className="text-xs text-muted-foreground">No hay objetivos para el filtro seleccionado</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select value={frequency} onValueChange={v => setFrequency(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Ej: %" maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label>Línea Base</Label>
              <Input type="number" value={baseline} onChange={e => setBaseline(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Meta</Label>
              <Input type="number" value={target} onChange={e => setTarget(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Actual</Label>
              <Input type="number" value={currentValue} onChange={e => setCurrentValue(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Peso (%)</Label>
              <Input type="number" value={weightPercent} onChange={e => setWeightPercent(Number(e.target.value))} min={0} max={100} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Umbral Verde ≥</Label>
              <Input type="number" value={thresholdGreen} onChange={e => setThresholdGreen(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Umbral Amarillo ≥</Label>
              <Input type="number" value={thresholdYellow} onChange={e => setThresholdYellow(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Umbral Rojo &lt;</Label>
              <Input type="number" value={thresholdRed} onChange={e => setThresholdRed(Number(e.target.value))} />
            </div>
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
