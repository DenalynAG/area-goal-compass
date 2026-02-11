import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profiles: Tables<'profiles'>[];
  post?: any | null;
}

export default function NewsletterPostFormDialog({ open, onOpenChange, profiles, post }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEditing = !!post;

  const [type, setType] = useState<string>('general');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType(post?.type ?? 'general');
      setTitle(post?.title ?? '');
      setContent(post?.content ?? '');
      setTargetUserId(post?.target_user_id ?? '');
    }
  }, [open, post]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error('El título es obligatorio'); return; }
    if (!content.trim()) { toast.error('El contenido es obligatorio'); return; }

    setSaving(true);
    const payload: any = {
      type,
      title: title.trim(),
      content: content.trim(),
      target_user_id: type === 'reconocimiento' && targetUserId ? targetUserId : null,
    };

    const { error } = isEditing
      ? await supabase.from('newsletter_posts').update(payload).eq('id', post.id)
      : await supabase.from('newsletter_posts').insert({ ...payload, created_by: user!.id });

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isEditing ? 'Publicación actualizada' : 'Publicación creada');
    qc.invalidateQueries({ queryKey: ['newsletter_posts'] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Publicación' : 'Nueva Publicación'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Noticia General</SelectItem>
                <SelectItem value="reconocimiento">Reconocimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} />
          </div>

          {type === 'reconocimiento' && (
            <div>
              <Label>Colaborador reconocido</Label>
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar colaborador" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Contenido</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} rows={4} maxLength={2000} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
