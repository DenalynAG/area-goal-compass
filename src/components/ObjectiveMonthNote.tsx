import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  objectiveId: string;
  period: string; // YYYY-MM
  periodLabel: string;
  canEdit: boolean;
}

export default function ObjectiveMonthNote({ objectiveId, period, periodLabel, canEdit }: Props) {
  const qc = useQueryClient();
  const key = ['objective_monthly_notes', objectiveId, period];
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('objective_monthly_notes')
        .select('*')
        .eq('objective_id', objectiveId)
        .eq('period', period)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setText(data?.note ?? ''); }, [data, period]);

  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    let name: string | null = null;
    if (u.user) {
      const { data: p } = await supabase.from('profiles').select('name').eq('id', u.user.id).maybeSingle();
      name = p?.name ?? u.user.email ?? null;
    }
    const { error } = await supabase.from('objective_monthly_notes').upsert(
      { objective_id: objectiveId, period, note: text.trim().slice(0, 2000), updated_by: u.user?.id ?? null, updated_by_name: name },
      { onConflict: 'objective_id,period' }
    );
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Comentario guardado');
    qc.invalidateQueries({ queryKey: key });
  };

  const dirty = text.trim() !== (data?.note ?? '').trim();

  return (
    <div className="mt-3 border-t pt-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="w-4 h-4" /> Comentarios — {periodLabel}
      </div>
      {canEdit ? (
        <>
          <Textarea value={text} onChange={e => setText(e.target.value)} rows={2} maxLength={2000} placeholder="Escribe notas de este mes..." />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {data?.updated_by_name ? `Última edición: ${data.updated_by_name} · ${new Date(data.updated_at).toLocaleString('es-CO')}` : ''}
            </span>
            <Button size="sm" onClick={save} disabled={saving || !dirty}>{saving ? 'Guardando...' : 'Guardar comentario'}</Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data?.note || 'Sin comentarios para este mes.'}</p>
      )}
    </div>
  );
}
