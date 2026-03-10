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
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Package, ArrowDownToLine, ArrowUpFromLine, Camera, X, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default function ControlActivosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: profiles = [] } = useProfiles();
  const { data: records = [], isLoading } = useAssetMovements();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
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

  const filteredSubareas = subareas.filter((s) => s.area_id === areaId);

  const resetForm = () => {
    setAreaId(""); setSubareaId(""); setCollaboratorId("");
    setMovementType("salida"); setAssetType(""); setCustomAssetType("");
    setAssetSerial(""); setExitDatetime(""); setEntryDatetime(""); setReason("");
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
    const finalAssetType = assetType === "Otros" ? customAssetType.trim() : assetType;
    if (!finalAssetType || !collaboratorId) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setSaving(true);

    let photoUrl: string | null = null;
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
      created_by: user?.id,
      photo_url: photoUrl,
    };
    const { error } = await supabase.from("asset_movements" as any).insert(payload);
    setSaving(false);
    if (error) { toast.error("Error al registrar movimiento"); return; }
    toast.success("Movimiento registrado");
    qc.invalidateQueries({ queryKey: ["asset_movements"] });
    resetForm();
    setDialogOpen(false);
  };

  const filtered = records.filter((r: any) =>
    [r.asset_type, r.asset_serial, r.reason]
      .join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const getProfileName = (id: string | null) => profiles.find((p) => p.id === id)?.name || "—";
  const getAreaName = (id: string | null) => areas.find((a) => a.id === id)?.name || "";
  const getSubareaName = (id: string | null) => subareas.find((s) => s.id === id)?.name || "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Control de Activos</h1>
          <p className="text-muted-foreground text-sm">Registro de entrada y salida de activos por área, subárea o colaborador</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo Movimiento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <CardTitle className="text-lg">Movimientos de Activos</CardTitle>
            <Input
              placeholder="Buscar por tipo, serie, motivo..."
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Área / Subárea</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead>Serie</TableHead>
                    <TableHead>F. Salida</TableHead>
                    <TableHead>F. Entrada</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any) => (
                    <TableRow key={r.id}>
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
                      <TableCell>
                        {getAreaName(r.area_id)}
                        {r.subarea_id ? ` / ${getSubareaName(r.subarea_id)}` : ""}
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
                      <TableCell className="max-w-[200px] truncate">{r.reason || "—"}</TableCell>
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
              <Package className="h-5 w-5" /> Registrar Movimiento de Activo
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
                <Label>Colaborador *</Label>
                <SearchableSelect
                  options={profiles.map((p) => ({ value: p.id, label: `${p.name} — ${p.position || "Sin cargo"}` }))}
                  value={collaboratorId}
                  onValueChange={setCollaboratorId}
                  placeholder="Buscar colaborador"
                  className="w-full"
                />
              </div>
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
              <div className="space-y-2">
                <Label>Tipo de Activo *</Label>
                <Select value={assetType} onValueChange={setAssetType}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {assetType === "Otros" && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Especificar Tipo de Activo *</Label>
                  <Input value={customAssetType} onChange={(e) => setCustomAssetType(e.target.value)} placeholder="Escribir tipo de activo" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Número de Serie</Label>
                <Input value={assetSerial} onChange={(e) => setAssetSerial(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha y Hora Salida</Label>
                <Input type="datetime-local" value={exitDatetime} onChange={(e) => setExitDatetime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha y Hora Entrada</Label>
                <Input type="datetime-local" value={entryDatetime} onChange={(e) => setEntryDatetime(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Motivo</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describir motivo de la entrada o salida del activo" rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Registrar Movimiento"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
