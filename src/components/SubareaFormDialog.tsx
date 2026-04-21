import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subarea?: Tables<'subareas'> | null;
  areaId: string;
  profiles: Tables<'profiles'>[];
}

export default function SubareaFormDialog({ open, onOpenChange, subarea, areaId, profiles }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leaderUserId, setLeaderUserId] = useState('');
  const [status, setStatus] = useState<'activo' | 'inactivo'>('activo');

  useEffect(() => {
    if (subarea) {
      setName(subarea.name);
      setDescription(subarea.description ?? '');
      setLeaderUserId(subarea.leader_user_id ?? '');
      setStatus(subarea.status);
    } else {
      setName(''); setDescription(''); setLeaderUserId(''); setStatus('activo');
    }
  }, [subarea, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { toast.error('El nombre es obligatorio'); return; }
    if (trimmed.length > 100) { toast.error('Nombre demasiado largo (máx 100)'); return; }

    setSaving(true);
    const payload = {
      name: trimmed,
      description: description.trim().slice(0, 500),
      leader_user_id: leaderUserId || null,
      status,
      area_id: areaId,
    };

    const { error } = subarea
      ? await supabase.from('subareas').update(payload).eq('id', subarea.id)
      : await supabase.from('subareas').insert(payload);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(subarea ? 'Subárea actualizada' : 'Subárea creada');
    qc.invalidateQueries({ queryKey: ['subareas'] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{subarea ? 'Editar Subárea' : 'Nueva Subárea'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} maxLength={100} required />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={500} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Líder</Label>
            <SearchableSelect
              value={leaderUserId}
              onValueChange={setLeaderUserId}
              options={profiles.map(p => ({ value: p.id, label: p.name }))}
              placeholder="Seleccionar líder"
              searchPlaceholder="Buscar líder..."
            />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={status} onValueChange={v => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
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
