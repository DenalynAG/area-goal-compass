import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAreas, useSubareas, useProfiles, getProfileName, getAreaNameFromList, getSubareaNameFromList, useEvidences } from "@/hooks/useSupabaseData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import EvidencePanel from "@/components/EvidencePanel";
import MuestreosTab from "@/components/MuestreosTab";
import {
  Plus, ClipboardCheck, AlertTriangle, CheckCircle2, Clock, Search,
  ChevronDown, ChevronUp, MessageSquare, Send, Trash2, Pencil,
  ShieldAlert, ShieldCheck, Shield, BarChart3, Paperclip, Upload, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

// ─── Types ───
interface AuditPlan {
  id: string;
  area_id: string;
  responsible_user_id: string;
  auditor_user_id: string;
  title: string;
  description: string;
  planned_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AuditFinding {
  id: string;
  audit_plan_id: string;
  description: string;
  action_description: string;
  finding_type: string;
  severity: string;
  responsible_user_id: string | null;
  due_date: string | null;
  created_at: string;
}

interface AuditComment {
  id: string;
  finding_id: string;
  user_id: string;
  user_name: string;
  role_label: string;
  comment: string;
  created_at: string;
}

// ─── Hooks ───
function useAuditPlans() {
  return useQuery({
    queryKey: ["audit_plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_plans").select("*").order("planned_date", { ascending: false });
      if (error) throw error;
      return data as AuditPlan[];
    },
  });
}

function useAuditFindings() {
  return useQuery({
    queryKey: ["audit_findings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_findings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as AuditFinding[];
    },
  });
}

function useAuditComments() {
  return useQuery({
    queryKey: ["audit_comments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_comments").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data as AuditComment[];
    },
  });
}

// ─── Helpers ───
const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pendiente: { label: "Pendiente", variant: "secondary", icon: Clock },
  en_proceso: { label: "En proceso", variant: "default", icon: ClipboardCheck },
  cumple: { label: "Cumple", variant: "default", icon: CheckCircle2 },
  no_cumple: { label: "No cumple", variant: "destructive", icon: AlertTriangle },
  pendiente_cierre: { label: "Pendiente cierre", variant: "outline", icon: Clock },
};

const SEVERITY_CONFIG: Record<string, { label: string; className: string; icon: typeof Shield }> = {
  critico: { label: "Crítico", className: "bg-destructive/10 text-destructive border-destructive/20", icon: ShieldAlert },
  leve: { label: "Leve", className: "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.2)]", icon: Shield },
  bajo: { label: "Bajo", className: "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)]", icon: ShieldCheck },
};

// ─── Main Component ───
interface AuditoriasPageProps {
  areaFilterName?: string;
}

export default function AuditoriasPage({ areaFilterName }: AuditoriasPageProps = {}) {
  const { user, profile, hasRole, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: plans = [], isLoading } = useAuditPlans();
  const { data: findings = [] } = useAuditFindings();
  const { data: comments = [] } = useAuditComments();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: profiles = [] } = useProfiles();

  const canManage = isSuperAdmin || hasRole("admin_area");

  // Resolve area filter from name
  const presetAreaId = useMemo(() => {
    if (!areaFilterName) return null;
    return areas.find(a => a.name === areaFilterName)?.id ?? null;
  }, [areaFilterName, areas]);

  const [activeTab, setActiveTab] = useState("planes");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterArea, setFilterArea] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Auto-set area filter when areaFilterName is provided
  useEffect(() => {
    if (presetAreaId) {
      setFilterArea(presetAreaId);
    }
  }, [presetAreaId]);

  // Plan dialog
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AuditPlan | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);

  // Finding dialog
  const [findingDialogOpen, setFindingDialogOpen] = useState(false);
  const [findingPlanId, setFindingPlanId] = useState<string>("");
  const [editingFinding, setEditingFinding] = useState<AuditFinding | null>(null);

  // Expanded plan for findings view
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // ─── Plan CRUD ───
  const [planForm, setPlanForm] = useState({ title: "", description: "", area_id: "", responsible_user_id: "", auditor_user_id: "", planned_date: "", status: "pendiente" as "pendiente" | "en_proceso" | "cumple" | "no_cumple" | "pendiente_cierre" });

  const openPlanDialog = (plan?: AuditPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        title: plan.title, description: plan.description ?? "", area_id: plan.area_id,
        responsible_user_id: plan.responsible_user_id, auditor_user_id: plan.auditor_user_id,
        planned_date: plan.planned_date, status: plan.status as typeof planForm.status,
      });
    } else {
      setEditingPlan(null);
      setPlanForm({ title: "", description: "", area_id: "", responsible_user_id: "", auditor_user_id: "", planned_date: format(new Date(), "yyyy-MM-dd"), status: "pendiente" as const });
    }
    setPlanDialogOpen(true);
  };

  const savePlan = async () => {
    if (!planForm.title.trim() || !planForm.area_id || !planForm.responsible_user_id || !planForm.auditor_user_id) {
      toast.error("Completa todos los campos obligatorios"); return;
    }
    const payload = { ...planForm };
    const { error } = editingPlan
      ? await supabase.from("audit_plans").update(payload).eq("id", editingPlan.id)
      : await supabase.from("audit_plans").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editingPlan ? "Plan actualizado" : "Plan creado");
    qc.invalidateQueries({ queryKey: ["audit_plans"] });
    setPlanDialogOpen(false);
  };

  const deletePlan = async () => {
    if (!deletePlanId) return;
    const { error } = await supabase.from("audit_plans").delete().eq("id", deletePlanId);
    if (error) { toast.error(error.message); return; }
    toast.success("Plan eliminado");
    qc.invalidateQueries({ queryKey: ["audit_plans"] });
    setDeletePlanId(null);
  };

  // ─── Finding CRUD ───
  const [findingForm, setFindingForm] = useState({ description: "", action_description: "", finding_type: "abierta" as "abierta" | "cerrada", severity: "leve" as "critico" | "leve" | "bajo", responsible_user_id: "", due_date: "" });

  const openFindingDialog = (planId: string, finding?: AuditFinding) => {
    setFindingPlanId(planId);
    if (finding) {
      setEditingFinding(finding);
      setFindingForm({
        description: finding.description, action_description: finding.action_description ?? "",
        finding_type: finding.finding_type as typeof findingForm.finding_type, severity: finding.severity as typeof findingForm.severity,
        responsible_user_id: finding.responsible_user_id ?? "", due_date: finding.due_date ?? "",
      });
    } else {
      setEditingFinding(null);
      setFindingForm({ description: "", action_description: "", finding_type: "abierta", severity: "leve", responsible_user_id: "", due_date: "" });
    }
    setFindingDialogOpen(true);
  };

  // File attachments for findings
  const findingFileRef = useRef<HTMLInputElement>(null);
  const [findingFiles, setFindingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Evidence panel state
  const [evidenceFindingId, setEvidenceFindingId] = useState<string | null>(null);
  const [evidenceFindingName, setEvidenceFindingName] = useState("");

  const handleFindingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const valid = Array.from(files).filter(f => {
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} excede 10MB`); return false; }
      return true;
    });
    setFindingFiles(prev => [...prev, ...valid]);
    if (findingFileRef.current) findingFileRef.current.value = '';
  };

  const removeFindingFile = (idx: number) => setFindingFiles(prev => prev.filter((_, i) => i !== idx));

  const uploadFindingFiles = async (findingId: string) => {
    if (findingFiles.length === 0 || !user) return;
    setUploadingFiles(true);
    try {
      for (const file of findingFiles) {
        const filePath = `audit_finding/${findingId}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from('evidencias').upload(filePath, file);
        if (upErr) { toast.error(`Error subiendo ${file.name}`); continue; }
        await supabase.from('evidences').insert({
          entity_type: 'audit_finding', entity_id: findingId,
          file_name: file.name, file_path: filePath,
          file_type: file.type, file_size: file.size,
          uploaded_by: user.id, uploaded_by_name: profile?.name ?? user.email,
        });
      }
      qc.invalidateQueries({ queryKey: ['evidences'] });
    } finally { setUploadingFiles(false); }
  };

  const saveFinding = async () => {
    if (!findingForm.description.trim()) { toast.error("La descripción es obligatoria"); return; }
    const payload = {
      ...findingForm,
      audit_plan_id: findingPlanId,
      responsible_user_id: findingForm.responsible_user_id || null,
      due_date: findingForm.due_date || null,
    };
    let findingId = editingFinding?.id;
    if (editingFinding) {
      const { error } = await supabase.from("audit_findings").update(payload).eq("id", editingFinding.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data, error } = await supabase.from("audit_findings").insert(payload).select('id').single();
      if (error) { toast.error(error.message); return; }
      findingId = data.id;
    }
    if (findingId && findingFiles.length > 0) await uploadFindingFiles(findingId);
    toast.success(editingFinding ? "Hallazgo actualizado" : "Hallazgo registrado");
    qc.invalidateQueries({ queryKey: ["audit_findings"] });
    setFindingFiles([]);
    setFindingDialogOpen(false);
  };

  // ─── Comments ───
  const [commentText, setCommentText] = useState("");
  const [commentFindingId, setCommentFindingId] = useState<string | null>(null);

  const addComment = async (findingId: string) => {
    if (!commentText.trim()) return;
    const roleLabel = isSuperAdmin ? "Super Admin" : hasRole("admin_area") ? "Analista de Calidad" : "Líder de Área";
    const { error } = await supabase.from("audit_comments").insert({
      finding_id: findingId, user_id: user!.id,
      user_name: profile?.name ?? "", role_label: roleLabel,
      comment: commentText.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setCommentText("");
    setCommentFindingId(null);
    qc.invalidateQueries({ queryKey: ["audit_comments"] });
  };

  // ─── Filters ───
  const filteredPlans = plans.filter((p) => {
    if (filterArea !== "all" && p.area_id !== filterArea) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const title = p.title.toLowerCase();
      const responsible = getProfileName(profiles, p.responsible_user_id).toLowerCase();
      if (!title.includes(s) && !responsible.includes(s)) return false;
    }
    return true;
  });

  // ─── Summary by area ───
  const areaSummary = areas.map((area) => {
    const areaPlans = plans.filter((p) => p.area_id === area.id);
    return {
      area,
      cumple: areaPlans.filter((p) => p.status === "cumple").length,
      no_cumple: areaPlans.filter((p) => p.status === "no_cumple").length,
      pendiente_cierre: areaPlans.filter((p) => p.status === "pendiente_cierre").length,
      total: areaPlans.length,
    };
  }).filter((s) => s.total > 0);

  // Severity summary
  const severitySummary = {
    critico: findings.filter((f) => f.severity === "critico").length,
    leve: findings.filter((f) => f.severity === "leve").length,
    bajo: findings.filter((f) => f.severity === "bajo").length,
  };

  const findingsSummary = {
    abiertas: findings.filter((f) => f.finding_type === "abierta").length,
    cerradas: findings.filter((f) => f.finding_type === "cerrada").length,
  };

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando auditorías…</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Auditorías</h1>
          <p className="page-subtitle">Gestión de planes de trabajo, hallazgos y seguimiento de calidad</p>
        </div>
        {canManage && (
          <Button onClick={() => openPlanDialog()}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo Plan
          </Button>
        )}
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{plans.length}</p>
              <p className="text-[11px] text-muted-foreground">Total Planes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--success)/0.1)] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{plans.filter(p => p.status === "cumple").length}</p>
              <p className="text-[11px] text-muted-foreground">Cumple</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{plans.filter(p => p.status === "no_cumple").length}</p>
              <p className="text-[11px] text-muted-foreground">No Cumple</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--warning)/0.1)] flex items-center justify-center">
              <Clock className="w-5 h-5 text-[hsl(var(--warning))]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{plans.filter(p => p.status === "pendiente_cierre").length}</p>
              <p className="text-[11px] text-muted-foreground">Pend. Cierre</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{findings.length}</p>
              <p className="text-[11px] text-muted-foreground">Hallazgos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Tabs ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="planes">Planes de Auditoría</TabsTrigger>
          <TabsTrigger value="muestreos">Muestreos</TabsTrigger>
          <TabsTrigger value="resumen">Resumen por Área</TabsTrigger>
        </TabsList>

        {/* ─── Plans Tab ─── */}
        <TabsContent value="planes" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por título o responsable…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterArea} onValueChange={setFilterArea}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Área" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las áreas</SelectItem>
                {areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredPlans.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No hay planes de auditoría registrados</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filteredPlans.map((plan) => {
                const planFindings = findings.filter((f) => f.audit_plan_id === plan.id);
                const st = STATUS_CONFIG[plan.status] ?? STATUS_CONFIG.pendiente;
                const isExpanded = expandedPlanId === plan.id;
                const StIcon = st.icon;

                return (
                  <Card key={plan.id} className="overflow-hidden">
                    <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base">{plan.title}</CardTitle>
                            <Badge variant={st.variant} className="gap-1 text-[10px]">
                              <StIcon className="w-3 h-3" /> {st.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                            <span>Área: <strong className="text-foreground">{getAreaNameFromList(areas, plan.area_id)}</strong></span>
                            <span>Responsable: <strong className="text-foreground">{getProfileName(profiles, plan.responsible_user_id)}</strong></span>
                            <span>Auditor: <strong className="text-foreground">{getProfileName(profiles, plan.auditor_user_id)}</strong></span>
                            <span>Fecha: {format(new Date(plan.planned_date), "d MMM yyyy", { locale: es })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="outline" className="text-[10px]">{planFindings.length} hallazgos</Badge>
                          {canManage && (
                            <>
                              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={(e) => { e.stopPropagation(); openPlanDialog(plan); }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletePlanId(plan.id); }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="border-t pt-4 space-y-4">
                        {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}

                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">Hallazgos</h4>
                          {canManage && (
                            <Button size="sm" variant="outline" onClick={() => openFindingDialog(plan.id)}>
                              <Plus className="w-3 h-3 mr-1" /> Agregar Hallazgo
                            </Button>
                          )}
                        </div>

                        {planFindings.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">Sin hallazgos registrados</p>
                        ) : (
                          <div className="space-y-3">
                            {planFindings.map((finding) => {
                              const sev = SEVERITY_CONFIG[finding.severity] ?? SEVERITY_CONFIG.leve;
                              const SevIcon = sev.icon;
                              const findingComments = comments.filter((c) => c.finding_id === finding.id);

                              return (
                                <div key={finding.id} className="rounded-lg border bg-muted/30 p-3 space-y-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <Badge className={`gap-1 text-[10px] border ${sev.className}`}>
                                          <SevIcon className="w-3 h-3" /> {sev.label}
                                        </Badge>
                                        <Badge variant={finding.finding_type === "abierta" ? "destructive" : "default"} className="text-[10px]">
                                          {finding.finding_type === "abierta" ? "Acción Abierta" : "Acción Cerrada"}
                                        </Badge>
                                      </div>
                                      <p className="text-sm font-medium">{finding.description}</p>
                                      {finding.action_description && (
                                        <p className="text-xs text-muted-foreground mt-1">Acción: {finding.action_description}</p>
                                      )}
                                      <div className="flex gap-3 mt-1 text-[11px] text-muted-foreground">
                                        {finding.responsible_user_id && <span>Responsable: {getProfileName(profiles, finding.responsible_user_id)}</span>}
                                        {finding.due_date && <span>Vence: {format(new Date(finding.due_date), "d MMM yyyy", { locale: es })}</span>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { setEvidenceFindingId(finding.id); setEvidenceFindingName(finding.description.substring(0, 50)); }}>
                                        <Paperclip className="w-3 h-3" />
                                      </Button>
                                      {canManage && (
                                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openFindingDialog(plan.id, finding)}>
                                          <Pencil className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  {/* Comments */}
                                  {findingComments.length > 0 && (
                                    <div className="space-y-2 pl-3 border-l-2 border-muted">
                                      {findingComments.map((c) => (
                                        <div key={c.id} className="text-xs">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-semibold">{c.user_name}</span>
                                            <Badge variant="outline" className="text-[9px] py-0">{c.role_label}</Badge>
                                            <span className="text-muted-foreground">{format(new Date(c.created_at), "d MMM HH:mm", { locale: es })}</span>
                                          </div>
                                          <p className="mt-0.5 text-muted-foreground">{c.comment}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Add comment */}
                                  {commentFindingId === finding.id ? (
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="Escribe tu justificación o avance…"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        className="text-xs h-8"
                                        onKeyDown={(e) => e.key === "Enter" && addComment(finding.id)}
                                      />
                                      <Button size="sm" className="h-8 px-2" onClick={() => addComment(finding.id)}>
                                        <Send className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <button
                                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                                      onClick={() => { setCommentFindingId(finding.id); setCommentText(""); }}
                                    >
                                      <MessageSquare className="w-3 h-3" /> Comentar
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Muestreos Tab ─── */}
        <TabsContent value="muestreos">
          <MuestreosTab />
        </TabsContent>

        {/* ─── Summary Tab ─── */}
        <TabsContent value="resumen" className="space-y-4">
          {/* Severity & findings summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><CardContent className="pt-4 pb-3 px-4 text-center">
              <ShieldAlert className="w-5 h-5 text-destructive mx-auto mb-1" />
              <p className="text-xl font-bold">{severitySummary.critico}</p>
              <p className="text-[11px] text-muted-foreground">Crítico</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3 px-4 text-center">
              <Shield className="w-5 h-5 text-[hsl(var(--warning))] mx-auto mb-1" />
              <p className="text-xl font-bold">{severitySummary.leve}</p>
              <p className="text-[11px] text-muted-foreground">Leve</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3 px-4 text-center">
              <ShieldCheck className="w-5 h-5 text-[hsl(var(--success))] mx-auto mb-1" />
              <p className="text-xl font-bold">{severitySummary.bajo}</p>
              <p className="text-[11px] text-muted-foreground">Bajo</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3 px-4 text-center">
              <AlertTriangle className="w-5 h-5 text-destructive mx-auto mb-1" />
              <p className="text-xl font-bold">{findingsSummary.abiertas}</p>
              <p className="text-[11px] text-muted-foreground">Acc. Abiertas</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3 px-4 text-center">
              <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] mx-auto mb-1" />
              <p className="text-xl font-bold">{findingsSummary.cerradas}</p>
              <p className="text-[11px] text-muted-foreground">Acc. Cerradas</p>
            </CardContent></Card>
          </div>

          {areaSummary.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No hay datos de auditoría aún</CardContent></Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">Indicadores por Área</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Área</TableHead>
                      <TableHead className="text-center">Cumple</TableHead>
                      <TableHead className="text-center">No Cumple</TableHead>
                      <TableHead className="text-center">Pend. Cierre</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {areaSummary.map((s) => (
                      <TableRow key={s.area.id}>
                        <TableCell className="font-medium">{s.area.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default" className="bg-[hsl(var(--success))] text-white">{s.cumple}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">{s.no_cumple}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{s.pendiente_cierre}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{s.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Plan Dialog ─── */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Editar Plan de Auditoría" : "Nuevo Plan de Auditoría"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Título *</Label>
              <Input value={planForm.title} onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Área *</Label>
              <SearchableSelect
                value={planForm.area_id} onValueChange={(v) => setPlanForm({ ...planForm, area_id: v })}
                options={areas.map((a) => ({ value: a.id, label: a.name }))}
                placeholder="Seleccionar área" searchPlaceholder="Buscar área…"
              />
            </div>
            <div>
              <Label>Responsable (Líder de Área) *</Label>
              <SearchableSelect
                value={planForm.responsible_user_id} onValueChange={(v) => setPlanForm({ ...planForm, responsible_user_id: v })}
                options={profiles.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Seleccionar responsable" searchPlaceholder="Buscar…"
              />
            </div>
            <div>
              <Label>Auditor (Analista de Calidad) *</Label>
              <SearchableSelect
                value={planForm.auditor_user_id} onValueChange={(v) => setPlanForm({ ...planForm, auditor_user_id: v })}
                options={profiles.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Seleccionar auditor" searchPlaceholder="Buscar…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha programada</Label>
                <Input type="date" value={planForm.planned_date} onChange={(e) => setPlanForm({ ...planForm, planned_date: e.target.value })} />
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={planForm.status} onValueChange={(v) => setPlanForm({ ...planForm, status: v as typeof planForm.status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Cancelar</Button>
              <Button onClick={savePlan}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Finding Dialog ─── */}
      <Dialog open={findingDialogOpen} onOpenChange={setFindingDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFinding ? "Editar Hallazgo" : "Nuevo Hallazgo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Descripción del hallazgo *</Label>
              <Textarea value={findingForm.description} onChange={(e) => setFindingForm({ ...findingForm, description: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Acción / Plan de acción</Label>
              <Textarea value={findingForm.action_description} onChange={(e) => setFindingForm({ ...findingForm, action_description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de acción</Label>
                <Select value={findingForm.finding_type} onValueChange={(v) => setFindingForm({ ...findingForm, finding_type: v as typeof findingForm.finding_type })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abierta">Acción Abierta</SelectItem>
                    <SelectItem value="cerrada">Acción Cerrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severidad</Label>
                <Select value={findingForm.severity} onValueChange={(v) => setFindingForm({ ...findingForm, severity: v as typeof findingForm.severity })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critico">Crítico</SelectItem>
                    <SelectItem value="leve">Leve</SelectItem>
                    <SelectItem value="bajo">Bajo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Responsable</Label>
              <SearchableSelect
                value={findingForm.responsible_user_id} onValueChange={(v) => setFindingForm({ ...findingForm, responsible_user_id: v })}
                options={profiles.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Seleccionar responsable" searchPlaceholder="Buscar…"
              />
            </div>
            <div>
              <Label>Fecha límite</Label>
              <Input type="date" value={findingForm.due_date} onChange={(e) => setFindingForm({ ...findingForm, due_date: e.target.value })} />
            </div>
            {/* File attachments */}
            <div>
              <Label>Adjuntos (Fotos, PDF)</Label>
              <input ref={findingFileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFindingFileChange} />
              <Button type="button" variant="outline" size="sm" className="gap-2 mt-1" onClick={() => findingFileRef.current?.click()}>
                <Upload className="w-3.5 h-3.5" /> Seleccionar archivos
              </Button>
              <p className="text-[11px] text-muted-foreground mt-1">PDF, PNG, JPG · Máx. 10MB por archivo</p>
              {findingFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {findingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                      <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      <button type="button" onClick={() => removeFindingFile(i)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setFindingDialogOpen(false); setFindingFiles([]); }}>Cancelar</Button>
              <Button onClick={saveFinding} disabled={uploadingFiles}>
                {uploadingFiles && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Plan Confirm ─── */}
      <AlertDialog open={!!deletePlanId} onOpenChange={() => setDeletePlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plan de auditoría?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminarán también los hallazgos y comentarios asociados. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deletePlan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Evidence Panel for Findings ─── */}
      <EvidencePanel
        entityType="audit_finding"
        entityId={evidenceFindingId ?? ''}
        entityName={evidenceFindingName}
        open={!!evidenceFindingId}
        onOpenChange={(open) => { if (!open) setEvidenceFindingId(null); }}
      />
    </div>
  );
}
