import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface Props {
  period: string;
  periodLabel: string;
  activities: { id: string; name: string; sort_order: number }[];
  areas: any[];
  subareas: any[];
  profiles: { id: string; name: string; position: string | null; is_active: boolean }[];
  memberships: { user_id: string; area_id: string; subarea_id: string | null }[];
  allowedUserIds: Set<string> | null;
}

const colorFor = (p: number) => (p >= 100 ? 'hsl(var(--success))' : p >= 80 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))');
const clean = (n: string) => n.replace(/^\d+[.)\-\s]*/, '');

export default function LeaderPassDashboard({ period, periodLabel, activities, areas, subareas, profiles, memberships, allowedUserIds }: Props) {
  const { data: recs = [], isLoading } = useQuery({
    queryKey: ['leader_pass_records', 'dashboard', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leader_pass_records')
        .select('user_id,activity_id,completed')
        .eq('period', period);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const done = new Set(recs.filter(r => r.completed).map(r => `${r.user_id}|${r.activity_id}`));
    const total = activities.length;
    const pct = (ids: string[]) => {
      if (!ids.length || !total) return 0;
      let c = 0;
      ids.forEach(u => activities.forEach(a => done.has(`${u}|${a.id}`) && c++));
      return Math.round((c / (ids.length * total)) * 100);
    };
    const ok = (id?: string | null) => !!id && (!allowedUserIds || allowedUserIds.has(id));

    const byArea = areas
      .map(a => {
        const leaders = Array.from(new Set([a.leader_user_id, ...subareas.filter(s => s.area_id === a.id).map(s => s.leader_user_id)].filter(ok))) as string[];
        return { name: a.name, value: pct(leaders), leaders: leaders.length };
      })
      .filter(x => x.leaders > 0)
      .sort((a, b) => b.value - a.value);

    const bySub = subareas
      .filter(s => ok(s.leader_user_id))
      .map(s => ({
        name: s.name,
        area: areas.find(a => a.id === s.area_id)?.name ?? '',
        value: pct([s.leader_user_id]),
      }))
      .sort((a, b) => b.value - a.value);

    const allLeaders = Array.from(new Set([...areas.map(a => a.leader_user_id), ...subareas.map(s => s.leader_user_id)].filter(ok))) as string[];
    const byAct = [...activities]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(a => {
        const c = allLeaders.filter(u => done.has(`${u}|${a.id}`)).length;
        return { name: clean(a.name), value: allLeaders.length ? Math.round((c / allLeaders.length) * 100) : 0, c };
      });

    const collaborators = (ids: (string | null | undefined)[]) => {
      const uniqueIds = new Set(ids.filter(ok));
      return profiles.filter(p => p.is_active && uniqueIds.has(p.id))
        .map(p => ({ id: p.id, name: p.name, position: p.position, value: pct([p.id]) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    };
    const groups = areas.map(area => ({
      id: area.id,
      name: area.name,
      collaborators: collaborators([area.leader_user_id]),
      subareas: subareas.filter(s => s.area_id === area.id).map(s => ({
        id: s.id,
        name: s.name,
        value: pct(ok(s.leader_user_id) ? [s.leader_user_id] : []),
        collaborators: collaborators([s.leader_user_id]),
      })).filter(s => s.collaborators.length > 0),
    })).filter(a => a.collaborators.length > 0 || a.subareas.length > 0);

    return { byArea, bySub, byAct, groups, leaders: allLeaders.length, overall: pct(allLeaders) };
  }, [recs, activities, areas, subareas, profiles, memberships, allowedUserIds]);

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Cargando dashboard...</div>;

  const Chart = ({ data, height }: { data: { name: string; value: number }[]; height: number }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} fontSize={11} />
        <YAxis type="category" dataKey="name" width={170} fontSize={11} />
        <Tooltip formatter={(v: number) => `${v}%`} />
        <Bar dataKey="value" name="Avance" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, formatter: (v: number) => `${v}%` }}>
          {data.map((d, i) => <Cell key={i} fill={colorFor(d.value)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['Periodo', periodLabel],
          ['Avance general', `${stats.overall}%`],
          ['Líderes', stats.leaders],
          ['Áreas', stats.byArea.length],
        ].map(([l, v]) => (
          <div key={String(l)} className="bg-card border rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{l}</p>
            <p className="text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Avance por área</h3>
          <Chart data={stats.byArea} height={Math.max(220, stats.byArea.length * 34)} />
        </div>
        <div className="bg-card border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Avance por actividad</h3>
          <Chart data={stats.byAct} height={Math.max(220, stats.byAct.length * 34)} />
        </div>
      </div>

      <div className="bg-card border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">Avance por área y subárea</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                <th className="py-2 pr-4">Área / Subárea / Líder</th>
                <th className="py-2 pr-4">Área</th>
                <th className="py-2 w-1/2">Avance</th>
              </tr>
            </thead>
            <tbody>
              {stats.groups.flatMap(area => [
                <tr key={area.id} className="border-b bg-muted/50">
                  <td className="py-3 pr-4 font-semibold">{area.name}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{area.name}</td>
                  <td className="py-3"><Progress value={stats.byArea.find(a => a.name === area.name)?.value ?? 0} /></td>
                </tr>,
                ...area.collaborators.map(p => <CollaboratorRow key={`${area.id}-${p.id}`} collaborator={p} area={area.name} />),
                ...area.subareas.flatMap(s => [
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{s.name}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{area.name}</td>
                  <td className="py-2">
                    <Progress value={s.value} />
                  </td>
                </tr>,
                ...s.collaborators.map(p => <CollaboratorRow key={`${s.id}-${p.id}`} collaborator={p} area={area.name} />),
                ]),
              ])}
              {stats.groups.length === 0 && (
                <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">Sin líderes para mostrar</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return <div className="flex items-center gap-2">
    <div className="flex-1 min-w-16 h-2 bg-muted rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${value}%`, background: colorFor(value) }} />
    </div>
    <span className="w-10 shrink-0 text-right font-semibold">{value}%</span>
  </div>;
}

function CollaboratorRow({ collaborator, area }: { collaborator: { name: string; position: string | null; value: number }; area: string }) {
  return <tr className="border-b last:border-0">
    <td className="py-2 pl-4 pr-4">
      <p className="font-medium break-words">{collaborator.name}</p>
      <p className="text-xs text-muted-foreground break-words">{collaborator.position || 'Sin cargo registrado'}</p>
    </td>
    <td className="py-2 pr-4 text-muted-foreground">{area}</td>
    <td className="py-2"><Progress value={collaborator.value} /></td>
  </tr>;
}
