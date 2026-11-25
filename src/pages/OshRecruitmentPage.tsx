import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAreas, useProfiles, useSubareas } from "@/hooks/useSupabaseData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Plus, Pencil, Trash2, Eye, ShieldAlert, Check, X, Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { coverageDays } from "@/lib/recruitment";

const db = supabase as any;
const V_STATUS = [
  { value: "activa", label: "Activa" }, { value: "cerrada", label: "Cerrada" },
  { value: "pausada", label: "Pausada" }, { value: "cancelada", label: "Cancelada" },
];
const C_STATUS = [
  { value: "en_proceso", label: "En proceso" }, { value: "descartado", label: "Descartado" },
  { value: "retirado", label: "Retirado" }, { value: "contratado", label: "Contratado" },
];
const TYPES = [{ value: "nueva", label: "Nueva" }, { value: "reemplazo", label: "Reemplazo" }];
const lbl = (arr: { value: string; label: string }[], v: string) => arr.find(o => o.value === v)?.label ?? v;
const NONE = "__none__";
export const STAGES = ["Reclutamiento", "Prueba técnica", "Assessment", "Exámenes médicos", "Polígrafo", "Contratación"].map(l => ({ value: l.toLowerCase(), label: l }));
const A_STATUS = [{ value: "pendiente", label: "Pendiente de aprobación" }, { value: "aprobada", label: "Aprobada" }, { value: "rechazada", label: "Rechazada" }];
const norm = (x: any) => String(x ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const toIso = (v: any): string | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") { const d = XLSX.SSF.parse_date_code(v); return d ? `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}` : null; }
  const t = String(v).trim(); let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; return null;
};

type Vacancy = any; type Candidate = any;

export default function OshRecruitmentPage() {
  const { user, isSuperAdmin, hasRole } = useAuth();
  const isLeader = hasRole("admin_area") || hasRole("gestor_area") || hasRole("lider_subarea");
  const qc = useQueryClient();
  const { data: isHR = false, isLoading: hrLoading } = useQuery({
    queryKey: ["is_hr", user?.id], enabled: !!user?.id,
    queryFn: async () => { const { data } = await supabase.rpc("is_hr", { _user_id: user!.id }); return !!data; },
  });
  const allowed = isSuperAdmin || isHR;
  const { data: areas = [] } = useAreas();
  const { data: profiles = [] } = useProfiles();
  const { data: subareas = [] } = useSubareas();
  const canSee = allowed || isLeader;
  const { data: vacancies = [] } = useQuery({
    queryKey: ["recruitment_vacancies"], enabled: canSee,
    queryFn: async () => { const { data, error } = await db.from("recruitment_vacancies").select("*").order("created_at", { ascending: false }); if (error) throw error; return data as Vacancy[]; },
  });
  const { data: candidates = [] } = useQuery({
    queryKey: ["recruitment_candidates"], enabled: allowed,
    queryFn: async () => { const { data, error } = await db.from("recruitment_candidates").select("*").order("application_date", { ascending: false }); if (error) throw error; return data as Candidate[]; },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["recruitment_vacancies"] }); qc.invalidateQueries({ queryKey: ["recruitment_candidates"] }); };

  const areaName = (id?: string) => (areas as any[]).find(a => a.id === id)?.name ?? "—";
  const personName = (id?: string) => (profiles as any[]).find(p => p.id === id)?.name ?? "—";
  const subName = (id?: string) => (subareas as any[]).find(a => a.id === id)?.name ?? "—";
  const stageLabel = (v?: string) => STAGES.find(o => o.value === v)?.label ?? v ?? "—";
  const vacCode = (id: string) => vacancies.find((v: Vacancy) => v.id === id)?.code ?? "—";

  const [vForm, setVForm] = useState<Vacancy | null>(null);
  const [cForm, setCForm] = useState<Candidate | null>(null);
  const [detail, setDetail] = useState<Vacancy | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<{ row: number; payload?: any; error?: string }[]>([]);
  const approved = vacancies.filter((v: Vacancy) => v.approval_status === "aprobada");
  const pendingReq = vacancies.filter((v: Vacancy) => v.approval_status === "pendiente");

  const stats = useMemo(() => {
    const vacancies = approved;
    const closed = vacancies.filter((v: Vacancy) => v.status === "cerrada" && v.closing_date);
    const avg = closed.length ? closed.reduce((s: number, v: Vacancy) => s + (coverageDays(v.opening_date, v.closing_date) ?? 0), 0) / closed.length : null;
    const hiredBy = (id: string) => candidates.filter((c: Candidate) => c.vacancy_id === id && c.status === "contratado").length;
    const pending = vacancies.filter((v: Vacancy) => v.status === "activa" && hiredBy(v.id) >= v.positions_required);
    const longest = [...vacancies].filter((v: Vacancy) => v.status !== "cancelada")
      .map((v: Vacancy) => ({ v, d: coverageDays(v.opening_date, v.status === "cerrada" ? v.closing_date : null) ?? 0 }))
      .sort((a, b) => b.d - a.d).slice(0, 5);
    return {
      active: vacancies.filter((v: Vacancy) => v.status === "activa").length,
      closed: vacancies.filter((v: Vacancy) => v.status === "cerrada").length,
      total: candidates.length, avg, pending, longest,
    };
  }, [vacancies, candidates]);

  const saveVacancy = async () => {
    const f = vForm!;
    if (!f.position?.trim()) return toast.error("El cargo es obligatorio");
    if (f.status === "cerrada" && !f.closing_date) return toast.error("Indica la fecha de cierre");
    const payload = {
      position: f.position.trim(), area_id: f.area_id || null, city: f.city || null, vacancy_type: f.vacancy_type,
      opening_date: f.opening_date, requesting_leader_id: f.requesting_leader_id || null,
      positions_required: Number(f.positions_required) || 1, status: f.status, closing_date: f.closing_date || null,
      subarea_id: f.subarea_id || null,
    };
    if (!allowed) {
      if (f.id) return;
      const { error } = await db.from("recruitment_vacancies").insert({ ...payload, status: "activa", closing_date: null, approval_status: "pendiente", requesting_leader_id: payload.requesting_leader_id ?? user?.id, created_by: user?.id });
      if (error) return toast.error(error.message);
      toast.success("Solicitud enviada a Recursos Humanos"); setVForm(null); return refresh();
    }
    const { error } = f.id ? await db.from("recruitment_vacancies").update(payload).eq("id", f.id)
      : await db.from("recruitment_vacancies").insert({ ...payload, created_by: user?.id });
    if (error) return toast.error(error.message);
    toast.success("Vacante guardada"); setVForm(null); refresh();
  };
  const saveCandidate = async () => {
    const f = cForm!;
    if (!f.name?.trim()) return toast.error("El nombre es obligatorio");
    if (!f.vacancy_id) return toast.error("Selecciona la vacante");
    if (f.status === "contratado" && !f.hire_date) return toast.error("Indica la fecha de contratación");
    const payload = { name: f.name.trim(), vacancy_id: f.vacancy_id, application_date: f.application_date, stage: f.stage || null, status: f.status, hire_date: f.hire_date || null };
    const { error } = f.id ? await db.from("recruitment_candidates").update(payload).eq("id", f.id)
      : await db.from("recruitment_candidates").insert({ ...payload, created_by: user?.id });
    if (error) return toast.error(error.message);
    toast.success("Candidato guardado"); setCForm(null); refresh();
  };
  const review = async (v: Vacancy, ok: boolean) => {
    let reason: string | null = null;
    if (!ok) { reason = prompt("Motivo del rechazo (opcional)") ; if (reason === null) return; }
    const { error } = await db.from("recruitment_vacancies").update({ approval_status: ok ? "aprobada" : "rechazada", approved_by: user?.id, approved_at: new Date().toISOString(), rejection_reason: ok ? null : (reason || null), ...(ok ? { opening_date: new Date().toISOString().slice(0, 10) } : {}) }).eq("id", v.id);
    if (error) return toast.error(error.message);
    toast.success(ok ? "Vacante aprobada" : "Solicitud rechazada"); refresh();
  };
  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([["Cargo", "Área", "Subárea", "Ciudad", "Tipo (Nueva/Reemplazo)", "Fecha de apertura", "Correo líder solicitante", "Posiciones requeridas", "Estado (Activa/Cerrada/Pausada/Cancelada)", "Fecha de cierre"],
      ["Auxiliar de cocina", (areas as any[])[0]?.name ?? "Alimentos y Bebidas", "", "Medellín", "Nueva", "01/11/2026", "", 1, "Activa", ""]]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Vacantes"); XLSX.writeFile(wb, "plantilla_vacantes.xlsx");
  };
  const parseFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("El archivo supera 5 MB");
    const wb = XLSX.read(await file.arrayBuffer());
    const grid: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: "" });
    const out = grid.slice(1).map((c, i) => ({ c, row: i + 2 })).filter(({ c }) => c.some(x => String(x).trim() !== "")).map(({ c, row }) => {
      const position = String(c[0]).trim(); if (!position) return { row, error: "Falta el cargo" };
      let area_id: string | null = null, subarea_id: string | null = null;
      if (String(c[1]).trim()) { const a = (areas as any[]).find(a => norm(a.name) === norm(c[1])); if (!a) return { row, error: `Área no encontrada: ${c[1]}` }; area_id = a.id; }
      if (String(c[2]).trim()) { const sa = (subareas as any[]).find(x => norm(x.name) === norm(c[2]) && (!area_id || x.area_id === area_id)); if (!sa) return { row, error: `Subárea no encontrada: ${c[2]}` }; subarea_id = sa.id; area_id = area_id ?? sa.area_id; }
      const tipo = norm(c[4]) || "nueva"; if (!["nueva", "reemplazo"].includes(tipo)) return { row, error: "Tipo inválido" };
      const opening = toIso(c[5]) ?? new Date().toISOString().slice(0, 10);
      let requesting_leader_id: string | null = null;
      if (String(c[6]).trim()) { const pr = (profiles as any[]).find(p => norm(p.email) === norm(c[6]) || norm(p.name) === norm(c[6])); if (!pr) return { row, error: `Líder no encontrado: ${c[6]}` }; requesting_leader_id = pr.id; }
      const status = norm(c[8]) || "activa"; if (!V_STATUS.some(o => o.value === status)) return { row, error: "Estado inválido" };
      const closing = toIso(c[9]); if (status === "cerrada" && !closing) return { row, error: "Vacante cerrada sin fecha de cierre" };
      return { row, payload: { position, area_id, subarea_id, city: String(c[3]).trim() || null, vacancy_type: tipo, opening_date: opening, requesting_leader_id, positions_required: Math.max(1, Number(c[7]) || 1), status, closing_date: closing, created_by: user?.id } };
    });
    setImportRows(out);
  };
  const confirmImport = async () => {
    const ok = importRows.filter(r => r.payload).map(r => r.payload);
    if (!ok.length) return;
    const { error } = await db.from("recruitment_vacancies").insert(ok);
    if (error) return toast.error(error.message);
    toast.success(`${ok.length} vacantes importadas, ${importRows.length - ok.length} omitidas`); setImportOpen(false); setImportRows([]); refresh();
  };
  const remove = async (table: string, id: string, msg: string) => {
    if (!confirm(msg)) return;
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Eliminado"); refresh();
  };

  if (hrLoading) return null;
  if (!allowed && !isLeader) return (
    <div className="p-8 flex items-center gap-2 text-muted-foreground"><ShieldAlert className="h-5 w-5" /> Solo Recursos Humanos y Super Admin pueden acceder a OSH Recruitment.</div>
  );

  const today = new Date().toISOString().slice(0, 10);
  const filteredV = approved.filter((v: Vacancy) => `${v.code} ${v.position} ${v.city ?? ""} ${areaName(v.area_id)}`.toLowerCase().includes(search.toLowerCase()));
  const filteredC = candidates.filter((c: Candidate) => `${c.code} ${c.name} ${vacCode(c.vacancy_id)}`.toLowerCase().includes(search.toLowerCase()));
  const Card = ({ title, value }: { title: string; value: any }) => (
    <div className="border-b border-border bg-card p-4"><p className="text-xs uppercase text-muted-foreground">{title}</p><p className="text-3xl font-bold text-foreground">{value}</p></div>
  );
  const th = "text-left p-2 text-xs uppercase text-muted-foreground border-b border-border";
  const td = "p-2 border-b border-border text-sm";

  const vacancyDialog = (
      <Dialog open={!!vForm} onOpenChange={o => !o && setVForm(null)}>
        <DialogContent>
          {vForm && <>
            <DialogHeader><DialogTitle>{vForm.id ? `Editar ${vForm.code}` : (allowed ? "Nueva vacante" : "Solicitar vacante")}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Cargo *</Label><Input value={vForm.position ?? ""} onChange={e => setVForm({ ...vForm, position: e.target.value })} /></div>
              <div><Label>Área</Label><SearchableSelect options={[{ value: NONE, label: "Sin área" }, ...(areas as any[]).map(a => ({ value: a.id, label: a.name }))]} value={vForm.area_id ?? NONE} onValueChange={v => setVForm({ ...vForm, area_id: v === NONE ? null : v, subarea_id: null })} /></div>
              <div><Label>Subárea</Label><SearchableSelect options={[{ value: NONE, label: "Sin subárea" }, ...(subareas as any[]).filter(x => !vForm.area_id || x.area_id === vForm.area_id).map(x => ({ value: x.id, label: x.name }))]} value={vForm.subarea_id ?? NONE} onValueChange={v => setVForm({ ...vForm, subarea_id: v === NONE ? null : v })} /></div>
              <div><Label>Ciudad</Label><Input value={vForm.city ?? ""} onChange={e => setVForm({ ...vForm, city: e.target.value })} /></div>
              <div><Label>Tipo</Label><SearchableSelect options={TYPES} value={vForm.vacancy_type} onValueChange={v => setVForm({ ...vForm, vacancy_type: v })} /></div>
              <div><Label>Posiciones requeridas</Label><Input type="number" min={1} value={vForm.positions_required} onChange={e => setVForm({ ...vForm, positions_required: e.target.value })} /></div>
              {allowed && <div className="col-span-2"><Label>Líder solicitante</Label><SearchableSelect options={[{ value: NONE, label: "Sin líder" }, ...(profiles as any[]).filter(p => p.is_active !== false).map(p => ({ value: p.id, label: p.name }))]} value={vForm.requesting_leader_id ?? NONE} onValueChange={v => setVForm({ ...vForm, requesting_leader_id: v === NONE ? null : v })} /></div>}
              <div><Label>Fecha de apertura</Label><Input type="date" value={vForm.opening_date ?? ""} onChange={e => setVForm({ ...vForm, opening_date: e.target.value })} /></div>
              {allowed && <><div><Label>Estado</Label><SearchableSelect options={V_STATUS} value={vForm.status} onValueChange={v => setVForm({ ...vForm, status: v, closing_date: v === "cerrada" ? (vForm.closing_date || today) : vForm.closing_date })} /></div>
              <div><Label>Fecha de cierre</Label><Input type="date" value={vForm.closing_date ?? ""} onChange={e => setVForm({ ...vForm, closing_date: e.target.value })} /></div></>}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setVForm(null)}>Cancelar</Button><Button onClick={saveVacancy}>{allowed ? "Guardar" : "Enviar solicitud"}</Button></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
  );

  if (!allowed) return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-foreground">Mis solicitudes de vacantes</h1>
        <Button onClick={() => setVForm({ vacancy_type: "nueva", opening_date: today, positions_required: 1, status: "activa" })}><Plus className="h-4 w-4 mr-1" />Solicitar vacante</Button>
      </div>
      <p className="text-sm text-muted-foreground">Recursos Humanos revisa y aprueba cada solicitud.</p>
      <div className="overflow-x-auto bg-card"><table className="w-full"><thead><tr>
        {["Código", "Cargo", "Área", "Subárea", "Ciudad", "Tipo", "Posiciones", "Solicitada", "Aprobación", "Motivo"].map(h => <th key={h} className={th}>{h}</th>)}
      </tr></thead><tbody>
        {vacancies.length === 0 && <tr><td className={td} colSpan={10}>Aún no has solicitado vacantes.</td></tr>}
        {vacancies.map((v: Vacancy) => <tr key={v.id}>
          <td className={td}>{v.code}</td><td className={td}>{v.position}</td><td className={td}>{areaName(v.area_id)}</td><td className={td}>{subName(v.subarea_id)}</td>
          <td className={td}>{v.city ?? "—"}</td><td className={td}>{lbl(TYPES, v.vacancy_type)}</td><td className={td}>{v.positions_required}</td>
          <td className={td}>{new Date(v.created_at).toLocaleDateString("es-CO")}</td><td className={td + " font-bold"}>{lbl(A_STATUS, v.approval_status)}</td><td className={td}>{v.rejection_reason ?? "—"}</td>
        </tr>)}
      </tbody></table></div>
      {vacancyDialog}
    </div>
  );

  const candRows = (list: Candidate[], showVac = true) => (
    <table className="w-full"><thead><tr>
      <th className={th}>Código</th><th className={th}>Candidato</th>{showVac && <th className={th}>Vacante</th>}
      <th className={th}>Postulación</th><th className={th}>Etapa</th><th className={th}>Estado</th><th className={th}>Contratación</th><th className={th}></th>
    </tr></thead><tbody>
      {list.length === 0 && <tr><td className={td} colSpan={8}>Sin candidatos.</td></tr>}
      {list.map(c => <tr key={c.id}>
        <td className={td}>{c.code}</td><td className={td}>{c.name}</td>{showVac && <td className={td}>{vacCode(c.vacancy_id)}</td>}
        <td className={td}>{c.application_date}</td><td className={td}>{stageLabel(c.stage)}</td><td className={td}>{lbl(C_STATUS, c.status)}</td><td className={td}>{c.hire_date ?? "—"}</td>
        <td className={td + " whitespace-nowrap"}>
          <Button size="icon" variant="ghost" onClick={() => setCForm({ ...c })}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => remove("recruitment_candidates", c.id, "¿Eliminar este candidato?")}><Trash2 className="h-4 w-4" /></Button>
        </td></tr>)}
    </tbody></table>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-foreground">OSH Recruitment</h1>
        <div className="flex gap-2">
          <Button onClick={() => setVForm({ vacancy_type: "nueva", opening_date: today, positions_required: 1, status: "activa" })}><Plus className="h-4 w-4 mr-1" />Vacante</Button>
          <Button variant="outline" onClick={() => setCForm({ application_date: today, status: "en_proceso", stage: "reclutamiento" })}><Plus className="h-4 w-4 mr-1" />Candidato</Button>
          <Button variant="outline" onClick={() => { setImportRows([]); setImportOpen(true); }}><Upload className="h-4 w-4 mr-1" />Importar Excel</Button>
        </div>
      </div>
      <Tabs defaultValue="dashboard">
        <TabsList><TabsTrigger value="dashboard">Dashboard</TabsTrigger><TabsTrigger value="vacantes">Vacantes</TabsTrigger><TabsTrigger value="candidatos">Candidatos</TabsTrigger><TabsTrigger value="solicitudes">Solicitudes ({pendingReq.length})</TabsTrigger></TabsList>
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card title="Vacantes activas" value={stats.active} />
            <Card title="Vacantes cerradas" value={stats.closed} />
            <Card title="Candidatos registrados" value={stats.total} />
            <Card title="Tiempo promedio de cobertura" value={stats.avg === null ? "—" : `${Math.round(stats.avg)} días`} />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border-b border-border p-4">
              <h2 className="font-bold mb-1">Vacantes pendientes de cierre ({stats.pending.length})</h2>
              <p className="text-xs text-muted-foreground mb-2">Activas con todas sus posiciones ya contratadas.</p>
              <table className="w-full"><tbody>
                {stats.pending.length === 0 && <tr><td className={td}>Ninguna.</td></tr>}
                {stats.pending.map((v: Vacancy) => <tr key={v.id}><td className={td}>{v.code}</td><td className={td}>{v.position}</td><td className={td}>{areaName(v.area_id)}</td></tr>)}
              </tbody></table>
            </div>
            <div className="bg-card border-b border-border p-4">
              <h2 className="font-bold mb-2">Vacantes con mayor tiempo de cobertura</h2>
              <table className="w-full"><tbody>
                {stats.longest.length === 0 && <tr><td className={td}>Sin datos.</td></tr>}
                {stats.longest.map(({ v, d }) => <tr key={v.id}><td className={td}>{v.code}</td><td className={td}>{v.position}</td><td className={td}>{lbl(V_STATUS, v.status)}</td><td className={td + " font-bold"}>{d} días</td></tr>)}
              </tbody></table>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="vacantes" className="space-y-3">
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          <div className="overflow-x-auto bg-card"><table className="w-full"><thead><tr>
            {["Código", "Cargo", "Área", "Subárea", "Ciudad", "Tipo", "Apertura", "Líder", "Posiciones", "Candidatos", "Estado", "Cierre", "Días", ""].map(h => <th key={h} className={th}>{h}</th>)}
          </tr></thead><tbody>
            {filteredV.length === 0 && <tr><td className={td} colSpan={14}>Sin vacantes.</td></tr>}
            {filteredV.map((v: Vacancy) => <tr key={v.id}>
              <td className={td}>{v.code}</td><td className={td}>{v.position}</td><td className={td}>{areaName(v.area_id)}</td><td className={td}>{subName(v.subarea_id)}</td><td className={td}>{v.city ?? "—"}</td>
              <td className={td}>{lbl(TYPES, v.vacancy_type)}</td><td className={td}>{v.opening_date}</td><td className={td}>{personName(v.requesting_leader_id)}</td>
              <td className={td}>{v.positions_required}</td><td className={td}>{candidates.filter((c: Candidate) => c.vacancy_id === v.id).length}</td>
              <td className={td}>{lbl(V_STATUS, v.status)}</td><td className={td}>{v.closing_date ?? "—"}</td>
              <td className={td}>{coverageDays(v.opening_date, v.status === "cerrada" ? v.closing_date : null) ?? "—"}</td>
              <td className={td + " whitespace-nowrap"}>
                <Button size="icon" variant="ghost" onClick={() => setDetail(v)}><Eye className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setVForm({ ...v })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove("recruitment_vacancies", v.id, "¿Eliminar esta vacante y todos sus candidatos?")}><Trash2 className="h-4 w-4" /></Button>
              </td></tr>)}
          </tbody></table></div>
        </TabsContent>
        <TabsContent value="solicitudes" className="space-y-3">
          <div className="overflow-x-auto bg-card"><table className="w-full"><thead><tr>
            {["Código", "Cargo", "Área", "Subárea", "Ciudad", "Tipo", "Posiciones", "Solicitante", "Fecha", ""].map(h => <th key={h} className={th}>{h}</th>)}
          </tr></thead><tbody>
            {pendingReq.length === 0 && <tr><td className={td} colSpan={10}>No hay solicitudes pendientes.</td></tr>}
            {pendingReq.map((v: Vacancy) => <tr key={v.id}>
              <td className={td}>{v.code}</td><td className={td}>{v.position}</td><td className={td}>{areaName(v.area_id)}</td><td className={td}>{subName(v.subarea_id)}</td>
              <td className={td}>{v.city ?? "—"}</td><td className={td}>{lbl(TYPES, v.vacancy_type)}</td><td className={td}>{v.positions_required}</td>
              <td className={td}>{personName(v.requesting_leader_id ?? v.created_by)}</td><td className={td}>{new Date(v.created_at).toLocaleDateString("es-CO")}</td>
              <td className={td + " whitespace-nowrap"}>
                <Button size="sm" onClick={() => review(v, true)}><Check className="h-4 w-4 mr-1" />Aprobar</Button>
                <Button size="sm" variant="outline" className="ml-1" onClick={() => review(v, false)}><X className="h-4 w-4 mr-1" />Rechazar</Button>
              </td></tr>)}
          </tbody></table></div>
        </TabsContent>
        <TabsContent value="candidatos" className="space-y-3">
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          <div className="overflow-x-auto bg-card">{candRows(filteredC)}</div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="max-w-4xl">
          {detail && <>
            <DialogHeader><DialogTitle>{detail.code} · {detail.position}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><b>Área:</b> {areaName(detail.area_id)}</div><div><b>Subárea:</b> {subName(detail.subarea_id)}</div><div><b>Ciudad:</b> {detail.city ?? "—"}</div>
              <div><b>Tipo:</b> {lbl(TYPES, detail.vacancy_type)}</div><div><b>Estado:</b> {lbl(V_STATUS, detail.status)}</div>
              <div><b>Apertura:</b> {detail.opening_date}</div><div><b>Cierre:</b> {detail.closing_date ?? "—"}</div>
              <div><b>Posiciones:</b> {detail.positions_required}</div><div><b>Días:</b> {coverageDays(detail.opening_date, detail.status === "cerrada" ? detail.closing_date : null) ?? "—"}</div>
              <div className="col-span-2"><b>Líder solicitante:</b> {personName(detail.requesting_leader_id)}</div>
              <div className="col-span-2"><b>Creada:</b> {new Date(detail.created_at).toLocaleDateString("es-CO")}</div>
            </div>
            <div className="flex justify-between items-center mt-2"><h3 className="font-bold">Candidatos asociados</h3>
              <Button size="sm" onClick={() => setCForm({ application_date: today, status: "en_proceso", stage: "reclutamiento", vacancy_id: detail.id })}><Plus className="h-4 w-4 mr-1" />Agregar</Button></div>
            <div className="overflow-x-auto max-h-80">{candRows(candidates.filter((c: Candidate) => c.vacancy_id === detail.id), false)}</div>
          </>}
        </DialogContent>
      </Dialog>

      {vacancyDialog}
      <Dialog open={!!cForm} onOpenChange={o => !o && setCForm(null)}>
        <DialogContent>
          {cForm && <>
            <DialogHeader><DialogTitle>{cForm.id ? `Editar ${cForm.code}` : "Nuevo candidato"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Nombre o identificador interno *</Label><Input value={cForm.name ?? ""} onChange={e => setCForm({ ...cForm, name: e.target.value })} /></div>
              <div className="col-span-2"><Label>Vacante *</Label><SearchableSelect options={approved.map((v: Vacancy) => ({ value: v.id, label: `${v.code} · ${v.position}` }))} value={cForm.vacancy_id ?? ""} onValueChange={v => setCForm({ ...cForm, vacancy_id: v })} placeholder="Selecciona" /></div>
              <div><Label>Fecha de postulación</Label><Input type="date" value={cForm.application_date ?? ""} onChange={e => setCForm({ ...cForm, application_date: e.target.value })} /></div>
              <div><Label>Etapa actual</Label><SearchableSelect options={STAGES} value={cForm.stage ?? "reclutamiento"} onValueChange={v => setCForm({ ...cForm, stage: v })} /></div>
              <div><Label>Estado</Label><SearchableSelect options={C_STATUS} value={cForm.status} onValueChange={v => setCForm({ ...cForm, status: v, hire_date: v === "contratado" ? (cForm.hire_date || today) : cForm.hire_date })} /></div>
              <div><Label>Fecha de contratación</Label><Input type="date" value={cForm.hire_date ?? ""} onChange={e => setCForm({ ...cForm, hire_date: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setCForm(null)}>Cancelar</Button><Button onClick={saveCandidate}>Guardar</Button></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Importar vacantes desde Excel</DialogTitle></DialogHeader>
          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1" />Descargar plantilla</Button>
            <Input type="file" accept=".xlsx,.xls,.csv" className="max-w-xs" onChange={e => e.target.files?.[0] && parseFile(e.target.files[0])} />
          </div>
          {importRows.length > 0 && <>
            <p className="text-sm">{importRows.length} filas · <b>{importRows.filter(r => r.payload).length} válidas</b> · {importRows.filter(r => r.error).length} con error</p>
            <div className="max-h-72 overflow-y-auto"><table className="w-full"><thead><tr><th className={th}>Fila</th><th className={th}>Cargo</th><th className={th}>Área</th><th className={th}>Resultado</th></tr></thead><tbody>
              {importRows.map(r => <tr key={r.row}><td className={td}>{r.row}</td><td className={td}>{r.payload?.position ?? "—"}</td><td className={td}>{areaName(r.payload?.area_id)}</td>
                <td className={td + (r.error ? " text-destructive" : "")}>{r.error ?? "OK"}</td></tr>)}
            </tbody></table></div>
          </>}
          <DialogFooter><Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button disabled={!importRows.some(r => r.payload)} onClick={confirmImport}>Importar {importRows.filter(r => r.payload).length}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
