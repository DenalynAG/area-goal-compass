import { useState, useRef, useMemo } from 'react';
import { useProfiles, useMemberships, useUserRoles, useAreas, useSubareas, getAreaNameFromList, getSubareaNameFromList } from '@/hooks/useSupabaseData';
import { getRoleLabel } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Mail, Phone, Edit, Upload } from 'lucide-react';
import type { Enums, Tables } from '@/integrations/supabase/types';
import ColaboradorFormDialog from '@/components/ColaboradorFormDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ColaboradoresPageProps {
  areaFilterName?: string;
}

export default function ColaboradoresPage({ areaFilterName }: ColaboradoresPageProps = {}) {
  const { data: profiles = [], isLoading } = useProfiles();
  const { data: memberships = [] } = useMemberships();
  const { data: userRoles = [] } = useUserRoles();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) { toast.error('El archivo está vacío'); setImporting(false); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Debes iniciar sesión'); setImporting(false); return; }

      let imported = 0;
      let errors = 0;

      for (const row of rows) {
        const name = (row['Nombre'] || row['Nombre completo'] || '').toString().trim();
        const email = (row['Correo'] || row['Email'] || row['Correo Corporativo'] || '').toString().trim();
        if (!name) { errors++; continue; }

        let userId: string;

        if (email) {
          // Create auth user via edge function
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ email, name }),
          });
          const result = await res.json();
          if (!res.ok) { errors++; continue; }
          userId = result.user_id;
        } else {
          // Profile-only (no auth account)
          userId = crypto.randomUUID();
          const { error } = await supabase.from('profiles').insert({
            id: userId,
            name,
            email: `sin-correo-${userId.slice(0, 8)}@placeholder.local`,
          });
          if (error) { errors++; continue; }
        }

        // Update profile with extra fields
        const profileUpdate: any = {};
        if (row['Identificación'] || row['Identificacion']) profileUpdate.identificacion = (row['Identificación'] || row['Identificacion']).toString().trim();
        if (row['Teléfono'] || row['Telefono']) profileUpdate.phone = (row['Teléfono'] || row['Telefono']).toString().trim();
        if (row['Cargo']) profileUpdate.position = row['Cargo'].toString().trim();
        if (row['Municipio']) profileUpdate.municipio = row['Municipio'].toString().trim();
        if (row['Dirección'] || row['Direccion']) profileUpdate.direccion = (row['Dirección'] || row['Direccion']).toString().trim();
        if (row['Fecha de Ingreso'] || row['Fecha Ingreso']) profileUpdate.fecha_ingreso = (row['Fecha de Ingreso'] || row['Fecha Ingreso']).toString().trim();
        if (row['Correo Personal']) profileUpdate.correo_personal = row['Correo Personal'].toString().trim();
        if (row['Tipo Contrato']) profileUpdate.tipo_contrato = row['Tipo Contrato'].toString().trim();
        if (row['Sexo']) profileUpdate.sexo = row['Sexo'].toString().trim().toLowerCase();

        if (Object.keys(profileUpdate).length > 0) {
          await supabase.from('profiles').update(profileUpdate).eq('id', userId);
        }

        // Assign area/subarea membership
        const areaName = (row['Área'] || row['Area'] || '').toString().trim();
        if (areaName) {
          const foundArea = areas.find(a => a.name.toLowerCase() === areaName.toLowerCase());
          if (foundArea) {
            const subareaName = (row['Subárea'] || row['Subarea'] || row['Sub Área'] || '').toString().trim();
            const foundSub = subareaName ? subareas.find(s => s.area_id === foundArea.id && s.name.toLowerCase() === subareaName.toLowerCase()) : null;
            await supabase.from('memberships').insert({ user_id: userId, area_id: foundArea.id, subarea_id: foundSub?.id || null });
          }
        }

        // Assign role
        const roleName = (row['Rol'] || '').toString().trim().toLowerCase();
        const roleMap: Record<string, string> = {
          'super admin': 'super_admin', 'admin de área': 'admin_area', 'admin area': 'admin_area',
          'líder de subárea': 'lider_subarea', 'lider subarea': 'lider_subarea',
          'colaborador': 'colaborador', 'solo lectura': 'solo_lectura',
        };
        const mappedRole = roleMap[roleName];
        if (mappedRole) {
          await supabase.from('user_roles').insert({ user_id: userId, role: mappedRole as Enums<'app_role'> });
        }

        imported++;
      }

      toast.success(`Importación completada: ${imported} colaboradores creados${errors > 0 ? `, ${errors} errores` : ''}`);
      qc.invalidateQueries({ queryKey: ['profiles'] });
      qc.invalidateQueries({ queryKey: ['memberships'] });
      qc.invalidateQueries({ queryKey: ['user_roles'] });
    } catch (err) {
      toast.error('Error al leer el archivo Excel');
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filter profiles by area if areaFilterName is provided
  const areaFilteredProfiles = useMemo(() => {
    if (!areaFilterName) return profiles;
    const area = areas.find(a => a.name === areaFilterName);
    if (!area) return profiles;
    const areaUserIds = new Set(memberships.filter(m => m.area_id === area.id).map(m => m.user_id));
    return profiles.filter(p => areaUserIds.has(p.id));
  }, [profiles, areaFilterName, areas, memberships]);

  const filtered = areaFilteredProfiles.filter(c =>
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
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="w-4 h-4 mr-2" />
            {importing ? 'Importando...' : 'Importar Excel'}
          </Button>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nuevo Colaborador</Button>
        </div>
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

      <div className="bg-muted/30 rounded-lg px-4 py-3">
        <p className="text-xs text-muted-foreground">
          📋 Para importar, usa un archivo Excel con columnas: <strong>Nombre</strong>, <strong>Correo</strong> (obligatorios), y opcionalmente: <strong>Identificación</strong>, <strong>Teléfono</strong>, <strong>Cargo</strong>, <strong>Área</strong>, <strong>Subárea</strong>, <strong>Rol</strong>, <strong>Sexo</strong>, <strong>Municipio</strong>, <strong>Dirección</strong>, <strong>Fecha de Ingreso</strong>, <strong>Tipo Contrato</strong>, <strong>Correo Personal</strong>.
        </p>
      </div>

      <ColaboradorFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profile={editingProfile}
        areas={areas}
        subareas={subareas}
        membership={editingMembership}
        userRole={editingProfile ? getRole(editingProfile.id) : null}
      />
    </div>
  );
}
