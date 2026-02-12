import { useState } from 'react';
import { useAreas, useSubareas, useProfiles, useMemberships, useUserRoles, getProfileName } from '@/hooks/useSupabaseData';
import { StatusBadge } from '@/components/StatusBadge';
import { ChevronDown, ChevronRight, Plus, Edit, Building2, Layers, User, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Organigrama from '@/components/Organigrama';
import AreaFormDialog from '@/components/AreaFormDialog';
import SubareaFormDialog from '@/components/SubareaFormDialog';
import ColaboradorFormDialog from '@/components/ColaboradorFormDialog';
import type { Tables, Enums } from '@/integrations/supabase/types';

export default function EstructuraPage() {
  const { data: areas = [], isLoading: loadingAreas } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: profiles = [] } = useProfiles();
  const { data: memberships = [] } = useMemberships();
  const { data: userRoles = [] } = useUserRoles();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const getExpanded = (id: string) => expanded[id] ?? true;

  // Area dialog
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Tables<'areas'> | null>(null);

  // Subarea dialog
  const [subareaDialogOpen, setSubareaDialogOpen] = useState(false);
  const [editingSubarea, setEditingSubarea] = useState<Tables<'subareas'> | null>(null);
  const [subareaParentId, setSubareaParentId] = useState('');

  // Colaborador dialog
  const [colabDialogOpen, setColabDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Tables<'profiles'> | null>(null);
  const [editingMembership, setEditingMembership] = useState<Tables<'memberships'> | null>(null);
  const [presetAreaId, setPresetAreaId] = useState('');
  const [presetSubareaId, setPresetSubareaId] = useState('');

  const openNewArea = () => { setEditingArea(null); setAreaDialogOpen(true); };
  const openEditArea = (a: Tables<'areas'>) => { setEditingArea(a); setAreaDialogOpen(true); };
  const openNewSubarea = (areaId: string) => { setEditingSubarea(null); setSubareaParentId(areaId); setSubareaDialogOpen(true); };
  const openEditSubarea = (s: Tables<'subareas'>) => { setEditingSubarea(s); setSubareaParentId(s.area_id); setSubareaDialogOpen(true); };

  const getRole = (userId: string): Enums<'app_role'> | null => userRoles.find(r => r.user_id === userId)?.role ?? null;
  const getMembership = (userId: string) => memberships.find(m => m.user_id === userId);

  const openNewColab = (areaId: string, subareaId?: string) => {
    setEditingProfile(null);
    setEditingMembership(null);
    setPresetAreaId(areaId);
    setPresetSubareaId(subareaId || '');
    setColabDialogOpen(true);
  };

  const openEditColab = (p: Tables<'profiles'>) => {
    setEditingProfile(p);
    setEditingMembership(getMembership(p.id) ?? null);
    setPresetAreaId('');
    setPresetSubareaId('');
    setColabDialogOpen(true);
  };

  // Get collaborators for a specific area (directly assigned, no subarea)
  const getAreaDirectCollabs = (areaId: string) => {
    const memberUserIds = memberships.filter(m => m.area_id === areaId && !m.subarea_id).map(m => m.user_id);
    return profiles.filter(p => memberUserIds.includes(p.id));
  };

  // Get collaborators for a specific subarea
  const getSubareaCollabs = (subareaId: string) => {
    const memberUserIds = memberships.filter(m => m.subarea_id === subareaId).map(m => m.user_id);
    return profiles.filter(p => memberUserIds.includes(p.id));
  };

  const CollabRow = ({ profile: p }: { profile: Tables<'profiles'> }) => (
    <div className="flex items-center gap-3 px-5 py-2 pl-20 hover:bg-muted/20 transition-colors">
      {p.avatar ? (
        <img src={p.avatar} alt={p.name} className="w-7 h-7 rounded-full object-cover" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
          {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{p.name}</span>
        {p.position && (
          <span className="text-xs text-muted-foreground ml-2 inline-flex items-center gap-1">
            <Briefcase className="w-3 h-3" />{p.position}
          </span>
        )}
      </div>
      <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={() => openEditColab(p)}>
        <Edit className="w-3.5 h-3.5" />
      </Button>
    </div>
  );

  if (loadingAreas) return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando estructura...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title">Estructura Organizacional</h1>
          <p className="page-subtitle">Áreas y subáreas de la empresa</p>
        </div>
        <Button onClick={openNewArea}><Plus className="w-4 h-4 mr-2" />Nueva Área</Button>
      </div>

      <Organigrama />

      <div className="space-y-3">
        {areas.map(area => {
          const areaSubs = subareas.filter(s => s.area_id === area.id);
          const isOpen = getExpanded(area.id);
          const directCollabs = getAreaDirectCollabs(area.id);
          const hasNoSubareas = areaSubs.length === 0;

          return (
            <div key={area.id} className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="flex items-center">
                <button
                  onClick={() => toggle(area.id)}
                  className="flex-1 flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                >
                  {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                  <Building2 className="w-5 h-5 text-accent" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{area.name}</h3>
                      <StatusBadge status={area.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{area.description} — Líder: {getProfileName(profiles, area.leader_user_id)}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {areaSubs.length > 0 && <span>{areaSubs.length} subáreas</span>}
                    <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" />{
                      memberships.filter(m => m.area_id === area.id).length
                    }</span>
                  </div>
                </button>
                <Button variant="ghost" size="icon" className="shrink-0 mr-2" onClick={() => openEditArea(area)}><Edit className="w-4 h-4" /></Button>
              </div>

              {isOpen && (
                <div className="border-t bg-muted/20">
                  {/* Subáreas con sus colaboradores */}
                  {areaSubs.map(sub => {
                    const subCollabs = getSubareaCollabs(sub.id);
                    const subExpanded = getExpanded(`sub-${sub.id}`);
                    return (
                      <div key={sub.id} className="border-b last:border-0">
                        <div className="flex items-center gap-4 px-5 py-3 pl-14 hover:bg-muted/30 transition-colors">
                          <button className="flex items-center gap-2" onClick={() => toggle(`sub-${sub.id}`)}>
                            {subExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            <Layers className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{sub.name}</span>
                              <StatusBadge status={sub.status} />
                              <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><User className="w-3 h-3" />{subCollabs.length}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{sub.description} — Líder: {getProfileName(profiles, sub.leader_user_id)}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => openEditSubarea(sub)}><Edit className="w-4 h-4" /></Button>
                        </div>
                        {subExpanded && (
                          <div>
                            {subCollabs.map(c => <CollabRow key={c.id} profile={c} />)}
                            <div className="px-5 py-1.5 pl-20">
                              <Button variant="ghost" size="sm" className="text-accent text-xs h-7" onClick={() => openNewColab(area.id, sub.id)}>
                                <Plus className="w-3.5 h-3.5 mr-1" />Agregar colaborador
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Colaboradores directos del área (sin subárea) */}
                  {directCollabs.length > 0 && (
                    <div className="border-b last:border-0">
                      {areaSubs.length > 0 && (
                        <div className="px-5 py-2 pl-14 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Sin subárea asignada
                        </div>
                      )}
                      {directCollabs.map(c => <CollabRow key={c.id} profile={c} />)}
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="px-5 py-2 pl-14 flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-accent" onClick={() => openNewSubarea(area.id)}>
                      <Plus className="w-4 h-4 mr-1" />Agregar subárea
                    </Button>
                    {hasNoSubareas && (
                      <Button variant="ghost" size="sm" className="text-accent" onClick={() => openNewColab(area.id)}>
                        <Plus className="w-4 h-4 mr-1" />Agregar colaborador
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AreaFormDialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen} area={editingArea} profiles={profiles} />
      <SubareaFormDialog open={subareaDialogOpen} onOpenChange={setSubareaDialogOpen} subarea={editingSubarea} areaId={subareaParentId} profiles={profiles} />
      <ColaboradorFormDialog
        open={colabDialogOpen}
        onOpenChange={setColabDialogOpen}
        profile={editingProfile}
        areas={areas}
        subareas={subareas}
        membership={editingMembership}
        userRole={editingProfile ? getRole(editingProfile.id) : null}
        defaultAreaId={presetAreaId}
        defaultSubareaId={presetSubareaId}
      />
    </div>
  );
}
