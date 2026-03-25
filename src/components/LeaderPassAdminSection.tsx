import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ClipboardList, GripVertical } from 'lucide-react';

interface Activity {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  sort_order: number;
}

function useLeaderPassActivities() {
  return useQuery({
    queryKey: ['leader_pass_activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leader_pass_activities')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as Activity[];
    },
  });
}

interface Props {
  canManage: boolean;
}

export default function LeaderPassAdminSection({ canManage }: Props) {
  const { data: activities = [], isLoading } = useLeaderPassActivities();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [form, setForm] = useState({ name: '', description: '', frequency: '', sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', description: '', frequency: 'Mensual', sort_order: activities.length + 1 });
    setDialogOpen(true);
  };

  const openEdit = (a: Activity) => {
    setEditing(a);
    setForm({ name: a.name, description: a.description || '', frequency: a.frequency, sort_order: a.sort_order });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.frequency.trim()) {
      toast.error('Nombre y frecuencia son obligatorios');
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('leader_pass_activities').update({
        name: form.name.trim(),
        description: form.description.trim(),
        frequency: form.frequency.trim(),
        sort_order: form.sort_order,
      }).eq('id', editing.id);
      if (error) toast.error(error.message);
      else toast.success('Actividad actualizada');
    } else {
      const { error } = await supabase.from('leader_pass_activities').insert({
        name: form.name.trim(),
        description: form.description.trim(),
        frequency: form.frequency.trim(),
        sort_order: form.sort_order,
      });
      if (error) toast.error(error.message);
      else toast.success('Actividad creada');
    }
    setSaving(false);
    setDialogOpen(false);
    qc.invalidateQueries({ queryKey: ['leader_pass_activities'] });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('leader_pass_activities').delete().eq('id', deleteId);
    if (error) toast.error(error.message);
    else toast.success('Actividad eliminada');
    setDeleteId(null);
    qc.invalidateQueries({ queryKey: ['leader_pass_activities'] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            Guía de Actividades — Leader Pass
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{activities.length} actividades registradas</p>
        </div>
        {canManage && (
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Nueva Actividad
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">Cargando...</div>
      ) : activities.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <ClipboardList className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
          <p>No hay actividades registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((a, idx) => (
            <div key={a.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
                    {a.sort_order}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{a.name}</p>
                    <span className="inline-block text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded mt-1">
                      {a.frequency}
                    </span>
                    {a.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{a.description}</p>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(a.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Actividad' : 'Nueva Actividad'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Nombre *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: One to One" />
            </div>
            <div>
              <label className="text-sm font-medium">Frecuencia *</label>
              <Input value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} placeholder="Ej: Mensual, Semanal" />
            </div>
            <div>
              <label className="text-sm font-medium">Orden</label>
              <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Descripción de la actividad..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar actividad?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará la actividad del programa Leader Pass.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
