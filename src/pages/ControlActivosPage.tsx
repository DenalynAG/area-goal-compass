import { useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAreas, useSubareas, useProfiles, useMemberships, useUserRoles } from "@/hooks/useSupabaseData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Package, ArrowDownToLine, ArrowUpFromLine, Camera, X, Image as ImageIcon, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Laptop, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ASSET_TYPES = [
  "Portátil",
  "Computador Escritorio",
  "Impresora",
  "Monitor",
  "Otros",
];

function useAssetMovements() {
  return useQuery({
    queryKey: ["asset_movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_movements" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

const PAGE_SIZE = 10;

export default function ControlActivosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: profiles = [] } = useProfiles();
  const { data: memberships = [] } = useMemberships();
  const { data: userRoles = [] } = useUserRoles();
  const { data: records = [], isLoading } = useAssetMovements();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);

  // Detail / Edit / Delete
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isEquipoMode, setIsEquipoMode] = useState(false);

  // Form
  const [areaId, setAreaId] = useState("");
  const [subareaId, setSubareaId] = useState("");
  const [collaboratorId, setCollaboratorId] = useState("");
  const [movementType, setMovementType] = useState<"entrada" | "salida">("salida");
  const [assetType, setAssetType] = useState("");
  const [customAssetType, setCustomAssetType] = useState("");
  const [assetSerial, setAssetSerial] = useState("");
  const [exitDatetime, setExitDatetime] = useState("");
  const [entryDatetime, setEntryDatetime] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"pendiente" | "recibido">("pendiente");

  const filteredSubareas = subareas.filter((s) => s.area_id === areaId);

  const resetForm = () => {
    setAreaId(""); setSubareaId(""); setCollaboratorId("");
    setMovementType("salida"); setAssetType(""); setCustomAssetType("");
    setAssetSerial(""); setExitDatetime(""); setEntryDatetime(""); setReason("");
    setStatus("pendiente");
    setPhotoFile(null); setPhotoPreview(null);
    setEditRecord(null);
    setIsEquipoMode(false);
  };

  const populateForm = (r: any) => {
    setAreaId(r.area_id || "");
    setSubareaId(r.subarea_id || "");
    setCollaboratorId(r.collaborator_user_id || "");
    setMovementType(r.movement_type || "salida");
    const isKnown = ASSET_TYPES.includes(r.asset_type);
    setAssetType(isKnown ? r.asset_type : "Otros");
    setCustomAssetType(isKnown ? "" : r.asset_type || "");
    setAssetSerial(r.asset_serial || "");
    setExitDatetime(r.exit_datetime ? r.exit_datetime.slice(0, 16) : "");
    setEntryDatetime(r.entry_datetime ? r.entry_datetime.slice(0, 16) : "");
    setReason(r.reason || "");
    setStatus(r.status || "pendiente");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAssetType = assetType === "Otros" ? customAssetType.trim() : assetType;
    if (!finalAssetType || !collaboratorId) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setSaving(true);

    let photoUrl: string | null = editRecord?.photo_url || null;
    if (photoFile) {
      setUploading(true);
      const ext = photoFile.name.split(".").pop();
      const filePath = `activos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("evidencias").upload(filePath, photoFile);
      setUploading(false);
      if (uploadErr) { toast.error("Error al subir imagen"); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("evidencias").getPublicUrl(filePath);
      photoUrl = urlData.publicUrl;
    }

    const payload: any = {
      area_id: areaId || null,
      subarea_id: subareaId || null,
      collaborator_user_id: collaboratorId,
      movement_type: movementType,
      asset_type: finalAssetType,
      asset_serial: assetSerial.trim(),
      exit_datetime: exitDatetime || null,
      entry_datetime: entryDatetime || null,
      reason: reason.trim(),
      photo_url: photoUrl,
      status,
    };

    if (editRecord) {
      const { error } = await supabase.from("asset_movements" as any).update(payload as any).eq("id", editRecord.id);
      setSaving(false);
      if (error) { toast.error("Error al actualizar"); return; }
      toast.success("Movimiento actualizado");
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("asset_movements" as any).insert(payload);
      setSaving(false);
      if (error) { toast.error("Error al registrar movimiento"); return; }
      toast.success("Movimiento registrado");
    }

    qc.invalidateQueries({ queryKey: ["asset_movements"] });
    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("asset_movements" as any).delete().eq("id", deleteId);
    if (error) { toast.error("Error al eliminar"); return; }
    toast.success("Movimiento eliminado");
    setDeleteId(null);
    qc.invalidateQueries({ queryKey: ["asset_movements"] });
  };

  const handleToggleStatus = async (record: any) => {
    const newStatus = record.status === "recibido" ? "pendiente" : "recibido";
    const updates: any = { status: newStatus };
    if (newStatus === "recibido") {
      updates.movement_type = "entrada";
      if (!record.entry_datetime) updates.entry_datetime = new Date().toISOString();
    } else {
      updates.movement_type = "salida";
    }
    const { error } = await supabase.from("asset_movements" as any).update(updates).eq("id", record.id);
    if (error) { toast.error("Error al actualizar estado"); return; }
    toast.success(newStatus === "recibido" ? "Activo marcado como Recibido" : "Activo marcado como Pendiente");
    qc.invalidateQueries({ queryKey: ["asset_movements"] });
  };

  const getProfileName = (id: string | null) => profiles.find((p) => p.id === id)?.name || "—";

  const filtered = records.filter((r: any) =>
    [r.asset_type, r.asset_serial, r.reason, getProfileName(r.collaborator_user_id)]
      .join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getAreaName = (id: string | null) => areas.find((a) => a.id === id)?.name || "—";
  const getSubareaName = (id: string | null) => subareas.find((s) => s.id === id)?.name || "";

  // Leaders with assigned laptops
  const leadersWithLaptops = useMemo(() => {
    // Get leaders: area leaders + subarea leaders + users with admin_area or lider_subarea roles
    const leaderUserIds = new Set<string>();

    // From areas table
    areas.forEach(a => { if (a.leader_user_id) leaderUserIds.add(a.leader_user_id); });
    // From subareas table
    subareas.forEach(s => { if (s.leader_user_id) leaderUserIds.add(s.leader_user_id); });
    // From user_roles
    userRoles.forEach(r => {
      if (r.role === "admin_area" || r.role === "lider_subarea") leaderUserIds.add(r.user_id);
    });

    // Find laptop movements for these leaders
    return Array.from(leaderUserIds).map(userId => {
      const profile = profiles.find(p => p.id === userId);
      if (!profile) return null;

      const membership = memberships.find(m => m.user_id === userId);
      const area = membership ? areas.find(a => a.id === membership.area_id) : null;
      const subarea = membership?.subarea_id ? subareas.find(s => s.id === membership.subarea_id) : null;

      // Check roles
      const roles = userRoles.filter(r => r.user_id === userId).map(r => r.role);
      const isAreaLeader = roles.includes("admin_area") || areas.some(a => a.leader_user_id === userId);
      const isSubareaLeader = roles.includes("lider_subarea") || subareas.some(s => s.leader_user_id === userId);

      // Find laptop asset movements for this user
      const laptopMovements = records.filter(
        (r: any) => r.collaborator_user_id === userId && (r.asset_type === "Portátil" || r.asset_type === "Computador Escritorio")
      );

      const lastMovement = laptopMovements.length > 0 ? laptopMovements[0] : null;

      return {
        userId,
        name: profile.name,
        position: profile.position || "Sin cargo",
        areaName: area?.name || "—",
        subareaName: subarea?.name || "",
        roleLabel: isAreaLeader ? "Líder de Área" : isSubareaLeader ? "Líder de Subárea" : "Líder",
        hasLaptop: laptopMovements.length > 0,
        lastMovement,
        totalMovements: laptopMovements.length,
      };
    }).filter(Boolean) as any[];
  }, [areas, subareas, profiles, memberships, userRoles, records]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Control de Activos</h1>
        <p className="text-muted-foreground text-sm">Registro de entrada y salida de activos</p>
      </div>

      <Tabs defaultValue="movements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="movements" className="gap-1.5"><Package className="h-4 w-4" /> Movimientos</TabsTrigger>
          <TabsTrigger value="recurring" className="gap-1.5"><Laptop className="h-4 w-4" /> Equipos Asignados</TabsTrigger>
        </TabsList>

        <TabsContent value="movements">

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <CardTitle className="text-lg">Movimientos de Activos ({filtered.length})</CardTitle>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Buscar por tipo, serie, colaborador..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="max-w-xs"
              />
              <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Nuevo Movimiento
              </Button>
            </div>
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
                      <TableHead>Tipo Mov.</TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead>Serie</TableHead>
                      <TableHead>F. Salida</TableHead>
                      <TableHead>F. Entrada</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          {r.photo_url ? (
                            <a href={r.photo_url} target="_blank" rel="noopener noreferrer">
                              <img src={r.photo_url} alt="Activo" className="w-10 h-10 rounded-md object-cover border hover:opacity-80 transition-opacity" />
                            </a>
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.movement_type === "salida" ? (
                            <Badge variant="destructive" className="gap-1">
                              <ArrowUpFromLine className="h-3 w-3" /> Salida
                            </Badge>
                          ) : (
                            <Badge className="gap-1 bg-emerald-600">
                              <ArrowDownToLine className="h-3 w-3" /> Entrada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{getProfileName(r.collaborator_user_id)}</TableCell>
                        <TableCell className="font-medium">{r.asset_type}</TableCell>
                        <TableCell>{r.asset_serial || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.exit_datetime ? format(new Date(r.exit_datetime), "dd/MM/yy HH:mm", { locale: es }) : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.entry_datetime ? format(new Date(r.entry_datetime), "dd/MM/yy HH:mm", { locale: es }) : "—"}
                        </TableCell>
                        <TableCell>
                          {getAreaName(r.area_id)}{r.subarea_id ? ` / ${getSubareaName(r.subarea_id)}` : ""}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={r.status === "recibido"}
                              onCheckedChange={() => handleToggleStatus(r)}
                            />
                            <span className={`text-xs font-medium ${r.status === "recibido" ? "text-emerald-600" : "text-muted-foreground"}`}>
                              {r.status === "recibido" ? "Recibido" : "Pendiente"}
                            </span>
                          </div>
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
        </TabsContent>

        <TabsContent value="recurring">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Laptop className="h-5 w-5" /> Líderes con Equipos PC Portátiles Asignados ({leadersWithLaptops.length})
                </CardTitle>
                <Button size="sm" onClick={() => {
                  resetForm();
                  setAssetType("Portátil");
                  setIsEquipoMode(true);
                  setDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" /> Asignar Equipo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {leadersWithLaptops.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Monitor className="h-12 w-12 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground">No se encontraron líderes con equipos asignados</p>
                  <p className="text-xs text-muted-foreground">Registra movimientos de activos tipo "Portátil" o "Computador Escritorio" para líderes de área o subárea</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Área / Subárea</TableHead>
                        <TableHead>Responsable</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Equipo Asignado</TableHead>
                        <TableHead>Nro. Serial</TableHead>
                        <TableHead>Código Registro OSH</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leadersWithLaptops.map((leader: any) => (
                        <TableRow key={leader.userId}>
                          <TableCell>
                            {leader.areaName}{leader.subareaName ? ` / ${leader.subareaName}` : ""}
                          </TableCell>
                          <TableCell className="font-medium">{leader.name}</TableCell>
                          <TableCell>{leader.position}</TableCell>
                          <TableCell>
                            {leader.hasLaptop ? (
                              <div className="flex items-center gap-1.5">
                                <Laptop className="h-4 w-4 text-primary" />
                                <span>{leader.lastMovement?.asset_type}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Sin asignación</span>
                            )}
                          </TableCell>
                          <TableCell>{leader.lastMovement?.asset_serial || "—"}</TableCell>
                          <TableCell>
                            {leader.lastMovement ? (
                              <Badge variant="outline" className="text-xs font-mono">
                                {leader.lastMovement.id.substring(0, 8).toUpperCase()}
                              </Badge>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            {leader.lastMovement ? (
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={leader.lastMovement.status === "recibido"}
                                  onCheckedChange={() => handleToggleStatus(leader.lastMovement)}
                                />
                                <span className={`text-xs font-semibold ${leader.lastMovement.status === "recibido" ? "text-emerald-600" : "text-destructive"}`}>
                                  {leader.lastMovement.status === "recibido" ? "Ingreso" : "Salida"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
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
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Movimiento</DialogTitle>
            <DialogDescription>Información completa del activo</DialogDescription>
          </DialogHeader>
          {detailRecord && (
            <div className="space-y-3 text-sm">
              {detailRecord.photo_url && (
                <img src={detailRecord.photo_url} alt="Activo" className="w-full h-48 object-cover rounded-lg border" />
              )}
              <DetailRow label="Tipo de Movimiento" value={detailRecord.movement_type === "salida" ? "Salida" : "Entrada"} />
              <DetailRow label="Tipo de Activo" value={detailRecord.asset_type} />
              <DetailRow label="Número de Serie" value={detailRecord.asset_serial || "—"} />
              <DetailRow label="Colaborador" value={getProfileName(detailRecord.collaborator_user_id)} />
              <DetailRow label="Área" value={`${getAreaName(detailRecord.area_id)}${detailRecord.subarea_id ? ` / ${getSubareaName(detailRecord.subarea_id)}` : ""}`} />
              <DetailRow label="Fecha Salida" value={detailRecord.exit_datetime ? format(new Date(detailRecord.exit_datetime), "dd/MM/yyyy HH:mm", { locale: es }) : "—"} />
              <DetailRow label="Fecha Entrada" value={detailRecord.entry_datetime ? format(new Date(detailRecord.entry_datetime), "dd/MM/yyyy HH:mm", { locale: es }) : "—"} />
              <DetailRow label="Motivo" value={detailRecord.reason || "—"} />
              <DetailRow label="Estado" value={detailRecord.status === "recibido" ? "Recibido" : "Pendiente"} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> {editRecord ? "Editar Movimiento" : isEquipoMode ? "Asignar Equipo PC" : "Registrar Movimiento de Activo"}
            </DialogTitle>
           </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="space-y-2 md:col-span-2">
                <Label>Responsable *</Label>
                <SearchableSelect
                  options={profiles.map((p) => ({ value: p.id, label: `${p.name} — ${p.position || "Sin cargo"}` }))}
                  value={collaboratorId}
                  onValueChange={setCollaboratorId}
                  placeholder="Buscar colaborador"
                  className="w-full"
                />
              </div>
              {!isEquipoMode && (
                <div className="space-y-2">
                  <Label>Tipo de Movimiento *</Label>
                  <Select value={movementType} onValueChange={(v) => setMovementType(v as "entrada" | "salida")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salida">Salida</SelectItem>
                      <SelectItem value="entrada">Entrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>{isEquipoMode ? "Equipo Asignado *" : "Tipo de Activo *"}</Label>
                <Select value={assetType} onValueChange={setAssetType}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                  <SelectContent>
                    {(isEquipoMode ? ["Portátil", "Computador Escritorio"] : ASSET_TYPES).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isEquipoMode && assetType === "Otros" && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Especificar Tipo de Activo *</Label>
                  <Input value={customAssetType} onChange={(e) => setCustomAssetType(e.target.value)} placeholder="Escribir tipo de activo" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Nro. Serial</Label>
                <Input value={assetSerial} onChange={(e) => setAssetSerial(e.target.value)} placeholder="Número de serie del equipo" />
              </div>
              {!isEquipoMode && (
                <>
                  <div className="space-y-2">
                    <Label>Fecha y Hora Salida</Label>
                    <Input type="datetime-local" value={exitDatetime} onChange={(e) => setExitDatetime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha y Hora Entrada</Label>
                    <Input type="datetime-local" value={entryDatetime} onChange={(e) => setEntryDatetime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <div className="flex items-center gap-3 h-10">
                      <Switch
                        checked={status === "recibido"}
                        onCheckedChange={(checked) => {
                          setStatus(checked ? "recibido" : "pendiente");
                          if (checked) setMovementType("entrada");
                        }}
                      />
                      <span className={`text-sm font-medium ${status === "recibido" ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {status === "recibido" ? "Recibido" : "Pendiente"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Motivo</Label>
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describir motivo de la entrada o salida del activo" rows={3} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Foto / Imagen del Activo</Label>
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
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
              <Button type="submit" disabled={saving || uploading}>
                {saving ? "Guardando..." : editRecord ? "Guardar Cambios" : isEquipoMode ? "Asignar Equipo" : "Registrar Movimiento"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. El registro será eliminado permanentemente.</AlertDialogDescription>
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
