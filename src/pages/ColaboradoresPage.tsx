import { useState } from 'react';
import { useProfiles, useMemberships, useUserRoles, useAreas, useSubareas, getAreaNameFromList, getSubareaNameFromList } from '@/hooks/useSupabaseData';
import { getRoleLabel } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Mail, Phone, Edit } from 'lucide-react';
import type { Enums, Tables } from '@/integrations/supabase/types';
import ColaboradorFormDialog from '@/components/ColaboradorFormDialog';

export default function ColaboradoresPage() {
  const { data: profiles = [], isLoading } = useProfiles();
  const { data: memberships = [] } = useMemberships();
  const { data: userRoles = [] } = useUserRoles();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Tables<'profiles'> | null>(null);
  const [editingMembership, setEditingMembership] = useState<Tables<'memberships'> | null>(null);

  const getRole = (userId: string): Enums<'app_role'> | null => userRoles.find(r => r.user_id === userId)?.role ?? null;
  const getMembership = (userId: string) => memberships.find(m => m.user_id === userId);

  const openNew = () => { setEditingProfile(null); setEditingMembership(null); setDialogOpen(true); };
  const openEdit = (p: Tables<'profiles'>) => {
    setEditingProfile(p);
    setEditingMembership(getMembership(p.id) ?? null);
    setDialogOpen(true);
  };

  const filtered = profiles.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.position ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando colaboradores...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Colaboradores</h1>
          <p className="page-subtitle">{profiles.length} colaboradores registrados</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nuevo Colaborador</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, correo o cargo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Colaborador</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Cargo</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Área</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Subárea</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Rol</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Contacto</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const membership = getMembership(c.id);
                const role = getRole(c.id);
                return (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {(c as any).avatar ? (
                          <img src={(c as any).avatar} alt={c.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                        )}
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{c.position || '—'}</td>
                    <td className="px-5 py-3">{membership ? getAreaNameFromList(areas, membership.area_id) : '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{membership?.subarea_id ? getSubareaNameFromList(subareas, membership.subarea_id) : '—'}</td>
                    <td className="px-5 py-3">
                      {role ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                          {getRoleLabel(role)}
                        </span>
                      ) : <span className="text-muted-foreground text-xs">Sin rol</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <a href={`mailto:${c.email}`} className="text-muted-foreground hover:text-accent" title={c.email}><Mail className="w-4 h-4" /></a>
                        {c.phone && <a href={`tel:${c.phone}`} className="text-muted-foreground hover:text-accent" title={c.phone}><Phone className="w-4 h-4" /></a>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No se encontraron colaboradores</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ColaboradorFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profile={editingProfile}
        areas={areas}
        subareas={subareas}
        membership={editingMembership}
      />
    </div>
  );
}
