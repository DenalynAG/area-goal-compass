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
import { useSystemParameters } from '@/hooks/useSupabaseData';
import type { Tables } from '@/integrations/supabase/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objective?: Tables<'objectives'> | null;
  areas: Tables<'areas'>[];
  subareas: Tables<'subareas'>[];
  profiles: Tables<'profiles'>[];
}

export default function ObjetivoFormDialog({ open, onOpenChange, objective, areas, subareas, profiles }: Props) {
  const qc = useQueryClient();
  const { data: systemParams = [] } = useSystemParameters();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scopeType, setScopeType] = useState<'area' | 'subarea'>('area');
  const [scopeId, setScopeId] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [priority, setPriority] = useState<'alta' | 'media' | 'baja'>('media');
  const [status, setStatus] = useState('borrador');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [period, setPeriod] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  // Derive status options and default period from system parameters
  const statusOptions = useMemo(() => {
    const param = systemParams.find(p => p.key === 'estados_objetivo');
    if (!param) return [
      { value: 'borrador', label: 'Borrador' },
      { value: 'activo', label: 'Activo' },
      { value: 'en_riesgo', label: 'En Riesgo' },
      { value: 'cerrado', label: 'Cerrado' },
    ];
    return param.value.split(',').map(s => {
      const label = s.trim();
      const value = label.toLowerCase().replace(/ /g, '_');
      return { value, label };
    });
  }, [systemParams]);

  const defaultPeriod = useMemo(() => {
    return systemParams.find(p => p.key === 'periodo_actual')?.value ?? '';
  }, [systemParams]);

  const scopeOptions = scopeType === 'area' ? areas : subareas;

  useEffect(() => {
    if (objective) {
      setTitle(objective.title);
      setDescription(objective.description ?? '');
      setScopeType(objective.scope_type as 'area' | 'subarea');
      setScopeId(objective.scope_id);
      setOwnerUserId(objective.owner_user_id ?? '');
      setPriority(objective.priority);
      setStatus(objective.status);
      setStartDate(objective.start_date ?? '');
      setEndDate(objective.end_date ?? '');
      setPeriod(objective.period ?? '');
      setProgressPercent(objective.progress_percent);
    } else {
      setTitle(''); setDescription(''); setScopeType('area'); setScopeId('');
      setOwnerUserId(''); setPriority('media'); setStatus(statusOptions[0]?.value ?? 'borrador');
      setStartDate(''); setEndDate(''); setPeriod(defaultPeriod); setProgressPercent(0);
    }
  }, [objective, open, defaultPeriod, statusOptions]);

  useEffect(() => {
    if (!scopeOptions.find((s: any) => s.id === scopeId)) setScopeId('');
  }, [scopeType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) { toast.error('El título es obligatorio'); return; }
    if (!scopeId) { toast.error('Selecciona el alcance'); return; }

    setSaving(true);
    const payload = {
      title: trimmed,
      description: description.trim().slice(0, 1000),
      scope_type: scopeType,
      scope_id: scopeId,
      owner_user_id: ownerUserId || null,
      priority,
      status: status as any,
      start_date: startDate || null,
      end_date: endDate || null,
      period: period.trim() || null,
      progress_percent: Math.min(100, Math.max(0, progressPercent)),
    };

    const { error } = objective
      ? await supabase.from('objectives').update(payload).eq('id', objective.id)
      : await supabase.from('objectives').insert(payload);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(objective ? 'Objetivo actualizado' : 'Objetivo creado');
    qc.invalidateQueries({ queryKey: ['objectives'] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{objective ? 'Editar Objetivo' : 'Nuevo Objetivo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} required />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Alcance *</Label>
              <Select value={scopeType} onValueChange={v => setScopeType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="area">Área</SelectItem>
                  <SelectItem value="subarea">Subárea</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{scopeType === 'area' ? 'Área' : 'Subárea'} *</Label>
              <Select value={scopeId} onValueChange={setScopeId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {scopeOptions.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsable</Label>
              <SearchableSelect
                value={ownerUserId}
                onValueChange={setOwnerUserId}
                options={profiles.map(p => ({ value: p.id, label: p.name }))}
                placeholder="Seleccionar..."
                searchPlaceholder="Buscar responsable..."
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={v => setPriority(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Período</Label>
              <Input value={period} onChange={e => setPeriod(e.target.value)} placeholder={defaultPeriod || 'Ej: Q1 2025'} maxLength={50} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Avance %</Label>
              <Input type="number" min={0} max={100} value={progressPercent} onChange={e => setProgressPercent(Number(e.target.value))} />
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
