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
  area?: Tables<'areas'> | null;
  profiles: Tables<'profiles'>[];
}

export default function AreaFormDialog({ open, onOpenChange, area, profiles }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leaderUserId, setLeaderUserId] = useState('');
  const [status, setStatus] = useState<'activo' | 'inactivo'>('activo');

  useEffect(() => {
    if (area) {
      setName(area.name);
      setDescription(area.description ?? '');
      setLeaderUserId(area.leader_user_id ?? '');
      setStatus(area.status);
    } else {
      setName(''); setDescription(''); setLeaderUserId(''); setStatus('activo');
    }
  }, [area, open]);

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
    };

    const { error } = area
      ? await supabase.from('areas').update(payload).eq('id', area.id)
      : await supabase.from('areas').insert(payload);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(area ? 'Área actualizada' : 'Área creada');
    qc.invalidateQueries({ queryKey: ['areas'] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{area ? 'Editar Área' : 'Nueva Área'}</DialogTitle>
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
