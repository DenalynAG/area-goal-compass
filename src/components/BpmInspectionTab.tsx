import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, LineChart, Line } from "recharts";

interface BpmInspection {
  id: string;
  year: number;
  month: number;
  zone: string;
  percentage: number | null;
  notes: string | null;
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const ZONE_COLORS = ["#4472C4", "#ED7D31", "#A5A5A5", "#FFC000", "#5B9BD5", "#70AD47", "#264478", "#9E480E"];

function pctColor(p: number | null) {
  if (p == null) return "";
  if (p >= 90) return "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] font-semibold";
  if (p >= 70) return "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))] font-semibold";
  return "bg-destructive/10 text-destructive font-semibold";
}

export default function BpmInspectionTab() {
  const { isSuperAdmin, hasRole } = useAuth();
  const canManage = isSuperAdmin || hasRole("admin_area");
  const qc = useQueryClient();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const [semesterFilter, setSemesterFilter] = useState<"all" | "1" | "2">("all");

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ["bpm_inspections", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bpm_inspections" as any)
        .select("*")
        .eq("year", year);
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        percentage: r.percentage != null ? Number(r.percentage) : null,
      })) as BpmInspection[];
    },
  });

  const zones = useMemo(() => {
    const set = new Set<string>(["Cocina", "Bar", "Mesa"]);
    inspections.forEach(i => set.add(i.zone));
    return Array.from(set);
  }, [inspections]);

  const grid = useMemo(() => {
    const map: Record<string, Record<number, BpmInspection>> = {};
    inspections.forEach(i => {
      if (!map[i.zone]) map[i.zone] = {};
      map[i.zone][i.month] = i;
    });
    return map;
  }, [inspections]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BpmInspection | null>(null);
  const [form, setForm] = useState({ zone: "", month: 1, percentage: "", notes: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newZoneDialogOpen, setNewZoneDialogOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");

  const openCreate = (zone?: string, month?: number) => {
    setEditing(null);
    setForm({ zone: zone ?? "", month: month ?? 1, percentage: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (insp: BpmInspection) => {
    setEditing(insp);
    setForm({
      zone: insp.zone,
      month: insp.month,
      percentage: insp.percentage?.toString() ?? "",
      notes: insp.notes ?? "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.zone.trim()) { toast.error("La zona es obligatoria"); return; }
    if (form.percentage === "" || form.percentage == null) {
      toast.error("El porcentaje es obligatorio"); return;
    }
    const pct = parseFloat(form.percentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Porcentaje debe estar entre 0 y 100"); return;
    }
    const payload = {
      year,
      month: form.month,
      zone: form.zone.trim(),
      percentage: pct,
      notes: form.notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("bpm_inspections" as any).update(payload).eq("id", editing.id)
      : await supabase.from("bpm_inspections" as any).upsert(payload, { onConflict: "year,month,zone" });
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Registro actualizado" : "Registro guardado");
    await qc.invalidateQueries({ queryKey: ["bpm_inspections"] });
    await qc.refetchQueries({ queryKey: ["bpm_inspections", year] });
    setDialogOpen(false);
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("bpm_inspections" as any).delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Registro eliminado");
    qc.invalidateQueries({ queryKey: ["bpm_inspections"] });
    setDeleteId(null);
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Cargando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Label className="text-sm">Año:</Label>
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setNewZoneName(""); setNewZoneDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Nueva Zona
            </Button>
            <Button onClick={() => openCreate()}>
              <Plus className="w-4 h-4 mr-1" /> Nuevo Registro
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th colSpan={13} className="bg-primary text-primary-foreground py-2 text-center font-semibold border border-border">
                  INSPECCIÓN BPM MENSUAL — {year}
                </th>
              </tr>
              <tr className="bg-muted">
                <th className="border border-border px-3 py-2 text-left min-w-[140px]">Zona</th>
                {MONTHS.map(m => (
                  <th key={m} className="border border-border px-2 py-2 text-center min-w-[80px]">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zones.map(zone => (
                <tr key={zone}>
                  <td className="border border-border px-3 py-2 font-medium bg-muted/50">{zone}</td>
                  {MONTHS.map((_, idx) => {
                    const month = idx + 1;
                    const insp = grid[zone]?.[month];
                    return (
                      <td
                        key={month}
                        className={cn(
                          "border border-border px-2 py-2 text-center cursor-pointer hover:bg-accent/50 transition-colors",
                          insp && pctColor(insp.percentage)
                        )}
                        onClick={() => {
                          if (!canManage) return;
                          insp ? openEdit(insp) : openCreate(zone, month);
                        }}
                        title={insp?.notes ?? ""}
                      >
                        {insp?.percentage != null ? `${insp.percentage}%` : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {zones.length === 0 && (
                <tr>
                  <td colSpan={13} className="text-center py-6 text-muted-foreground">
                    Sin zonas registradas. Crea una nueva zona para comenzar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {canManage && (
        <p className="text-xs text-muted-foreground">
          Tip: haz clic en cualquier celda para registrar o editar el porcentaje.
        </p>
      )}

      {/* Chart: stacked bars per month */}
      {zones.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Inspección BPM Mensual — {year}</h3>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={MONTHS.map((m, idx) => {
                  const row: Record<string, any> = { month: m };
                  zones.forEach(z => {
                    const v = grid[z]?.[idx + 1]?.percentage;
                    row[z] = v != null ? Number(v) : 0;
                  });
                  return row;
                })}
                margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Legend />
                {zones.map((z, i) => (
                  <Bar key={z} dataKey={z} stackId="bpm" fill={ZONE_COLORS[i % ZONE_COLORS.length]}>
                    <LabelList
                      dataKey={z}
                      position="center"
                      formatter={(v: number) => (v > 0 ? `${v}%` : "")}
                      style={{ fill: "#fff", fontSize: 11, fontWeight: 600 }}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Auditoría externa por semestre */}
      {zones.length > 0 && (() => {
        const semesterAvg = (zone: string, sem: 1 | 2) => {
          const start = sem === 1 ? 1 : 7;
          const end = sem === 1 ? 6 : 12;
          let sum = 0, count = 0;
          for (let m = start; m <= end; m++) {
            const v = grid[zone]?.[m]?.percentage;
            if (v != null) { sum += Number(v); count++; }
          }
          return count > 0 ? Math.round(sum / count) : null;
        };
        const renderSemester = (sem: 1 | 2, title: string, color: string) => {
          const data = zones.map(z => ({ zone: z, value: semesterAvg(z, sem) }));
          const hasAny = data.some(d => d.value != null);
          return (
            <div className="border border-border rounded-md overflow-hidden">
              <div className="bg-primary text-primary-foreground py-2 text-center text-sm font-semibold">{title}</div>
              <div className="grid grid-cols-[1fr_120px]">
                <table className="w-full text-sm border-r border-border">
                  <tbody>
                    {data.map(d => (
                      <tr key={d.zone} className="border-b border-border">
                        <td className="px-3 py-2 font-medium">{d.zone}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {d.value != null ? `${d.value}%` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3">
                {hasAny ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data} margin={{ top: 24, right: 20, left: 0, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="zone" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => v != null ? [`${v}%`, "Promedio"] : ["Sin datos", ""]} />
                      <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 4, fill: color }} connectNulls>
                        <LabelList dataKey="value" position="top" formatter={(v: any) => v != null ? `${v}%` : ""} style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }} />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-xs text-muted-foreground py-10">Sin datos en el semestre</div>
                )}
              </div>
            </div>
          );
        };
        return (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">Auditoría Externa por Área y Semestre — {year}</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {renderSemester(1, "Auditoría externa 1er semestre", "#2563eb")}
                {renderSemester(2, "Auditoría externa 2do semestre", "#dc2626")}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Edit/Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar registro" : "Nuevo registro"} BPM</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Zona</Label>
              <Select value={form.zone} onValueChange={(v) => setForm(f => ({ ...f, zone: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona una zona" /></SelectTrigger>
                <SelectContent>
                  {zones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mes</Label>
              <Select value={form.month.toString()} onValueChange={(v) => setForm(f => ({ ...f, month: parseInt(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, idx) => <SelectItem key={m} value={(idx + 1).toString()}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Porcentaje (%)</Label>
              <Input type="number" min={0} max={100} step={0.01} value={form.percentage}
                onChange={(e) => setForm(f => ({ ...f, percentage: e.target.value }))} placeholder="Ej: 95" />
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editing && (
              <Button variant="destructive" onClick={() => { setDeleteId(editing.id); setDialogOpen(false); }}>
                <Trash2 className="w-4 h-4 mr-1" /> Eliminar
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Actualizar" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New zone dialog */}
      <Dialog open={newZoneDialogOpen} onOpenChange={setNewZoneDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva zona</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Nombre de la zona</Label>
            <Input value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} placeholder="Ej: Panadería" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewZoneDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              const z = newZoneName.trim();
              if (!z) { toast.error("Ingresa el nombre"); return; }
              setNewZoneDialogOpen(false);
              openCreate(z, 1);
            }}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}