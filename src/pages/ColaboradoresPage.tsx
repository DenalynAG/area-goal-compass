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
      const wb = XLSX.read(data, { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows: any[] = XLSX.utils.sheet_to_json(ws);
      // Trim header keys (some Excel files have trailing spaces)
      const rows = rawRows.map(row => {
        const clean: any = {};
        for (const [k, v] of Object.entries(row)) {
          clean[k.trim()] = v;
        }
        return clean;
      });

      if (rows.length === 0) { toast.error('El archivo está vacío'); setImporting(false); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Debes iniciar sesión'); setImporting(false); return; }

      let imported = 0;
      let errors = 0;

      for (const row of rows) {
        const name = (row['Nombre'] || row['Nombre completo'] || row['Nombre Completo'] || '').toString().trim();
        const email = (row['Correo'] || row['Email'] || row['Correo Corporativo'] || row['Correo'] || '').toString().trim();
        if (!name) { errors++; continue; }

        let userId: string;

        if (email) {
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ email, name }),
          });
          const result = await res.json();
          if (!res.ok) { errors++; continue; }
          userId = result.user_id;
        } else {
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
        const fieldMap: [string[], string][] = [
          [['Cedula', 'Identificación', 'Identificacion'], 'identificacion'],
          [['Teléfono', 'Telefono'], 'phone'],
          [['Cargo'], 'position'],
          [['Municipio'], 'municipio'],
          [['Dirección', 'Direccion'], 'direccion'],
          [['Fecha de Ingreso', 'Fecha Ingreso', 'Fecha De Ingreso'], 'fecha_ingreso'],
          [['Correo Personal'], 'correo_personal'],
          [['Tipo Contrato', 'T. Contrato'], 'tipo_contrato'],
          [['Genero', 'Género', 'Sexo'], 'sexo'],
          [['Lugar Nacimiento', 'Lugar de Nacimiento'], 'lugar_nacimiento'],
          [['RH'], 'rh'],
          [['Estado Civil'], 'estado_civil'],
          [['Nivel Educativo'], 'nivel_educativo'],
          [['Arl', 'ARL'], 'arl'],
          [['Jefe Inmediato'], 'jefe_inmediato'],
          [['Fecha De Nacimiento', 'Fecha Nacimiento', 'Cumpleaños'], 'birthday'],
          [['Salud', 'EPS', 'Entidad Salud'], 'entidad_salud'],
          [['Pensión', 'Pension', 'Fondo Pensiones'], 'fondo_pensiones'],
          [['Cesantías', 'Cesantias', 'Fondo Cesantias'], 'fondo_cesantias'],
        ];

        for (const [keys, field] of fieldMap) {
          const rawVal = keys.reduce<any>((acc, k) => acc || row[k], undefined);
          if (rawVal == null) continue;
          // Handle Date objects from xlsx (date cells)
          if (rawVal instanceof Date) {
            profileUpdate[field] = rawVal.toISOString().split('T')[0];
          } else {
            const str = rawVal.toString().trim();
            if (str) profileUpdate[field] = str;
          }
        }

        // Normalize sexo
        if (profileUpdate.sexo) {
          profileUpdate.sexo = profileUpdate.sexo.toLowerCase();
        }

        // Normalize tipo_contrato
        if (profileUpdate.tipo_contrato) {
          const tc = profileUpdate.tipo_contrato.toLowerCase();
          if (tc.includes('indefinido')) profileUpdate.tipo_contrato = 'indefinido';
          else if (tc.includes('fijo')) profileUpdate.tipo_contrato = 'fijo';
          else if (tc.includes('obra') || tc.includes('labor')) profileUpdate.tipo_contrato = 'obra_labor';
          else if (tc.includes('prestaci')) profileUpdate.tipo_contrato = 'prestacion_servicios';
          else if (tc.includes('aprendiz')) profileUpdate.tipo_contrato = 'aprendizaje';
        }

        // Normalize estado_civil
        if (profileUpdate.estado_civil) {
          const ec = profileUpdate.estado_civil.toLowerCase();
          if (ec.includes('solter')) profileUpdate.estado_civil = 'soltero';
          else if (ec.includes('casad')) profileUpdate.estado_civil = 'casado';
          else if (ec.includes('uni')) profileUpdate.estado_civil = 'union_libre';
          else if (ec.includes('divorc')) profileUpdate.estado_civil = 'divorciado';
          else if (ec.includes('viud')) profileUpdate.estado_civil = 'viudo';
        }

        // Normalize nivel_educativo
        if (profileUpdate.nivel_educativo) {
          const ne = profileUpdate.nivel_educativo.toLowerCase();
          if (ne.includes('doctor')) profileUpdate.nivel_educativo = 'doctorado';
          else if (ne.includes('maestr')) profileUpdate.nivel_educativo = 'maestria';
          else if (ne.includes('especial')) profileUpdate.nivel_educativo = 'especializacion';
          else if (ne.includes('profesional')) profileUpdate.nivel_educativo = 'profesional';
          else if (ne.includes('tecnologo') || ne.includes('tecnólogo')) profileUpdate.nivel_educativo = 'tecnologo';
          else if (ne.includes('tecnico') || ne.includes('técnico')) profileUpdate.nivel_educativo = 'tecnico';
          else if (ne.includes('secundar')) profileUpdate.nivel_educativo = 'basica_secundaria';
          else if (ne.includes('primar')) profileUpdate.nivel_educativo = 'basica_primaria';
        }

        // Parse dates that are still strings (Date objects already handled above)
        for (const dateField of ['fecha_ingreso', 'birthday']) {
          if (profileUpdate[dateField] && !/^\d{4}-\d{2}-\d{2}$/.test(profileUpdate[dateField])) {
            const parsed = new Date(profileUpdate[dateField]);
            if (!isNaN(parsed.getTime())) {
              profileUpdate[dateField] = parsed.toISOString().split('T')[0];
            }
          }
        }

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
          <h1 className="page-title">{areaFilterName ? `Colaboradores · ${areaFilterName}` : 'Colaboradores'}</h1>
          <p className="page-subtitle">{areaFilteredProfiles.length} colaboradores registrados</p>
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
          📋 Para importar, usa un archivo Excel con columnas: <strong>Nombre Completo</strong> (obligatorio), y opcionalmente: <strong>Cedula</strong>, <strong>Correo</strong>, <strong>Correo Personal</strong>, <strong>Genero</strong>, <strong>Fecha De Nacimiento</strong>, <strong>Lugar Nacimiento</strong>, <strong>RH</strong>, <strong>Estado Civil</strong>, <strong>Nivel Educativo</strong>, <strong>Fecha Ingreso</strong>, <strong>T. Contrato</strong>, <strong>Cargo</strong>, <strong>Área</strong>, <strong>Subárea</strong>, <strong>Jefe Inmediato</strong>, <strong>Arl</strong>, <strong>Salud</strong>, <strong>Pensión</strong>, <strong>Cesantías</strong>, <strong>Teléfono</strong>, <strong>Dirección</strong>, <strong>Municipio</strong>, <strong>Rol</strong>.
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
