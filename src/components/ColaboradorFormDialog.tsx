import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePositions } from '@/hooks/useSupabaseData';
import { getRoleLabel } from '@/types';
import type { Enums } from '@/integrations/supabase/types';
import { Constants } from '@/integrations/supabase/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: Tables<'profiles'> | null;
  areas: Tables<'areas'>[];
  subareas: Tables<'subareas'>[];
  membership?: Tables<'memberships'> | null;
  userRole?: Enums<'app_role'> | null;
  defaultAreaId?: string;
  defaultSubareaId?: string;
}

export default function ColaboradorFormDialog({ open, onOpenChange, profile, areas, subareas, membership, userRole, defaultAreaId, defaultSubareaId }: Props) {
  const { isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: positions = [] } = usePositions();
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Basic fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [birthday, setBirthday] = useState('');
  const [sexo, setSexo] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [correoPersonal, setCorreoPersonal] = useState('');
  const [tipoContrato, setTipoContrato] = useState('');

  // Tallas
  const [tallaPantalon, setTallaPantalon] = useState('');
  const [tallaCamisa, setTallaCamisa] = useState('');
  const [tallaZapatos, setTallaZapatos] = useState('');

  // Nuevos campos
  const [lugarNacimiento, setLugarNacimiento] = useState('');
  const [rh, setRh] = useState('');
  const [estadoCivil, setEstadoCivil] = useState('');
  const [nivelEducativo, setNivelEducativo] = useState('');
  const [arlField, setArlField] = useState('');
  const [jefeInmediato, setJefeInmediato] = useState('');

  // Seguridad social
  const [entidadSalud, setEntidadSalud] = useState('');
  const [fondoPensiones, setFondoPensiones] = useState('');
  const [fondoCesantias, setFondoCesantias] = useState('');

  // Membership & Role
  const [areaId, setAreaId] = useState('');
  const [subareaId, setSubareaId] = useState('');
  const [role, setRole] = useState('');

  const isEditing = !!profile;
  const filteredSubareas = subareas.filter(s => s.area_id === areaId);
  const filteredPositions = positions.filter((p: any) =>
    (!areaId || p.area_id === areaId) && (!subareaId || !p.subarea_id || p.subarea_id === subareaId)
  );

  useEffect(() => {
    if (profile) {
      const p = profile as any;
      setName(p.name ?? '');
      setEmail(p.email ?? '');
      setIdentificacion(p.identificacion ?? '');
      setPhone(p.phone ?? '');
      setPosition(p.position ?? '');
      setBirthday(p.birthday ?? '');
      setSexo(p.sexo ?? '');
      setMunicipio(p.municipio ?? '');
      setDireccion(p.direccion ?? '');
      setFechaIngreso(p.fecha_ingreso ?? '');
      setCorreoPersonal(p.correo_personal ?? '');
      setTipoContrato(p.tipo_contrato ?? '');
      setTallaPantalon(p.talla_pantalon ?? '');
      setTallaCamisa(p.talla_camisa ?? '');
      setTallaZapatos(p.talla_zapatos ?? '');
      setEntidadSalud(p.entidad_salud ?? '');
      setFondoPensiones(p.fondo_pensiones ?? '');
      setFondoCesantias(p.fondo_cesantias ?? '');
      setLugarNacimiento(p.lugar_nacimiento ?? '');
      setRh(p.rh ?? '');
      setEstadoCivil(p.estado_civil ?? '');
      setNivelEducativo(p.nivel_educativo ?? '');
      setArlField(p.arl ?? '');
      setJefeInmediato(p.jefe_inmediato ?? '');
      setAvatarPreview(p.avatar || null);
      setAreaId(membership?.area_id ?? '');
      setSubareaId(membership?.subarea_id ?? '');
      setRole(userRole ?? '');
    } else {
      setName(''); setEmail(''); setIdentificacion(''); setPhone(''); setPosition('');
      setBirthday(''); setSexo(''); setMunicipio(''); setDireccion('');
      setFechaIngreso(''); setCorreoPersonal(''); setTipoContrato('');
      setTallaPantalon(''); setTallaCamisa(''); setTallaZapatos('');
      setEntidadSalud(''); setFondoPensiones(''); setFondoCesantias('');
      setLugarNacimiento(''); setRh(''); setEstadoCivil('');
      setNivelEducativo(''); setArlField(''); setJefeInmediato('');
      setAvatarPreview(null); setAvatarFile(null);
      setAreaId(defaultAreaId || ''); setSubareaId(defaultSubareaId || ''); setRole('');
    }
  }, [profile, membership, open]);

  useEffect(() => {
    if (!filteredSubareas.find(s => s.id === subareaId)) setSubareaId('');
    // Reset position when area changes if current position doesn't belong to new area
    const posForArea = positions.filter((p: any) => !areaId || p.area_id === areaId);
    if (position && !posForArea.find((p: any) => p.name === position)) setPosition('');
  }, [areaId]);

  useEffect(() => {
    // Reset position when subarea changes if current position doesn't match
    const posForSub = positions.filter((p: any) =>
      (!areaId || p.area_id === areaId) && (!subareaId || !p.subarea_id || p.subarea_id === subareaId)
    );
    if (position && !posForSub.find((p: any) => p.name === position)) setPosition('');
  }, [subareaId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('La imagen no debe superar 2MB'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null;
    const ext = avatarFile.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
    if (error) { toast.error('Error subiendo foto: ' + error.message); return null; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedCorreoPersonal = correoPersonal.trim();
    const loginEmail = trimmedEmail || trimmedCorreoPersonal;
    if (!trimmedName) { toast.error('El nombre es obligatorio'); return; }
    if (!identificacion.trim()) { toast.error('La identificación es obligatoria'); return; }
    if (!loginEmail && !isEditing) { toast.error('Debe ingresar al menos un correo (corporativo o personal)'); return; }

    setSaving(true);

    const profilePayload: any = {
      name: trimmedName,
      phone: phone.trim() || null,
      position: position.trim() || null,
      birthday: birthday || null,
      identificacion: identificacion.trim() || null,
      sexo: sexo || null,
      municipio: municipio.trim() || null,
      direccion: direccion.trim() || null,
      fecha_ingreso: fechaIngreso || null,
      correo_personal: correoPersonal.trim() || null,
      tipo_contrato: tipoContrato || null,
      talla_pantalon: tallaPantalon.trim() || null,
      talla_camisa: tallaCamisa.trim() || null,
      talla_zapatos: tallaZapatos.trim() || null,
      entidad_salud: entidadSalud.trim() || null,
      fondo_pensiones: fondoPensiones.trim() || null,
      fondo_cesantias: fondoCesantias.trim() || null,
    };

    if (isEditing) {
      const avatarUrl = await uploadAvatar(profile!.id);
      if (avatarUrl) profilePayload.avatar = avatarUrl;
      if (isSuperAdmin && email.trim()) profilePayload.email = email.trim();

      const { error } = await supabase.from('profiles').update(profilePayload).eq('id', profile!.id);
      if (error) { toast.error(error.message); setSaving(false); return; }

      if (areaId) {
        if (membership) {
          await supabase.from('memberships').update({ area_id: areaId, subarea_id: subareaId || null }).eq('id', membership.id);
        } else {
          await supabase.from('memberships').insert({ user_id: profile!.id, area_id: areaId, subarea_id: subareaId || null });
        }
      }
      // Upsert role
      if (role) {
        const { data: existingRole } = await supabase.from('user_roles').select('id').eq('user_id', profile!.id).maybeSingle();
        if (existingRole) {
          await supabase.from('user_roles').update({ role: role as Enums<'app_role'> }).eq('id', existingRole.id);
        } else {
          await supabase.from('user_roles').insert({ user_id: profile!.id, role: role as Enums<'app_role'> });
        }
      }
      toast.success('Colaborador actualizado');
    } else {
      let userId: string;

      if (loginEmail) {
        // Create auth user via edge function using the available email
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ email: loginEmail, name: trimmedName }),
        });
        const result = await res.json();
        if (!res.ok) { toast.error(result.error || 'Error creando usuario'); setSaving(false); return; }
        userId = result.user_id;
        // Store the login email as the profile email
        profilePayload.email = loginEmail;
      } else {
        // Create profile-only (no auth account)
        userId = crypto.randomUUID();
        profilePayload.id = userId;
        profilePayload.email = `sin-correo-${userId.slice(0, 8)}@placeholder.local`;
        const { error } = await supabase.from('profiles').insert(profilePayload);
        if (error) { toast.error(error.message); setSaving(false); return; }
      }

      const avatarUrl = await uploadAvatar(userId);
      if (avatarUrl) profilePayload.avatar = avatarUrl;

      if (trimmedEmail) {
        // Update the profile created by auth trigger
        await supabase.from('profiles').update(profilePayload).eq('id', userId);
      } else if (avatarUrl) {
        // Only update avatar for profile-only
        await supabase.from('profiles').update({ avatar: avatarUrl }).eq('id', userId);
      }

      if (areaId) {
        await supabase.from('memberships').insert({ user_id: userId, area_id: areaId, subarea_id: subareaId || null });
      }
      if (role) {
        await supabase.from('user_roles').insert({ user_id: userId, role: role as Enums<'app_role'> });
      }
      toast.success('Colaborador creado exitosamente.');
    }

    setSaving(false);
    qc.invalidateQueries({ queryKey: ['profiles'] });
    qc.invalidateQueries({ queryKey: ['memberships'] });
    qc.invalidateQueries({ queryKey: ['user_roles'] });
    onOpenChange(false);
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-3 pb-1 border-b border-border">{children}</h3>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{isEditing ? 'Editar Colaborador' : 'Nuevo Colaborador'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div
                className="relative w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-border hover:border-primary transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Foto de perfil</p>
                <p>JPG, PNG. Máximo 2MB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Información Personal */}
            <SectionTitle>Información Personal</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre completo *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} maxLength={100} required />
              </div>
              <div className="space-y-1.5">
                <Label>Identificación *</Label>
                <Input value={identificacion} onChange={e => setIdentificacion(e.target.value)} maxLength={30} placeholder="Cédula / Pasaporte" required />
              </div>
              <div className="space-y-1.5">
                <Label>Sexo</Label>
                <Select value={sexo} onValueChange={setSexo}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="femenino">Femenino</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cumpleaños</Label>
                <Input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Municipio</Label>
                <Input value={municipio} onChange={e => setMunicipio(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Dirección</Label>
                <Input value={direccion} onChange={e => setDireccion(e.target.value)} maxLength={200} />
              </div>
            </div>

            {/* Contacto */}
            <SectionTitle>Contacto</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Correo Corporativo</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={255} disabled={isEditing && !isSuperAdmin} placeholder="Para login (si no hay personal)" />
              </div>
              <div className="space-y-1.5">
                <Label>Correo Personal</Label>
                <Input type="email" value={correoPersonal} onChange={e => setCorreoPersonal(e.target.value)} maxLength={255} placeholder="Para login (si no hay corporativo)" />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono Particular</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} />
              </div>
              {!isEditing && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">📧 Se usará el correo corporativo para crear la cuenta de acceso. Si no tiene, se usará el correo personal.</p>
                </div>
              )}
            </div>

            {/* Información Laboral */}
            <SectionTitle>Información Laboral</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Área</Label>
                <Select value={areaId} onValueChange={setAreaId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar área" /></SelectTrigger>
                  <SelectContent>
                    {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subárea</Label>
                <Select value={subareaId} onValueChange={setSubareaId} disabled={!areaId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar subárea" /></SelectTrigger>
                  <SelectContent>
                    {filteredSubareas.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cargo</Label>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cargo" /></SelectTrigger>
                  <SelectContent>
                    {filteredPositions.map((p: any) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rol del Sistema</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.app_role.map(r => (
                      <SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Contrato</Label>
                <Select value={tipoContrato} onValueChange={setTipoContrato}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indefinido">Indefinido</SelectItem>
                    <SelectItem value="fijo">Término Fijo</SelectItem>
                    <SelectItem value="obra_labor">Obra o Labor</SelectItem>
                    <SelectItem value="prestacion_servicios">Prestación de Servicios</SelectItem>
                    <SelectItem value="aprendizaje">Aprendizaje</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de Ingreso</Label>
                <Input type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} />
              </div>
            </div>

            {/* Tallas de Uniformes */}
            <SectionTitle>Tallas de Uniformes</SectionTitle>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Pantalón</Label>
                <Input value={tallaPantalon} onChange={e => setTallaPantalon(e.target.value)} maxLength={10} placeholder="Ej: 32" />
              </div>
              <div className="space-y-1.5">
                <Label>Camisa</Label>
                <Input value={tallaCamisa} onChange={e => setTallaCamisa(e.target.value)} maxLength={10} placeholder="Ej: M" />
              </div>
              <div className="space-y-1.5">
                <Label>Zapatos</Label>
                <Input value={tallaZapatos} onChange={e => setTallaZapatos(e.target.value)} maxLength={10} placeholder="Ej: 42" />
              </div>
            </div>

            {/* Seguridad Social */}
            <SectionTitle>Seguridad Social</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Entidad de Salud (EPS)</Label>
                <Input value={entidadSalud} onChange={e => setEntidadSalud(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label>Fondo de Pensiones</Label>
                <Input value={fondoPensiones} onChange={e => setFondoPensiones(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label>Fondo de Cesantías</Label>
                <Input value={fondoCesantias} onChange={e => setFondoCesantias(e.target.value)} maxLength={100} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
