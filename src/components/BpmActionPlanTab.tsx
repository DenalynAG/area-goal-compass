import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Row {
  id: string;
  finding_date: string | null;
  reported_by: string;
  assigned_to: string;
  company: string;
  audited_personnel: string;
  condition_type: string;
  finding_description: string;
  finding_evidence_url: string;
  action_plan: string;
  estimated_close_date: string | null;
  real_close_date: string | null;
  action_evidence_url: string;
  closure_status: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-amber-100 text-amber-800 border-amber-300" },
  en_proceso: { label: "En proceso", className: "bg-blue-100 text-blue-800 border-blue-300" },
  cerrado: { label: "Cerrado", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  vencido: { label: "Vencido", className: "bg-red-100 text-red-800 border-red-300" },
};

const emptyForm = (): Omit<Row, "id"> => ({
  finding_date: format(new Date(), "yyyy-MM-dd"),
  reported_by: "",
  assigned_to: "",
  company: "",
  audited_personnel: "",
  condition_type: "",
  finding_description: "",
  finding_evidence_url: "",
  action_plan: "",
  estimated_close_date: null,
  real_close_date: null,
  action_evidence_url: "",
  closure_status: "pendiente",
});

export default function BpmActionPlanTab() {
  const { user, isSuperAdmin, hasRole } = useAuth();
  const canManage = isSuperAdmin || hasRole("admin_area");
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["bpm_action_plan"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bpm_action_plan" as any)
        .select("*")
        .order("finding_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Omit<Row, "id">>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"finding" | "action" | null>(null);
  const findingFileRef = useRef<HTMLInputElement>(null);
  const actionFileRef = useRef<HTMLInputElement>(null);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({
      finding_date: r.finding_date,
      reported_by: r.reported_by ?? "",
      assigned_to: r.assigned_to ?? "",
      company: r.company ?? "",
      audited_personnel: r.audited_personnel ?? "",
      condition_type: r.condition_type ?? "",
      finding_description: r.finding_description ?? "",
      finding_evidence_url: r.finding_evidence_url ?? "",
      action_plan: r.action_plan ?? "",
      estimated_close_date: r.estimated_close_date,
      real_close_date: r.real_close_date,
      action_evidence_url: r.action_evidence_url ?? "",
      closure_status: r.closure_status ?? "pendiente",
    });
    setDialogOpen(true);
  };

  const uploadEvidence = async (file: File, kind: "finding" | "action") => {
    if (!user) return;
    setUploading(kind);
    try {
      const path = `bpm_action_plan/${user.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("evidencias").upload(path, file);
      if (upErr) { toast.error(upErr.message); return; }
      const { data: signed } = await supabase.storage.from("evidencias").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl ?? path;
      setForm(f => ({ ...f, [kind === "finding" ? "finding_evidence_url" : "action_evidence_url"]: url }));
      toast.success("Evidencia cargada");
    } finally { setUploading(null); }
  };

  const save = async () => {
    if (!form.finding_description.trim()) { toast.error("La descripción del hallazgo es obligatoria"); return; }
    const payload = { ...form, created_by: user?.id ?? null };
    const { error } = editing
      ? await supabase.from("bpm_action_plan" as any).update(payload).eq("id", editing.id)
      : await supabase.from("bpm_action_plan" as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Registro actualizado" : "Registro guardado");
    qc.invalidateQueries({ queryKey: ["bpm_action_plan"] });
    setDialogOpen(false);
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("bpm_action_plan" as any).delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Registro eliminado");
    qc.invalidateQueries({ queryKey: ["bpm_action_plan"] });
    setDeleteId(null);
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Cargando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide">
            Auditoría de Verificación del Cumplimiento de los Principios de BPM
          </h3>
          <p className="text-xs text-muted-foreground">Basada en la Resolución 2674 de 2013</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo registro
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1600px]">
            <thead>
              <tr className="bg-amber-400 text-amber-950">
                <th className="border border-border px-2 py-2 text-center w-[90px]">Fecha hallazgo</th>
                <th className="border border-border px-2 py-2 text-center">Quien reporta</th>
                <th className="border border-border px-2 py-2 text-center">Asignado a</th>
                <th className="border border-border px-2 py-2 text-center">Empresa</th>
                <th className="border border-border px-2 py-2 text-center">Personal auditado</th>
                <th className="border border-border px-2 py-2 text-center">Tipo de condición</th>
                <th className="border border-border px-2 py-2 text-center min-w-[220px]">Descripción hallazgo</th>
                <th className="border border-border px-2 py-2 text-center w-[90px]">Evidencia</th>
                <th className="border border-border px-2 py-2 text-center min-w-[220px]">Plan de acción</th>
                <th className="border border-border px-2 py-2 text-center w-[90px]">Fecha estim. cierre</th>
                <th className="border border-border px-2 py-2 text-center w-[90px]">Fecha real cierre</th>
                <th className="border border-border px-2 py-2 text-center w-[90px]">Soporte plan</th>
                <th className="border border-border px-2 py-2 text-center w-[110px]">Estado</th>
                {canManage && <th className="border border-border px-2 py-2 text-center w-[80px]">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 14 : 13} className="text-center py-8 text-muted-foreground">
                    Sin registros. Crea el primer hallazgo para comenzar.
                  </td>
                </tr>
              ) : rows.map(r => {
                const st = STATUS_CONFIG[r.closure_status] ?? STATUS_CONFIG.pendiente;
                return (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="border border-border px-2 py-2 text-center whitespace-nowrap">
                      {r.finding_date ? format(new Date(r.finding_date), "d MMM yyyy", { locale: es }) : "—"}
                    </td>
                    <td className="border border-border px-2 py-2"><span className="bg-yellow-100 px-1.5 py-0.5 rounded">{r.reported_by || "—"}</span></td>
                    <td className="border border-border px-2 py-2 text-center">{r.assigned_to || "—"}</td>
                    <td className="border border-border px-2 py-2 text-center">{r.company || "—"}</td>
                    <td className="border border-border px-2 py-2 text-center">{r.audited_personnel || "—"}</td>
                    <td className="border border-border px-2 py-2">{r.condition_type || "—"}</td>
                    <td className="border border-border px-2 py-2 align-top whitespace-pre-wrap">{r.finding_description}</td>
                    <td className="border border-border px-2 py-2 text-center">
                      {r.finding_evidence_url ? (
                        <a href={r.finding_evidence_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          <ImageIcon className="w-3.5 h-3.5" /> Ver
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="border border-border px-2 py-2 align-top whitespace-pre-wrap">{r.action_plan || "—"}</td>
                    <td className="border border-border px-2 py-2 text-center whitespace-nowrap">
                      {r.estimated_close_date ? format(new Date(r.estimated_close_date), "d MMM yyyy", { locale: es }) : "—"}
                    </td>
                    <td className="border border-border px-2 py-2 text-center whitespace-nowrap">
                      {r.real_close_date ? format(new Date(r.real_close_date), "d MMM yyyy", { locale: es }) : "—"}
                    </td>
                    <td className="border border-border px-2 py-2 text-center">
                      {r.action_evidence_url ? (
                        <a href={r.action_evidence_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          <ImageIcon className="w-3.5 h-3.5" /> Ver
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="border border-border px-2 py-2 text-center">
                      <Badge className={`text-[10px] border ${st.className}`}>{st.label}</Badge>
                    </td>
                    {canManage && (
                      <td className="border border-border px-2 py-2 text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(r)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => setDeleteId(r.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar registro" : "Nuevo registro"} — Matriz Plan de Acción BPM</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Fecha hallazgo</Label>
              <Input type="date" value={form.finding_date ?? ""} onChange={e => setForm(f => ({ ...f, finding_date: e.target.value || null }))} />
            </div>
            <div>
              <Label>Quien reporta</Label>
              <Input value={form.reported_by} onChange={e => setForm(f => ({ ...f, reported_by: e.target.value }))} />
            </div>
            <div>
              <Label>Asignado a</Label>
              <Input value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} />
            </div>
            <div>
              <Label>Empresa</Label>
              <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
            <div>
              <Label>Personal auditado</Label>
              <Input value={form.audited_personnel} onChange={e => setForm(f => ({ ...f, audited_personnel: e.target.value }))} />
            </div>
            <div>
              <Label>Tipo de condición identificada</Label>
              <Input value={form.condition_type} onChange={e => setForm(f => ({ ...f, condition_type: e.target.value }))} placeholder="Ej: 1.2 Condiciones de pisos…" />
            </div>
            <div className="md:col-span-2">
              <Label>Descripción del hallazgo *</Label>
              <Textarea rows={3} value={form.finding_description} onChange={e => setForm(f => ({ ...f, finding_description: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Evidencia visual del hallazgo</Label>
              <div className="flex gap-2 items-center">
                <input type="file" ref={findingFileRef} accept="image/*,application/pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadEvidence(f, "finding"); e.target.value = ""; }} />
                <Button type="button" variant="outline" size="sm" onClick={() => findingFileRef.current?.click()} disabled={uploading === "finding"}>
                  {uploading === "finding" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                  Subir
                </Button>
                {form.finding_evidence_url && (
                  <a href={form.finding_evidence_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                    <ExternalLink className="w-3 h-3" /> Ver evidencia
                  </a>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <Label>Plan de acción</Label>
              <Textarea rows={3} value={form.action_plan} onChange={e => setForm(f => ({ ...f, action_plan: e.target.value }))} />
            </div>
            <div>
              <Label>Fecha estimada de cierre</Label>
              <Input type="date" value={form.estimated_close_date ?? ""} onChange={e => setForm(f => ({ ...f, estimated_close_date: e.target.value || null }))} />
            </div>
            <div>
              <Label>Fecha real de cierre</Label>
              <Input type="date" value={form.real_close_date ?? ""} onChange={e => setForm(f => ({ ...f, real_close_date: e.target.value || null }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Soporte visual del plan de acción</Label>
              <div className="flex gap-2 items-center">
                <input type="file" ref={actionFileRef} accept="image/*,application/pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadEvidence(f, "action"); e.target.value = ""; }} />
                <Button type="button" variant="outline" size="sm" onClick={() => actionFileRef.current?.click()} disabled={uploading === "action"}>
                  {uploading === "action" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                  Subir
                </Button>
                {form.action_evidence_url && (
                  <a href={form.action_evidence_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                    <ExternalLink className="w-3 h-3" /> Ver evidencia
                  </a>
                )}
              </div>
            </div>
            <div>
              <Label>Estado de cierre del plan</Label>
              <Select value={form.closure_status} onValueChange={v => setForm(f => ({ ...f, closure_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Actualizar" : "Guardar"}</Button>
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