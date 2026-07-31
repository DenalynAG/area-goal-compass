import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAreas } from '@/hooks/useSupabaseData';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

type Evaluation = {
  id: string;
  candidate_name: string;
  area_id: string | null;
  position: string | null;
  weighted_score: number | null;
  evaluation_date: string;
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const PALETTE = [
  'hsl(var(--primary))', '#2563eb', '#16a34a', '#f59e0b', '#ef4444',
  '#8b5cf6', '#0891b2', '#db2777', '#65a30d', '#ea580c',
];

export default function AssessmentDashboardTab() {
  const { data: areas = [] } = useAreas();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [areaFilter, setAreaFilter] = useState('all');

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['assessment_evaluations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_evaluations' as any)
        .select('*')
        .order('evaluation_date', { ascending: false });
      if (error) throw error;
      return (data as unknown) as Evaluation[];
    },
  });

  const years = useMemo(() => {
    const s = new Set<string>(evaluations.map(e => e.evaluation_date.slice(0, 4)));
    s.add(String(new Date().getFullYear()));
    return Array.from(s).sort().reverse();
  }, [evaluations]);

  const rows = useMemo(() => evaluations.filter(e =>
    e.evaluation_date.startsWith(year) && (areaFilter === 'all' || e.area_id === areaFilter),
  ), [evaluations, year, areaFilter]);

  const activeAreas = useMemo(() => {
    const ids = new Set(rows.map(r => r.area_id).filter(Boolean) as string[]);
    return areas.filter(a => ids.has(a.id));
  }, [areas, rows]);

  // Assessments realizados por mes y área
  const byMonth = useMemo(() => MONTHS.map((label, i) => {
    const entry: Record<string, any> = { mes: label };
    activeAreas.forEach(a => { entry[a.name] = 0; });
    entry['Sin área'] = 0;
    rows.filter(r => Number(r.evaluation_date.slice(5, 7)) === i + 1).forEach(r => {
      const key = areas.find(a => a.id === r.area_id)?.name ?? 'Sin área';
      entry[key] = (entry[key] ?? 0) + 1;
    });
    return entry;
  }), [rows, activeAreas, areas]);

  const hasSinArea = rows.some(r => !r.area_id);
  const seriesKeys = [...activeAreas.map(a => a.name), ...(hasSinArea ? ['Sin área'] : [])];

  // Promedio de nota ponderada por área
  const avgByArea = useMemo(() => {
    const map = new Map<string, { sum: number; n: number }>();
    rows.forEach(r => {
      if (r.weighted_score === null || r.weighted_score === undefined) return;
      const key = areas.find(a => a.id === r.area_id)?.name ?? 'Sin área';
      const cur = map.get(key) ?? { sum: 0, n: 0 };
      map.set(key, { sum: cur.sum + Number(r.weighted_score), n: cur.n + 1 });
    });
    return Array.from(map.entries()).map(([area, v]) => ({
      area, promedio: Math.round((v.sum / v.n) * 10) / 10,
    }));
  }, [rows, areas]);

  const evaluated = rows.filter(r => r.weighted_score !== null).length;
  const avgTotal = evaluated
    ? Math.round((rows.reduce((s, r) => s + Number(r.weighted_score ?? 0), 0) / evaluated) * 10) / 10
    : null;

  const areaName = (id: string | null) => areas.find(a => a.id === id)?.name ?? 'Sin área';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Área" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las áreas</SelectItem>
            {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Assessments realizados</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Con calificación</p>
          <p className="text-2xl font-bold">{evaluated}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Nota ponderada promedio</p>
          <p className="text-2xl font-bold">{avgTotal !== null ? `${avgTotal}%` : '—'}</p>
        </Card>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold">Assessments por área y mes — {year}</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sin assessments registrados en {year}.</p>
        ) : (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {seriesKeys.map((k, i) => (
                  <Bar key={k} dataKey={k} stackId="a" fill={PALETTE[i % PALETTE.length]} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold">Nota ponderada promedio por área</h2>
        {avgByArea.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Aún no hay evaluaciones calificadas.</p>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgByArea}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="area" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} fontSize={12} unit="%" />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Bar dataKey="promedio" fill="#2563eb" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Historial de assessments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b text-left">
                <th className="px-3 py-2">Aspirante</th>
                <th className="px-3 py-2">Área</th>
                <th className="px-3 py-2">Cargo</th>
                <th className="px-3 py-2">Mes</th>
                <th className="px-3 py-2">Nota</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground text-sm">Sin registros</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id} className="border-b">
                  <td className="px-3 py-2 font-medium">{r.candidate_name}</td>
                  <td className="px-3 py-2">{areaName(r.area_id)}</td>
                  <td className="px-3 py-2">{r.position ?? '—'}</td>
                  <td className="px-3 py-2">{MONTHS[Number(r.evaluation_date.slice(5, 7)) - 1]} {r.evaluation_date.slice(0, 4)}</td>
                  <td className="px-3 py-2 font-semibold">
                    {r.weighted_score !== null ? `${Number(r.weighted_score).toFixed(0)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}