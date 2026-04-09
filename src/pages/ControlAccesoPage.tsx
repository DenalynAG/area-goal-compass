import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAreas, useSubareas, useProfiles } from "@/hooks/useSupabaseData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, DoorOpen, LogOut as LogOutIcon, Camera, X, Image as ImageIcon, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, FileText, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function useAccessControl() {
  return useQuery({
    queryKey: ["access_control"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_control" as any)
        .select("*")
        .order("entry_datetime", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

const PAGE_SIZE = 10;

export default function ControlAccesoPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: profiles = [] } = useProfiles();
  const { data: records = [], isLoading } = useAccessControl();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const arlFileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);

  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [entryDatetime, setEntryDatetime] = useState("");
  const [estimatedExit, setEstimatedExit] = useState("");
  const [areaId, setAreaId] = useState("");
  const [subareaId, setSubareaId] = useState("");
  const [companionId, setCompanionId] = useState("");
  const [zoneReq, setZoneReq] = useState("");
  const [arl, setArl] = useState("");
  const [bloque, setBloque] = useState("");
  const [hasActivity, setHasActivity] = useState(false);
  const [arlFile, setArlFile] = useState<File | null>(null);
  const [arlFileName, setArlFileName] = useState<string | null>(null);

  const filteredSubareas = subareas.filter((s) => s.area_id === areaId);

  const resetForm = () => {
    setCompanyName(""); setVisitorName(""); setDocumentId("");
    setEntryDatetime(""); setEstimatedExit("");
    setAreaId(""); setSubareaId(""); setCompanionId("");
    setZoneReq(""); setArl(""); setBloque("");
    setHasActivity(false);
    setArlFile(null); setArlFileName(null);
    setPhotoFile(null); setPhotoPreview(null);
    setEditRecord(null);
  };

  const populateForm = (r: any) => {
    setCompanyName(r.company_name || "");
    setVisitorName(r.visitor_name || "");
    setDocumentId(r.document_id || "");
    setEntryDatetime(r.entry_datetime ? r.entry_datetime.slice(0, 16) : "");
    setEstimatedExit(r.estimated_exit_time ? r.estimated_exit_time.slice(0, 16) : "");
    setAreaId(r.area_id || "");
    setSubareaId(r.subarea_id || "");
    setCompanionId(r.companion_user_id || "");
    setZoneReq(r.zone_requirement || "");
    setArl(r.arl || "");
    setBloque(r.bloque || "");
    setHasActivity(r.has_activity || false);
    setArlFileName(r.arl_document_url ? "Soporte ARL existente" : null);
    setArlFile(null);
    setPhotoPreview(r.photo_url || null);
    setPhotoFile(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Solo se permiten imágenes"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("La imagen no puede superar 5MB"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleArlFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Solo se permiten archivos PDF"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("El archivo no puede superar 10MB"); return; }
    setArlFile(file);
    setArlFileName(file.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !documentId.trim() || !companyName.trim()) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setSaving(true);

    let photoUrl: string | null = editRecord?.photo_url || null;
    if (photoFile) {
      setUploading(true);
      const ext = photoFile.name.split(".").pop();
      const filePath = `acceso/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("evidencias").upload(filePath, photoFile);
      setUploading(false);
      if (uploadErr) { toast.error("Error al subir imagen"); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("evidencias").getPublicUrl(filePath);
      photoUrl = urlData.publicUrl;
    }

    let arlDocUrl: string | null = editRecord?.arl_document_url || null;
    if (arlFile) {
      setUploading(true);
      const filePath = `arl/${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`;
      const { error: uploadErr } = await supabase.storage.from("evidencias").upload(filePath, arlFile, { contentType: "application/pdf" });
      setUploading(false);
      if (uploadErr) { toast.error("Error al subir soporte ARL"); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("evidencias").getPublicUrl(filePath);
      arlDocUrl = urlData.publicUrl;
    }

    const payload: any = {
      company_name: companyName.trim(),
      visitor_name: visitorName.trim(),
      document_id: documentId.trim(),
      entry_datetime: entryDatetime || new Date().toISOString(),
      estimated_exit_time: estimatedExit || null,
      area_id: areaId || null,
      subarea_id: subareaId || null,
      companion_user_id: companionId || null,
      zone_requirement: zoneReq.trim(),
      arl: arl.trim(),
      bloque: bloque || null,
      has_activity: hasActivity,
      arl_document_url: arlDocUrl,
      photo_url: photoUrl,
    };

    if (editRecord) {
      const { error } = await supabase.from("access_control" as any).update(payload as any).eq("id", editRecord.id);
      setSaving(false);
      if (error) { toast.error("Error al actualizar"); return; }
      toast.success("Registro actualizado");
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("access_control" as any).insert(payload);
      setSaving(false);
      if (error) { toast.error("Error al registrar"); return; }
      toast.success("Registro de acceso creado");
    }

    qc.invalidateQueries({ queryKey: ["access_control"] });
    resetForm();
    setDialogOpen(false);
  };

  const handleMarkExit = async (id: string) => {
    const { error } = await supabase
      .from("access_control" as any)
      .update({ exit_datetime: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) { toast.error("Error al registrar salida"); return; }
    toast.success("Salida registrada");
    qc.invalidateQueries({ queryKey: ["access_control"] });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("access_control" as any).delete().eq("id", deleteId);
    if (error) { toast.error("Error al eliminar registro"); return; }
    toast.success("Registro eliminado");
    setDeleteId(null);
    qc.invalidateQueries({ queryKey: ["access_control"] });
  };

  const filtered = records.filter((r: any) =>
    [r.visitor_name, r.company_name, r.document_id]
      .join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getProfileName = (id: string | null) => profiles.find((p) => p.id === id)?.name || "—";
  const getAreaName = (id: string | null) => areas.find((a) => a.id === id)?.name || "—";
  const getSubareaName = (id: string | null) => subareas.find((s) => s.id === id)?.name || "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Control de Acceso Interno</h1>
          <p className="text-muted-foreground text-sm">Registro de ingreso y salida de visitantes</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo Registro
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <CardTitle className="text-lg">Registros de Acceso ({filtered.length})</CardTitle>
            <Input
              placeholder="Buscar visitante, empresa, documento..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay registros</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Foto</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Visitante</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Ingreso</TableHead>
                      <TableHead>Salida Est.</TableHead>
                      <TableHead>Salida Real</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Bloque</TableHead>
                      <TableHead>Actividad</TableHead>
                      <TableHead>ARL Doc.</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          {r.photo_url ? (
                            <a href={r.photo_url} target="_blank" rel="noopener noreferrer">
                              <img src={r.photo_url} alt="Visitante" className="w-10 h-10 rounded-md object-cover border hover:opacity-80 transition-opacity" />
                            </a>
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{r.company_name}</TableCell>
                        <TableCell>{r.visitor_name}</TableCell>
                        <TableCell>{r.document_id}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.entry_datetime ? format(new Date(r.entry_datetime), "dd/MM/yy HH:mm", { locale: es }) : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.estimated_exit_time ? format(new Date(r.estimated_exit_time), "dd/MM/yy HH:mm", { locale: es }) : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.exit_datetime ? (
                            <Badge variant="secondary">{format(new Date(r.exit_datetime), "HH:mm", { locale: es })}</Badge>
                          ) : (
                            <Badge variant="destructive">En sitio</Badge>
                          )}
                        </TableCell>
                        <TableCell>{getAreaName(r.area_id)}{r.subarea_id ? ` / ${getSubareaName(r.subarea_id)}` : ""}</TableCell>
                        <TableCell>
                          {r.bloque ? (
                            <Badge className={
                              r.bloque === 'A' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                              r.bloque === 'B' ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                              r.bloque === 'C' ? 'bg-green-600 hover:bg-green-700 text-white' : ''
                            }>
                              Bloque {r.bloque}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.has_activity ? "default" : "outline"}>
                            {r.has_activity ? "Sí" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.arl_document_url ? (
                            <a href={r.arl_document_url} target="_blank" rel="noopener noreferrer">
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" title="Ver soporte ARL">
                                <FileText className="h-4 w-4" />
                              </Button>
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Ver detalle"
                              onClick={() => { setDetailRecord(r); setDetailOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar"
                              onClick={() => { setEditRecord(r); populateForm(r); setDialogOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Eliminar"
                              onClick={() => setDeleteId(r.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {!r.exit_datetime && (
                              <Button size="sm" variant="outline" onClick={() => handleMarkExit(r.id)}>
                                <LogOutIcon className="h-3 w-3 mr-1" /> Salida
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">{currentPage} / {totalPages}</span>
                    <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Registro</DialogTitle>
            <DialogDescription>Información completa del visitante</DialogDescription>
          </DialogHeader>
          {detailRecord && (
            <div className="space-y-3 text-sm">
              {detailRecord.photo_url && (
                <img src={detailRecord.photo_url} alt="Visitante" className="w-full h-48 object-cover rounded-lg border" />
              )}
              <DetailRow label="Empresa" value={detailRecord.company_name} />
              <DetailRow label="Visitante" value={detailRecord.visitor_name} />
              <DetailRow label="Documento" value={detailRecord.document_id} />
              <DetailRow label="ARL" value={detailRecord.arl || "—"} />
              <DetailRow label="Actividad por realizar" value={detailRecord.has_activity ? "Sí" : "No"} />
              <DetailRow label="Ingreso" value={detailRecord.entry_datetime ? format(new Date(detailRecord.entry_datetime), "dd/MM/yyyy HH:mm", { locale: es }) : "—"} />
              <DetailRow label="Salida Estimada" value={detailRecord.estimated_exit_time ? format(new Date(detailRecord.estimated_exit_time), "dd/MM/yyyy HH:mm", { locale: es }) : "—"} />
              <DetailRow label="Salida Real" value={detailRecord.exit_datetime ? format(new Date(detailRecord.exit_datetime), "dd/MM/yyyy HH:mm", { locale: es }) : "En sitio"} />
              <DetailRow label="Área" value={`${getAreaName(detailRecord.area_id)}${detailRecord.subarea_id ? ` / ${getSubareaName(detailRecord.subarea_id)}` : ""}`} />
              <DetailRow label="Acompañante" value={getProfileName(detailRecord.companion_user_id)} />
              <DetailRow label="Zona / Requerimiento" value={detailRecord.zone_requirement || "—"} />
              <DetailRow label="Bloque" value={detailRecord.bloque ? `Bloque ${detailRecord.bloque}` : "—"} />
              {detailRecord.arl_document_url && (
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground font-medium">Soporte ARL</span>
                  <a href={detailRecord.arl_document_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Ver PDF
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5" /> {editRecord ? "Editar Registro" : "Registro de Acceso"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre Empresa *</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Nombre y Apellido *</Label>
                <Input value={visitorName} onChange={(e) => setVisitorName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Documento de Identidad *</Label>
                <Input value={documentId} onChange={(e) => setDocumentId(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>ARL</Label>
                <Input value={arl} onChange={(e) => setArl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha y Hora de Ingreso</Label>
                <Input type="datetime-local" value={entryDatetime} onChange={(e) => setEntryDatetime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tiempo Estimado de Salida</Label>
                <Input type="datetime-local" value={estimatedExit} onChange={(e) => setEstimatedExit(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Área</Label>
                <SearchableSelect
                  options={areas.map((a) => ({ value: a.id, label: a.name }))}
                  value={areaId}
                  onValueChange={(v) => { setAreaId(v); setSubareaId(""); }}
                  placeholder="Seleccionar área"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Subárea</Label>
                <SearchableSelect
                  options={filteredSubareas.map((s) => ({ value: s.id, label: s.name }))}
                  value={subareaId}
                  onValueChange={setSubareaId}
                  placeholder="Seleccionar subárea"
                  disabled={!areaId}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Acompañamiento</Label>
                <SearchableSelect
                  options={profiles.map((p) => ({ value: p.id, label: p.name }))}
                  value={companionId}
                  onValueChange={setCompanionId}
                  placeholder="Buscar colaborador"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Zona o Requerimiento</Label>
                <Input value={zoneReq} onChange={(e) => setZoneReq(e.target.value)} placeholder="Ej: Lobby, Piso 3..." />
              </div>
              <div className="space-y-2">
                <Label>Bloque</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'A', label: 'Bloque A', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
                    { value: 'B', label: 'Bloque B', color: 'bg-orange-500 hover:bg-orange-600 text-white' },
                    { value: 'C', label: 'Bloque C', color: 'bg-green-600 hover:bg-green-700 text-white' },
                  ].map((b) => (
                    <Button
                      key={b.value}
                      type="button"
                      size="sm"
                      className={bloque === b.value ? b.color : 'bg-muted text-muted-foreground hover:bg-muted/80'}
                      onClick={() => setBloque(bloque === b.value ? '' : b.value)}
                    >
                      {b.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2 flex items-center gap-3 pt-6">
                <Switch checked={hasActivity} onCheckedChange={setHasActivity} id="has-activity" />
                <Label htmlFor="has-activity" className="cursor-pointer">¿Tiene actividad por realizar?</Label>
              </div>

              {/* Soporte ARL PDF */}
              <div className="space-y-2 md:col-span-2">
                <Label>Soporte ARL (PDF)</Label>
                <input ref={arlFileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleArlFileChange} />
                {arlFileName ? (
                  <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm flex-1 truncate">{arlFileName}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setArlFile(null); setArlFileName(null); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="w-full max-w-xs h-12 border-dashed flex items-center gap-2"
                    onClick={() => arlFileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Subir soporte ARL en PDF</span>
                  </Button>
                )}
              </div>

              {/* Foto */}
              <div className="space-y-2 md:col-span-2">
                <Label>Foto / Imagen del Visitante</Label>
                <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                {photoPreview ? (
                  <div className="relative w-full max-w-xs">
                    <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-7 w-7"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="w-full max-w-xs h-24 border-dashed flex flex-col gap-1"
                    onClick={() => photoInputRef.current?.click()}>
                    <Camera className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Tomar foto o seleccionar imagen</span>
                  </Button>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
              <Button type="submit" disabled={saving || uploading}>{saving ? "Guardando..." : editRecord ? "Guardar Cambios" : "Registrar Ingreso"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. El registro de acceso será eliminado permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-2">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  );
}
