import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAreas, useSubareas } from '@/hooks/useSupabaseData';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  position?: any;
}

export default function CargoFormDialog({ open, onOpenChange, position }: Props) {
  const qc = useQueryClient();
  const isEditing = !!position;
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();

  const [name, setName] = useState('');
  const [areaId, setAreaId] = useState<string>('');
  const [subareaId, setSubareaId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(position?.name ?? '');
      setAreaId(position?.area_id ?? '');
      setSubareaId(position?.subarea_id ?? '');
    }
  }, [open, position]);

  const filteredSubareas = areaId
    ? subareas.filter(s => s.area_id === areaId)
    : [];

  const handleSave = async () => {
    if (!name.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (!areaId) { toast.error('Selecciona un área'); return; }
    setSaving(true);
    const payload: any = {
      name: name.trim(),
      area_id: areaId,
      subarea_id: subareaId || null,
    };
    const { error } = isEditing
      ? await supabase.from('positions').update(payload).eq('id', position.id)
      : await supabase.from('positions').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isEditing ? 'Cargo actualizado' : 'Cargo creado');
    qc.invalidateQueries({ queryKey: ['positions'] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cargo' : 'Nuevo Cargo'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Área</Label>
            <Select value={areaId} onValueChange={v => { setAreaId(v); setSubareaId(''); }}>
              <SelectTrigger><SelectValue placeholder="Seleccionar área" /></SelectTrigger>
              <SelectContent>
                {areas.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filteredSubareas.length > 0 && (
            <div>
              <Label>Subárea (opcional)</Label>
              <Select value={subareaId || '__none__'} onValueChange={v => setSubareaId(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar subárea" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Ninguna</SelectItem>
                  {filteredSubareas.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Nombre del cargo</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Director/a General" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
