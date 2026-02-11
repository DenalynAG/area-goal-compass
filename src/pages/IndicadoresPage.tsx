import { mockKPIs, mockObjectives, mockMeasurements } from '@/data/mockData';
import { getTrafficLight } from '@/types';
import { TrafficLightBadge, ProgressBar } from '@/components/StatusBadge';
import { BarChart3, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function IndicadoresPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">Indicadores (KPIs)</h1>
        <p className="page-subtitle">{mockKPIs.length} indicadores definidos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {mockKPIs.map(kpi => {
          const obj = mockObjectives.find(o => o.id === kpi.objective_id);
          const measurements = mockMeasurements.filter(m => m.kpi_id === kpi.id);
          const chartData = measurements.map(m => ({ period: m.period_date, valor: m.value }));
          const light = getTrafficLight(kpi);
          const progress = Math.round((kpi.current_value / kpi.target) * 100);

          return (
            <div key={kpi.id} className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-accent" />
                    <div>
                      <h3 className="font-semibold">{kpi.name}</h3>
                      <p className="text-xs text-muted-foreground">{obj?.title}</p>
                    </div>
                  </div>
                  <TrafficLightBadge light={light} />
                </div>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold">{kpi.current_value}</p>
                    <p className="text-[10px] text-muted-foreground">Actual</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{kpi.target}</p>
                    <p className="text-[10px] text-muted-foreground">Meta</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{kpi.baseline}</p>
                    <p className="text-[10px] text-muted-foreground">Línea Base</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} />
                </div>

                {chartData.length > 0 && (
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="period" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                        <Line type="monotone" dataKey="valor" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span>🟢 ≥{kpi.threshold_green}</span>
                  <span>🟡 ≥{kpi.threshold_yellow}</span>
                  <span>🔴 &lt;{kpi.threshold_yellow}</span>
                  <span className="ml-auto">{kpi.frequency} · {kpi.unit}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
