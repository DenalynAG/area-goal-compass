import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAreas, useSubareas } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Sparkles, ShieldAlert, HeartPulse, Trash2, Paperclip, FileCheck2, Loader2, Check, X } from "lucide-react";
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
  evidence_status?: string | null;
  rejection_reason?: string | null;
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
  const { user, isSuperAdmin } = useAuth();
  const meta = REPORT_META[reportType];
  const qc = useQueryClient();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: reports = [], isLoading } = useReports(reportType, year, month);

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Calendar (cumplimiento + evidencia) state
  const [calArea, setCalArea] = useState<string>("");
  const [calSubarea, setCalSubarea] = useState<string>("__none__");
  const [uploadingDay, setUploadingDay] = useState<number | null>(null);

  const calAreaSubareas = useMemo(
    () => subareas.filter((s) => s.area_id === calArea),
    [subareas, calArea],
  );

  // Per-day info for selected area/subarea
  const calDays = useMemo(() => {
    const arr: { completed: boolean; evidenceUrl: string | null; recordId: string | null; hasReport: boolean; status: string; rejectionReason: string | null }[] =
      Array.from({ length: daysInMonth }, () => ({ completed: false, evidenceUrl: null, recordId: null, hasReport: false, status: "pendiente", rejectionReason: null }));
    if (!calArea) return arr;
    const subFilter = calSubarea === "__none__" ? null : calSubarea;
    for (const r of reports) {
      if (r.area_id !== calArea) continue;
      if ((r.subarea_id ?? null) !== subFilter) continue;
      const dayIdx = new Date(r.report_date + "T00:00:00").getDate() - 1;
      const slot = arr[dayIdx];
      if (!slot) continue;
      slot.hasReport = true;
      if (r.completed) slot.completed = true;
      if (r.evidence_url) {
        slot.evidenceUrl = r.evidence_url;
        slot.recordId = r.id;
        slot.status = r.evidence_status ?? "pendiente";
        slot.rejectionReason = r.rejection_reason ?? null;
      } else if (!slot.recordId) {
        slot.recordId = r.id;
      }
    }
    return arr;
  }, [reports, calArea, calSubarea, daysInMonth]);

  const dateStrFor = (dayIdx: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(dayIdx + 1).padStart(2, "0")}`;

  const toggleCompleted = async (dayIdx: number, next: boolean) => {
    if (!calArea) return;
    const subFilter = calSubarea === "__none__" ? null : calSubarea;
    const dateStr = dateStrFor(dayIdx);
    if (next) {
      const { error } = await supabase.from("mision_cerosh_reports" as any).insert({
        report_type: reportType,
        area_id: calArea,
        subarea_id: subFilter,
        report_date: dateStr,
        count: 1,
        completed: true,
        created_by: user?.id ?? null,
      });
      if (error) { toast.error("No se pudo marcar: " + error.message); return; }
    } else {
      const q = supabase
        .from("mision_cerosh_reports" as any)
        .update({ completed: false })
        .eq("report_type", reportType)
        .eq("area_id", calArea)
        .eq("report_date", dateStr);
      const { error } = subFilter
        ? await q.eq("subarea_id", subFilter)
        : await q.is("subarea_id", null);
      if (error) { toast.error("No se pudo desmarcar: " + error.message); return; }
    }
    qc.invalidateQueries({ queryKey: ["mision_cerosh_reports", reportType] });
  };

  const uploadEvidence = async (dayIdx: number, file: File) => {
    if (!calArea || !file) return;
    const subFilter = calSubarea === "__none__" ? null : calSubarea;
    const dateStr = dateStrFor(dayIdx);
    setUploadingDay(dayIdx);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `mision-cerosh/${reportType}/${calArea}/${year}-${String(month + 1).padStart(2, "0")}/${dateStr}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("evidencias").upload(path, file, { upsert: false });
      if (upErr) { toast.error("Error subiendo evidencia: " + upErr.message); return; }
      const existing = calDays[dayIdx].recordId;
      if (existing) {
        const { error } = await supabase
          .from("mision_cerosh_reports" as any)
          .update({ evidence_url: path, completed: true, evidence_status: "pendiente", approved_by: null, approved_at: null })
          .eq("id", existing);
        if (error) { toast.error("Error guardando: " + error.message); return; }
      } else {
        const { error } = await supabase.from("mision_cerosh_reports" as any).insert({
          report_type: reportType,
          area_id: calArea,
          subarea_id: subFilter,
          report_date: dateStr,
          count: 1,
          completed: true,
          evidence_url: path,
          evidence_status: "pendiente",
          created_by: user?.id ?? null,
        });
        if (error) { toast.error("Error guardando: " + error.message); return; }
      }
      toast.success("Evidencia adjuntada. Pendiente de aprobación.");
      qc.invalidateQueries({ queryKey: ["mision_cerosh_reports", reportType] });
    } finally {
      setUploadingDay(null);
    }
  };

  const viewEvidence = async (path: string) => {
    const { data, error } = await supabase.storage.from("evidencias").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) { toast.error("No se pudo abrir la evidencia"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const reviewEvidence = async (recordId: string, approve: boolean) => {
    let reason: string | null = null;
    if (!approve) {
      const input = window.prompt("Motivo del rechazo (opcional):", "");
      if (input === null) return; // user cancelled
      reason = input.trim() || null;
    }
    const { error } = await supabase
      .from("mision_cerosh_reports" as any)
      .update({
        evidence_status: approve ? "aprobado" : "rechazado",
        approved_by: user?.id ?? null,
        approved_at: new Date().toISOString(),
        rejection_reason: approve ? null : reason,
      })
      .eq("id", recordId);
    if (error) { toast.error("No se pudo actualizar: " + error.message); return; }
    toast.success(approve ? "Evidencia aprobada" : "Evidencia rechazada");
    qc.invalidateQueries({ queryKey: ["mision_cerosh_reports", reportType] });
  };

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
      </div>

      {/* Calendario diario: cumplimiento + evidencia */}
      <div className="rounded-lg border p-4 space-y-3 bg-card">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h4 className="font-display font-extrabold text-base">Calendario diario</h4>
                <p className="text-xs text-muted-foreground">
                  Marca cada día como cumplido y adjunta evidencia (foto o PDF).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={calArea} onValueChange={(v) => { setCalArea(v); setCalSubarea("__none__"); }}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Selecciona área" /></SelectTrigger>
                  <SelectContent>
                    {areas.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={calSubarea} onValueChange={setCalSubarea} disabled={!calArea}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Subárea" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— General —</SelectItem>
                    {calAreaSubareas.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!calArea ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Selecciona un área para ver el calendario del mes.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2">
                {calDays.map((d, i) => {
                  const isUploading = uploadingDay === i;
                  const hasEvidence = !!d.evidenceUrl;
                  const isApproved = hasEvidence && d.status === "aprobado";
                  const isPending = hasEvidence && d.status === "pendiente";
                  const isRejected = hasEvidence && d.status === "rechazado";
                  const cardTone = isApproved
                    ? "border-emerald-400 bg-emerald-50"
                    : isPending
                    ? "border-amber-400 bg-amber-50"
                    : isRejected
                    ? "border-rose-300 bg-rose-50"
                    : d.completed
                    ? "border-emerald-400 bg-emerald-50"
                    : "bg-background";
                  return (
                    <div
                      key={i}
                      className={`rounded-md border p-2 flex flex-col gap-1.5 text-xs transition-colors ${cardTone}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">Día {i + 1}</span>
                        <Checkbox
                          checked={d.completed}
                          onCheckedChange={(v) => toggleCompleted(i, Boolean(v))}
                          aria-label={`Cumplido día ${i + 1}`}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        {d.evidenceUrl ? (
                          <button
                            type="button"
                            onClick={() => viewEvidence(d.evidenceUrl!)}
                            className={`flex items-center gap-1 hover:underline ${
                              isApproved ? "text-emerald-700" : isRejected ? "text-rose-700" : "text-amber-700"
                            }`}
                            title="Ver evidencia"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Evidencia</span>
                          </button>
                        ) : (
                          <label className="flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground">
                            {isUploading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Paperclip className="w-3.5 h-3.5" />
                            )}
                            <span>{isUploading ? "Subiendo..." : "Adjuntar"}</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,application/pdf"
                              disabled={isUploading}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadEvidence(i, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </div>
                      {hasEvidence && (
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              isApproved
                                ? "bg-emerald-600 text-white"
                                : isRejected
                                ? "bg-rose-600 text-white"
                                : "bg-amber-500 text-white"
                            }`}
                          >
                            {isApproved ? "Aprobada" : isRejected ? "Rechazada" : "Pendiente"}
                          </span>
                          {isSuperAdmin && !isApproved && d.recordId && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title="Aprobar"
                                onClick={() => reviewEvidence(d.recordId!, true)}
                                className="p-0.5 rounded hover:bg-emerald-100 text-emerald-700"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              {!isRejected && (
                                <button
                                  type="button"
                                  title="Rechazar"
                                  onClick={() => reviewEvidence(d.recordId!, false)}
                                  className="p-0.5 rounded hover:bg-rose-100 text-rose-700"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {isRejected && d.rejectionReason && (
                        <p
                          className="text-[10px] text-rose-700 leading-tight break-words"
                          title={d.rejectionReason}
                        >
                          <span className="font-semibold">Motivo:</span> {d.rejectionReason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
                (() => {
                  const daysWithReport = subData.days.filter((v) => v > 0).length;
                  const compliancePct = Math.round((daysWithReport / daysInMonth) * 100);
                  const toneClass =
                    compliancePct >= 80
                      ? "text-emerald-600"
                      : compliancePct >= 50
                      ? "text-amber-600"
                      : "text-rose-600";
                  const barGradient =
                    reportType === "orden_aseo"
                      ? "from-emerald-400 to-emerald-600"
                      : reportType === "accion_preventiva"
                      ? "from-amber-400 to-amber-600"
                      : "from-rose-400 to-rose-600";
                  return (
                    <div key={subKey} className="space-y-2.5">
                      <div className="flex items-center justify-between text-sm gap-3 flex-wrap">
                        <span className="font-medium">{subData.subName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {daysWithReport}/{daysInMonth} días · Total <strong className="text-foreground">{subData.total}</strong>
                          </span>
                          <span className={`font-display font-extrabold text-base tabular-nums ${toneClass}`}>
                            {compliancePct}%
                          </span>
                        </div>
                      </div>
                      {/* Daily bars per day of month */}
                      <div className="flex gap-[3px] items-end h-16 bg-muted/40 rounded-md p-1.5 ring-1 ring-border/50">
                        {subData.days.map((v, i) => {
                          const pct = v > 0 ? Math.max(15, (v / maxDay) * 100) : 0;
                          return (
                            <div
                              key={i}
                              className="flex-1 flex flex-col items-center justify-end gap-1"
                              title={`Día ${i + 1}: ${v}`}
                            >
                              <div
                                className={`w-full rounded-sm transition-all ${
                                  v > 0
                                    ? `bg-gradient-to-t ${barGradient} shadow-sm`
                                    : "bg-muted"
                                }`}
                                style={{ height: `${pct}%`, minHeight: v > 0 ? 6 : 2 }}
                              />
                              <span className="text-[9px] text-muted-foreground leading-none">{i + 1}</span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Compliance progress bar */}
                      <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${barGradient} transition-all duration-500`}
                          style={{ width: `${compliancePct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()
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