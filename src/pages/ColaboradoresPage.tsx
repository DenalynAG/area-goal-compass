import { useState, useRef, useMemo } from 'react';
import { useProfiles, useMemberships, useUserRoles, useAreas, useSubareas, getAreaNameFromList, getSubareaNameFromList } from '@/hooks/useSupabaseData';
import { getRoleLabel } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Upload, Trash2, Eye, CheckCircle2, XCircle, FileText, Download } from 'lucide-react';
import type { Enums, Tables } from '@/integrations/supabase/types';
import ColaboradorFormDialog from '@/components/ColaboradorFormDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface ColaboradoresPageProps {
  areaFilterName?: string;
}

export default function ColaboradoresPage({ areaFilterName }: ColaboradoresPageProps = {}) {
  const { data: profiles = [], isLoading } = useProfiles();
  const { data: memberships = [] } = useMemberships();
  const { data: userRoles = [] } = useUserRoles();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Tables<'profiles'> | null>(null);
  const [editingMembership, setEditingMembership] = useState<Tables<'memberships'> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tables<'profiles'> | null>(null);
  const [detailProfile, setDetailProfile] = useState<Tables<'profiles'> | null>(null);
  const [importReport, setImportReport] = useState<{ success: { row: number; name: string; action: string }[]; errors: { row: number; name: string; reason: string }[] } | null>(null);

  const getRole = (userId: string): Enums<'app_role'> | null => userRoles.find(r => r.user_id === userId)?.role ?? null;
  const getMembership = (userId: string) => memberships.find(m => m.user_id === userId);

  const openNew = () => { setEditingProfile(null); setEditingMembership(null); setDialogOpen(true); };
  const openEdit = (p: Tables<'profiles'>) => {
    setEditingProfile(p);
    setEditingMembership(getMembership(p.id) ?? null);
    setDialogOpen(true);
  };

  const handleDeleteColaborador = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    await supabase.from('memberships').delete().eq('user_id', id);
    await supabase.from('user_roles').delete().eq('user_id', id);
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar colaborador'); }
    else { toast.success('Colaborador eliminado'); }
    setDeleteTarget(null);
    qc.invalidateQueries({ queryKey: ['profiles'] });
    qc.invalidateQueries({ queryKey: ['memberships'] });
    qc.invalidateQueries({ queryKey: ['user_roles'] });
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

      const normalizeDigits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
      const toTitleCase = (value: string) => value.replace(/\b\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      const getRowValue = (rowData: Record<string, any>, keys: string[]) => {
        for (const key of keys) {
          const value = rowData[key];
          if (value !== undefined && value !== null && `${value}`.trim() !== '') return value;
        }
        return undefined;
      };

      const profileByEmail = new Map(
        profiles
          .filter(profile => profile.email)
          .map(profile => [profile.email.trim().toLowerCase(), profile] as const)
      );
      const profileByIdentification = new Map(
        profiles
          .filter(profile => profile.identificacion)
          .map(profile => [normalizeDigits(profile.identificacion), profile] as const)
          .filter(([identification]) => identification)
      );
      const membershipByUserId = new Map(memberships.map(membership => [membership.user_id, membership] as const));
      const roleByUserId = new Map(userRoles.map(roleItem => [roleItem.user_id, roleItem] as const));

      let imported = 0;
      let errors = 0;
      const reportSuccess: { row: number; name: string; action: string }[] = [];
      const reportErrors: { row: number; name: string; reason: string }[] = [];

      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        const rowNum = rowIdx + 2; // Excel row (header = 1)
        try {
          const rawName = getRowValue(row, ['Nombre', 'Nombre completo', 'Nombre Completo']);
          const name = rawName ? toTitleCase(rawName.toString().trim()) : '';
          const emailValue = getRowValue(row, ['Correo', 'Email', 'Correo Corporativo']);
          const email = emailValue ? emailValue.toString().trim().toLowerCase() : '';
          if (!name) { errors++; reportErrors.push({ row: rowNum, name: '(vacío)', reason: 'Nombre vacío o no encontrado' }); continue; }

          const identificationValue = getRowValue(row, ['Cedula', 'Cédula', 'Identificación', 'Identificacion']);
          const identification = identificationValue == null
            ? ''
            : typeof identificationValue === 'number'
              ? String(Math.round(identificationValue))
              : identificationValue.toString().trim();
          const normalizedIdentification = normalizeDigits(identification);

          let matchedProfile = (email ? profileByEmail.get(email) : undefined)
            ?? (normalizedIdentification ? profileByIdentification.get(normalizedIdentification) : undefined)
            ?? null;

          let userId = matchedProfile?.id ?? '';
          const isUpdate = !!matchedProfile;

          if (!userId) {
            if (email && isSuperAdmin) {
              const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ email, name }),
              });
              const result = await res.json().catch(() => ({}));
              if (!res.ok) { errors++; reportErrors.push({ row: rowNum, name, reason: `Error creando usuario: ${result.error || res.statusText}` }); continue; }
              userId = result.user_id;
            } else {
              errors++;
              reportErrors.push({ row: rowNum, name, reason: 'Sin correo corporativo — no se puede crear el usuario' });
              continue;
            }
          }

          const profileUpdate: Record<string, any> = {};
          const fieldMap: [string[], string][] = [
            [['Cedula', 'Cédula', 'Identificación', 'Identificacion'], 'identificacion'],
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
            const rawVal = getRowValue(row, keys);
            if (rawVal == null) continue;
            if (rawVal instanceof Date) {
              profileUpdate[field] = rawVal.toISOString().split('T')[0];
            } else if (typeof rawVal === 'number') {
              profileUpdate[field] = String(Math.round(rawVal));
            } else {
              const str = rawVal.toString().trim();
              if (str) profileUpdate[field] = str;
            }
          }

          for (const tf of ['position', 'lugar_nacimiento', 'jefe_inmediato', 'municipio', 'direccion', 'entidad_salud', 'fondo_pensiones', 'fondo_cesantias', 'arl']) {
            if (profileUpdate[tf] && typeof profileUpdate[tf] === 'string') {
              profileUpdate[tf] = toTitleCase(profileUpdate[tf]);
            }
          }

          if (profileUpdate.sexo) {
            profileUpdate.sexo = profileUpdate.sexo.toLowerCase();
          }

          if (profileUpdate.tipo_contrato) {
            const tc = profileUpdate.tipo_contrato.toLowerCase();
            if (tc.includes('indefinido')) profileUpdate.tipo_contrato = 'indefinido';
            else if (tc.includes('fijo')) profileUpdate.tipo_contrato = 'fijo';
            else if (tc.includes('obra') || tc.includes('labor')) profileUpdate.tipo_contrato = 'obra_labor';
            else if (tc.includes('prestaci')) profileUpdate.tipo_contrato = 'prestacion_servicios';
            else if (tc.includes('aprendiz')) profileUpdate.tipo_contrato = 'aprendizaje';
          }

          if (profileUpdate.estado_civil) {
            const ec = profileUpdate.estado_civil.toLowerCase();
            if (ec.includes('solter')) profileUpdate.estado_civil = 'soltero';
            else if (ec.includes('casad')) profileUpdate.estado_civil = 'casado';
            else if (ec.includes('uni')) profileUpdate.estado_civil = 'union_libre';
            else if (ec.includes('divorc')) profileUpdate.estado_civil = 'divorciado';
            else if (ec.includes('viud')) profileUpdate.estado_civil = 'viudo';
          }

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

          for (const dateField of ['fecha_ingreso', 'birthday']) {
            if (profileUpdate[dateField] && !/^\d{4}-\d{2}-\d{2}$/.test(profileUpdate[dateField])) {
              const parsed = new Date(profileUpdate[dateField]);
              if (!isNaN(parsed.getTime())) {
                profileUpdate[dateField] = parsed.toISOString().split('T')[0];
              }
            }
          }

          const resolvedEmail = email || matchedProfile?.email || `sin-correo-${userId.slice(0, 8)}@placeholder.local`;
          const profilePayload = {
            id: userId,
            name,
            email: resolvedEmail,
            ...profileUpdate,
          };

          const { error: profileError } = await supabase.from('profiles').upsert(profilePayload);
          if (profileError) { errors++; reportErrors.push({ row: rowNum, name, reason: `Error perfil: ${profileError.message}` }); continue; }

          matchedProfile = { ...(matchedProfile ?? {}), ...profilePayload } as Tables<'profiles'>;
          profileByEmail.set(resolvedEmail.toLowerCase(), matchedProfile);
          if (normalizedIdentification) profileByIdentification.set(normalizedIdentification, matchedProfile);

          const areaName = (getRowValue(row, ['Área', 'Area']) || '').toString().trim();
          if (areaName) {
            const foundArea = areas.find(a => a.name.toLowerCase() === areaName.toLowerCase());
            if (foundArea) {
              const subareaName = (getRowValue(row, ['Subárea', 'Subarea', 'Sub Área']) || '').toString().trim();
              const foundSub = subareaName ? subareas.find(s => s.area_id === foundArea.id && s.name.toLowerCase() === subareaName.toLowerCase()) : null;
              const existingMembership = membershipByUserId.get(userId);

              if (existingMembership) {
                const { data: updatedMembership, error: membershipError } = await supabase
                  .from('memberships')
                  .update({ area_id: foundArea.id, subarea_id: foundSub?.id || null })
                  .eq('id', existingMembership.id)
                  .select('*')
                  .maybeSingle();

                if (membershipError) { errors++; reportErrors.push({ row: rowNum, name, reason: `Error membresía: ${membershipError.message}` }); continue; }
                membershipByUserId.set(userId, updatedMembership ?? { ...existingMembership, area_id: foundArea.id, subarea_id: foundSub?.id || null });
              } else {
                const { data: insertedMembership, error: membershipError } = await supabase
                  .from('memberships')
                  .insert({ user_id: userId, area_id: foundArea.id, subarea_id: foundSub?.id || null })
                  .select('*')
                  .maybeSingle();

                if (membershipError) { errors++; reportErrors.push({ row: rowNum, name, reason: `Error membresía: ${membershipError.message}` }); continue; }
                if (insertedMembership) membershipByUserId.set(userId, insertedMembership);
              }
            }
          }

          const roleName = (getRowValue(row, ['Rol']) || '').toString().trim().toLowerCase();
          const roleMap: Record<string, Enums<'app_role'>> = {
            'super admin': 'super_admin',
            'admin de área': 'admin_area',
            'admin area': 'admin_area',
            'líder de subárea': 'lider_subarea',
            'lider subarea': 'lider_subarea',
            'colaborador': 'colaborador',
            'solo lectura': 'solo_lectura',
          };
          const mappedRole = roleMap[roleName];

          if (mappedRole) {
            const existingRole = roleByUserId.get(userId);

            if (existingRole) {
              const { data: updatedRole, error: roleError } = await supabase
                .from('user_roles')
                .update({ role: mappedRole })
                .eq('id', existingRole.id)
                .select('*')
                .maybeSingle();

              if (roleError) { errors++; reportErrors.push({ row: rowNum, name, reason: `Error rol: ${roleError.message}` }); continue; }
              roleByUserId.set(userId, updatedRole ?? { ...existingRole, role: mappedRole });
            } else {
              const { data: insertedRole, error: roleError } = await supabase
                .from('user_roles')
                .insert({ user_id: userId, role: mappedRole })
                .select('*')
                .maybeSingle();

              if (roleError) { errors++; reportErrors.push({ row: rowNum, name, reason: `Error rol: ${roleError.message}` }); continue; }
              if (insertedRole) roleByUserId.set(userId, insertedRole);
            }
          }

          imported++;
          reportSuccess.push({ row: rowNum, name, action: isUpdate ? 'Actualizado' : 'Creado' });
        } catch {
          errors++;
          reportErrors.push({ row: rowNum, name: `Fila ${rowNum}`, reason: 'Error inesperado' });
        }
      }

      setImportReport({ success: reportSuccess, errors: reportErrors });
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
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDetailProfile(c)} title="Ver detalle"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                        {isSuperAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No se encontraron colaboradores</td></tr>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar colaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente a <strong>{deleteTarget?.name}</strong> y sus asignaciones. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteColaborador} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Card Dialog */}
      <Dialog open={!!detailProfile} onOpenChange={open => !open && setDetailProfile(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {detailProfile && (() => {
            const dm = getMembership(detailProfile.id);
            const dr = getRole(detailProfile.id);
            const areaName = dm ? getAreaNameFromList(areas, dm.area_id) : '—';
            const subareaName = dm?.subarea_id ? getSubareaNameFromList(subareas, dm.subarea_id) : '';
            return (
              <div className="flex flex-col">
                {/* Header band */}
                <div className="bg-gradient-to-r from-primary to-primary/70 px-6 py-5 flex items-center gap-5">
                  {detailProfile.avatar ? (
                    <img src={detailProfile.avatar} alt={detailProfile.name} className="w-20 h-20 rounded-xl object-cover border-2 border-primary-foreground/30 shadow-lg" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-primary-foreground/20 flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-lg">
                      {detailProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-primary-foreground truncate">{detailProfile.name}</h3>
                    <p className="text-sm text-primary-foreground/80 truncate">{detailProfile.position || 'Sin cargo'}</p>
                    {dr && (
                      <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-foreground/20 text-primary-foreground">
                        {getRoleLabel(dr)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="px-6 py-4 space-y-3 text-sm">
                  {detailProfile.identificacion && <DetailRow label="Identificación" value={detailProfile.identificacion} />}
                  {detailProfile.sexo && <DetailRow label="Género" value={detailProfile.sexo} />}
                  {detailProfile.rh && <DetailRow label="RH" value={detailProfile.rh} />}
                  <DetailRow label="Área" value={areaName} />
                  {subareaName && <DetailRow label="Subárea" value={subareaName} />}
                  <DetailRow label="Correo" value={detailProfile.email} />
                  {detailProfile.phone && <DetailRow label="Teléfono" value={detailProfile.phone} />}
                  {detailProfile.arl && <DetailRow label="ARL" value={detailProfile.arl} />}
                  {detailProfile.entidad_salud && <DetailRow label="EPS" value={detailProfile.entidad_salud} />}
                  {detailProfile.fecha_ingreso && <DetailRow label="Fecha de ingreso" value={new Date(detailProfile.fecha_ingreso + 'T12:00:00').toLocaleDateString('es-CO')} />}
                  {detailProfile.tipo_contrato && <DetailRow label="Tipo contrato" value={detailProfile.tipo_contrato} />}
                  {detailProfile.jefe_inmediato && <DetailRow label="Jefe inmediato" value={detailProfile.jefe_inmediato} />}
                  {detailProfile.municipio && <DetailRow label="Municipio" value={detailProfile.municipio} />}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Import Report Dialog */}
      <Dialog open={!!importReport} onOpenChange={open => !open && setImportReport(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Reporte de Importación
            </DialogTitle>
          </DialogHeader>
          {importReport && (
            <div className="px-6 pb-6 space-y-4">
              {/* Summary counters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 p-3 flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">{importReport.success.length}</p>
                    <p className="text-xs text-green-600 dark:text-green-500">Exitosos</p>
                  </div>
                </div>
                <div className="rounded-lg border bg-red-50 dark:bg-red-950/30 p-3 flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">{importReport.errors.length}</p>
                    <p className="text-xs text-red-600 dark:text-red-500">Con errores</p>
                  </div>
                </div>
              </div>

              <ScrollArea className="max-h-[45vh]">
                {/* Errors section */}
                {importReport.errors.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <h4 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" /> Filas con errores
                    </h4>
                    <div className="rounded-lg border border-destructive/30 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-destructive/10">
                            <th className="text-left px-3 py-2 font-medium w-14">Fila</th>
                            <th className="text-left px-3 py-2 font-medium">Nombre</th>
                            <th className="text-left px-3 py-2 font-medium">Motivo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importReport.errors.map((err, i) => (
                            <tr key={i} className="border-t border-destructive/10">
                              <td className="px-3 py-1.5 text-muted-foreground">{err.row}</td>
                              <td className="px-3 py-1.5 font-medium">{err.name}</td>
                              <td className="px-3 py-1.5 text-destructive">{err.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Success section */}
                {importReport.success.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Filas procesadas exitosamente
                    </h4>
                    <div className="rounded-lg border border-green-300/50 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-green-50 dark:bg-green-950/30">
                            <th className="text-left px-3 py-2 font-medium w-14">Fila</th>
                            <th className="text-left px-3 py-2 font-medium">Nombre</th>
                            <th className="text-left px-3 py-2 font-medium w-24">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importReport.success.map((s, i) => (
                            <tr key={i} className="border-t border-green-200/30">
                              <td className="px-3 py-1.5 text-muted-foreground">{s.row}</td>
                              <td className="px-3 py-1.5 font-medium">{s.name}</td>
                              <td className="px-3 py-1.5">
                                <Badge variant={s.action === 'Creado' ? 'default' : 'secondary'} className="text-[10px]">
                                  {s.action}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </ScrollArea>

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const lines = ['Fila,Nombre,Estado,Detalle'];
                  importReport.success.forEach(s => lines.push(`${s.row},"${s.name}",Exitoso,${s.action}`));
                  importReport.errors.forEach(e => lines.push(`${e.row},"${e.name}",Error,"${e.reason}"`));
                  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'reporte_importacion.csv'; a.click();
                  URL.revokeObjectURL(url);
                }}>
                  <Download className="w-4 h-4 mr-2" />Descargar reporte CSV
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-muted-foreground whitespace-nowrap">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  );
}
