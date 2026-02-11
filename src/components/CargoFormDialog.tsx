import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  position?: any;
}

export default function CargoFormDialog({ open, onOpenChange, position }: Props) {
  const qc = useQueryClient();
  const isEditing = !!position;
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(position?.name ?? '');
  }, [open, position]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    const { error } = isEditing
      ? await supabase.from('positions').update({ name: name.trim() }).eq('id', position.id)
      : await supabase.from('positions').insert({ name: name.trim() });
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
