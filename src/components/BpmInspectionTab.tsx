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

interface BpmInspection {
  id: string;
  year: number;
  month: number;
  zone: string;
  percentage: number | null;
  notes: string | null;
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

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

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ["bpm_inspections", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bpm_inspections" as any)
        .select("*")
        .eq("year", year);
      if (error) throw error;
      return (data ?? []) as unknown as BpmInspection[];
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
    const pct = form.percentage === "" ? null : parseFloat(form.percentage);
    if (pct != null && (isNaN(pct) || pct < 0 || pct > 100)) {
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
    qc.invalidateQueries({ queryKey: ["bpm_inspections"] });
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