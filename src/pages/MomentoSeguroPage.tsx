import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAreas, useSubareas, useProfiles } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import SignaturePad from "@/components/SignaturePad";
import {
  ShieldCheck, AlertTriangle, Lightbulb, Plus, Pencil, Trash2, Search, Filter,
  Paperclip, History, BarChart3, ClipboardList, Loader2, Download, X,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";

const NONE = "__none__";

type Category = "comportamiento_seguro" | "oportunidad_mejora" | "comportamiento_inseguro";
type RiskLevel = "bajo" | "medio" | "alto" | "critico";
type Status = "abierta" | "en_seguimiento" | "cerrada";

interface Observation {
  id: string;
  observation_date: string;
  observation_time: string | null;
  area_id: string | null;
  subarea_id: string | null;
  location: string | null;
  observer_user_id: string | null;
  observer_name: string | null;
  observed_user_id: string | null;
  observed_name: string | null;
  observed_document: string | null;
  observed_position: string | null;
  category: Category;
  behavior_category: string | null;
  description: string;
  contributing_factors: string[];
  associated_risk: string | null;
  risk_level: RiskLevel;
  evidence_urls: string[];
  immediate_actions: string | null;
  followup_required: boolean;
  followup_responsible_user_id: string | null;
  followup_due_date: string | null;
  followup_notes: string | null;
  status: Status;
  closed_at: string | null;
  signature_observer: string | null;
  signature_observed: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORY_META: Record<Category, { label: string; icon: any; chip: string }> = {
  comportamiento_seguro: { label: "Comportamiento seguro", icon: ShieldCheck, chip: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" },
  oportunidad_mejora: { label: "Oportunidad de mejora", icon: Lightbulb, chip: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]" },
  comportamiento_inseguro: { label: "Comportamiento inseguro", icon: AlertTriangle, chip: "bg-destructive/15 text-destructive" },
};

const RISK_META: Record<RiskLevel, { label: string; chip: string }> = {
  bajo: { label: "Bajo", chip: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" },
  medio: { label: "Medio", chip: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]" },
  alto: { label: "Alto", chip: "bg-[hsl(var(--warning)/0.18)] text-[hsl(var(--warning))]" },
  critico: { label: "Crítico", chip: "bg-destructive/15 text-destructive" },
};

const STATUS_META: Record<Status, { label: string; chip: string }> = {
  abierta: { label: "Abierta", chip: "bg-muted text-foreground" },
  en_seguimiento: { label: "En seguimiento", chip: "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]" },
  cerrada: { label: "Cerrada", chip: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" },
};

const BEHAVIOR_CATEGORIES = [
  "Uso de EPP",
  "Herramientas y equipos",
  "Orden y aseo",
  "Posición / ergonomía",
  "Procedimientos de trabajo",
  "Trabajo en alturas",
  "Manipulación de químicos",
  "Manipulación de alimentos",
  "Riesgo eléctrico",
  "Vehículos y desplazamientos",
  "Reacción de las personas",
  "Otro",
];

const CONTRIBUTING_FACTORS = [
  "Falta de capacitación",
  "Exceso de confianza",
  "Prisa / presión de tiempo",
  "Fatiga",
  "Procedimiento inexistente o poco claro",
  "EPP no disponible",
  "Herramienta inadecuada",
  "Condiciones del entorno",
  "Falta de supervisión",
  "Comunicación deficiente",
];

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const emptyForm = (): Partial<Observation> => ({
  observation_date: new Date().toISOString().slice(0, 10),
  observation_time: new Date().toTimeString().slice(0, 5),
  category: "comportamiento_seguro",
  risk_level: "bajo",
  status: "abierta",
  description: "",
  contributing_factors: [],
  evidence_urls: [],
  followup_required: false,
});

function useObservations() {
  return useQuery({
    queryKey: ["safe_moment_observations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("safe_moment_observations")
        .select("*")
        .order("observation_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Observation[];
    },
  });
}

function useObservationHistory() {
  return useQuery({
    queryKey: ["safe_moment_history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .eq("table_name", "safe_moment_observations")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export default function MomentoSeguroPage() {
  const { user, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: profiles = [] } = useProfiles();
  const { data: observations = [], isLoading } = useObservations();
  const { data: history = [] } = useObservationHistory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Observation | null>(null);
  const [form, setForm] = useState<Partial<Observation>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<Observation | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [fArea, setFArea] = useState(NONE);
  const [fCategory, setFCategory] = useState(NONE);
  const [fRisk, setFRisk] = useState(NONE);
  const [fStatus, setFStatus] = useState(NONE);
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const areaOptions = areas.map((a) => ({ value: a.id, label: a.name }));
  const subareaOptions = (form.area_id ? subareas.filter((s) => s.area_id === form.area_id) : subareas)
    .map((s) => ({ value: s.id, label: s.name }));
  const profileOptions = profiles.map((p) => ({ value: p.id, label: p.name }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return observations.filter((o) => {
      if (fArea !== NONE && o.area_id !== fArea) return false;
      if (fCategory !== NONE && o.category !== fCategory) return false;
      if (fRisk !== NONE && o.risk_level !== fRisk) return false;
      if (fStatus !== NONE && o.status !== fStatus) return false;
      if (fFrom && o.observation_date < fFrom) return false;
      if (fTo && o.observation_date > fTo) return false;
      if (q) {
        const hay = [o.observed_name, o.observer_name, o.description, o.location, o.behavior_category, o.associated_risk]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [observations, search, fArea, fCategory, fRisk, fStatus, fFrom, fTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const resetFilters = () => {
    setSearch(""); setFArea(NONE); setFCategory(NONE); setFRisk(NONE); setFStatus(NONE);
    setFFrom(""); setFTo(""); setPage(1);
  };

  // Indicators
  const indicators = useMemo(() => {
    const total = filtered.length;
    const by = (c: Category) => filtered.filter((o) => o.category === c).length;
    const safe = by("comportamiento_seguro");
    const open = filtered.filter((o) => o.status !== "cerrada").length;
    const closed = filtered.filter((o) => o.status === "cerrada").length;
    const overdue = filtered.filter((o) =>
      o.followup_required && o.status !== "cerrada" && o.followup_due_date &&
      o.followup_due_date < new Date().toISOString().slice(0, 10)).length;
    return {
      total, safe, improvement: by("oportunidad_mejora"), unsafe: by("comportamiento_inseguro"),
      open, closed, overdue,
      safeIndex: total ? Math.round((safe / total) * 100) : 0,
      closureRate: total ? Math.round((closed / total) * 100) : 0,
    };
  }, [filtered]);

  const monthlyData = useMemo(() => {
    const year = new Date().getFullYear();
    return MONTHS.map((m, i) => {
      const rows = filtered.filter((o) => {
        const d = new Date(o.observation_date + "T00:00:00");
        return d.getFullYear() === year && d.getMonth() === i;
      });
      return {
        mes: m,
        Seguro: rows.filter((r) => r.category === "comportamiento_seguro").length,
        Mejora: rows.filter((r) => r.category === "oportunidad_mejora").length,
        Inseguro: rows.filter((r) => r.category === "comportamiento_inseguro").length,
      };
    });
  }, [filtered]);

  const areaData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((o) => {
      const name = areas.find((a) => a.id === o.area_id)?.name ?? "Sin área";
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map, ([area, total]) => ({ area, total })).sort((a, b) => b.total - a.total);
  }, [filtered, areas]);

  const riskData = useMemo(() =>
    (Object.keys(RISK_META) as RiskLevel[]).map((r) => ({
      name: RISK_META[r].label,
      value: filtered.filter((o) => o.risk_level === r).length,
    })).filter((d) => d.value > 0), [filtered]);

  const RISK_COLORS = ["hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--warning))", "hsl(var(--destructive))"];

  const canEdit = (o: Observation) =>
    isSuperAdmin || o.created_by === user?.id || o.observer_user_id === user?.id || o.followup_responsible_user_id === user?.id;

  const openNew = () => {
    const me = profiles.find((p) => p.id === user?.id);
    setEditing(null);
    setForm({ ...emptyForm(), observer_user_id: user?.id ?? null, observer_name: me?.name ?? null });
    setDialogOpen(true);
  };

  const openEdit = (o: Observation) => {
    setEditing(o);
    setForm({ ...o });
    setDialogOpen(true);
  };

  const setField = (k: keyof Observation, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const toggleFactor = (factor: string) => {
    const current = form.contributing_factors ?? [];
    setField("contributing_factors", current.includes(factor)
      ? current.filter((f) => f !== factor)
      : [...current, factor]);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} supera 10 MB`); continue; }
        const ok = /^(image\/|video\/|application\/pdf)/.test(file.type);
        if (!ok) { toast.error(`${file.name}: formato no permitido`); continue; }
        const path = `momento-seguro/${user?.id ?? "anon"}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error } = await supabase.storage.from("evidencias").upload(path, file);
        if (error) { toast.error(`No se pudo subir ${file.name}`); continue; }
        uploaded.push(path);
      }
      if (uploaded.length) {
        setField("evidence_urls", [...(form.evidence_urls ?? []), ...uploaded]);
        toast.success(`${uploaded.length} archivo(s) adjuntado(s)`);
      }
    } finally {
      setUploading(false);
    }
  };

  const downloadEvidence = async (path: string) => {
    const { data, error } = await supabase.storage.from("evidencias").download(path);
    if (error || !data) { toast.error("No se pudo descargar la evidencia"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url; a.download = path.split("/").pop() || "evidencia";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const validate = () => {
    if (!form.observation_date) return "La fecha de observación es obligatoria";
    if (!form.area_id) return "Selecciona el área";
    if (!form.observed_name?.trim() && !form.observed_user_id) return "Indica el colaborador observado";
    if (!form.category) return "Selecciona la categoría del comportamiento";
    if (!form.description?.trim() || form.description.trim().length < 15)
      return "La descripción debe tener al menos 15 caracteres";
    if (!form.risk_level) return "Selecciona el nivel de riesgo";
    if (form.followup_required && !form.followup_due_date)
      return "Indica la fecha compromiso del seguimiento";
    if (form.followup_required && !form.followup_responsible_user_id)
      return "Indica el responsable del seguimiento";
    if ((form.description ?? "").length > 4000) return "La descripción es demasiado larga";
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      const observedName = form.observed_user_id
        ? profiles.find((p) => p.id === form.observed_user_id)?.name ?? form.observed_name
        : form.observed_name;
      const payload: any = {
        observation_date: form.observation_date,
        observation_time: form.observation_time || null,
        area_id: form.area_id,
        subarea_id: form.subarea_id || null,
        location: form.location?.trim() || null,
        observer_user_id: form.observer_user_id || user?.id || null,
        observer_name: form.observer_name?.trim() || profiles.find((p) => p.id === user?.id)?.name || null,
        observed_user_id: form.observed_user_id || null,
        observed_name: observedName?.trim() || null,
        observed_document: form.observed_document?.trim() || null,
        observed_position: form.observed_position?.trim() || null,
        category: form.category,
        behavior_category: form.behavior_category || null,
        description: form.description?.trim(),
        contributing_factors: form.contributing_factors ?? [],
        associated_risk: form.associated_risk?.trim() || null,
        risk_level: form.risk_level,
        evidence_urls: form.evidence_urls ?? [],
        immediate_actions: form.immediate_actions?.trim() || null,
        followup_required: !!form.followup_required,
        followup_responsible_user_id: form.followup_responsible_user_id || null,
        followup_due_date: form.followup_due_date || null,
        followup_notes: form.followup_notes?.trim() || null,
        status: form.status ?? "abierta",
        closed_at: form.status === "cerrada" ? (editing?.closed_at ?? new Date().toISOString()) : null,
        signature_observer: form.signature_observer || null,
        signature_observed: form.signature_observed || null,
      };
      if (editing) {
        const { error } = await (supabase as any)
          .from("safe_moment_observations").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Observación actualizada");
      } else {
        const { error } = await (supabase as any)
          .from("safe_moment_observations").insert({ ...payload, created_by: user?.id ?? null });
        if (error) throw error;
        toast.success("Observación registrada");
      }
      qc.invalidateQueries({ queryKey: ["safe_moment_observations"] });
      qc.invalidateQueries({ queryKey: ["safe_moment_history"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar la observación");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const { error } = await (supabase as any)
      .from("safe_moment_observations").delete().eq("id", toDelete.id);
    if (error) { toast.error("No se pudo eliminar"); return; }
    toast.success("Observación eliminada");
    qc.invalidateQueries({ queryKey: ["safe_moment_observations"] });
    qc.invalidateQueries({ queryKey: ["safe_moment_history"] });
    setToDelete(null);
  };

  const areaName = (id: string | null) => areas.find((a) => a.id === id)?.name ?? "—";
  const subareaName = (id: string | null) => subareas.find((s) => s.id === id)?.name ?? "";
  const profileName = (id: string | null) => profiles.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display">Momento Seguro</h1>
          <p className="text-sm text-muted-foreground">
            Observación de comportamientos y seguimiento SG-SST
          </p>
        </div>
        <Button onClick={openNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Nueva observación
        </Button>
      </header>

      <Tabs defaultValue="observaciones" className="space-y-4">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="observaciones"><ClipboardList className="h-4 w-4 mr-1.5" />Observaciones</TabsTrigger>
          <TabsTrigger value="indicadores"><BarChart3 className="h-4 w-4 mr-1.5" />Indicadores</TabsTrigger>
          <TabsTrigger value="historial"><History className="h-4 w-4 mr-1.5" />Historial</TabsTrigger>
        </TabsList>

        {/* OBSERVACIONES */}
        <TabsContent value="observaciones" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Buscar..." value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <SearchableSelect options={[{ value: NONE, label: "Todas las áreas" }, ...areaOptions]}
                value={fArea} onValueChange={(v) => { setFArea(v); setPage(1); }} placeholder="Área" />
              <SearchableSelect
                options={[{ value: NONE, label: "Todas las categorías" },
                  ...(Object.keys(CATEGORY_META) as Category[]).map((c) => ({ value: c, label: CATEGORY_META[c].label }))]}
                value={fCategory} onValueChange={(v) => { setFCategory(v); setPage(1); }} placeholder="Categoría" />
              <SearchableSelect
                options={[{ value: NONE, label: "Todos los riesgos" },
                  ...(Object.keys(RISK_META) as RiskLevel[]).map((r) => ({ value: r, label: RISK_META[r].label }))]}
                value={fRisk} onValueChange={(v) => { setFRisk(v); setPage(1); }} placeholder="Nivel de riesgo" />
              <SearchableSelect
                options={[{ value: NONE, label: "Todos los estados" },
                  ...(Object.keys(STATUS_META) as Status[]).map((s) => ({ value: s, label: STATUS_META[s].label }))]}
                value={fStatus} onValueChange={(v) => { setFStatus(v); setPage(1); }} placeholder="Estado" />
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div>
                  <Label className="text-xs">Desde</Label>
                  <Input type="date" value={fFrom} onChange={(e) => { setFFrom(e.target.value); setPage(1); }} />
                </div>
                <div>
                  <Label className="text-xs">Hasta</Label>
                  <Input type="date" value={fTo} onChange={(e) => { setFTo(e.target.value); setPage(1); }} />
                </div>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={resetFilters} className="w-full">
                  <X className="h-4 w-4 mr-1.5" /> Limpiar filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total observaciones", value: indicators.total },
              { label: "Índice de seguridad", value: `${indicators.safeIndex}%` },
              { label: "Abiertas", value: indicators.open },
              { label: "Seguimientos vencidos", value: indicators.overdue },
            ].map((k) => (
              <Card key={k.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-semibold mt-1">{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando observaciones...
            </div>
          ) : pageItems.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              No hay observaciones con los filtros seleccionados.
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {pageItems.map((o) => {
                const CatIcon = CATEGORY_META[o.category]?.icon ?? ShieldCheck;
                return (
                  <Card key={o.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`${CATEGORY_META[o.category]?.chip} border-0`}>
                              <CatIcon className="h-3 w-3 mr-1" />{CATEGORY_META[o.category]?.label}
                            </Badge>
                            <Badge className={`${RISK_META[o.risk_level]?.chip} border-0`}>Riesgo {RISK_META[o.risk_level]?.label}</Badge>
                            <Badge className={`${STATUS_META[o.status]?.chip} border-0`}>{STATUS_META[o.status]?.label}</Badge>
                          </div>
                          <p className="mt-2 font-medium">{o.observed_name ?? "Sin colaborador"}{o.observed_position ? ` · ${o.observed_position}` : ""}</p>
                          <p className="text-xs text-muted-foreground">
                            {o.observation_date}{o.observation_time ? ` ${o.observation_time}` : ""} · {areaName(o.area_id)}
                            {o.subarea_id ? ` / ${subareaName(o.subarea_id)}` : ""}{o.location ? ` · ${o.location}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {canEdit(o) && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(o)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {(isSuperAdmin || o.created_by === user?.id) && (
                            <Button variant="ghost" size="icon" onClick={() => setToDelete(o)} title="Eliminar">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <p className="text-sm whitespace-pre-wrap">{o.description}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                        {o.behavior_category && <p><span className="font-medium text-foreground">Categoría:</span> {o.behavior_category}</p>}
                        {o.associated_risk && <p><span className="font-medium text-foreground">Riesgo asociado:</span> {o.associated_risk}</p>}
                        {!!o.contributing_factors?.length && (
                          <p className="sm:col-span-2"><span className="font-medium text-foreground">Factores:</span> {o.contributing_factors.join(", ")}</p>
                        )}
                        {o.immediate_actions && <p className="sm:col-span-2"><span className="font-medium text-foreground">Acción inmediata:</span> {o.immediate_actions}</p>}
                        {o.followup_required && (
                          <p className="sm:col-span-2">
                            <span className="font-medium text-foreground">Seguimiento:</span> {profileName(o.followup_responsible_user_id)}
                            {o.followup_due_date ? ` · vence ${o.followup_due_date}` : ""}
                          </p>
                        )}
                        <p><span className="font-medium text-foreground">Observador:</span> {o.observer_name ?? profileName(o.observer_user_id)}</p>
                      </div>

                      {!!o.evidence_urls?.length && (
                        <div className="flex flex-wrap gap-2">
                          {o.evidence_urls.map((p) => (
                            <Button key={p} variant="outline" size="sm" className="h-7 text-xs" onClick={() => downloadEvidence(p)}>
                              <Download className="h-3 w-3 mr-1" />{p.split("/").pop()?.slice(0, 22)}
                            </Button>
                          ))}
                        </div>
                      )}

                      {(o.signature_observer || o.signature_observed) && (
                        <div className="flex flex-wrap gap-4 pt-2 border-t border-border">
                          {o.signature_observer && (
                            <div><p className="text-[11px] text-muted-foreground mb-1">Firma observador</p>
                              <img src={o.signature_observer} alt="Firma del observador" className="h-12 bg-background rounded border border-border" /></div>
                          )}
                          {o.signature_observed && (
                            <div><p className="text-[11px] text-muted-foreground mb-1">Firma colaborador</p>
                              <img src={o.signature_observed} alt="Firma del colaborador observado" className="h-12 bg-background rounded border border-border" /></div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">Página {page} de {totalPages} · {filtered.length} registros</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* INDICADORES */}
        <TabsContent value="indicadores" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Comportamientos seguros", value: indicators.safe },
              { label: "Oportunidades de mejora", value: indicators.improvement },
              { label: "Comportamientos inseguros", value: indicators.unsafe },
              { label: "% de cierre", value: `${indicators.closureRate}%` },
            ].map((k) => (
              <Card key={k.label}><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-semibold mt-1">{k.value}</p>
              </CardContent></Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Comportamiento mensual ({new Date().getFullYear()})</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Seguro" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Mejora" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Inseguro" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Observaciones por área</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areaData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis type="number" allowDecimals={false} fontSize={12} />
                    <YAxis type="category" dataKey="area" width={120} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Distribución por nivel de riesgo</CardTitle></CardHeader>
              <CardContent className="h-72">
                {riskData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center pt-20">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={riskData} dataKey="value" nameKey="name" outerRadius={90} label>
                        {riskData.map((_, i) => <Cell key={i} fill={RISK_COLORS[i % RISK_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* HISTORIAL */}
        <TabsContent value="historial">
          <Card>
            <CardHeader><CardTitle className="text-base">Historial de cambios</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Aún no hay movimientos registrados.</p>
              ) : history.map((h: any) => (
                <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize">{h.action} observación</p>
                    <p className="text-xs text-muted-foreground">{h.user_name ?? "Sistema"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("es-CO")}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FORM DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar observación" : "Nueva observación de Momento Seguro"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Datos generales */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">1. Datos generales</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Fecha *</Label>
                  <Input type="date" value={form.observation_date ?? ""} onChange={(e) => setField("observation_date", e.target.value)} /></div>
                <div><Label>Hora</Label>
                  <Input type="time" value={form.observation_time ?? ""} onChange={(e) => setField("observation_time", e.target.value)} /></div>
                <div><Label>Área *</Label>
                  <SearchableSelect options={areaOptions} value={form.area_id ?? ""}
                    onValueChange={(v) => { setField("area_id", v); setField("subarea_id", null); }} placeholder="Seleccionar área" /></div>
                <div><Label>Subárea</Label>
                  <SearchableSelect options={[{ value: NONE, label: "Sin subárea" }, ...subareaOptions]}
                    value={form.subarea_id ?? NONE}
                    onValueChange={(v) => setField("subarea_id", v === NONE ? null : v)} placeholder="Seleccionar subárea" /></div>
                <div className="sm:col-span-2"><Label>Lugar / zona</Label>
                  <Input maxLength={150} value={form.location ?? ""} onChange={(e) => setField("location", e.target.value)} placeholder="Ej. Cocina principal, Bloque B" /></div>
                <div className="sm:col-span-2"><Label>Observador</Label>
                  <SearchableSelect options={profileOptions} value={form.observer_user_id ?? ""}
                    onValueChange={(v) => setField("observer_user_id", v)} placeholder="Seleccionar observador" /></div>
              </div>
            </section>

            {/* Colaborador observado */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">2. Colaborador observado</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2"><Label>Colaborador *</Label>
                  <SearchableSelect options={[{ value: NONE, label: "Registrar manualmente" }, ...profileOptions]}
                    value={form.observed_user_id ?? NONE}
                    onValueChange={(v) => {
                      if (v === NONE) { setField("observed_user_id", null); return; }
                      const p = profiles.find((x) => x.id === v);
                      setField("observed_user_id", v);
                      setField("observed_name", p?.name ?? "");
                      setField("observed_position", p?.position ?? "");
                    }} placeholder="Seleccionar colaborador" /></div>
                <div><Label>Nombre</Label>
                  <Input maxLength={150} value={form.observed_name ?? ""} onChange={(e) => setField("observed_name", e.target.value)} /></div>
                <div><Label>Documento</Label>
                  <Input maxLength={30} value={form.observed_document ?? ""} onChange={(e) => setField("observed_document", e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>Cargo</Label>
                  <Input maxLength={100} value={form.observed_position ?? ""} onChange={(e) => setField("observed_position", e.target.value)} /></div>
              </div>
            </section>

            {/* Categoría */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">3. Categoría del comportamiento</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
                  const Icon = CATEGORY_META[c].icon;
                  const active = form.category === c;
                  return (
                    <button key={c} type="button" onClick={() => setField("category", c)}
                      className={`rounded-lg border p-3 text-left text-sm transition-colors ${active ? "border-foreground bg-muted" : "border-border hover:bg-muted/50"}`}>
                      <Icon className="h-4 w-4 mb-1" />
                      {CATEGORY_META[c].label}
                    </button>
                  );
                })}
              </div>
              <div><Label>Tipo de comportamiento</Label>
                <SearchableSelect options={BEHAVIOR_CATEGORIES.map((b) => ({ value: b, label: b }))}
                  value={form.behavior_category ?? ""} onValueChange={(v) => setField("behavior_category", v)}
                  placeholder="Seleccionar tipo" /></div>
            </section>

            {/* Descripción y factores */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">4. Descripción y factores</h3>
              <div><Label>Descripción detallada *</Label>
                <Textarea rows={4} maxLength={4000} value={form.description ?? ""}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Describe qué observaste, dónde y en qué contexto" />
                <p className="text-xs text-muted-foreground mt-1">{(form.description ?? "").length}/4000</p></div>
              <div>
                <Label>Factores contribuyentes</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {CONTRIBUTING_FACTORS.map((f) => (
                    <label key={f} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={(form.contributing_factors ?? []).includes(f)} onCheckedChange={() => toggleFactor(f)} />
                      {f}
                    </label>
                  ))}
                </div>
              </div>
            </section>

            {/* Riesgo */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">5. Riesgo asociado</h3>
              <div><Label>Riesgo asociado</Label>
                <Input maxLength={200} value={form.associated_risk ?? ""} onChange={(e) => setField("associated_risk", e.target.value)}
                  placeholder="Ej. Caída a distinto nivel, corte con cuchillo" /></div>
              <div>
                <Label>Nivel de riesgo *</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {(Object.keys(RISK_META) as RiskLevel[]).map((r) => (
                    <button key={r} type="button" onClick={() => setField("risk_level", r)}
                      className={`rounded-md border py-2 text-xs sm:text-sm transition-colors ${form.risk_level === r ? "border-foreground bg-muted font-medium" : "border-border hover:bg-muted/50"}`}>
                      {RISK_META[r].label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Evidencia */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">6. Evidencia multimedia</h3>
              <Input type="file" multiple accept="image/*,video/*,application/pdf"
                onChange={(e) => handleUpload(e.target.files)} disabled={uploading} />
              <p className="text-xs text-muted-foreground">Imágenes, video o PDF. Máximo 10 MB por archivo.</p>
              {uploading && <p className="text-xs flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Subiendo...</p>}
              {!!(form.evidence_urls ?? []).length && (
                <div className="flex flex-wrap gap-2">
                  {(form.evidence_urls ?? []).map((p) => (
                    <Badge key={p} variant="secondary" className="gap-1">
                      <Paperclip className="h-3 w-3" />{p.split("/").pop()?.slice(0, 20)}
                      <button type="button" onClick={() => setField("evidence_urls", (form.evidence_urls ?? []).filter((x) => x !== p))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </section>

            {/* Acciones y seguimiento */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">7. Acciones inmediatas y seguimiento</h3>
              <div><Label>Acciones inmediatas</Label>
                <Textarea rows={3} maxLength={1500} value={form.immediate_actions ?? ""} onChange={(e) => setField("immediate_actions", e.target.value)} /></div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={!!form.followup_required} onCheckedChange={(v) => setField("followup_required", !!v)} />
                Requiere seguimiento
              </label>
              {form.followup_required && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Responsable *</Label>
                    <SearchableSelect options={profileOptions} value={form.followup_responsible_user_id ?? ""}
                      onValueChange={(v) => setField("followup_responsible_user_id", v)} placeholder="Seleccionar responsable" /></div>
                  <div><Label>Fecha compromiso *</Label>
                    <Input type="date" value={form.followup_due_date ?? ""} onChange={(e) => setField("followup_due_date", e.target.value)} /></div>
                  <div className="sm:col-span-2"><Label>Notas de seguimiento</Label>
                    <Textarea rows={2} maxLength={1500} value={form.followup_notes ?? ""} onChange={(e) => setField("followup_notes", e.target.value)} /></div>
                </div>
              )}
              <div><Label>Estado</Label>
                <SearchableSelect options={(Object.keys(STATUS_META) as Status[]).map((s) => ({ value: s, label: STATUS_META[s].label }))}
                  value={form.status ?? "abierta"} onValueChange={(v) => setField("status", v)} placeholder="Estado" /></div>
            </section>

            {/* Firmas */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">8. Firmas digitales</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SignaturePad label="Firma del observador" value={form.signature_observer ?? null}
                  onChange={(v) => setField("signature_observer", v)} />
                <SignaturePad label="Firma del colaborador observado" value={form.signature_observed ?? null}
                  onChange={(v) => setField("signature_observed", v)} />
              </div>
            </section>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Guardar cambios" : "Registrar observación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar observación</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el registro de {toDelete?.observed_name ?? "el colaborador"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
