import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
}

export default function KPIFormDialog({ open, onOpenChange, kpi, objectives }: Props) {
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
    } else {
      setName(''); setDefinition(''); setObjectiveId(''); setUnit('');
      setFrequency('mensual'); setBaseline(0); setTarget(0); setCurrentValue(0);
      setThresholdGreen(0); setThresholdYellow(0); setThresholdRed(0);
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
    };

    const { error } = kpi
      ? await supabase.from('kpis').update(payload).eq('id', kpi.id)
      : await supabase.from('kpis').insert(payload);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(kpi ? 'Indicador actualizado' : 'Indicador creado');
    qc.invalidateQueries({ queryKey: ['kpis'] });
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
              <Label>Objetivo *</Label>
              <Select value={objectiveId} onValueChange={setObjectiveId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {objectives.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
                </SelectContent>
              </Select>
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
          <div className="space-y-2">
            <Label>Valor Actual</Label>
            <Input type="number" value={currentValue} onChange={e => setCurrentValue(Number(e.target.value))} />
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
