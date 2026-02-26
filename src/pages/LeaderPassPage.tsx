import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles, useAreas, useMemberships, getProfileName } from '@/hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle2, Circle, ClipboardList, MessageSquare, Save } from 'lucide-react';

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
  const { data: memberships = [] } = useMemberships();
  const qc = useQueryClient();

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);
  const [selectedUserId, setSelectedUserId] = useState<string>(user?.id ?? '');
  const [notesDialog, setNotesDialog] = useState<{ activityId: string; activityName: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const periods = useMemo(() => getPeriodOptions(), []);

  // For super admin / admin_area, show a user selector
  const canViewOthers = isSuperAdmin || hasRole('admin_area');
  const viewableProfiles = useMemo(() => {
    if (isSuperAdmin) return profiles;
    if (hasRole('admin_area')) {
      const myAreas = memberships.filter(m => m.user_id === user?.id).map(m => m.area_id);
      const areaUserIds = memberships.filter(m => myAreas.includes(m.area_id)).map(m => m.user_id);
      return profiles.filter(p => areaUserIds.includes(p.id));
    }
    return profiles.filter(p => p.id === user?.id);
  }, [profiles, memberships, user, isSuperAdmin, hasRole]);

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
          {canViewOthers && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Seleccionar líder..." />
              </SelectTrigger>
              <SelectContent>
                {viewableProfiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map(p => (
                <SelectItem key={p} value={p}>{formatPeriod(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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

              {/* Notes & completed info */}
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
                  {record?.notes ? 'Ver notas' : 'Agregar notas'}
                </Button>
                {isCompleted && record?.completed_at && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(record.completed_at).toLocaleDateString('es')}
                  </span>
                )}
              </div>
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
    </div>
  );
}
