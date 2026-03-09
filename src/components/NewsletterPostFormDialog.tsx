import { useState, useEffect, useRef } from 'react';
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
import { ImagePlus, X } from 'lucide-react';
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
  const fileRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<string>('general');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType(post?.type ?? 'general');
      setTitle(post?.title ?? '');
      setContent(post?.content ?? '');
      setTargetUserId(post?.target_user_id ?? '');
      setImageFile(null);
      setImagePreview(post?.image_url ?? '');
    }
  }, [open, post]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no debe superar 5 MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return imagePreview || null;
    const ext = imageFile.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('newsletter').upload(path, imageFile);
    if (error) { toast.error('Error al subir imagen'); return null; }
    const { data } = supabase.storage.from('newsletter').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error('El título es obligatorio'); return; }
    if (!content.trim()) { toast.error('El contenido es obligatorio'); return; }

    setSaving(true);

    const image_url = await uploadImage();

    const payload: any = {
      type,
      title: title.trim(),
      content: content.trim(),
      target_user_id: type === 'reconocimiento' && targetUserId ? targetUserId : null,
      image_url: image_url || null,
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

          {/* Image upload */}
          <div>
            <Label>Imagen (opcional)</Label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            {imagePreview ? (
              <div className="relative mt-2 rounded-xl overflow-hidden border bg-muted">
                <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-destructive hover:bg-background transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-2 w-full h-28 rounded-xl border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-xs font-medium">Agregar imagen</span>
              </button>
            )}
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
