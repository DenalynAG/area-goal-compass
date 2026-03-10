import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles, useAreas, useSubareas, useMemberships, getProfileName } from '@/hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle2, Circle, ClipboardList, MessageSquare, Save, Paperclip, Filter, ChevronDown, ChevronUp, Info } from 'lucide-react';
import EvidencePanel from '@/components/EvidencePanel';

const LEADER_PASS_INFO = [
  { title: 'One to One (Feedback Consciente)', frequency: 'Mensual', description: 'Cumplir con One to One mensual de toda el área asignada. Equipos de más de 20 personas realizar el 10% y para equipos de 1-12 personas, 1 persona mensual' },
  { title: 'Evaluación de Performance', frequency: 'Diario / Anual', description: 'Oper: en el mes se deben evaluar el 100% de los colab. (Mínimo 22 días). Admón: Anual' },
  { title: 'Desarrollo del equipo (IDP admón. o Cronograma de Capacitación)', frequency: 'Mensual', description: 'Toda el área o personal a cargo admón. debe tener el 100% IDPs en Buk. Para los colab. operativos el 90% de Cumpl. OSH University' },
  { title: 'People Review & Planes de Sucesión', frequency: 'Trimestral', description: '1 Trimestral (oper.) / 1 Semestral (adm.) — decisiones documentadas' },
  { title: 'ADN OSH', frequency: 'Semanal / Mensual', description: '100% Briefing Semanal y STAR mensual' },
  { title: 'Upward Feedback', frequency: 'Semestral', description: '100% del Upward Feedback 2 veces al año' },
  { title: 'Programa OSH People', frequency: 'Mensual', description: 'Reconocer 1 persona por mes del programa de forma correcta y consciente hacia otras áreas' },
  { title: 'Misión CerOSH', frequency: 'Mensual', description: 'Proponer 1 acción preventiva de su área al mes' },
  { title: 'Orden y Limpieza', frequency: 'Mensual', description: 'Gestión de una jornada de Orden y Limpieza mensual de su área' },
];

interface Activity {
  id: string;
  name: string;
  description: string;
  frequency: string;
  sort_order: number;
}

interface Record {
  id: string;
  activity_id: string;
  user_id: string;
  period: string;
  completed: boolean;
  completed_at: string | null;
  notes: string;
  created_at: string;
}

function useLeaderPassActivities() {
  return useQuery({
    queryKey: ['leader_pass_activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leader_pass_activities')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as Activity[];
    },
  });
}

function useLeaderPassRecords(period: string, userId?: string) {
  return useQuery({
    queryKey: ['leader_pass_records', period, userId],
    queryFn: async () => {
      let q = supabase.from('leader_pass_records').select('*').eq('period', period);
      if (userId) q = q.eq('user_id', userId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Record[];
    },
  });
}

function getPeriodOptions() {
  const options: string[] = [];
  const now = new Date();
  for (let i = -3; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return options;
}

function formatPeriod(p: string) {
  const [y, m] = p.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

const ACTIVITY_COLORS = [
  'bg-blue-500/10 text-blue-700 border-blue-200',
  'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  'bg-violet-500/10 text-violet-700 border-violet-200',
  'bg-amber-500/10 text-amber-700 border-amber-200',
  'bg-rose-500/10 text-rose-700 border-rose-200',
  'bg-cyan-500/10 text-cyan-700 border-cyan-200',
  'bg-orange-500/10 text-orange-700 border-orange-200',
  'bg-indigo-500/10 text-indigo-700 border-indigo-200',
  'bg-teal-500/10 text-teal-700 border-teal-200',
];

export default function LeaderPassPage() {
  const { user, isSuperAdmin, hasRole } = useAuth();
  const { data: activities = [], isLoading: loadingActs } = useLeaderPassActivities();
  const { data: profiles = [] } = useProfiles();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: memberships = [] } = useMemberships();
  const qc = useQueryClient();

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);
  const [selectedUserId, setSelectedUserId] = useState<string>(user?.id ?? '');
  const [notesDialog, setNotesDialog] = useState<{ activityId: string; activityName: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [evidenceActivity, setEvidenceActivity] = useState<{ id: string; name: string } | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  // Filters
  const [filterAreaId, setFilterAreaId] = useState<string>('all');
  const [filterSubareaId, setFilterSubareaId] = useState<string>('all');
  const [filterCargo, setFilterCargo] = useState<string>('all');

  const periods = useMemo(() => getPeriodOptions(), []);

  // For super admin / admin_area, show a user selector
  const canViewOthers = isSuperAdmin || hasRole('admin_area');
  const baseProfiles = useMemo(() => {
    if (isSuperAdmin) return profiles;
    if (hasRole('admin_area')) {
      const myAreas = memberships.filter(m => m.user_id === user?.id).map(m => m.area_id);
      const areaUserIds = memberships.filter(m => myAreas.includes(m.area_id)).map(m => m.user_id);
      return profiles.filter(p => areaUserIds.includes(p.id));
    }
    return profiles.filter(p => p.id === user?.id);
  }, [profiles, memberships, user, isSuperAdmin, hasRole]);

  // Available filter options based on baseProfiles
  const availableAreas = useMemo(() => {
    const userIds = new Set(baseProfiles.map(p => p.id));
    const areaIds = new Set(memberships.filter(m => userIds.has(m.user_id)).map(m => m.area_id));
    return areas.filter(a => areaIds.has(a.id));
  }, [baseProfiles, memberships, areas]);

  const filteredSubareas = useMemo(() => {
    if (filterAreaId === 'all') return [];
    return subareas.filter(s => s.area_id === filterAreaId);
  }, [subareas, filterAreaId]);

  const availableCargos = useMemo(() => {
    const cargos = new Set(baseProfiles.map(p => p.position).filter(Boolean));
    return Array.from(cargos).sort() as string[];
  }, [baseProfiles]);

  // Apply filters to profiles
  const viewableProfiles = useMemo(() => {
    let filtered = baseProfiles;
    if (filterAreaId !== 'all') {
      const areaUserIds = new Set(memberships.filter(m => m.area_id === filterAreaId).map(m => m.user_id));
      filtered = filtered.filter(p => areaUserIds.has(p.id));
    }
    if (filterSubareaId !== 'all') {
      const subUserIds = new Set(memberships.filter(m => m.subarea_id === filterSubareaId).map(m => m.user_id));
      filtered = filtered.filter(p => subUserIds.has(p.id));
    }
    if (filterCargo !== 'all') {
      filtered = filtered.filter(p => p.position === filterCargo);
    }
    return filtered;
  }, [baseProfiles, memberships, filterAreaId, filterSubareaId, filterCargo]);

  const targetUserId = canViewOthers ? selectedUserId : (user?.id ?? '');
  const { data: records = [], isLoading: loadingRecs } = useLeaderPassRecords(selectedPeriod, targetUserId || undefined);

  const getRecord = (activityId: string) => records.find(r => r.activity_id === activityId && r.user_id === targetUserId);

  const toggleCompleted = async (activityId: string) => {
    if (!targetUserId) return;
    const existing = getRecord(activityId);
    setSaving(true);

    if (existing) {
      const newCompleted = !existing.completed;
      const { error } = await supabase.from('leader_pass_records').update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      }).eq('id', existing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('leader_pass_records').insert({
        activity_id: activityId,
        user_id: targetUserId,
        period: selectedPeriod,
        completed: true,
        completed_at: new Date().toISOString(),
      });
      if (error) { toast.error(error.message); setSaving(false); return; }
    }

    qc.invalidateQueries({ queryKey: ['leader_pass_records'] });
    setSaving(false);
  };

  const saveNotes = async () => {
    if (!notesDialog || !targetUserId) return;
    setSaving(true);
    const existing = getRecord(notesDialog.activityId);

    if (existing) {
      const { error } = await supabase.from('leader_pass_records').update({ notes: notes.trim() }).eq('id', existing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('leader_pass_records').insert({
        activity_id: notesDialog.activityId,
        user_id: targetUserId,
        period: selectedPeriod,
        notes: notes.trim(),
      });
      if (error) { toast.error(error.message); setSaving(false); return; }
    }

    toast.success('Notas guardadas');
    qc.invalidateQueries({ queryKey: ['leader_pass_records'] });
    setSaving(false);
    setNotesDialog(null);
  };

  const completedCount = activities.filter(a => getRecord(a.id)?.completed).length;
  const progress = activities.length > 0 ? Math.round((completedCount / activities.length) * 100) : 0;

  if (loadingActs) return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando Leader Pass...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Leader Pass
          </h1>
          <p className="page-subtitle">Plan de desarrollo y seguimiento de actividades de liderazgo</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SearchableSelect
            value={selectedPeriod}
            onValueChange={setSelectedPeriod}
            options={periods.map(p => ({ value: p, label: formatPeriod(p) }))}
            placeholder="Periodo"
            searchPlaceholder="Buscar periodo..."
            className="w-[160px]"
          />
        </div>
      </div>

      {/* Info Banner */}
      <div className="border rounded-xl overflow-hidden shadow-sm">
        <button
          onClick={() => setShowBanner(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 bg-accent text-accent-foreground font-semibold text-sm hover:brightness-95 transition-all"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span>Programa Leader Pass — Guía de Actividades</span>
          </div>
          {showBanner ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showBanner && (
          <>
            {/* Desktop: horizontal table */}
            <div className="hidden lg:block overflow-x-auto">
              <div className="grid grid-cols-9 min-w-[1200px]">
                {LEADER_PASS_INFO.map((item, i) => (
                  <div
                    key={`h-${i}`}
                    className={`p-3 text-xs font-bold text-center border-r border-b last:border-r-0 ${
                      i % 2 === 0
                        ? 'bg-muted text-foreground'
                        : 'bg-accent/80 text-accent-foreground'
                    }`}
                  >
                    <div className="leading-tight">{item.title}</div>
                    <div className="font-medium mt-1.5 opacity-80 text-[10px] uppercase tracking-wide">{item.frequency}</div>
                  </div>
                ))}
                {LEADER_PASS_INFO.map((item, i) => (
                  <div
                    key={`d-${i}`}
                    className={`p-3 text-[11px] leading-relaxed border-r last:border-r-0 ${
                      i % 2 === 0
                        ? 'bg-accent/5 text-foreground'
                        : 'bg-muted/50 text-foreground'
                    }`}
                  >
                    {item.description}
                  </div>
                ))}
              </div>
            </div>
            {/* Mobile/Tablet: vertical cards */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-0">
              {LEADER_PASS_INFO.map((item, i) => (
                <div
                  key={i}
                  className={`p-4 border-b sm:odd:border-r ${
                    i % 2 === 0 ? 'bg-accent/5' : 'bg-muted/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-bold text-foreground leading-tight">{item.title}</h4>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent text-accent-foreground">
                      {item.frequency}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      {canViewOthers && (
        <div className="flex items-center gap-3 flex-wrap bg-card border rounded-xl p-4">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <SearchableSelect
            value={filterAreaId}
            onValueChange={v => { setFilterAreaId(v); setFilterSubareaId('all'); setSelectedUserId(''); }}
            options={[{ value: 'all', label: 'Todas las áreas' }, ...availableAreas.map(a => ({ value: a.id, label: a.name }))]}
            placeholder="Todas las áreas"
            searchPlaceholder="Buscar área..."
            className="w-[180px]"
          />
          {filteredSubareas.length > 0 && (
            <SearchableSelect
              value={filterSubareaId}
              onValueChange={v => { setFilterSubareaId(v); setSelectedUserId(''); }}
              options={[{ value: 'all', label: 'Todas las subáreas' }, ...filteredSubareas.map(s => ({ value: s.id, label: s.name }))]}
              placeholder="Todas las subáreas"
              searchPlaceholder="Buscar subárea..."
              className="w-[180px]"
            />
          )}
          <SearchableSelect
            value={filterCargo}
            onValueChange={v => { setFilterCargo(v); setSelectedUserId(''); }}
            options={[{ value: 'all', label: 'Todos los cargos' }, ...availableCargos.map(c => ({ value: c, label: c }))]}
            placeholder="Todos los cargos"
            searchPlaceholder="Buscar cargo..."
            className="w-[180px]"
          />
          <SearchableSelect
            value={selectedUserId}
            onValueChange={setSelectedUserId}
            options={viewableProfiles.map(p => ({ value: p.id, label: p.name }))}
            placeholder="Seleccionar líder..."
            searchPlaceholder="Buscar líder..."
            className="w-[220px]"
          />
        </div>
      )}

      {/* Progress summary */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold">{getProfileName(profiles, targetUserId)}</p>
            <p className="text-xs text-muted-foreground">{formatPeriod(selectedPeriod)} · {completedCount} de {activities.length} actividades</p>
          </div>
          <span className="text-2xl font-bold text-primary">{progress}%</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Activities grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activities.map((act, idx) => {
          const record = getRecord(act.id);
          const isCompleted = record?.completed ?? false;
          const colorClass = ACTIVITY_COLORS[idx % ACTIVITY_COLORS.length];

          return (
            <div
              key={act.id}
              className={`relative border rounded-xl p-4 transition-all ${isCompleted ? 'bg-primary/5 border-primary/30' : 'bg-card'}`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleCompleted(act.id)}
                  disabled={saving}
                  className="shrink-0 mt-0.5"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  ) : (
                    <Circle className="w-6 h-6 text-muted-foreground/40 hover:text-primary/60 transition-colors" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                    {act.sort_order}. {act.name}
                  </h3>
                  {act.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{act.description}</p>
                  )}
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium border ${colorClass}`}>
                    {act.frequency}
                  </span>
                </div>
              </div>

              {/* Actions row */}
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    setNotes(record?.notes ?? '');
                    setNotesDialog({ activityId: act.id, activityName: act.name });
                  }}
                >
                  <MessageSquare className="w-3 h-3" />
                  Agregar notas
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setEvidenceActivity({ id: act.id, name: act.name })}
                >
                  <Paperclip className="w-3 h-3" />
                  Evidencias
                </Button>
                {isCompleted && record?.completed_at && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(record.completed_at).toLocaleDateString('es')}
                  </span>
                )}
              </div>

              {/* Notes list visible on card */}
              {record?.notes && record.notes.trim() && (
                <div className="mt-3 border-t pt-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Notas
                  </p>
                  <div className="space-y-1">
                    {record.notes.trim().split('\n').filter(line => line.trim()).map((line, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                        <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-primary/50" />
                        <span className="leading-relaxed">{line.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activities.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No hay actividades definidas</div>
      )}

      {/* Notes dialog */}
      <Dialog open={!!notesDialog} onOpenChange={open => { if (!open) setNotesDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Notas — {notesDialog?.activityName}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Escribe tus notas o comentarios..."
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNotesDialog(null)}>Cancelar</Button>
            <Button onClick={saveNotes} disabled={saving} className="gap-1">
              <Save className="w-4 h-4" />
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evidence panel */}
      {evidenceActivity && (
        <EvidencePanel
          entityType="leader_pass"
          entityId={evidenceActivity.id}
          entityName={evidenceActivity.name}
          open={!!evidenceActivity}
          onOpenChange={open => { if (!open) setEvidenceActivity(null); }}
        />
      )}
    </div>
  );
}
