import { useState, useMemo } from 'react';
import { useProfiles, useUserRoles } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Search, KeyRound, Shield, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin_area', label: 'Admin de Área' },
  { value: 'gestor_area', label: 'Gestor de Área' },
  { value: 'lider_subarea', label: 'Líder de Subárea' },
  { value: 'colaborador', label: 'Colaborador' },
  { value: 'solo_lectura', label: 'Solo Lectura' },
];

const roleLabel = (r: string) => ROLE_OPTIONS.find(o => o.value === r)?.label ?? r;

export default function UserManagementSection() {
  const { data: profiles = [], isLoading } = useProfiles();
  const { data: userRoles = [] } = useUserRoles();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [pwdOpen, setPwdOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [target, setTarget] = useState<{ id: string; name: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('colaborador');
  const [busy, setBusy] = useState(false);

  const rolesByUser = useMemo(() => {
    const m: Record<string, AppRole[]> = {};
    for (const r of userRoles) {
      (m[r.user_id] ||= []).push(r.role as AppRole);
    }
    return m;
  }, [userRoles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      p =>
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q),
    );
  }, [profiles, search]);

  const openPassword = (p: any) => {
    setTarget({ id: p.id, name: p.name, email: p.email });
    setNewPassword('');
    setNewPassword2('');
    setPwdOpen(true);
  };

  const openRole = (p: any) => {
    setTarget({ id: p.id, name: p.name, email: p.email });
    setNewRole((rolesByUser[p.id]?.[0] as AppRole) ?? 'colaborador');
    setRoleOpen(true);
  };

  const handleResetPassword = async () => {
    if (!target) return;
    if (newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== newPassword2) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setBusy(true);
    const { error } = await supabase.functions.invoke('reset-user-password', {
      body: { email: target.email, password: newPassword },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? 'Error al cambiar la contraseña');
      return;
    }
    toast.success(`Contraseña actualizada para ${target.name}`);
    setPwdOpen(false);
  };

  const handleAssignRole = async () => {
    if (!target) return;
    setBusy(true);
    // Replace user's roles with the selected one (single role per user model)
    const { error: delErr } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', target.id);
    if (delErr) {
      setBusy(false);
      toast.error(delErr.message);
      return;
    }
    const { error: insErr } = await supabase
      .from('user_roles')
      .insert({ user_id: target.id, role: newRole });
    setBusy(false);
    if (insErr) {
      toast.error(insErr.message);
      return;
    }
    toast.success(`Rol asignado a ${target.name}`);
    qc.invalidateQueries({ queryKey: ['user_roles'] });
    setRoleOpen(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="pl-9 h-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} usuarios</p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Usuario</th>
              <th className="text-left px-4 py-2 font-medium">Correo</th>
              <th className="text-left px-4 py-2 font-medium">Rol(es)</th>
              <th className="text-right px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Sin resultados</td></tr>
            ) : filtered.map(p => {
              const userRoleList = rolesByUser[p.id] ?? [];
              return (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{p.email}</td>
                  <td className="px-4 py-2">
                    {userRoleList.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">Sin rol</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {userRoleList.map(r => (
                          <span key={r} className="text-xs bg-muted px-2 py-0.5 rounded-full">{roleLabel(r)}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => openRole(p)}>
                        <Shield className="w-3.5 h-3.5 mr-1" /> Rol
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openPassword(p)}>
                        <KeyRound className="w-3.5 h-3.5 mr-1" /> Contraseña
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Password dialog */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              {target ? `${target.name} — ${target.email}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nueva contraseña</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <Label>Confirmar contraseña</Label>
              <Input
                type="password"
                value={newPassword2}
                onChange={e => setNewPassword2(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdOpen(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={handleResetPassword} disabled={busy}>
              {busy ? 'Actualizando...' : 'Actualizar contraseña'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role dialog */}
      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar rol</DialogTitle>
            <DialogDescription>
              {target ? `${target.name} — ${target.email}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Rol</Label>
              <SearchableSelect
                value={newRole}
                onValueChange={(v) => setNewRole(v as AppRole)}
                options={ROLE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                placeholder="Selecciona un rol"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Esta acción reemplaza el rol actual del usuario.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={handleAssignRole} disabled={busy}>
              {busy ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}