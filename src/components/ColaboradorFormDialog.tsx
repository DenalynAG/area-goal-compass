import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: Tables<'profiles'> | null;
  areas: Tables<'areas'>[];
  subareas: Tables<'subareas'>[];
  membership?: Tables<'memberships'> | null;
}

export default function ColaboradorFormDialog({ open, onOpenChange, profile, areas, subareas, membership }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [birthday, setBirthday] = useState('');
  const [areaId, setAreaId] = useState('');
  const [subareaId, setSubareaId] = useState('');

  const isEditing = !!profile;
  const filteredSubareas = subareas.filter(s => s.area_id === areaId);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
      setPhone(profile.phone ?? '');
      setPosition(profile.position ?? '');
      setBirthday((profile as any).birthday ?? '');
      setAreaId(membership?.area_id ?? '');
      setSubareaId(membership?.subarea_id ?? '');
    } else {
      setName(''); setEmail(''); setPhone(''); setPosition(''); setBirthday(''); setAreaId(''); setSubareaId('');
    }
  }, [profile, membership, open]);

  useEffect(() => {
    if (!filteredSubareas.find(s => s.id === subareaId)) setSubareaId('');
  }, [areaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) { toast.error('El nombre es obligatorio'); return; }
    if (!trimmedEmail) { toast.error('El correo es obligatorio'); return; }

    setSaving(true);

    if (isEditing) {
      // Update profile
      const { error } = await supabase.from('profiles').update({
        name: trimmedName,
        phone: phone.trim() || null,
        position: position.trim() || null,
        birthday: birthday || null,
      } as any).eq('id', profile!.id);

      if (error) { toast.error(error.message); setSaving(false); return; }

      // Update membership
      if (areaId) {
        if (membership) {
          await supabase.from('memberships').update({
            area_id: areaId,
            subarea_id: subareaId || null,
          }).eq('id', membership.id);
        } else {
          await supabase.from('memberships').insert({
            user_id: profile!.id,
            area_id: areaId,
            subarea_id: subareaId || null,
          });
        }
      }

      toast.success('Colaborador actualizado');
    } else {
      // Create new user via auth, then profile is auto-created by trigger
      const tempPassword = crypto.randomUUID().slice(0, 12) + 'A1!';
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: tempPassword,
        options: { data: { name: trimmedName } },
      });

      if (authError) { toast.error(authError.message); setSaving(false); return; }
      if (!authData.user) { toast.error('No se pudo crear el usuario'); setSaving(false); return; }

      const userId = authData.user.id;

      // Update profile with extra fields
      await supabase.from('profiles').update({
        phone: phone.trim() || null,
        position: position.trim() || null,
        birthday: birthday || null,
      } as any).eq('id', userId);

      // Create membership
      if (areaId) {
        await supabase.from('memberships').insert({
          user_id: userId,
          area_id: areaId,
          subarea_id: subareaId || null,
        });
      }

      toast.success('Colaborador creado. Se envió invitación por correo.');
    }

    setSaving(false);
    qc.invalidateQueries({ queryKey: ['profiles'] });
    qc.invalidateQueries({ queryKey: ['memberships'] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Colaborador' : 'Nuevo Colaborador'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Nombre completo *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} maxLength={100} required />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Correo electrónico *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={255} required disabled={isEditing} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input value={position} onChange={e => setPosition(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Cumpleaños</Label>
              <Input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={areaId} onValueChange={setAreaId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar área" /></SelectTrigger>
                <SelectContent>
                  {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subárea</Label>
              <Select value={subareaId} onValueChange={setSubareaId} disabled={!areaId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar subárea" /></SelectTrigger>
                <SelectContent>
                  {filteredSubareas.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
