import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAreas, useSubareas, useProfiles, useMemberships } from "@/hooks/useSupabaseData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, DoorOpen, Clock, LogOut as LogOutIcon, Camera, X, Image as ImageIcon } from "lucide-react";
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

  const filteredSubareas = subareas.filter((s) => s.area_id === areaId);

  const resetForm = () => {
    setCompanyName(""); setVisitorName(""); setDocumentId("");
    setEntryDatetime(""); setEstimatedExit("");
    setAreaId(""); setSubareaId(""); setCompanionId("");
    setZoneReq(""); setArl(""); setBloque("");
    setPhotoFile(null); setPhotoPreview(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Solo se permiten imágenes"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("La imagen no puede superar 5MB"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !documentId.trim() || !companyName.trim()) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setSaving(true);

    let photoUrl: string | null = null;
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
      created_by: user?.id,
      photo_url: photoUrl,
    };
    const { error } = await supabase.from("access_control" as any).insert(payload);
    setSaving(false);
    if (error) { toast.error("Error al registrar"); return; }
    toast.success("Registro de acceso creado");
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

  const filtered = records.filter((r: any) =>
    [r.visitor_name, r.company_name, r.document_id]
      .join(" ").toLowerCase().includes(search.toLowerCase())
  );

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
            <CardTitle className="text-lg">Registros de Acceso</CardTitle>
            <Input
              placeholder="Buscar visitante, empresa, documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                    <TableHead>Acompañante</TableHead>
                     <TableHead>Zona</TableHead>
                     <TableHead>Bloque</TableHead>
                     <TableHead>ARL</TableHead>
                     <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any) => (
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
                      <TableCell>{getProfileName(r.companion_user_id)}</TableCell>
                      <TableCell>{r.zone_requirement || "—"}</TableCell>
                      <TableCell>{r.arl || "—"}</TableCell>
                      <TableCell>
                        {!r.exit_datetime && (
                          <Button size="sm" variant="outline" onClick={() => handleMarkExit(r.id)}>
                            <LogOutIcon className="h-3 w-3 mr-1" /> Salida
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5" /> Registro de Acceso
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
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving || uploading}>{saving ? "Guardando..." : "Registrar Ingreso"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
