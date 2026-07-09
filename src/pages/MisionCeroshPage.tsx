import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAreas, useSubareas } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Sparkles, ShieldAlert, HeartPulse, Trash2, Paperclip, FileCheck2, Loader2 } from "lucide-react";
import misionLogo from "@/assets/mision-cerosh-logo.png.asset.json";

type ReportType = "orden_aseo" | "accion_preventiva" | "accidente_trabajo";

interface Report {
  id: string;
  report_type: ReportType;
  area_id: string;
  subarea_id: string | null;
  report_date: string;
  count: number;
  notes: string | null;
  created_by: string | null;
  completed?: boolean | null;
  evidence_url?: string | null;
}

const REPORT_META: Record<ReportType, { label: string; short: string; icon: any; color: string }> = {
  orden_aseo: { label: "Reporte de Orden y Aseo", short: "Orden y Aseo", icon: Sparkles, color: "bg-emerald-500" },
  accion_preventiva: { label: "Reporte de Acción Preventiva", short: "Acción Preventiva", icon: ShieldAlert, color: "bg-amber-500" },
  accidente_trabajo: { label: "Reporte de Accidentes de Trabajo", short: "Accidentes de Trabajo", icon: HeartPulse, color: "bg-rose-500" },
};

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function useReports(reportType: ReportType, year: number, month: number) {
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDate = new Date(year, month + 1, 1);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-01`;
  return useQuery({
    queryKey: ["mision_cerosh_reports", reportType, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mision_cerosh_reports" as any)
        .select("*")
        .eq("report_type", reportType)
        .gte("report_date", start)
        .lt("report_date", end)
        .order("report_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Report[];
    },
  });
}

function ReportSection({ reportType, year, month }: { reportType: ReportType; year: number; month: number }) {
  const { user } = useAuth();
  const meta = REPORT_META[reportType];
  const qc = useQueryClient();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: reports = [], isLoading } = useReports(reportType, year, month);

  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    area_id: "",
    subarea_id: "__none__",
    report_date: today,
    count: 1,
    notes: "",
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Group counts per (area,subarea) per day
  const byArea = useMemo(() => {
    const map = new Map<string, { areaName: string; subareas: Map<string, { subName: string; days: number[]; total: number }> }>();
    for (const a of areas) {
      map.set(a.id, { areaName: a.name, subareas: new Map() });
    }
    for (const r of reports) {
      const d = new Date(r.report_date + "T00:00:00");
      const dayIdx = d.getDate() - 1;
      const ent = map.get(r.area_id);
      if (!ent) continue;
      const subKey = r.subarea_id ?? "__none__";
      const subName = r.subarea_id
        ? subareas.find((s) => s.id === r.subarea_id)?.name ?? "—"
        : "General";
      let subEnt = ent.subareas.get(subKey);
      if (!subEnt) {
        subEnt = { subName, days: Array(daysInMonth).fill(0), total: 0 };
        ent.subareas.set(subKey, subEnt);
      }
      subEnt.days[dayIdx] += r.count;
      subEnt.total += r.count;
    }
    return map;
  }, [reports, areas, subareas, daysInMonth]);

  // Only show areas that have data OR let user filter
  const populatedAreas = useMemo(() => {
    return [...byArea.entries()].filter(([_, v]) => v.subareas.size > 0);
  }, [byArea]);

  const areaSubareas = useMemo(
    () => subareas.filter((s) => s.area_id === form.area_id),
    [subareas, form.area_id],
  );

  const handleSubmit = async () => {
    if (!form.area_id) {
      toast.error("Selecciona un área");
      return;
    }
    const payload: any = {
      report_type: reportType,
      area_id: form.area_id,
      subarea_id: form.subarea_id === "__none__" ? null : form.subarea_id,
      report_date: form.report_date,
      count: Number(form.count) || 1,
      notes: form.notes || null,
      created_by: user?.id ?? null,
    };
    const { error } = await supabase.from("mision_cerosh_reports" as any).insert(payload);
    if (error) {
      toast.error("No se pudo guardar el reporte: " + error.message);
      return;
    }
    toast.success("Reporte registrado");
    setOpen(false);
    setForm({ area_id: "", subarea_id: "__none__", report_date: today, count: 1, notes: "" });
    qc.invalidateQueries({ queryKey: ["mision_cerosh_reports", reportType] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este reporte?")) return;
    const { error } = await supabase.from("mision_cerosh_reports" as any).delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar: " + error.message);
      return;
    }
    toast.success("Reporte eliminado");
    qc.invalidateQueries({ queryKey: ["mision_cerosh_reports", reportType] });
  };

  const totalMonth = reports.reduce((s, r) => s + r.count, 0);
  // Progress benchmark: assume daily target = 1 per active subarea/day
  const maxDay = Math.max(1, ...[...byArea.values()].flatMap((a) => [...a.subareas.values()].map((s) => Math.max(...s.days))));

  const Icon = meta.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-lg ${meta.color} text-white flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-lg">{meta.label}</h3>
            <p className="text-xs text-muted-foreground">
              {MONTH_NAMES[month]} {year} · Total del mes: <strong>{totalMonth}</strong>
            </p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> Registrar reporte
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo {meta.short.toLowerCase()}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Área</Label>
                <Select value={form.area_id} onValueChange={(v) => setForm({ ...form, area_id: v, subarea_id: "__none__" })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona área" /></SelectTrigger>
                  <SelectContent>
                    {areas.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subárea</Label>
                <Select value={form.subarea_id} onValueChange={(v) => setForm({ ...form, subarea_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona subárea" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— General —</SelectItem>
                    {areaSubareas.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fecha</Label>
                  <Input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} />
                </div>
                <div>
                  <Label>Cantidad</Label>
                  <Input type="number" min={1} value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Observaciones</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : populatedAreas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Sin reportes registrados en {MONTH_NAMES[month]} {year}.
        </div>
      ) : (
        <div className="space-y-4">
          {populatedAreas.map(([areaId, areaData]) => (
            <div key={areaId} className="rounded-lg border p-4 space-y-3">
              <h4 className="font-display font-extrabold text-base">{areaData.areaName}</h4>
              {[...areaData.subareas.entries()].map(([subKey, subData]) => (
                <div key={subKey} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{subData.subName}</span>
                    <span className="text-muted-foreground">Total: <strong>{subData.total}</strong></span>
                  </div>
                  {/* Daily progress bar per day of month */}
                  <div className="flex gap-[2px] items-end h-16 bg-muted/30 rounded p-1">
                    {subData.days.map((v, i) => {
                      const pct = v > 0 ? Math.max(10, (v / maxDay) * 100) : 0;
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center justify-end group relative"
                          title={`Día ${i + 1}: ${v}`}
                        >
                          <div
                            className={`w-full rounded-sm ${v > 0 ? meta.color : "bg-muted"}`}
                            style={{ height: `${pct}%`, minHeight: v > 0 ? 6 : 2 }}
                          />
                          <span className="text-[9px] text-muted-foreground mt-0.5">{i + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                  <Progress value={Math.min(100, (subData.total / daysInMonth) * 100)} className="h-1.5" />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {reports.length > 0 && (
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">Ver registros ({reports.length})</summary>
          <div className="mt-3 max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left">
                  <th className="py-1 pr-2">Fecha</th>
                  <th className="py-1 pr-2">Área</th>
                  <th className="py-1 pr-2">Subárea</th>
                  <th className="py-1 pr-2">Cant.</th>
                  <th className="py-1 pr-2">Notas</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-1 pr-2">{r.report_date}</td>
                    <td className="py-1 pr-2">{areas.find((a) => a.id === r.area_id)?.name ?? "—"}</td>
                    <td className="py-1 pr-2">{r.subarea_id ? subareas.find((s) => s.id === r.subarea_id)?.name ?? "—" : "General"}</td>
                    <td className="py-1 pr-2">{r.count}</td>
                    <td className="py-1 pr-2 max-w-[200px] truncate">{r.notes ?? ""}</td>
                    <td>
                      {(r.created_by === user?.id) && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

export default function MisionCeroshPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [tab, setTab] = useState<ReportType>("orden_aseo");

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <img src={misionLogo.url} alt="Misión CerOSH" className="w-16 h-16 object-contain" />
          <div>
            <h1 className="font-display font-extrabold text-2xl">Misión CerOSH</h1>
            <p className="text-sm text-muted-foreground">
              Control diario de Orden y Aseo, Acciones Preventivas y Accidentes de Trabajo por área y subárea.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((m, i) => (<SelectItem key={i} value={String(i)}>{m}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ReportType)}>
        <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
          <TabsTrigger
            value="orden_aseo"
            className="border border-emerald-300 bg-emerald-50 text-emerald-800 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:border-emerald-600"
          >
            Orden y Aseo
          </TabsTrigger>
          <TabsTrigger
            value="accion_preventiva"
            className="border border-amber-300 bg-amber-50 text-amber-800 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:border-amber-500"
          >
            Acción Preventiva
          </TabsTrigger>
          <TabsTrigger
            value="accidente_trabajo"
            className="border border-rose-300 bg-rose-50 text-rose-800 data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:border-rose-600"
          >
            Accidentes
          </TabsTrigger>
        </TabsList>
        <TabsContent value="orden_aseo" className="mt-6">
          <ReportSection reportType="orden_aseo" year={year} month={month} />
        </TabsContent>
        <TabsContent value="accion_preventiva" className="mt-6">
          <ReportSection reportType="accion_preventiva" year={year} month={month} />
        </TabsContent>
        <TabsContent value="accidente_trabajo" className="mt-6">
          <ReportSection reportType="accidente_trabajo" year={year} month={month} />
        </TabsContent>
      </Tabs>
    </div>
  );
}